// Licensed under the Apache License. See footer for details.
var supertest = require('supertest');
var assert = require('chai').assert;

describe('Demos', function () {

  var loopback;
  var app;
  var apiAnon;
  var apiSupply;
  var apiRetail;

  before(function (done) {
    loopback = require('loopback');
    app = require('..');
    app.use(loopback.rest());

    apiAnon = supertest(app);
    apiSupply = supertest(app);
    apiRetail = supertest(app);

    done();
  });

  after(function (done) {
    app.models.Demo.destroyAll(function (err, info) {
      app.models.ERPUser.destroyAll(function (err, info) {
        done(err);
      });
    });
  });

  var demoEnvironment;

  it('can create a Demo environment', function (done) {
    apiAnon.post("/Demos")
      .set('Content-Type', 'application/json')
      .send(JSON.stringify({
        name: "My Demo"
      }))
      .expect(200)
      .end(function (err, res) {
        if (!err) {
          demoEnvironment = res.body;
          assert.equal("My Demo", demoEnvironment.name);
        }
        done(err);
      });
  });

  it('creates one Supply Chain Manager user that can login', function (done) {
    apiSupply.post("/Users/login")
      .set('Content-Type', 'application/json')
      .send(JSON.stringify({
        email: demoEnvironment.users[0].email,
        password: demoEnvironment.users[0].password
      }))
      .expect(200)
      .end(function (err, res) {
        done(err);
      });
  });

  it('creates one Retail Store Manager user that can login', function (done) {
    apiRetail.post("/Users/login")
      .set('Content-Type', 'application/json')
      .send(JSON.stringify({
        email: demoEnvironment.users[1].email,
        password: demoEnvironment.users[1].password
      }))
      .expect(200)
      .end(function (err, res) {
        done(err);
      });
  });

  it('can retrieve a previous environment', function (done) {
    apiAnon.get("/Demos/findByGuid/" + demoEnvironment.guid)
      .set('Content-Type', 'application/json')
      .expect(200)
      .end(function (err, res) {
        if (!err) {
          var demoEnvironmentFound = res.body;
          assert.equal(2, demoEnvironmentFound.users.length);
        }
        done(err);
      });
  });

  it('gets an error if trying to retrieve a non-existent environment', function (done) {
    apiAnon.get("/Demos/findByGuid/blah")
      .set('Content-Type', 'application/json')
      .expect(404)
      .end(function (err, res) {
        done(err);
      });
  });

  it('can log in as a user without providing credentials', function (done) {
    apiAnon.post("/Demos/loginAs")
      .set('Content-Type', 'application/json')
      .send(JSON.stringify({
        guid: demoEnvironment.guid,
        userId: demoEnvironment.users[0].id
      }))
      .expect(200)
      .end(function (err, res) {
        assert.isNotNull(res.body.id);
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
