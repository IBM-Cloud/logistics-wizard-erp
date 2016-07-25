'use strict'
var http = require("http")
var request = require('request');
var heartbeats = require('heartbeats');
var winston = require("winston");

var tags = ["logistics-wizard","database"];
var status = 'UP';
var service_name = 'lw-erp';
var ttl = 300;
var serviceEndpoint = 'https://logistics-wizard-erp.mybluemix.net/';
var serviceEndpointProtocol = 'http';

var serviceDiscoveryServiceURL;
var serviceDiscoveryServiceToken;
var serviceDiscoveryServiceID;
var serviceDiscoveryServiceHeartbeatURL;

var heart

//Returns the Service Discovery credentials, if available
function loadCredentials(){
  // If running on Bluemix, use VCAP_SERVICES
  if (process.env.VCAP_SERVICES) {
    var vcapServices = JSON.parse(process.env.VCAP_SERVICES);
    if (vcapServices.hasOwnProperty("service_discovery")) {
      winston.info("Found Service Discovery service");
      return vcapServices.service_discovery[0].credentials;
    }
  }
}

//Registers the service with Service Discovery.
function registerService() {
  var credentials = loadCredentials();
  serviceDiscoveryServiceURL = credentials['url']
  serviceDiscoveryServiceToken = credentials['auth_token']
  var options = {
    method: 'POST',
    url: serviceDiscoveryServiceURL + '/api/v1/instances',
    headers: {
      'content-type': 'application/json',
       authorization: 'bearer ' + serviceDiscoveryServiceToken
     },
    body: {
       tags: tags,
       status: status,
       service_name: service_name,
       ttl: ttl,
       endpoint: { value: serviceEndpoint, type: serviceEndpointProtocol }
     },
    json: true
  };
  request(options, function (error, response, body) {
    if (!error) {
      winston.info("Registered with Service Discovery");
      serviceDiscoveryServiceID = body.id
      serviceDiscoveryServiceHeartbeatURL = body.links.heartbeat
      startHeartbeat();
    } else{
      winston.error("ERROR registering with Service Discovery")
      winston.error(error);
    }

  });
}

function startHeartbeat() {
    winston.info("Starting heartbeat. URL : " + serviceDiscoveryServiceHeartbeatURL)
        // a heart that beats every ttl * .75 seconds
    heart = heartbeats.createHeart(300 * .75 * 1000);
    heart.createEvent(1, function(heartbeat, last) {
        winston.debug("Heartbeat #" + heart.age)
        var options = {
            method: 'PUT',
            url: serviceDiscoveryServiceHeartbeatURL,
            headers: {
                'content-type': 'application/json',
                authorization: 'bearer ' + serviceDiscoveryServiceToken
            }
        };
        request(options, function(error, response, body) {
            if (error)       winston.error(error);
        });
    });
}

//Registers the service with Service Discovery.
function deRegisterService() {
  heart.kill();
  var options = {
    method: 'DELETE',
    url: serviceDiscoveryServiceURL + '/api/v1/instances/' + serviceDiscoveryServiceID,
    headers: {
      'content-type': 'application/json',
       authorization: 'bearer ' + serviceDiscoveryServiceToken
     },
    body: {
       tags: tags,
       status: status,
       service_name: service_name,
       ttl: ttl,
       endpoint: { value: serviceEndpoint, type: serviceEndpointProtocol }
     },
    json: true
  };
  request(options, function (error, response, body) {
    if (!error && response.statusCode == 200) {
      winston.info("De-registered with Service Discovery");
    } else {
      winston.error("ERROR de-registering with Service Discovery")
      winston.error(error);
    }

  });
}

exports.registerService = registerService
