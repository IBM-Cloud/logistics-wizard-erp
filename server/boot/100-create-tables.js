// Licensed under the Apache License. See footer for details.
var winston = require("winston");

/**
 * Initializes the database, creating missing tables, adding/removing colums.
 */
module.exports = function (server, next) {

  winston.info("Checking for tables to create/update...");

  // this is our main datasource
  var ds = server.dataSources.db;
  
  // collect all tables persisted in this datasource
  var erpTables = Object.keys(server.models).filter(function (model) {
    return server.models[model].autoAttach == "db";
  });

  // and create or update the tables
  ds.autoupdate(erpTables, function (er) {
    if (er) {
      winston.error(er);
    } else {
      winston.info("ERP service tables created/updated.");
    }
    next();
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
