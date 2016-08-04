// Licensed under the Apache License. See footer for details.
var winston = require("winston");
var async = require("async");
var helper = require("./helper.js");

module.exports = function (ErpUser) {

  // ERP roles - they get initialized in server/boot/create-roles.js
  ErpUser.SUPPLY_CHAIN_MANAGER_ROLE = "supplychainmanager";
  ErpUser.RETAIL_STORE_MANAGER_ROLE = "retailstoremanager";

  // remove all remote API methods, leaving only login/logout and token management
  helper.readOnly(ErpUser);
  ErpUser.disableRemoteMethod("find", true);
  ErpUser.disableRemoteMethod("findById", true);
  ErpUser.disableRemoteMethod("confirm", true);
  ErpUser.disableRemoteMethod("resetPassword", true);
  ErpUser.disableRemoteMethod("login", true);

  // hide the link back to the demo
  helper.hideRelation(ErpUser, "demo");
  helper.hideRelation(ErpUser, "accessTokens");
  helper.readOnlyRelation(ErpUser, "roles");

  // callback(err, principal)
  ErpUser.assignRole = function (user, roleName, callback) {
    ErpUser.app.models.Role.find({
      where: {
        name: roleName
      }
    }, function (err, roles) {
      roles[0].principals.create({
        principalType: ErpUser.app.models.RoleMapping.USER,
        principalId: user.id
      }, function (err, principal) {
        callback(err, principal);
      });
    });
  };

  // Delete access tokens for the given user
  ErpUser.observe("after delete", function (ctx, next) {
    if (ctx.where.id) {
      winston.info("Deleting access tokens and roles for user", ctx.where.id);
      async.waterfall([
        // delete its token
        function (callback) {
          ErpUser.app.models.AccessToken.destroyAll({
            userId: ctx.where.id
          }, function (err, info) {
            callback();
          });
        },
        // delete its roles
        function (callback) {
          ErpUser.app.models.RoleMapping.destroyAll({
            principalType: ErpUser.app.models.RoleMapping.USER,
            principalId: ctx.where.id
          }, function (err, info) {
            callback();
          });
        },
      ], function (err, result) {
        next();
      });
    } else {
      next();
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
