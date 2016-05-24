// Licensed under the Apache License. See footer for details.
var supertest = require('supertest');

describe('Users', function () {

  var loopback;
  var app;
  var apiAnon, apiSupply, apiRetail;

  before(function (done) {
    loopback = require('loopback');
    app = require('..');
    app.use(loopback.rest());

    apiAnon = supertest(app);
    apiSupply = supertest(app);
    apiRetail = supertest(app);

    app.models.ERPUser.create([{
        email: "supplymanager@acme.com",
        username: "Supply Manager",
        password: "supply"
      },
      {
        email: "retailmanager@retail.com",
        username: "Retail Manager",
        password: "retail"
      }], function (err, objects) {
      done(err);
    });
  });

  after(function(done) {
    app.models.ERPUser.destroyAll(function(err, info) {
      done(err);
    });
  });
  
  it('can NOT log in with invalid info', function (done) {
    apiAnon.post("/Users/login")
      .set('Content-Type', 'application/json')
      .send('{"email": "john@acme.com", "password": "doe"}')
      .expect(401)
      .end(function (err, res) {
        done(err);
      });
  });

  it('can NOT register a user', function (done) {
    apiAnon.post("/Users")
      .set('Content-Type', 'application/json')
      .send('{"email": "john@acme.com", "username": "john", "password": "doe"}')
      .expect(404)
      .end(function (err, res) {
        done(err);
      });
  });

  it('can NOT logout if no logged in', function (done) {
    apiAnon.post("/Users/logout")
      .expect(500)
      .end(function (err, res) {
        done(err);
      });
  });

  it('can NOT logout with a wrong token', function (done) {
    apiSupply.post("/Users/logout")
      .set("Authorization", "NOT A VALID TOKEN")
      .expect(500)
      .end(function (err, res) {
        done(err);
      });
  });


  it('can login with proper credentials', function (done) {
    apiSupply.post("/Users/login")
      .set('Content-Type', 'application/json')
      .send(JSON.stringify({
        email: "supplymanager@acme.com",
        password: "supply"
      }))
      .expect(200)
      .end(function (err, res) {
        // save the loopback token for later
        apiSupply.loopbackAccessToken = res.body.id;
        done(err);
      });
  });

  it('can logout if previously logged in', function (done) {
    apiSupply.post("/Users/logout")
      .set("Authorization", apiSupply.loopbackAccessToken)
      .expect(204)
      .end(function (err, res) {
        done(err);
      });
  });
  
});
//------------------------------------------------------------------------------
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//    http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.
//------------------------------------------------------------------------------
