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
    api = supertest(app);

    done();
  });

  after(function (done) {
    app.models.ERPUser.destroyAll(function (err, info) {
      done(err);
    });
  });

  var demoEnvironment;

  it('can create a Demo environment', function (done) {
    api.post("/Demos")
      .set('Content-Type', 'application/json')
      .send(JSON.stringify({
        name: "My Demo"
      }))
      .expect(200)
      .end(function (err, res) {
        if (!err) {
          demoEnvironment = res.body;
        }
        done(err);
      });
  });

  it('can NOT retrieve products without being logged', function (done) {
    api.get("/Products")
      .expect(401)
      .end(function (err, res) {
        done(err);
      });
  });

  it('can login with proper credentials', function (done) {
    api.post("/Demos/" + demoEnvironment.guid + "/loginAs")
      .set('Content-Type', 'application/json')
      .send(JSON.stringify({
        userId: demoEnvironment.users[0].id
      }))
      .expect(200)
      .end(function (err, res) {
        // capture the token
        api.loopbackAccessToken = res.body;
        done(err);
      });
  });

  it('can NOT logout with a wrong token', function (done) {
    api.post("/Users/logout")
      .set("Authorization", "NOT A VALID TOKEN")
      .expect(500)
      .end(function (err, res) {
        done(err);
      });
  });

  it('can logout if previously logged in', function (done) {
    api.post("/Users/logout")
      .set("Authorization", api.loopbackAccessToken.id)
      .expect(204)
      .end(function (err, res) {
        done(err);
      });
  });

  it('can NOT log in with invalid info', function (done) {
    apiAnon.post("/Users/login")
      .set('Content-Type', 'application/json')
      .send('{"email": "john@acme.com", "password": "doe"}')
      .expect(404)
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
