// Licensed under the Apache License. See footer for details.
var supertest = require('supertest');
var assert = require('chai').assert;
var fs = require('fs');

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

    var retailers = JSON.parse(fs.readFileSync("./seed/retailer.json"));
    app.models.Retailer.create(retailers, function (err, retailers) {
      done(err);
    });
  });

  after(function (done) {
    app.models.Retailer.destroyAll(function (err, info) {
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
          assert.equal(1, demoEnvironment.users.length);
          assert.equal(1, demoEnvironment.users[0].roles.length);
        }
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
          assert.equal(1, demoEnvironmentFound.users.length);
          assert.equal(1, demoEnvironmentFound.users[0].roles.length);
        }
        done(err);
      });
  });

  it('can retrieve the list of retailers', function (done) {
    apiAnon.get("/Demos/" + demoEnvironment.guid + "/retailers")
      .set('Content-Type', 'application/json')
      .expect(200)
      .end(function (err, res) {
        assert.equal(4, res.body.length);
        done(err);
      });
  });

  it('can NOT log in with a non-existent user on a valid demo', function (done) {
    apiSupply.post("/Demos/" + demoEnvironment.guid + "/loginAs")
      .set('Content-Type', 'application/json')
      .send(JSON.stringify({
        userId: "I do not exist"
      }))
      .expect(404)
      .end(function (err, res) {
        done(err);
      });
  });

  it('can log in as a user without providing credentials', function (done) {
    apiSupply.post("/Demos/" + demoEnvironment.guid + "/loginAs")
      .set('Content-Type', 'application/json')
      .send(JSON.stringify({
        userId: demoEnvironment.users[0].id
      }))
      .expect(200)
      .end(function (err, res) {
        assert.isNotNull(res.body.id);
        apiSupply.loopbackAccessToken = res.body;
        done(err);
      });
  });

  it('can query ERP API with a user', function (done) {
    apiSupply.get('/Products')
      .set("Authorization", apiSupply.loopbackAccessToken.id)
      .expect(200)
      .end(function (err, res) {
        done(err);
      });
  });

  it('can create a new Retailer user', function (done) {
    var userCount = demoEnvironment.users.length;
    apiAnon.post("/Demos/" + demoEnvironment.guid + "/createUser")
      .set('Content-Type', 'application/json')
      .send(JSON.stringify({
        retailerId: "R1"
      }))
      .expect(200)
      .end(function (err, res) {
        var user = res.body;
        assert.equal(demoEnvironment.id, user.demoId);
        if (err) {
          done(err);
        }
      });

    apiAnon.get("/Demos/findByGuid/" + demoEnvironment.guid)
      .set('Content-Type', 'application/json')
      .expect(200)
      .end(function (err, res) {
        var updatedDemoEnvironment = res.body;
        assert.equal(demoEnvironment.users.length + 1, updatedDemoEnvironment.users.length);
        done(err);
      });
  });

  it('can not create a new Retailer user for non-existent retailer', function (done) {
    var userCount = demoEnvironment.users.length;
    apiAnon.post("/Demos/" + demoEnvironment.guid + "/createUser")
      .set('Content-Type', 'application/json')
      .send(JSON.stringify({
        retailerId: "IdoNotExist"
      }))
      .expect(404)
      .end(function (err, res) {
        done(err);
      });
  });

  it('can delete a demo environment', function (done) {
    apiAnon.delete("/Demos/" + demoEnvironment.guid)
      .set('Content-Type', 'application/json')
      .expect(204)
      .end(function (err, res) {
        done(err);
      });
  });

  it('can not retrieve a deleted environment', function (done) {
    apiAnon.get("/Demos/findByGuid/" + demoEnvironment.guid)
      .set('Content-Type', 'application/json')
      .expect(404)
      .end(function (err, res) {
        done(err);
      });
  });

  it('can not query ERP API with a user from a deleted environment', function (done) {
    apiSupply.get('/Products')
      .set("Authorization", apiSupply.loopbackAccessToken.id)
      .expect(401)
      .end(function (err, res) {
        done(err);
      });
  });

  it('can not get a non-existent demo', function (done) {
    apiAnon.get("/Demos/findByGuid/blah")
      .set('Content-Type', 'application/json')
      .expect(404)
      .end(function (err, res) {
        done(err);
      });
  });

  it('can not delete a non-existent demo environment', function (done) {
    apiAnon.delete("/Demos/blah")
      .set('Content-Type', 'application/json')
      .expect(404)
      .end(function (err, res) {
        done(err);
      });
  });

  it('can not login with a non-existent demo', function (done) {
    apiSupply.post("/Demos/blah/loginAs")
      .set('Content-Type', 'application/json')
      .send(JSON.stringify({
        userId: demoEnvironment.users[0].id
      }))
      .expect(404)
      .end(function (err, res) {
        assert.isNotNull(res.body.id);
        apiSupply.loopbackAccessToken = res.body;
        done(err);
      });
  });

  it('can not create a user for a non-existent demo', function (done) {
    apiAnon.post("/Demos/blah/createUser")
      .set('Content-Type', 'application/json')
      .send(JSON.stringify({
        retailerId: "R1"
      }))
      .expect(404)
      .end(function (err, res) {
        done(err);
      });
  });

  it('can not get retailers from a non-existent demo', function (done) {
    apiAnon.get("/Demos/blah/retailers")
      .set('Content-Type', 'application/json')
      .expect(404)
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
