// Licensed under the Apache License. See footer for details.
/*global require, describe, it, before */
var supertest = require("supertest");
var assert = require("chai").assert;
var async = require("async");
var fs = require("fs");

// load default behaviors for unit tests
require("./unittest.js");

describe("Validates the Retail Store Manager", function () {

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

  var demoEnvironment;
  var retailStoreManager;

  it("can create a Demo environment", function (done) {
    api.post("/Demos")
      .set("Content-Type", "application/json")
      .send()
      .expect(200)
      .end(function (err, res) {
        if (!err) {
          demoEnvironment = res.body;
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

  var demoEnvironmentRetailers = [];

  it("can retrieve the list of retailers", function (done) {
    api.get("/Demos/" + demoEnvironment.guid + "/retailers")
      .set("Content-Type", "application/json")
      .expect(200)
      .end(function (err, res) {
        assert.equal(4, res.body.length);
        demoEnvironmentRetailers = res.body;
        done(err);
      });
  });

  it("can create a new Retailer user", function (done) {
    var userCount = demoEnvironment.users.length;
    api.post("/Demos/" + demoEnvironment.guid + "/createUser")
      .set("Content-Type", "application/json")
      .send({
        retailerId: demoEnvironmentRetailers[0].id
      })
      .expect(200)
      .end(function (err, res) {
        retailStoreManager = res.body;
        assert.equal(demoEnvironment.id, retailStoreManager.demoId);
        done(err);
      });
  });

  it("can NOT create a new Retailer user with the same store", function (done) {
    api.post("/Demos/" + demoEnvironment.guid + "/createUser")
      .set("Content-Type", "application/json")
      .send({
        retailerId: demoEnvironmentRetailers[0].id
      })
      .expect(400)
      .end(function (err, res) {
        done(err);
      });
  });

  it("can login with proper credentials", function (done) {
    api.post("/Demos/" + demoEnvironment.guid + "/loginAs")
      .set("Content-Type", "application/json")
      .send({
        userId: retailStoreManager.id
      })
      .expect(200)
      .end(function (err, res) {
        // capture the token
        api.loopbackAccessToken = res.body.token;
        assert.equal(retailStoreManager.id, res.body.user.id);
        assert.equal(app.models.ERPUser.RETAIL_STORE_MANAGER_ROLE, res.body.user.roles[0].name);
        done(err);
      });
  });

  it("has the right rights", function (done) {
    api.get("/Users/" + api.loopbackAccessToken.userId + "/roles")
      .set("Authorization", api.loopbackAccessToken.id)
      .expect(200)
      .end(function (err, res) {
        assert.equal(app.models.ERPUser.RETAIL_STORE_MANAGER_ROLE, res.body[0].name);
        done(err);
      });
  });

  it("can retrieve distribution centers when logged", function (done) {
    api.get("/DistributionCenters")
      .set("Authorization", api.loopbackAccessToken.id)
      .expect(200)
      .end(function (err, res) {
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

  var distributionCenters;

  it("can retrieve distribution centers when logged", function (done) {
    api.get("/DistributionCenters")
      .set("Authorization", api.loopbackAccessToken.id)
      .expect(200)
      .end(function (err, res) {
        assert.isAbove(res.body.length, 0);
        distributionCenters = res.body;
        done(err);
      });
  });

  it("can retrieve inventories when logged", function (done) {
    api.get("/DistributionCenters/" + distributionCenters[0].id + "/inventories")
      .set("Authorization", api.loopbackAccessToken.id)
      .expect(200)
      .end(function (err, res) {
        assert.isAbove(res.body.length, 0);
        done(err);
      });
  });

  var retailers;

  it("can retrieve retailers when logged", function (done) {
    api.get("/Retailers")
      .set("Authorization", api.loopbackAccessToken.id)
      .expect(200)
      .end(function (err, res) {
        assert.isAbove(res.body.length, 0);
        retailers = res.body;
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

  it("needs to specify source and destination for shipments", function (done) {
    api.post("/Shipments")
      .set("Authorization", api.loopbackAccessToken.id)
      .send({
        "status": "NEW",
        estimatedTimeOfArrival: new Date()
      })
      .expect(422)
      .end(function (err, res) {
        done(err);
      });
  });

  it("needs to specify destination in addition to source for shipments", function (done) {
    api.post("/Shipments")
      .set("Authorization", api.loopbackAccessToken.id)
      .send({
        "status": "NEW",
        "fromId": "14",
        estimatedTimeOfArrival: new Date()
      })
      .expect(422)
      .end(function (err, res) {
        done(err);
      });
  });

  it("needs to specify source in addition to destination for shipments", function (done) {
    api.post("/Shipments")
      .set("Authorization", api.loopbackAccessToken.id)
      .send({
        "status": "NEW",
        "toId": "14",
        estimatedTimeOfArrival: new Date()
      })
      .expect(422)
      .end(function (err, res) {
        done(err);
      });
  });

  it("can not create a shipment with invalid source", function (done) {
    api.post("/Shipments")
      .set("Authorization", api.loopbackAccessToken.id)
      .send({
        "status": "NEW",
        "fromId": "1664",
        "toId": retailers[0].id,
        estimatedTimeOfArrival: new Date()
      })
      .expect(422)
      .end(function (err, res) {
        done(err);
      });
  });

  it("can not create a shipment with invalid destination", function (done) {
    api.post("/Shipments")
      .set("Authorization", api.loopbackAccessToken.id)
      .send({
        "status": "NEW",
        "fromId": distributionCenters[0].id,
        "toId": "1789",
        estimatedTimeOfArrival: new Date()
      })
      .expect(422)
      .end(function (err, res) {
        done(err);
      });
  });

  var newShipment;

  it("can create a new shipment when logged", function (done) {
    api.post("/Shipments")
      .set("Authorization", api.loopbackAccessToken.id)
      .send({
        "status": "NEW",
        "fromId": distributionCenters[0].id,
        "toId": retailers[0].id,
        estimatedTimeOfArrival: new Date()
      })
      .expect(200)
      .end(function (err, res) {
        newShipment = res.body;
        done(err);
      });
  });

  it("can add line items to a shipment", function (done) {
    api.post("/Shipments/" + newShipment.id + "/items")
      .set("Authorization", api.loopbackAccessToken.id)
      .set("Content-Type", "application/json")
      .send([{
        productId: 103,
        quantity: 100
      }])
      .expect(200)
      .end(function (err, res) {
        done(err);
      });
  });

  it("can retrieve the  line items of a shipment", function (done) {
    api.get("/Shipments/" + newShipment.id + "/items")
      .set("Authorization", api.loopbackAccessToken.id)
      .set("Content-Type", "application/json")
      .expect(200)
      .end(function (err, res) {
        assert.equal(1, res.body.length);
        done(err);
      });
  });

  it("can NOT retrieve suppliers when logged", function (done) {
    api.get("/Suppliers")
      .set("Authorization", api.loopbackAccessToken.id)
      .expect(401)
      .end(function (err, res) {
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
