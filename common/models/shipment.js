// Licensed under the Apache License. See footer for details.
var helper = require("./helper.js");
var winston = require("winston");
var async = require("async");

module.exports = function (Shipment) {

  Shipment.validate("status", function (err) {
    if (this.status != "NEW" &&
      this.status != "APPROVED" &&
      this.status != "IN_TRANSIT" &&
      this.status != "DELIVERED") err();
  }, {
    message: "Invalid status"
  });

  // keep only GET and POST
  Shipment.disableRemoteMethod("upsert", true);
  Shipment.disableRemoteMethod("deleteById", true);
  Shipment.disableRemoteMethod("updateAll", true);
  Shipment.disableRemoteMethod("updateAttributes", false);
  Shipment.disableRemoteMethod("createChangeStream", true);
  Shipment.disableRemoteMethod("count", true);
  Shipment.disableRemoteMethod("findOne", true);
  Shipment.disableRemoteMethod("exists", true);
  Shipment.disableRemoteMethod("replaceOrCreate", true);
  Shipment.disableRemoteMethod("upsertWithWhere", true);
  Shipment.disableRemoteMethod("replaceById", true);

  // keep only GET and GET :id
  Shipment.disableRemoteMethod("__create__items", false);
  Shipment.disableRemoteMethod("__update__items", false);
  Shipment.disableRemoteMethod("__destroy__items", false);
  Shipment.disableRemoteMethod("__delete__items", false);
  Shipment.disableRemoteMethod("__updateById__items", false);
  Shipment.disableRemoteMethod("__destroyById__items", false);
  Shipment.disableRemoteMethod("__count__items", false);
  Shipment.disableRemoteMethod("__findById__items", false);
  Shipment.disableRemoteMethod("__link__items", false);
  Shipment.disableRemoteMethod("__unlink__items", false);
  Shipment.disableRemoteMethod("__exists__items", false);

  helper.hideRelation(Shipment, "address");
  helper.hideRelation(Shipment, "demo");

  /**
   * Increases or decreases stock at a location.
   *
   * tx - the transaction to use for all database calls
   * shipment - the shipment with items to load from
   * locationId - the ID of the location to update
   * locationType - one of DistributionCenter or Retailer
   * operation - one of +1 or -1 whether you want to add or remove stock from the inventory
   */
  function updateInventory(tx, shipment, locationId, locationType, operation, cb) {
    winston.info("Updating inventory for", locationType, locationId);

    var tasks = [
      // get line items in the shipment
      function (callback) {
        winston.info("Retrieving items in shipment", shipment.id);
        shipment.items({
          transaction: tx
        }, function (err, items) {
          callback(err, items);
        });
      },
      // get inventory lines for the products in the shipment for the source
      function (items, callback) {
        winston.info("Retrieving inventory for", items.length, "line items");
        var productIds = items.map(function (item) {
          return item.productId;
        });

        Shipment.app.models.Inventory.find({
          where: {
            demoId: shipment.demoId,
            locationId: locationId,
            locationType: locationType,
            productId: {
              inq: productIds
            }
          }
        }, {
          transaction: tx
        }, function (err, inventories) {
          callback(err, items, inventories);
        });
      },
      // update inventory lines with line item quantity
      // there might be multiple line items for the same product in a shipment
      function (items, inventories, callback) {
        var productIdToInventory = [];
        inventories.forEach(function (inventory) {
          productIdToInventory[inventory.productId] = inventory;
        });

        items.forEach(function (item) {
          var inventory = productIdToInventory[item.productId];
          var newQuantity = inventory.quantity + operation * item.quantity;
          winston.info("Updating inventory for product", item.productId, "from",
            inventory.quantity, "to", newQuantity);
          inventory.quantity = newQuantity;

          // dynamically add new tasks to persist the inventory data
          // at the end of this task list, async will run them
          tasks.push(function (callback) {
            winston.info("Saving inventory", inventory);
            inventory.save({
              transaction: tx
            }, function (err, updateInventory) {
              callback(err);
            });
          });
        });

        callback(null);
      },
      // and a dummy task to ensure we can dynamically add other tasks
      function (callback) {
        winston.info("Going to save inventories...");
        callback(null);
      }
    ];

    async.waterfall(tasks, function (err, result) {
      cb(err);
    });
  }

  /**
   * Handles state transition for a shipment.
   *
   * tx - the transaction to use for all database calls
   * shipment - the shipment to update
   * shipmentUpdate - the new state to apply
   */
  function applyShipmentUpdate(tx, shipment, shipmentUpdate, cb) {
    switch (shipmentUpdate.status) {
      case "APPROVED":
        if (shipment.status != "NEW") {
          var invalidStatus = new Error("Shipment is not NEW: " + shipment.status);
          invalidStatus.status = 400;
          return cb(invalidStatus);
        } else {
          shipment.status = "APPROVED";
        }
        break;
      case "IN_TRANSIT":
        if (shipment.status != "IN_TRANSIT" && shipment.status != "APPROVED") {
          var invalidStatus = new Error("Shipment has not been approved or is not in transit");
          invalidStatus.status = 400;
          return cb(invalidStatus);
        } else {
          shipment.status = "IN_TRANSIT";
          shipment.estimatedTimeOfArrival = shipmentUpdate.estimatedTimeOfArrival;
          shipment.currentLocation = shipmentUpdate.currentLocation;
        }
        break;
      case "DELIVERED":
        if (shipment.status != "IN_TRANSIT") {
          var invalidStatus = new Error("Shipment is not in transit");
          invalidStatus.status = 400;
          return cb(invalidStatus);
        } else {
          shipment.status = "DELIVERED";
          shipment.currentLocation = shipmentUpdate.currentLocation;
        }
        break;
      default:
        var invalidStatus = new Error("Invalid status: " + shipmentUpdate.status);
        invalidStatus.status = 400;
        return cb(invalidStatus);
    }

    // persist the new state and update the inventory
    shipment.save({
      transaction: tx
    }, function (err, updatedShipment) {
      if (err) {
        cb(err);
      } else if (shipment.status == "APPROVED") { // decrease stock at source
        updateInventory(tx, shipment, shipment.fromId, "DistributionCenter", -1, function (err) {
          cb(err, updatedShipment);
        });
      } else if (shipment.status == "DELIVERED") { // increase stock at destination
        updateInventory(tx, shipment, shipment.toId, "Retailer", +1, function (err) {
          cb(err, updatedShipment);
        });
      } else {
        cb(err, updatedShipment);
      }
    });
  };

  Shipment.updateShipmentStatus = function (token, shipmentId, shipmentUpdate, cb) {
    winston.info("User", token.userId, "is updating shipment", shipmentId);

    async.waterfall([
      // start a transaction
      function (callback) {
          helper.beginTransaction(Shipment, function (err, tx) {
            callback(err, tx);
          });
      },
      // find the user
      function (tx, callback) {
          Shipment.app.models.ERPUser.findById(token.userId, {
            transaction: tx
          }, function (err, user) {
            callback(err, tx, user);
          });
      },
      // find the shipment
      function (tx, user, callback) {
          Shipment.findOne({
              where: {
                id: shipmentId,
                demoId: user.demoId
              }
            }, {
              transaction: tx
            },
            function (err, shipment) {
              if (err) {
                callback(err, tx);
              } else if (!shipment) {
                var notFound = new Error("Shipment does not exist");
                notFound.status = 404;
                callback(notFound, tx);
              } else {
                callback(null, tx, shipment);
              }
            });
        },
        // apply the update
        function (tx, shipment, callback) {
          applyShipmentUpdate(tx, shipment, shipmentUpdate, function (err, updatedShipment) {
            callback(err, tx, updatedShipment);
          });
        },
        // commit the transaction
        function (tx, updatedShipment, callback) {
          tx.commit(function (err) {
            callback(err, tx, updatedShipment);
          });
        }
      ],
      function (err, tx, updatedShipment) {
        if (tx && err) {
          tx.rollback(function () {
            cb(err);
          });
        } else {
          cb(err, updatedShipment);
        }
      });
  }

  Shipment.remoteMethod("updateShipmentStatus", {
    description: "Updates the status of a shipment as it moves along the supply-chain.",
    http: {
      verb: "PUT",
      path: "/:id"
    },
    accessType: 'WRITE',
    accepts: [
      {
        arg: "token",
        type: "AccessToken",
        http: function (ctx) {
          return ctx.req.accessToken;
        }
      },
      {
        arg: "id",
        type: "number",
        required: true,
        http: {
          source: "path"
        }
      },
      {
        arg: "data",
        type: "Shipment",
        description: "The update to apply to the Shipment. Only status, estimatedTimeOfArrival and currentLocation can be updated",
        required: true,
        http: {
          source: "body"
        }
      }
    ],
    returns: {
      arg: "data",
      type: "Shipment",
      root: true
    }
  });

  /**
   * Adds items to a shipment.
   * Items can be added only if the shipment is still NEW.
   */
  Shipment.addItems = function (token, shipmentId, items, cb) {
    winston.info("User", token.userId, "is adding", items.length, "items to shipment", shipmentId);

    async.waterfall([
      // start a transaction
      function (callback) {
        helper.beginTransaction(Shipment, function (err, tx) {
          callback(err, tx);
        });
      },
      // find the user
      function (tx, callback) {
        Shipment.app.models.ERPUser.findById(token.userId, {
          transaction: tx
        }, function (err, user) {
          callback(err, tx, user);
        });
      },
      // find the shipment
      function (tx, user, callback) {
        Shipment.findOne({
            where: {
              id: shipmentId,
              demoId: user.demoId
            }
          }, {
            transaction: tx
          },
          function (err, shipment) {
            if (err) {
              callback(err, tx);
            } else if (!shipment) {
              var notFound = new Error("Shipment does not exist");
              notFound.status = 404;
              callback(notFound, tx);
            } else if (shipment.status != "NEW") {
              var invalidStatus = new Error("Shipment can no longer be modified");
              invalidStatus.status = 400;
              callback(invalidStatus, tx);
            } else {
              callback(null, tx, user, shipment);
            }
          });
        },
      // add items
      function (tx, user, shipment, callback) {
        // link these items to the demo
        items.forEach(function (item) {
          item.demoId = user.demoId;
        });

        shipment.items.create(items, {
          transaction: tx
        }, function (err, persistedItems) {
          callback(err, tx, persistedItems);
        });
      },
      // commit transaction
      function (tx, items, callback) {
        tx.commit(function (err) {
          callback(err, tx, items);
        });
      }
    ], function (err, tx, items) {
      if (tx && err) {
        tx.rollback(function () {
          cb(err);
        });
      } else {
        cb(err, items);
      }
    });
  }

  Shipment.remoteMethod("addItems", {
    description: "Adds new line items to a shipment",
    http: {
      verb: "POST",
      path: "/:id/items"
    },
    accessType: 'WRITE',
    accepts: [
      {
        arg: "token",
        type: "AccessToken",
        http: function (ctx) {
          return ctx.req.accessToken;
        }
      },
      {
        arg: "id",
        type: "number",
        required: true,
        http: {
          source: "path"
        }
      },
      {
        arg: "data",
        type: ["LineItem"],
        required: true,
        http: {
          source: 'body'
        }
    }],
    returns: {
      arg: "data",
      type: ["LineItem"],
      root: true
    }
  });

  Shipment.cancelShipment = function (token, shipmentId, cb) {
    winston.info("User", token.userId, "is canceling shipment", shipmentId);

    async.waterfall([
      // start a transaction
      function (callback) {
          helper.beginTransaction(Shipment, function (err, tx) {
            callback(err, tx);
          });
      },
      // find the user
      function (tx, callback) {
          Shipment.app.models.ERPUser.findById(token.userId, {
            transaction: tx
          }, function (err, user) {
            callback(err, tx, user);
          });
      },
      // find the shipment
      function (tx, user, callback) {
          Shipment.findOne({
              where: {
                id: shipmentId,
                demoId: user.demoId
              }
            }, {
              transaction: tx
            },
            function (err, shipment) {
              if (err) {
                callback(err, tx);
              } else if (!shipment) {
                var notFound = new Error("Shipment does not exist");
                notFound.status = 404;
                callback(notFound, tx);
              } else {
                callback(null, tx, shipment);
              }
            });
        },
      // update inventory if shipment was approved or in transit
      function (tx, shipment, callback) {
          if (shipment.status == "APPROVED" || shipment.status == "IN_TRANSIT") {
            winston.info("Restoring inventory to source for shipment", shipment.id);
            updateInventory(tx, shipment, shipment.fromId, "DistributionCenter", +1, function (err) {
              if (err) {
                callback(err, tx);
              } else {
                callback(null, tx, shipment);
              }
            });
          } else {
            callback(null, tx, shipment);
          }
      },
      // destroy shipment
      function (tx, shipment, callback) {
          shipment.destroy({
            transaction: tx
          }, function (err) {
            callback(err, tx);
          });
      },
      // commit transaction
      function (tx, callback) {
          tx.commit(function (err) {
            callback(err);
          });
        }
      ],
      function (err, tx) {
        if (tx && err) {
          tx.rollback(function () {
            cb(err);
          });
        } else {
          cb(err);
        }
      });
  };

  Shipment.remoteMethod("cancelShipment", {
    description: "Cancels the given shipment.",
    http: {
      verb: "DELETE",
      path: "/:id"
    },
    accessType: 'WRITE',
    accepts: [
      {
        arg: "token",
        type: "AccessToken",
        http: function (ctx) {
          return ctx.req.accessToken;
        }
      },
      {
        arg: "id",
        type: "number",
        required: true,
        http: {
          source: "path"
        }
      }
    ]
  });

};
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
