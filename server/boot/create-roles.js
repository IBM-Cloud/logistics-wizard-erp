// Licensed under the Apache License. See footer for details.
module.exports = function (app) {

  function createRoles() {
    app.models.Role.find(function (err, roles) {
      if (err) {
        // Database connectors like CouchDB, Cloudant set up indexes during model autoupdate
        // but there is not event emitted that would allow us to register a listener to create
        // the roles. As we need to wait for those to be created, we check here the error and retry
        if (err.scope == "couch" && err.error == "no_usable_index") {
          console.log("Database is not ready, retrying...");
          process.nextTick(function () {
            createRoles();
          });
        } else {
          console.log("find:", err);
        }
      } else if (roles.length == 0) {
        console.log("ERP roles not found. Creating...");
        app.models.Role.create([{
          name: app.models.ERPUser.SUPPLY_CHAIN_MANAGER_ROLE
            }, {
          name: app.models.ERPUser.RETAIL_STORE_MANAGER_ROLE
            }], function (err, roles) {
          if (err) {
            console.log("create:", err);
          } else {
            console.log("Created", roles.length, "roles");
          }
        });
      } else {
        console.log("Existing ERP roles", roles.map(function (role) {
          return role.name;
        }));
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
