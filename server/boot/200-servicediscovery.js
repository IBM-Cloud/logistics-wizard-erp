// Licensed under the Apache License. See footer for details.
var winston = require("winston");

var ServicePublisher = require('../../lib/service_discovery').ServicePublisher;

module.exports = function (app) {
  
  //Register this applications url to the Service Discovery service
  if (app.dataSources.serviceDiscovery) {

    // Register with the service discovery once the REST API is mounted
    app.once("started", function () {
      var serviceDiscoveryDatasource = app.dataSources.serviceDiscovery.settings;

      winston.info("Registering", serviceDiscoveryDatasource.serviceEndpoint,
        "under the name", serviceDiscoveryDatasource.serviceName);

      var publisher = new ServicePublisher(true, serviceDiscoveryDatasource.credentials);
      publisher.publishService(serviceDiscoveryDatasource.serviceName,
        serviceDiscoveryDatasource.serviceEndpoint, {
          "tags": serviceDiscoveryDatasource.tags || ["logistics-wizard", "database"],
          "TTL": serviceDiscoveryDatasource.ttl || 300
        });

      publisher.on('registered', function (serviceName) {
        winston.info(serviceName + " successfully registered with Service Discovery!");
        app.emit("servicediscovery.registered");
      });

      publisher.on('error', function (serverResponse) {
        winston.error("Server responded with: ", serverResponse);
        app.emit("servicediscovery.error");
      });

      publisher.on('expired', function (serviceName) {
        winston.error(serviceName + " expired from Service Discovery registry");
        app.emit("servicediscovery.expired");
      });
    });
    
  } else {
    winston.info("Service Discovery not found, skipping registration")
  }
}

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
