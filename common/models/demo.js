// Licensed under the Apache License. See footer for details.
var helper = require("./helper.js");
var async = require("async");
var bcrypt = require("bcryptjs");
var randomstring = require("randomstring");

function makeUniqueSession(demo) {
  var SALT_WORK_FACTOR = 10;
  var salt = bcrypt.genSaltSync(SALT_WORK_FACTOR);
  return new Buffer(bcrypt.hashSync(demo.id + " " + demo.createdAt, salt)).toString('base64');
}

module.exports = function (Demo) {
  helper.hideAll(Demo);
  helper.hideRelation(Demo, "users");

  Demo.newDemo = function (data, cb) {

    var app = Demo.app;

    async.waterfall([
      // create a new demo environment
      function (callback) {
        Demo.create({
          name: data.name
        }, function (err, demo) {
          callback(err, demo);
        });
      },
      // make a unique guid for the demo environment
      function (demo, callback) {
        demo.guid = makeUniqueSession(demo);
        Demo.upsert(demo, function (err, demo) {
          callback(err, demo);
        });
      },
      // create two new users
      function (demo, callback) {
        var random = randomstring.generate(10)
        var supplyChainManager = {
          email: "chris." + random + "@acme.com",
          username: "Supply Chain Manager (" + random + ")",
          password: randomstring.generate(10),
          demoId: demo.id
        }

        var retailStoreManager = {
          email: "ruth." + random + "@acme.com",
          username: "Retail Store Manager (" + random + ")",
          password: randomstring.generate(10),
          demoId: demo.id
        }

        app.models.ERPUser.create([supplyChainManager, retailStoreManager], function (err, users) {
          if (!err) {
            supplyChainManager.id = users[0].id;
            retailStoreManager.id = users[1].id;
            demo.users = [supplyChainManager, retailStoreManager];
          }
          callback(err, demo, users);
        });
      },
      // assign roles to the users
      function (demo, users, callback) {
        Demo.app.models.ERPUser.assignRole(users[0],
          Demo.app.models.ERPUser.SUPPLY_CHAIN_MANAGER_ROLE,
          function (err, principal) {
            callback(err, demo, users)
          });
      },
      function (demo, users, callback) {
        Demo.app.models.ERPUser.assignRole(users[1],
          Demo.app.models.ERPUser.RETAIL_STORE_MANAGER_ROLE,
          function (err, principal) {
            callback(err, demo)
          });
      },
      // returns the demo, its users and the roles
      function (demo, callback) {
        Demo.findById(demo.id, {
            include: {
              relation: 'users',
              scope: {
                include: {
                  relation: 'roles'
                }
              }
            }
          },
          function (err, demo) {
            callback(err, demo);
          });
        // insert default shipments and inventories
      }
    ], function (err, result) {
      cb(err, result);
    });
  };

  Demo.remoteMethod('newDemo', {
    description: 'Creates a new Demo environment',
    http: {
      path: '/',
      verb: 'post'
    },
    accepts: [
      {
        arg: 'data',
        type: 'Demo',
        http: {
          source: 'body'
        }
      }
    ],
    returns: {
      arg: "demo",
      type: "Demo",
      root: true
    }
  });

  Demo.findByGuid = function (guid, cb) {
    Demo.findOne({
        where: {
          guid: guid
        },
        include: {
          relation: 'users',
          scope: {
            include: {
              relation: 'roles'
            }
          }
        }
      },
      function (err, demo) {
        if (!err && !demo) {
          var notFound = new Error();
          notFound.status = 404
          cb(notFound);
        } else {
          cb(err, demo);
        }
      });
  };

  Demo.remoteMethod('findByGuid', {
    description: 'Retrieves the Demo environment with the given guid',
    http: {
      path: '/findByGuid/:guid',
      verb: 'get'
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
            var notFound = new Error();
            notFound.status = 404
            callback(notFound);
          } else {
            callback(err);
          }
        });
      },
      // retrieve the user linked to this demo
      function (callback) {
        Demo.app.models.Retailer.find(function (err, retailers) {
          callback(err, retailers);
        });
      }
    ], function (err, retailers) {
      cb(err, retailers);
    });
  };

  Demo.remoteMethod('retailers', {
    description: 'Returns all retailers',
    http: {
      path: '/:guid/retailers',
      verb: 'get'
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
      type: "[Retailer]",
      root: true
    }
  });

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
            var notFound = new Error();
            notFound.status = 404
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
          }
        }, function (err, user) {
          if (user) {
            callback(null, user);
          } else {
            callback(err, null);
          }
        });
      },
      // issue a token for this user
      function (user, callback) {
        user.createAccessToken(Demo.app.models.User.DEFAULT_TTL, function (err, token) {
          callback(err, token);
        });
      }
    ], function (err, token) {
      cb(err, token);
    });
  };

  Demo.remoteMethod('loginAs', {
    description: 'Logs in as the specified user belonging to the given demo environment',
    http: {
      path: '/loginAs',
      verb: 'post'
    },
    accepts: [
      {
        arg: "guid",
        type: "string",
        required: true
      },
      {
        arg: "userId",
        type: "string",
        required: true
      }
    ],
    returns: {
      arg: "token",
      type: "AccessToken",
      root: true
    }
  });

  // Delete users associated to a demo environment
  Demo.observe("after delete", function (context, next) {
    console.log("Deleting users linked to demo", context.where.id);
    Demo.app.models.ERPUser.find({
      where: {
        demoId: context.where.id
      }
    }, function (err, users) {
      if (err) {
        next(err);
      } else if (users.length == 0) {
        next();
      } else {
        async.waterfall(users.map(function (user) {
          return function (callback) {
            console.log("Deleting user", user.email);
            user.destroy(function () {
              callback();
            });
          }
        }), function (err, result) {
          next();
        });
      }
    });
  });

  Demo.deleteByGuid = function (guid, cb) {
    console.log("Deleting demo with guid", guid);
    async.waterfall([
      // retrieve the demo
      function (callback) {
          Demo.findOne({
            where: {
              guid: guid
            }
          }, function (err, demo) {
            if (!err && !demo) {
              var notFound = new Error();
              notFound.status = 404
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
              console.log("Deleted demo", demo.id);
              callback(err, demo);
            });
      }
    ],
      function (err, result) {
        cb(err);
      });
  };

  Demo.remoteMethod('deleteByGuid', {
    description: 'Deletes the given demo environment',
    http: {
      path: '/:guid',
      verb: 'delete'
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
