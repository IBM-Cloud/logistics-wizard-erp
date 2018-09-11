// Licensed under the Apache License. See footer for details.
var winston = require("winston");

// default to in-memory datasource
var datasources = {
  "db": {
    "name": "db",
    "connector": "memory"
  }
};

// then use VCAP_SERVICES
if (process.env.VCAP_SERVICES) {
  var vcapServices = JSON.parse(process.env.VCAP_SERVICES);
  if (vcapServices.hasOwnProperty("elephantsql")) {
    winston.info("Using ElephantSQL as datasource");
    // uri is "postgres://user:password@host:port/database"
    var urlObject = require('url').parse(vcapServices.elephantsql[0].credentials.uri);
    datasources.db = {
      "name": "db",
      "connector": "postgresql",
      "database": urlObject.path.substring(1),
      "host": urlObject.hostname,
      "port": urlObject.port,
      "username": urlObject.auth.substring(0, urlObject.auth.indexOf(":")),
      "password": urlObject.auth.substring(urlObject.auth.indexOf(":") + 1),
      "max": Math.max(1, vcapServices.elephantsql[0].credentials.max_conns - 2) // leave some connections for the frontend
    };
  } else if (vcapServices.hasOwnProperty("dashDB For Transactions")) {
    winston.info("Using Db2 as datasource");
    var db2Creds = vcapServices["dashDB For Transactions"][0].credentials;
    datasources.db = {
      "name": "db",
      "connector": "db2",
      "username": db2Creds.username,
      "password": db2Creds.password,
      "database": db2Creds.db,
      "hostname": db2Creds.hostname,
      "port": db2Creds.port,
      "minPoolSize": 1,
      "maxPoolSize": 3
    };
  } else if (vcapServices.hasOwnProperty("cloudantNoSQLDB")) {
    winston.info("Using Cloudant as datasource");
    var cloudantCreds = vcapServices.cloudantNoSQLDB[0].credentials;
    datasources.db = {
      "name": "db",
      "connector": "cloudant",
      "url": cloudantCreds.url,
      "database": "logistics-wizard",
      "plugin": "retry",
      "retryAttempts": 10,
      "retryTimeout": 500
    };
  }
  else if (vcapServices.hasOwnProperty("cloudantnosqldb")) {
    winston.info("Using Cloudant as datasource");
    var cloudantCreds = vcapServices.cloudantnosqldb[0].credentials;
    datasources.db = {
      "name": "db",
      "connector": "cloudant",
      "url": cloudantCreds.url,
      "database": "logistics-wizard",
      "plugin": "retry",
      "retryAttempts": 10,
      "retryTimeout": 500
    };
  }
}

// and allow override with a local datasource definition
var localDatasources = null;
try {
  localDatasources = require("./datasources.local.json");
  winston.debug("Loaded local datasources");

  if (localDatasources.hasOwnProperty("db")) {
    winston.info("Using locally defined datasource");
    datasources.db = localDatasources.db;
  }
} catch (e) {
  winston.error(e);
}

winston.info("Datasource uses connector:", datasources.db.connector);

module.exports = datasources;

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
