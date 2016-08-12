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
  }
  if (vcapServices.hasOwnProperty("service_discovery") && process.env.VCAP_APPLICATION) {
    var tags = ["logistics-wizard", "database"];
    if(process.env.LOGISTICS_WIZARD_ENV){ //Differentiate among different instances
      tags.push(process.env.LOGISTICS_WIZARD_ENV); //"DEV", "PROD"
    }
    datasources.serviceDiscovery = {
      "serviceName": "lw-erp",
      "serviceEndpoint": JSON.parse(process.env.VCAP_APPLICATION)['application_uris'][0],
      "tags": tags,
      "credentials": {
        "token": vcapServices.service_discovery[0].credentials.auth_token,
        "url": vcapServices.service_discovery[0].credentials.url
      }
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
  if (localDatasources.hasOwnProperty("service_discovery")) {
    winston.info("Using locally defined Service Discovery parameters");
    datasources.serviceDiscovery = localDatasources.service_discovery;
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
