// Licensed under the Apache License. See footer for details.
var winston = require("winston");
var helper = require("./helper.js");
var async = require("async");
var randomstring = require("randomstring");
var fs = require("fs");

function makeUniqueSession(demo) {
  return demo.id + randomstring.generate({
    length: 3,
    charset: 'numeric'
  });
}

module.exports = function (Demo) {

  // There are the models that are indexed per "demoId"
  // They all have the "isolated" mixin in their JSON definition
  // together with a "belongsTo" directed to the Demo object.
  // They are listed here in ascending dependency order.
  Demo.ISOLATED_MODELS = [ //
    Demo.definition.modelBuilder.models.Retailer,
    Demo.definition.modelBuilder.models.Inventory,
    Demo.definition.modelBuilder.models.Shipment,
    Demo.definition.modelBuilder.models.LineItem
  ];

  // There are the models shared by all demo environments.
  // They can not be updated.
  Demo.STATIC_MODELS = [
    Demo.definition.modelBuilder.models.Supplier,
    Demo.definition.modelBuilder.models.Product,
    Demo.definition.modelBuilder.models.DistributionCenter
  ];

  helper.hideAll(Demo);
  helper.hideRelation(Demo, "users");

  /**
   * Injects data from the "seed" directory for the given model.
   * If demoId is not null, then all ids read from the seed data and suffixed with the demoId.
   */
  function seed(model, demoId, seedIdtoRealIds, callback) {
    winston.info("Seeding " + model.definition.name);

    var where = {};
    if (demoId) {
      where.demoId = demoId;
    }

    model.count(where, function (err, count) {
      if (err) {
        winston.error(err);
        callback(err);
      } else if (count == 0) {
        var objects = JSON.parse(fs.readFileSync("./seed/" + model.definition.name.toLowerCase() + ".json"));
        // keep track of the IDs specified in the seed file
        var objectIds = [];

        // inject the demoId if needed
        if (demoId) {
          objects.forEach(function (object) {
            object.demoId = demoId;
            objectIds.push(object.id);

            if (seedIdtoRealIds) {
              if (model.modelName == "Shipment") {
                object.toId = seedIdtoRealIds["Retailer-" + object.toId];
              }
              if (model.modelName == "LineItem") {
                object.shipmentId = seedIdtoRealIds["Shipment-" + object.shipmentId];
              }
              if (model.modelName == "Inventory" && object.locationType == "Retailer") {
                object.locationId = seedIdtoRealIds["Retailer-" + object.locationId];
              }
            }

            delete object.id;
          });
        }
        winston.info("Injecting", objects.length, model.definition.name);
        model.create(objects, function (err, records) {
          if (err) {
            winston.error("Failed to create", model.definition.name, err);
          } else {
            if (seedIdtoRealIds) {
              // record a mapping between the ID of our objects in the seed file
              // and the actual ID they got in Loopback so we can resolve references later on
              objectIds.forEach(function (objectId, index) {
                if (objectId) {
                  seedIdtoRealIds[model.modelName + "-" + objectId] = records[index].id;
                }
              });
            }
            winston.info("Created", records.length, model.definition.name);
          }
          callback(null);
        });
      } else {
        winston.warn("There are already", count, model.definition.name);
        callback(null);
      }
    });
  }

  // Seed the database with data for static models
  Demo.seed = function (cb) {
    winston.info("Seeding...");
    async.waterfall(Demo.STATIC_MODELS.map(function (model) {
        return function (callback) {
          seed(model, null, null, callback);
        };
      }),
      function (err, result) {
        if (err) {
          winston.error(err);
        } else {
          winston.info("Inject complete");
        }
        cb(err);
      });
  };

  /**
   * Create a new demo environment, seeding the environment with data
   */
  Demo.newDemo = function (cb) {

    var app = Demo.app;

    async.waterfall([
      // create a new demo environment
      function (callback) {
        winston.info("Creating new Demo instance");
        Demo.create({}, function (err, demo) {
          callback(err, demo);
        });
      },
      // make a unique guid for the demo environment
      function (demo, callback) {
        winston.info("Generating guid for Demo");
        demo.guid = makeUniqueSession(demo);
        demo.save(function (err, demo) {
          callback(err, demo);
        });
      },
      // insert default data, indexed on the demo.id
      function (demo, callback) {
        winston.info("Inserting demo data");
        var seedIdtoRealIds = {};
        async.waterfall(Demo.ISOLATED_MODELS.map(function (model) {
            return function (seedCallback) {
              seed(model, demo.id, seedIdtoRealIds, seedCallback);
            };
          }),
          function (err, result) {
            if (err) {
              winston.error(err);
            } else {
              winston.info("Inject complete");
            }
            callback(err, demo);
          });
      },
      // create all inventory lines
      function (demo, callback) {
        Demo.app.models.Inventory.initializeAllInventories(demo.id, function (err) {
          callback(err, demo);
        });
      },
      // create the supply chain manager
      function (demo, callback) {
        winston.info("Creating Supply Chain Manager user");
        var random = randomstring.generate(10);
        var supplyChainManager = {
          email: "chris." + random + "@acme.com",
          username: "Supply Chain Manager (" + random + ")",
          password: randomstring.generate(10),
          demoId: demo.id
        };

        app.models.ERPUser.create(supplyChainManager, function (err, user) {
          callback(err, demo, user);
        });
      },
      // assign roles to the users
      function (demo, user, callback) {
        winston.info("Assigning role to Supply Chain Manager");
        Demo.app.models.ERPUser.assignRole(user,
          Demo.app.models.ERPUser.SUPPLY_CHAIN_MANAGER_ROLE,
          function (err, principal) {
            callback(err, demo);
          });
      },
      // returns the demo, its users and the roles
      function (demo, callback) {
        winston.info("Retrieving Demo and its users");
        Demo.findById(demo.id, {
            include: {
              relation: "users",
              scope: {
                include: {
                  relation: "roles"
                }
              }
            }
          },
          function (err, demo) {
            callback(err, demo);
          });
      }
    ], function (err, result) {
      cb(err, result);
    });
  };

  Demo.remoteMethod("newDemo", {
    description: "Creates a new Demo environment",
    http: {
      path: "/",
      verb: "post"
    },
    returns: {
      arg: "demo",
      type: "Demo",
      root: true
    }
  });

  /**
   * Returns the demo with the given GUID.
   */
  Demo.findByGuid = function (guid, cb) {
    Demo.findOne({
        where: {
          guid: guid
        },
        include: {
          relation: "users",
          scope: {
            include: {
              relation: "roles"
            }
          }
        }
      },
      function (err, demo) {
        if (!err && !demo) {
          var notFound = new Error("No Demo with this guid");
          notFound.status = 404;
          cb(notFound);
        } else {
          cb(err, demo);
        }
      });
  };

  Demo.remoteMethod("findByGuid", {
    description: "Retrieves the Demo environment with the given guid",
    http: {
      path: "/findByGuid/:guid",
      verb: "get"
    },
    accepts: [
      {
        arg: "guid",
        type: "string",
        required: true,
        http: {
          source: "path"
        }
      }
    ],
    returns: {
      arg: "demo",
      type: "Demo",
      root: true
    }
  });

  /**
   * Returns all retailers in the given demo environment.
   */
  Demo.retailers = function (guid, cb) {
    async.waterfall([
      // retrieve the demo
      function (callback) {
        Demo.findOne({
          where: {
            guid: guid
          }
        }, function (err, demo) {
          if (!err && !demo) {
            var notFound = new Error("No Demo with this guid");
            notFound.status = 404;
            callback(notFound);
          } else {
            callback(err, demo);
          }
        });
      },
      // retrieve the retailers linked to this demo
      function (demo, callback) {
        Demo.app.models.Retailer.find({
          where: {
            demoId: demo.id
          }
        }, function (err, retailers) {
          callback(err, retailers);
        });
      }
    ], function (err, retailers) {
      cb(err, retailers);
    });
  };

  Demo.remoteMethod("retailers", {
    description: "Returns all retailers",
    http: {
      path: "/:guid/retailers",
      verb: "get"
    },
    accepts: [
      {
        arg: "guid",
        type: "string",
        required: true,
        http: {
          source: "path"
        }
      }
    ],
    returns: {
      arg: "retailers",
      type: ["Retailer"],
      root: true
    }
  });

  /**
   * Returns a loopback token for the given user in the specified demo environment.
   */
  Demo.loginAs = function (guid, userId, cb) {
    async.waterfall([
      // retrieve the demo
      function (callback) {
        Demo.findOne({
          where: {
            guid: guid
          }
        }, function (err, demo) {
          if (!err && !demo) {
            var notFound = new Error("No Demo with this guid");
            notFound.status = 404;
            callback(notFound);
          } else {
            callback(err, demo);
          }
        });
      },
      // retrieve the user linked to this demo
      function (demo, callback) {
        Demo.app.models.ERPUser.findOne({
          where: {
            id: userId,
            demoId: demo.id
          },
          include: {
            relation: "roles"
          }
        }, function (err, user) {
          if (!err && !user) {
            var userNotFound = new Error("No user with this id");
            userNotFound.status = 404;
            callback(userNotFound);
          } else {
            callback(err, user);
          }
        });
      },
      // issue a token for this user
      function (user, callback) {
        user.createAccessToken(Demo.app.models.User.DEFAULT_TTL, function (err, token) {
          callback(err, {
            token: token,
            user: user
          });
        });
      }
    ], function (err, result) {
      cb(err, result);
    });
  };

  Demo.remoteMethod("loginAs", {
    description: "Logs in as the specified user belonging to the given demo environment",
    http: {
      path: "/:guid/loginAs",
      verb: "post"
    },
    accepts: [
      {
        arg: "guid",
        type: "string",
        required: true,
        http: {
          source: "path"
        }
      },
      {
        arg: "userId",
        type: "string",
        required: true
      }
    ],
    returns: {
      arg: "result",
      type: "LoginResponse",
      root: true
    }
  });

  /**
   * Reacts to delete of a demo environment and deletes the associated data and users.
   */
  Demo.observe("after delete", function (context, next) {
    if (context.where.id) {
      // delete all objects linked to the demo
      var tasks = [];
      Demo.ISOLATED_MODELS.forEach(function (model) {
        tasks.push(function (callback) {
          winston.info("Deleting", model.modelName, "linked to demo", context.where.id);
          model.destroyAll({
            demoId: context.where.id
          }, function (err, info) {
            if (err) {
              winston.error(err);
            }
            callback(null);
          });
        });
      });

      // and its users
      tasks.push(function (callback) {
        winston.info("Deleting users linked to demo", context.where.id);
        Demo.app.models.ERPUser.find({
          where: {
            demoId: context.where.id
          }
        }, function (err, users) {
          if (err || users.length == 0) {
            callback();
          } else {
            async.waterfall(users.map(function (user) {
              return function (callback) {
                winston.info("Deleting user", user.email);
                user.destroy(function () {
                  callback();
                });
              };
            }), function (err, result) {
              callback();
            });
          }
        });
      });

      async.waterfall(tasks, function (err, result) {
        next();
      });

    } else {
      next();
    }
  });

  /**
   * Deletes the demo environment with the given guid
   */
  Demo.deleteByGuid = function (guid, cb) {
    winston.info("Deleting demo with guid", guid);
    async.waterfall([
      // retrieve the demo
      function (callback) {
          Demo.findOne({
            where: {
              guid: guid
            }
          }, function (err, demo) {
            if (!err && !demo) {
              var notFound = new Error("No Demo with this guid");
              notFound.status = 404;
              callback(notFound);
            } else {
              callback(err, demo);
            }
          });
      },
      // delete the demo
      function (demo, callback) {
          Demo.destroyById(demo.id,
            function (err, info) {
              winston.info("Deleted demo", demo.id);
              callback(err, demo);
            });
      }
    ],
      function (err, result) {
        cb(err);
      });
  };

  Demo.remoteMethod("deleteByGuid", {
    description: "Deletes the given demo environment",
    http: {
      path: "/:guid",
      verb: "delete"
    },
    accepts: [
      {
        arg: "guid",
        type: "string",
        required: true,
        http: {
          source: "path"
        }
      }
    ]
  });

  /**
   * Creates a new user in the given demo environment making this user the manager of the given store.
   */
  Demo.createUserByGuid = function (guid, retailerId, cb) {
    winston.info("Adding new Retail Store Manager to demo with guid", guid, retailerId);

    var app = Demo.app;

    async.waterfall([
      // retrieve the demo
      function (callback) {
          Demo.findOne({
            where: {
              guid: guid
            }
          }, function (err, demo) {
            if (!err && !demo) {
              var notFound = new Error("No Demo with this guid");
              notFound.status = 404;
              callback(notFound);
            } else {
              callback(err, demo);
            }
          });
      },
      // retrieve the store
      function (demo, callback) {
          app.models.Retailer.findOne({
            where: {
              id: retailerId,
              demoId: demo.id
            }
          }, function (err, retailer) {
            if (!err && !retailer) {
              var notFound = new Error("No retailer with this id");
              notFound.status = 404;
              callback(notFound);
            } else if (retailer && retailer.managerId) {
              var alreadyAssigned = new Error("A manager is already assigned to this retail store");
              alreadyAssigned.status = 400;
              callback(alreadyAssigned);
            } else {
              callback(err, demo, retailer);
            }
          });
      },
      // create the user
      function (demo, retailer, callback) {
          var random = randomstring.generate(10);
          var retailStoreManager = {
            email: "ruth." + random + "@acme.com",
            username: "Retail Store Manager (" + random + ")",
            password: randomstring.generate(10),
            demoId: demo.id
          };

          app.models.ERPUser.create(retailStoreManager, function (err, user) {
            callback(err, demo, retailer, user);
          });
      },
      // assign Retail manager role to the user
      function (demo, retailer, user, callback) {
          Demo.app.models.ERPUser.assignRole(user,
            Demo.app.models.ERPUser.RETAIL_STORE_MANAGER_ROLE,
            function (err, principal) {
              callback(err, retailer, user);
            });
      },
      // assign the user as manager for the store
      function (retailer, user, callback) {
          retailer.managerId = user.id;
          retailer.save(function (err, updated) {
            callback(err, user);
          });
      }
    ],
      function (err, user) {
        cb(err, user);
      });
  };

  Demo.remoteMethod("createUserByGuid", {
    description: "Adds a new Retail Store manager to the given demo environment",
    http: {
      path: "/:guid/createUser",
      verb: "post"
    },
    accepts: [
      {
        arg: "guid",
        type: "string",
        required: true,
        http: {
          source: "path"
        }
      },
      {
        arg: "retailerId",
        type: "string",
        required: true
      }
    ],
    returns: {
      arg: "user",
      type: "ERPUser",
      root: true
    }
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
