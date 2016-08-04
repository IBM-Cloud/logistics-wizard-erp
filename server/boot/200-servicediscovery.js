// Licensed under the Apache License. See footer for details.
var winston = require("winston");

var servicediscovery = require("../serviceDiscovery")

module.exports = function (app) {

  //Register this applications url to the Service Discovery service
  if(app.dataSources.servicediscovery){
    var serviceDiscoveryCredentials = app.dataSources.servicediscovery.settings;
    servicediscovery.registerInstance(serviceDiscoveryCredentials.serviceName, serviceDiscoveryCredentials.serviceEndpoint )
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
