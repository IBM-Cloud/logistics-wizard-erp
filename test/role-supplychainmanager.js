// Licensed under the Apache License. See footer for details.
/*global require, describe, it, before */
var supertest = require("supertest");
var assert = require("chai").assert;
var async = require("async");

// workaround for "warning: possible EventEmitter memory leak detected"
// seems to be linked to the number of unit tests in the file
require("events").EventEmitter.prototype._maxListeners = 100;

describe("Validates the Supply Chain Manager", function () {

  var loopback;
  var app;
  var api;

  before(function (done) {
    loopback = require("loopback");
    app = require("..");
    app.use(loopback.rest());
    api = supertest(app);

    if (!app.booted) {
      app.once("booted", function () {
        done();
      });
    } else {
      done();
    }
  });

  it("can populate the app with sample data", function (done) {
    api.post("/Demos/seed")
      .set("Content-Type", "application/json")
      .expect(204)
      .end(function (err, res) {
        done(err);
      });
  });

  var demoEnvironment;

  it("can create a Demo environment", function (done) {
    api.post("/Demos")
      .set("Content-Type", "application/json")
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

  it("can NOT retrieve products without being logged", function (done) {
    api.get("/Products")
      .expect(401)
      .end(function (err, res) {
        done(err);
      });
  });

  it("can login with proper credentials", function (done) {
    api.post("/Demos/" + demoEnvironment.guid + "/loginAs")
      .set("Content-Type", "application/json")
      .send(JSON.stringify({
        userId: demoEnvironment.users[0].id
      }))
      .expect(200)
      .end(function (err, res) {
        // capture the token
        api.loopbackAccessToken = res.body.token;
        assert.equal(demoEnvironment.users[0].id, res.body.user.id);
        assert.equal(app.models.ERPUser.SUPPLY_CHAIN_MANAGER_ROLE, res.body.user.roles[0].name);
        done(err);
      });
  });

  it("has the right rights", function (done) {
    api.get("/Users/" + api.loopbackAccessToken.userId + "/roles")
      .set("Authorization", api.loopbackAccessToken.id)
      .expect(200)
      .end(function (err, res) {
        assert.equal(app.models.ERPUser.SUPPLY_CHAIN_MANAGER_ROLE, res.body[0].name);
        done(err);
      });
  });

  it("can retrieve distribution centers when logged", function (done) {
    api.get("/DistributionCenters")
      .set("Authorization", api.loopbackAccessToken.id)
      .expect(200)
      .end(function (err, res) {
        assert.isAbove(res.body.length, 0);
        done(err);
      });
  });

  it("can retrieve inventories when logged", function (done) {
    api.get("/Inventories")
      .set("Authorization", api.loopbackAccessToken.id)
      .expect(200)
      .end(function (err, res) {
        assert.isAbove(res.body.length, 0);
        done(err);
      });
  });

  it("can retrieve products when logged", function (done) {
    api.get("/Products")
      .set("Authorization", api.loopbackAccessToken.id)
      .expect(200)
      .end(function (err, res) {
        assert.isAbove(res.body.length, 0);
        done(err);
      });
  });

  it("can retrieve retailers when logged", function (done) {
    api.get("/Retailers")
      .set("Authorization", api.loopbackAccessToken.id)
      .expect(200)
      .end(function (err, res) {
        assert.isAbove(res.body.length, 0);
        done(err);
      });
  });

  it("can retrieve shipments when logged", function (done) {
    api.get("/Shipments")
      .set("Authorization", api.loopbackAccessToken.id)
      .expect(200)
      .end(function (err, res) {
        assert.isAbove(res.body.length, 0);
        done(err);
      });
  });

  it("can create a new shipment when logged", function (done) {
    api.post("/Shipments")
      .set("Authorization", api.loopbackAccessToken.id)
      .set("Content-Type", "application/json")
      .send(JSON.stringify({
        "status": "NEW"
      }))
      .expect(200)
      .end(function (err, res) {
        done(err);
      });
  });

  it("can retrieve suppliers when logged", function (done) {
    api.get("/Suppliers")
      .set("Authorization", api.loopbackAccessToken.id)
      .expect(200)
      .end(function (err, res) {
        assert.isAbove(res.body.length, 0);
        done(err);
      });
  });

  it("can delete a demo environment", function (done) {
    api.delete("/Demos/" + demoEnvironment.guid)
      .set("Content-Type", "application/json")
      .expect(204)
      .end(function (err, res) {
        done(err);
      });
  });

  it("can delete all sample data", function (done) {
    api.post("/Demos/reset")
      .set("Content-Type", "application/json")
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
