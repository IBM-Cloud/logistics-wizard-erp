// Licensed under the Apache License. See footer for details.
/*global require, describe, it, before */
var supertest = require("supertest");
var assert = require("chai").assert;
var fs = require("fs");

// load default behaviors for unit tests
require("./unittest.js");

describe("Data Isolation", function () {

  var loopback;
  var app;
  var apiAnon;
  var apiSupply1;
  var apiSupply2;

  before(function (done) {
    loopback = require("loopback");
    app = require("..");
    app.use(loopback.rest());
    apiAnon = supertest(app);
    apiSupply1 = supertest(app);
    apiSupply2 = supertest(app);

    if (!app.booted) {
      app.once("booted", function () {
        done();
      });
    } else {
      done();
    }
  });

  var demoEnvironment1,
    demoEnvironment2;

  // create D1 demo env
  it("can create D1 demo environment", function (done) {
    apiAnon.post("/Demos")
      .set("Content-Type", "application/json")
      .send()
      .expect(200)
      .end(function (err, res) {
        demoEnvironment1 = res.body;
        done(err);
      });
  });

  // create D2 demo env
  it("can create D2 demo environment", function (done) {
    apiAnon.post("/Demos")
      .set("Content-Type", "application/json")
      .send()
      .expect(200)
      .end(function (err, res) {
        demoEnvironment2 = res.body;
        done(err);
      });
  });

  // log in as Supply Chain Manager in D1
  it("can log in D1", function (done) {
    apiSupply1.post("/Demos/" + demoEnvironment1.guid + "/loginAs")
      .set("Content-Type", "application/json")
      .send({
        userId: demoEnvironment1.users[0].id
      })
      .expect(200)
      .end(function (err, res) {
        apiSupply1.loopbackAccessToken = res.body.token;
        done(err);
      });
  });

  // log in as Supply Chain Manager in D2
  it("can log in D2", function (done) {
    apiSupply2.post("/Demos/" + demoEnvironment2.guid + "/loginAs")
      .set("Content-Type", "application/json")
      .send({
        userId: demoEnvironment2.users[0].id
      })
      .expect(200)
      .end(function (err, res) {
        apiSupply2.loopbackAccessToken = res.body.token;
        done(err);
      });
  });

  var products = [];
  it("can get products through D1", function (done) {
    apiSupply1.get("/Products")
      .set("Authorization", apiSupply1.loopbackAccessToken.id)
      .set("Content-Type", "application/json")
      .expect(200)
      .end(function (err, res) {
        products = res.body;
        done(err);
      });
  });

  var supply1DistributionCenters;

  it("can retrieve distribution centers when logged", function (done) {
    apiSupply1.get("/DistributionCenters")
      .set("Authorization", apiSupply1.loopbackAccessToken.id)
      .expect(200)
      .end(function (err, res) {
        assert.isAbove(res.body.length, 0);
        supply1DistributionCenters = res.body;
        done(err);
      });
  });

  // get initial inventory for first distribution center
  var initialDistributionCenterInventory;
  it("can get inventory for distribution center in D1", function (done) {
    apiSupply1.get("/DistributionCenters/" + supply1DistributionCenters[0].id + "/inventories")
      .set("Authorization", apiSupply1.loopbackAccessToken.id)
      .set("Content-Type", "application/json")
      .expect(200)
      .end(function (err, res) {
        assert.equal(products.length, res.body.length);
        done(err);
      });
  });

  var supply1Retailers;

  it("can retrieve retailers when logged", function (done) {
    apiSupply1.get("/Retailers")
      .set("Authorization", apiSupply1.loopbackAccessToken.id)
      .expect(200)
      .end(function (err, res) {
        assert.isAbove(res.body.length, 0);
        supply1Retailers = res.body;
        done(err);
      });
  });

  var supply2Retailers;

  it("can retrieve retailers when logged", function (done) {
    apiSupply2.get("/Retailers")
      .set("Authorization", apiSupply2.loopbackAccessToken.id)
      .expect(200)
      .end(function (err, res) {
        assert.isAbove(res.body.length, 0);
        supply2Retailers = res.body;
        done(err);
      });
  });

  var newShipment;

  // create a shipment in D1
  it("can create a new shipment in D1", function (done) {
    apiSupply1.post("/Shipments")
      .set("Authorization", apiSupply1.loopbackAccessToken.id)
      .send({
        status: "NEW",
        fromId: supply1DistributionCenters[0].id,
        toId: supply1Retailers[0].id,
        estimatedTimeOfArrival: new Date()
      })
      .expect(200)
      .end(function (err, res) {
        newShipment = res.body;
        done(err);
      });
  });

  it("can NOT create a new shipment in D1 with a retailer from D2", function (done) {
    apiSupply1.post("/Shipments")
      .set("Authorization", apiSupply1.loopbackAccessToken.id)
      .send({
        status: "NEW",
        fromId: supply1DistributionCenters[0].id,
        toId: supply2Retailers[0].id,
        estimatedTimeOfArrival: new Date()
      })
      .expect(422)
      .end(function (err, res) {
        done(err);
      });
  });

  it("can attach a line item to the shipment", function (done) {
    apiSupply1.post("/Shipments/" + newShipment.id + "/items")
      .set("Authorization", apiSupply1.loopbackAccessToken.id)
      .send([{
        productId: 103,
        quantity: 100
      }])
      .expect(200)
      .end(function (err, res) {
        if (!err) {
          assert.equal(newShipment.id, res.body[0].shipmentId);
        }
        done(err);
      });
  });

  // this shipment is not visible in D2
  it("can see the shipment it created in D1", function (done) {
    apiSupply1.get("/Shipments")
      .set("Authorization", apiSupply1.loopbackAccessToken.id)
      .set("Content-Type", "application/json")
      .expect(200)
      .end(function (err, res) {
        assert.equal(1, res.body.filter(function (shipment) {
          return shipment.id == newShipment.id;
        }).length);
        done(err);
      });
  });

  it("can see shipment items from D1 by id", function (done) {
    apiSupply1.get("/Shipments/" + newShipment.id + "/items")
      .set("Authorization", apiSupply1.loopbackAccessToken.id)
      .set("Content-Type", "application/json")
      .expect(200)
      .end(function (err, res) {
        assert.isAbove(res.body.length, 0);
        done(err);
      });
  });

  // this shipment is not visible in D2
  it("can not see shipment from D1 in D2 Shipments", function (done) {
    apiSupply2.get("/Shipments")
      .set("Authorization", apiSupply2.loopbackAccessToken.id)
      .set("Content-Type", "application/json")
      .expect(200)
      .end(function (err, res) {
        assert.isAbove(res.body.length, 0);
        assert.equal(0, res.body.filter(function (shipment) {
          return shipment.id == newShipment.id;
        }).length);
        done(err);
      });
  });

  // this shipment is not visible in D2
  it("can not see shipment from D1 in D2 by id", function (done) {
    apiSupply2.get("/Shipments/" + newShipment.id)
      .set("Authorization", apiSupply2.loopbackAccessToken.id)
      .set("Content-Type", "application/json")
      .expect(404) // this shipment should not be visible so Not Found
      .end(function (err, res) {
        done(err);
      });
  });

  // this shipment is not visible in D2
  it("can not see shipment items from D1 in D2 by id", function (done) {
    apiSupply2.get("/Shipments/" + newShipment.id + "/items")
      .set("Authorization", apiSupply2.loopbackAccessToken.id)
      .set("Content-Type", "application/json")
      .expect(404) // this shipment should not be visible so Not Found
      .end(function (err, res) {
        done(err);
      });
  });

  it("can not update shipments from D1 in D2", function (done) {
    newShipment.deliveredAt = new Date();
    apiSupply2.put("/Shipments/" + newShipment.id)
      .set("Authorization", apiSupply2.loopbackAccessToken.id)
      .set("Content-Type", "application/json")
      .send(newShipment)
      .expect(404) // this shipment should not be visible so Not Found
      .end(function (err, res) {
        done(err);
      });
  });

  it("can not add items to shipments from D1 in D2", function (done) {
    apiSupply2.post("/Shipments/" + newShipment.id + "/items")
      .set("Authorization", apiSupply2.loopbackAccessToken.id)
      .send({
        "productId": "I5",
        "quantity": 100
      })
      .expect(404) // this shipment should not be visible so Not Found
      .end(function (err, res) {
        done(err);
      });
  });

  it("can not delete shipments from D1 in D2", function (done) {
    apiSupply2.delete("/Shipments/" + newShipment.id)
      .set("Authorization", apiSupply2.loopbackAccessToken.id)
      .set("Content-Type", "application/json")
      .expect(404) // this shipment should not be visible so Not Found
      .end(function (err, res) {
        done(err);
      });
  });

  it("can delete the demo environment 1", function (done) {
    apiAnon.delete("/Demos/" + demoEnvironment1.guid)
      .expect(204)
      .end(function (err, res) {
        done(err);
      });
  });

  it("can delete the demo environment 2", function (done) {
    apiAnon.delete("/Demos/" + demoEnvironment2.guid)
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
