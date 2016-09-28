// Licensed under the Apache License. See footer for details.
/*global require, describe, it, before */
var supertest = require("supertest");
var assert = require("chai").assert;
var fs = require("fs");

// load default behaviors for unit tests
require("./unittest.js");

describe("Cancelling a shipment", function () {

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
    api = supertest(app);
    apiRetailer = supertest(app);

    if (!app.booted) {
      app.once("booted", function () {
        done();
      });
    } else {
      done();
    }
  });

  var demoEnvironment;
  it("can create a demo environment", function (done) {
    apiAnon.post("/Demos")
      .set("Content-Type", "application/json")
      .send()
      .expect(200)
      .end(function (err, res) {
        demoEnvironment = res.body;
        done(err);
      });
  });

  var retailStore;
  it("can retrieve the list of retailers", function (done) {
    api.get("/Demos/" + demoEnvironment.guid + "/retailers")
      .set("Content-Type", "application/json")
      .expect(200)
      .end(function (err, res) {
        assert.equal(4, res.body.length);
        retailStore = res.body[0];
        done(err);
      });
  });

  var retailStoreManager;
  it("can create a new Retailer user", function (done) {
    var userCount = demoEnvironment.users.length;
    api.post("/Demos/" + demoEnvironment.guid + "/createUser")
      .set("Content-Type", "application/json")
      .send({
        retailerId: retailStore.id
      })
      .expect(200)
      .end(function (err, res) {
        retailStoreManager = res.body;
        assert.equal(demoEnvironment.id, retailStoreManager.demoId);
        done(err);
      });
  });

  it("can login as retailer", function (done) {
    api.post("/Demos/" + demoEnvironment.guid + "/loginAs")
      .set("Content-Type", "application/json")
      .send({
        userId: retailStoreManager.id
      })
      .expect(200)
      .end(function (err, res) {
        // capture the token
        apiRetailer.loopbackAccessToken = res.body.token;
        assert.equal(retailStoreManager.id, res.body.user.id);
        assert.equal(app.models.ERPUser.RETAIL_STORE_MANAGER_ROLE, res.body.user.roles[0].name);
        done(err);
      });
  });

  var products = [];
  it("can get products", function (done) {
    apiRetailer.get("/Products")
      .set("Authorization", apiRetailer.loopbackAccessToken.id)
      .set("Content-Type", "application/json")
      .expect(200)
      .end(function (err, res) {
        products = res.body;
        done(err);
      });
  });

  var distributionCenters = [];
  it("can get distribution center", function (done) {
    apiRetailer.get("/DistributionCenters")
      .set("Authorization", apiRetailer.loopbackAccessToken.id)
      .set("Content-Type", "application/json")
      .expect(200)
      .end(function (err, res) {
        distributionCenters = res.body;
        done(err);
      });
  });

  // get initial inventory for first distribution center
  var initialDistributionCenterInventory;
  it("can get inventory for distribution center", function (done) {
    apiRetailer.get("/DistributionCenters/" + distributionCenters[0].id + "/inventories")
      .set("Authorization", apiRetailer.loopbackAccessToken.id)
      .set("Content-Type", "application/json")
      .expect(200)
      .end(function (err, res) {
        initialDistributionCenterInventory = res.body;
        assert.equal(products.length, initialDistributionCenterInventory.length);
        done(err);
      });
  });

  // create a new shipment from dc to retailer
  var shipment;
  it("can create a shipment from DC to Retailer", function (done) {
    apiRetailer.post("/Shipments")
      .set("Authorization", apiRetailer.loopbackAccessToken.id)
      .send({
        fromId: distributionCenters[0].id,
        toId: retailStore.id,
        estimatedTimeOfArrival: new Date()
      })
      .expect(200)
      .end(function (err, res) {
        shipment = res.body;
        assert.equal(shipment.status, "NEW");
        done(err);
      });
  });

  var lineItems = [
    {
      quantity: 15,
      productId: 103,
      shipmentId: 4355
    },
    {
      quantity: 20,
      productId: 102
    }
  ];

  it("can add items to the shipment", function (done) {
    apiRetailer.post("/Shipments/" + shipment.id + "/items")
      .set("Authorization", apiRetailer.loopbackAccessToken.id)
      .send(lineItems)
      .expect(200)
      .end(function (err, res) {
        done(err);
      });
  });

  it("can delete the shipment", function (done) {
    apiRetailer.delete("/Shipments/" + shipment.id)
      .set("Authorization", apiRetailer.loopbackAccessToken.id)
      .expect(204)
      .end(function (err, res) {
        done(err);
      });
  });

  it("can't delete a deleted shipment", function (done) {
    apiRetailer.delete("/Shipments/" + shipment.id)
      .set("Authorization", apiRetailer.loopbackAccessToken.id)
      .expect(404)
      .end(function (err, res) {
        done(err);
      });
  });

  it("can't add items to a deleted shipment", function (done) {
    apiRetailer.post("/Shipments/" + shipment.id + "/items")
      .set("Authorization", apiRetailer.loopbackAccessToken.id)
      .send(lineItems)
      .expect(404)
      .end(function (err, res) {
        done(err);
      });
  });

  it("can't approve something that has been deleted", function (done) {
    apiRetailer.put("/Shipments/" + shipment.id)
      .set("Authorization", apiRetailer.loopbackAccessToken.id)
      .send({
        status: "APPROVED"
      })
      .expect(404)
      .end(function (err, res) {
        done(err);
      });
  });

  it("can create a shipment from DC to Retailer", function (done) {
    apiRetailer.post("/Shipments")
      .set("Authorization", apiRetailer.loopbackAccessToken.id)
      .send({
        fromId: distributionCenters[0].id,
        toId: retailStore.id,
        estimatedTimeOfArrival: new Date()
      })
      .expect(200)
      .end(function (err, res) {
        shipment = res.body;
        assert.equal(shipment.status, "NEW");
        done(err);
      });
  });

  var lineItems = [
    {
      quantity: 15,
      productId: 103,
      shipmentId: 4355
    },
    {
      quantity: 20,
      productId: 102
    }
  ];

  it("can add items to the shipment", function (done) {
    apiRetailer.post("/Shipments/" + shipment.id + "/items")
      .set("Authorization", apiRetailer.loopbackAccessToken.id)
      .send(lineItems)
      .expect(200)
      .end(function (err, res) {
        done(err);
      });
  });

  it("can approve the shipment", function (done) {
    apiRetailer.put("/Shipments/" + shipment.id)
      .set("Authorization", apiRetailer.loopbackAccessToken.id)
      .send({
        status: "APPROVED"
      })
      .expect(200)
      .end(function (err, res) {
        done(err);
      });
  });

  it("decreases the inventory at the source", function (done) {
    apiRetailer.get("/DistributionCenters/" + shipment.fromId + "/inventories")
      .set("Authorization", apiRetailer.loopbackAccessToken.id)
      .set("Content-Type", "application/json")
      .expect(200)
      .end(function (err, res) {
        var updatedInventory = res.body;

        // take the initial inventory
        var productIdToInitialInventory = [];
        initialDistributionCenterInventory.forEach(function (inventory) {
          productIdToInitialInventory[inventory.productId] = inventory;
        });

        // apply the expected changes
        lineItems.forEach(function (item) {
          productIdToInitialInventory[item.productId].quantity =
            productIdToInitialInventory[item.productId].quantity - item.quantity;
        });

        // check the expected against actual
        updatedInventory.forEach(function (inventory) {
          assert.equal(productIdToInitialInventory[inventory.productId].quantity, inventory.quantity);
        });

        done(err);
      });
  });

  it("can delete the APPROVED shipment", function (done) {
    apiRetailer.delete("/Shipments/" + shipment.id)
      .set("Authorization", apiRetailer.loopbackAccessToken.id)
      .expect(204)
      .end(function (err, res) {
        done(err);
      });
  });

  it("restores the inventory at the source", function (done) {
    apiRetailer.get("/DistributionCenters/" + shipment.fromId + "/inventories")
      .set("Authorization", apiRetailer.loopbackAccessToken.id)
      .set("Content-Type", "application/json")
      .expect(200)
      .end(function (err, res) {
        var updatedInventory = res.body;

        // take the initial inventory
        var productIdToInitialInventory = [];
        initialDistributionCenterInventory.forEach(function (inventory) {
          productIdToInitialInventory[inventory.productId] = inventory;
        });

        // apply the expected changes
        lineItems.forEach(function (item) {
          productIdToInitialInventory[item.productId].quantity =
            productIdToInitialInventory[item.productId].quantity + item.quantity;
        });

        // check the expected against actual
        updatedInventory.forEach(function (inventory) {
          assert.equal(productIdToInitialInventory[inventory.productId].quantity, inventory.quantity);
        });

        done(err);
      });
  });


  it("can delete the demo environment", function (done) {
    apiAnon.delete("/Demos/" + demoEnvironment.guid)
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
