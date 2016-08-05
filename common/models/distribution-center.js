// Licensed under the Apache License. See footer for details.
var helper = require("./helper.js");
var async = require("async");

module.exports = function (DistributionCenter) {
  helper.readOnly(DistributionCenter);
  helper.hideRelation(DistributionCenter, "dcAddress");
  helper.hideRelation(DistributionCenter, "dcContact");
  helper.readOnlyRelation(DistributionCenter, "products");
  helper.hideRelation(DistributionCenter, "inventories");

  DistributionCenter.getInventories = function (token, dcId, cb) {
    async.waterfall([
      // find the user
      function (callback) {
          DistributionCenter.app.models.ERPUser.findById(token.userId, function (err, user) {
            callback(err, user);
          });
      },
      function(user, callback){
        DistributionCenter.findById(dcId, function (err, distributionCenter) {
          if(!distributionCenter){
            var notFound = new Error("Inventory does not exist");
            notFound.status = 404;
            callback(notFound);
            return;
          }
          callback(err, user);
        });
      },
      // find the inventories
      function (user, callback) {
          DistributionCenter.app.models.Inventory.find({
              where: {
                locationId: dcId,
                locationType: "DistributionCenter",
                demoId: user.demoId
              }
            },
            function (err, inventories) {
              callback(err, inventories);
            });
      }
      ],
      function (err, inventories) {
        cb(err, inventories);
      });
  }

  DistributionCenter.remoteMethod("getInventories", {
    description: "Gets inventories at the given distribution center.",
    http: {
      verb: "GET",
      path: "/:id/inventories"
    },
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
    ],
    returns: {
      arg: "data",
      type: ["Inventory"],
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
