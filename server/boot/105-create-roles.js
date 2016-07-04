// Licensed under the Apache License. See footer for details.
var winston = require("winston");

module.exports = function (app, next) {

  function createRoles() {
    app.models.Role.find(function (err, roles) {
      if (err) {
        winston.error("find:", err);
        next();
      } else if (roles.length == 0) {
        winston.warn("ERP roles not found. Creating...");
        app.models.Role.create([{
          name: app.models.ERPUser.SUPPLY_CHAIN_MANAGER_ROLE
            }, {
          name: app.models.ERPUser.RETAIL_STORE_MANAGER_ROLE
            }], function (err, roles) {
          if (err) {
            winston.error("create:", err);
          } else {
            winston.warn("Created", roles.length, "roles");
          }
          next(err);
        });
      } else {
        winston.info("Existing ERP roles", roles.map(function (role) {
          return role.name;
        }));
        next();
      }
    });
  }

  createRoles();

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
