'use strict'
var winston = require("winston");
winston.level = process.env.LOG_LEVEL || "info";

var serviceDiscovery = require('./service_discovery');
var ServicePublisher = serviceDiscovery.ServicePublisher;


/**
 * Register this micro service with the Service Discovery service
 * as a micro service named "MessageGenerator", along with it's
 * IP address.
 *
 * Use the wrapper library function .publishService
 * in the module  node_modules/service_discovery/index.js  to
 * register (publish) this micro service to the Service Discovery
 * service.
 */
function registerInstance(serviceName, serviceEndpoint, tags) {

  if (!serviceName || !serviceEndpoint) {
    winston.error("Service Discovery serviceName or  serviceEndpoint is not defined");
     return;
   }
  tags = tags || ["logistics-wizard","database"];

  winston.info("Registering " + serviceEndpoint + " under the name " + serviceName);
	var publisher = new ServicePublisher(true);
	publisher.publishService(serviceName, serviceEndpoint, {"tags": tags, "TTL":300});

	publisher.on('registered',function(serviceName) {
		winston.info(serviceName + " successfully registered with Service Discovery!");
	});

	publisher.on('error',function(serverResponse) {
		winston.error("Server responded with: ",serverResponse);
	});

	publisher.on('expired',function(serviceName) {
		winston.error(serviceName + " expired from Service Discovery registry");
	});

}

exports.registerInstance = registerInstance
