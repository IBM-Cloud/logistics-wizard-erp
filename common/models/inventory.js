// Licensed under the Apache License. See footer for details.
var helper = require("./helper.js");
var winston = require("winston");
var async = require("async");
var _ = require("underscore");

module.exports = function (Inventory) {
  helper.simpleCrud(Inventory);
  helper.hideRelation(Inventory, "demo");

  /**
   * Ensures we have inventory data for all distribution centers,
   * all retailers, all products within this demo environment.
   */
  Inventory.initializeAllInventories = function(demoId, cb) {
    winston.info("Initializing all inventory data...");

    async.waterfall([
      // get all products
      function (callback) {
        Inventory.app.models.Product.find(function (err, products) {
          callback(err, products);
        });
      },
      // get all distribution centers
      function (products, callback) {
        Inventory.app.models.DistributionCenter.find(function (err, distributionCenters) {
          callback(err, products, distributionCenters);
        });
      },
      // get all retailers for this demo
      function (products, distributionCenters, callback) {
        Inventory.app.models.Retailer.find({
          where: {
            demoId: demoId
          }
        }, function (err, retailers) {
          callback(err, products, distributionCenters, retailers);
        });
      },
      // get all existing inventory lines
      function (products, distributionCenters, retailers, callback) {
        Inventory.find({
          where: {
            demoId: demoId
          }
        }, function (err, inventories) {
          callback(err, products, distributionCenters, retailers, inventories);
        });
      },
      // create all missing inventory lines
      function (products, distributionCenters, retailers, inventories, callback) {
        var createInventoryLines = [];
        products.forEach(function (product) {          
          distributionCenters.forEach(function (dc) {
            if (!_.findWhere(inventories, {
                productId: product.id,
                locationId: dc.id,
                locationType: "DistributionCenter",
                demoId: demoId
              })) {
              createInventoryLines.push({
                productId: product.id,
                quantity: 100,
                locationId: dc.id,
                locationType: "DistributionCenter",
                demoId: demoId
              });
            }
          });
          retailers.forEach(function (retail) {
            if (!_.findWhere(inventories, {
                productId: product.id,
                locationId: retail.id,
                locationType: "Retailer",
                demoId: demoId
              })) {
              createInventoryLines.push({
                productId: product.id,
                quantity: 0,
                locationId: retail.id,
                locationType: "Retailer",
                demoId: demoId
              });
            }
          });
        });

        winston.info("Creating", createInventoryLines.length, "inventory lines");
        Inventory.create(createInventoryLines, function (err, lines) {
          callback(err);
        });
      }
    ], function (err, result) {
      cb(err);
    });
  }

};
