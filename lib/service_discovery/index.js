/** 
 * index.js
 *
 * The Service Discovery service provides a registry of services available for use
 * by other applications and services.
 *
 * This module provides two main functions that provide a wrapper for registering 
 * and listing service instances with the Service Discovery service
 * 
 * - ServicePublisher  Register (publish) service instances with the Service 
 *                     Discovery service.
 *
 * - ServiceLocator    List (locate) service instances that have been registered 
 *                     with the Service Discovery service.
 */




var hashCode = require('string-hash');
var util = require('util');
var syncReq = require('sync-request');
var request = require('request');
var EventEmitter = require('events').EventEmitter;

var timeout = 1500;
var DEFAULT_REFRESH_INTERVAL = 15;

util.inherits(ServicePublisher, EventEmitter);  
util.inherits(ServiceLocator, EventEmitter);



/**	
    _____                 _         ______      _     _ _     _               
   /  ___|               (_)        | ___ \    | |   | (_)   | |              
   \ `--.  ___ _ ____   ___  ___ ___| |_/ /   _| |__ | |_ ___| |__   ___ _ __ 
    `--. \/ _ \ '__\ \ / / |/ __/ _ \  __/ | | | '_ \| | / __| '_ \ / _ \ '__|
   /\__/ /  __/ |   \ V /| | (_|  __/ |  | |_| | |_) | | \__ \ | | |  __/ |   
   \____/ \___|_|    \_/ |_|\___\___\_|   \__,_|_.__/|_|_|___/_| |_|\___|_|                                           
 */
 
/**
 * Creates an instance of a ServicePublisher, which is used to register (publish)
 * service instances with the Service Discovery service.
 *
 * @constructor
 * @param {boolean} autoRecovery - indicate if the service instance should re-register
 *                                 itself in case of expiration or assumed expiration 
 *                                 (if the service discovery server was unreachable for
 *                                 too long) 
 * @param {object}  credentials  - object containing URL of Service Discovery service,
 *                                 and an authorization token for the provisioned instance
 *                                 of the Service Discovery service
 */
function ServicePublisher(autoRecovery,credentials) {
	var credentials = loadCredentials(credentials);
	this.autoRecovery = autoRecovery || true;
	this.token = credentials.token;
	this.url = credentials.url;
	this.heartBeats = {}
	this.republishes = {};
	
	var self = this;
	
		
	/**
	 * Register (publish) a service instance with Service Discovery.  
	 *
	 * This function will call the Service Discovery POST /api/v1/instances
	 * interface to register a service instance
	 *
	 * @param serviceName - The name of the service instance as it will be 
	 *                      known to Service Discovery
	 * @param publishedURL - the URL of the service instance
	 * @param options - an object for additional parameters, optional
	 */
	this.publishService = function(serviceName, publishedURL, options) {
		if (!serviceName) {
			throw new Error("serviceName must be input");
		}

		if (!publishedURL) {
			throw new Error("publishedURL must be input");
		}
		
		
		options = options || {};
		var endpointType = options.endpointType || 'http';
		var TTL  = options.TTL || 30;
		var tags = options.tags || [];
		var status = options.status || "UP";
		var metadata = options.metadata || {};
		
		// Construct the Service Discovery POST API call to 
		// register (publish) the service instance
		self.heartBeatInterval = parseInt(TTL / 3);
		request({
			url : self.url + '/api/v1/instances',
			method : "POST",
			json : true,
			body : {
				service_name : serviceName,
				endpoint : {
					type : endpointType,
					value : publishedURL
				},
				ttl : TTL,
				status: status,
				tags: tags,
				metadata: metadata
			},
			headers : {
				Authorization : 'Bearer ' + self.token
			},
			timeout: timeout
		}, function(error, response, body) {
			if (error != null) {
				self.emit('error',error);
				
				// If HTTP request failed, re-try publishing
				setTimeout(self.publishService, 5000, serviceName, publishedURL, options);
				return;
			}
			
			var statusCode = response.statusCode;
			// If unauthorized, no point in retrying because token is static in VCAP_SERVICES
			// and is expired
			if (statusCode === 401) {
				self.emit('error',body);
				return;
			}
			
			// Retry, problem may be only a temporary failure
			if (parseInt(statusCode / 100) != 2) {
				setTimeout(self.publishService, 5000, serviceName, publishedURL, options);
				return;
			}
			
			// At this point, statusCode is 200 and error is null.
			// 
			// Create a heartBeat routine that sends keep-alives to the Service
            // Discovery service.  This tells Service Discovery the registered service
			// is active/alive and ready to service requests.  If the heartBeat is not
			// sent within the time-to-live (TTL) value, Service Discovery will assume 
			// the service instance is not availbable and will remove it from the registry.
            // Once removed, the service instance will need to be re-registered.
			
			// This is the object that is used for re-registration requests by the heartBeat
			// routine.  The heartBeat routine invokes publishService if the service is 
			// expired and autoRecovery is set to true.
			var republish = {
				"serviceName": serviceName,
				"publishedURL": publishedURL,
				"options": options
			}
			
			// Set/override the republish object of the service.  If a heartBeat routine 
			// already exists, the object is overriden.
			self.republishes[serviceName] = republish;
			links = body.links;
			
			// If we already have an active heartBeat routine, skip scheduling a new 
			// heartBeat routine
			if (! self.heartBeats[republish.serviceName]) {
				// last heartBeat 
				self.heartBeats[republish.serviceName] = new Date().getTime();
				
				registerCleanupHandler(links.self,self.token)
				heartBeat(links.heartbeat,self.token,self.heartBeatInterval,self,serviceName);
			}
			
			self.emit('registered',serviceName);
		});
	}

	
    /**
     *
     */	 
	this.getLastHeartbeat = function(serviceName) {
		return self.heartBeats[serviceName];
	}
	
	
	EventEmitter.call(self);
	
	
	// Define a class of publisherInstanceCtor in order to encapsulate the fields 
	// of ServicePublisher
	var publisherInstanceCtor = function() {
		EventEmitter.call(this);
		this.getLastHeartbeat = self.getLastHeartbeat;
		this.publishService   = self.publishService;
	};
	util.inherits(publisherInstanceCtor, EventEmitter);
	var publisherInstance = new publisherInstanceCtor();
	
	
	// Forward all events to the publisher instance that's actually returned
	self.on('registered',function(serviceName) {
		publisherInstance.emit('registered',serviceName);
	});
	
	
	self.on('error',function(error) {
		if (publisherInstance.listeners('error').length > 0) {
			publisherInstance.emit('error',error);
		}
	});
	
	
	self.on('expired',function(serviceName) {
		publisherInstance.emit('expired',serviceName);
	});
	
	
	return publisherInstance;
}


/**
 * Re-register (re-publish) a service instance with the Service
 * Discovery service.
 */
function republishInstance(publisher,republish) {
	
	serviceName  = republish.serviceName;
	publishedURL = republish.publishedURL;
	options = republish.options;
	publisher.publishService(serviceName, publishedURL,options);
}


/**
 * Send a KeepAlive/heartbeat to Service Discovery for the registered
 * instance.  This tells Service Discovery the service instance is alive
 * and ready to service requests.
 * 
 * This function will reschedule itself to heartBeat again if the service
 * instance has expired.  If the autoRecovery flag was set to true, the
 * service instance will be re-registered (re-published) with Service Discovery.
 *
 * This function will call the Service Discovery PUT /api/v1/instances interface
 * to re-register the service instance. 
 */
function heartBeat(url,token,heartbeatInterval,publisher,serviceName) {
	
	if (! publisher.republishes[serviceName]) {
		return;
	}
	
	var republishObject = publisher.republishes[serviceName];
	
	// Construct the Service Discovery PUT API call to renew (heartbeat) the 
	// registration for a registered (published) service instance
	request({
	    url: url,
	    method: "PUT",
	    headers: {
	    	Authorization: 'Bearer ' + token
	    },
	    timeout: timeout
	}, function (error, response, body) {
		// The error response is not null, OR it's not 200/410...so error could be
		// 400 = bad request, 401 = unauthorized (token not valid), or unexpected error
		if (error != null || (response.statusCode != 200 && response.statusCode != 410)) {
			var lastHB = publisher.heartBeats[republishObject.serviceName] || new Date().getTime();
			var diff = new Date().getTime() - lastHB;
			
			// If the service instance registration has expired, re-register (re-publish) it now.
			if (republishObject.TTL * 1000 < diff) {
				delete publisher.heartBeats[republishObject.serviceName];
				publisher.emit('expired',republishObject.serviceName);
				if (publisher.autoRecovery) {
					republishInstance(publisher,republishObject);
				}
			} else { 
                // The service instance is still registered/published, try to 
				// heartbeat again after 5 seconds
				setTimeout(heartBeat,5000,url,token,heartbeatInterval,publisher,serviceName);
			}
		} else {
			// The service instance is not currently registered (published) with Service
			// Discovery, it likely expired and was removed from Service Discovery's list
			// of registered services.
			if (response.statusCode == 410) {
				publisher.emit('expired',republishObject.serviceName);
				delete publisher.heartBeats[republishObject.serviceName];
				if (publisher.autoRecovery) {
					republishInstance(publisher,republishObject);
				}
			} else { 
                // The response was a 200 status code = OK
				publisher.heartBeats[republishObject.serviceName] = new Date().getTime();
				setTimeout(heartBeat,heartbeatInterval * 1000,url,token,heartbeatInterval,publisher,serviceName);
			}
		}
	});
}




/**
    _____                 _          _                     _               
   /  ___|               (_)        | |                   | |            
   \ `--.  ___ _ ____   ___  ___ ___| |     ___   ___ __ _| |_ ___  _ __ 
    `--. \/ _ \ '__\ \ / / |/ __/ _ \ |    / _ \ / __/ _` | __/ _ \| '__|
   /\__/ /  __/ |   \ V /| | (_|  __/ |___| (_) | (_| (_| | || (_) | |   
   \____/ \___|_|    \_/ |_|\___\___\_____/\___/ \___\__,_|\__\___/|_|   
 */

/**
 * Creates an instance of a ServiceLocator, which is used to list (locate) service
 * instances that are registered (published) with the Service Discovery service.
 *
 * @constructor
 * @param {function} instanceSelectionPolicy - The policy that specifies which instance will be returned 
 *                                             by the selectInstance method out of the available service 
 *                                             instances. The policy can be one of: [InstanceSelectionRandom, 
                                               InstanceSelectionAffinity,InstanceSelectionRoundRobin].
 * @param {number}   refreshInterval - Specifies the time between subsequent lookups to Service Discovery 
 *                                     in order to refresh the available service instance list.
 * @param {object}   credentials     - object containing URL of Service Discovery service,
 *                                     and an authorization token for the provisioned instance
 *                                     of the Service Discovery service.
 */
  
 
 
 
function ServiceLocator(instanceSelectionPolicy,refreshInterval,credentials) {
	var self = this;
	
	if (typeof(refreshInterval) !== 'number') {
		credentials = refreshInterval;
		refreshInterval = DEFAULT_REFRESH_INTERVAL;
	}
	
	this.refreshInterval = refreshInterval || DEFAULT_REFRESH_INTERVAL;
	
	if (this.refreshInterval < DEFAULT_REFRESH_INTERVAL) {
		this.refreshInterval = DEFAULT_REFRESH_INTERVAL;
	}
	
	this.credentials = loadCredentials(credentials);
	
	this.instanceSelectionPolicy = instanceSelectionPolicy || module.exports.InstanceSelectionRandom;
	this.instances = {};
	
	
	/**
	 * Selects a registered service instance from the list of service instances
	 * generated during the last lookup from the Service Discovery service.
	 *
	 * @param serviceName - The name of the service instance as it is known 
	 *                      to Service Discovery
	 * @return The URI of the service instance, or null if no servcie instance
	 *         is available
	 */
	this.selectInstance = function(serviceName) {
		if (! self.instances[serviceName]) {
			return null;
		}
		return self.instanceSelectionPolicy(self.instances[serviceName],Array.prototype.slice.call(arguments).slice(1));
	}
	
	
	/**
	 * Call the Service Discovery service for a list of service instances that
     * match the input criteria (i.e. service name, fields, tags, status)
	 *
	 * @param serviceName - The name of the service instance as it is known 
	 *                      to Service Discovery
	 * @param {function} callback    - The callback to which the result is passed. 
	 *                                 The arguments passed are: error, response, 
	                                   body like in the 'request' package
	 * @param {object}   options     - An object that contains: fields, tags and 
     *                                 status properties.  The fields and tags 
     *                                 are string arrays, and the status is a string.
     */
	this.lookup = function(serviceName, callback, options) {
		var querySuffix = "";

		// Build the input fields, tags, status information into
		// a string taht will be appended to the URL for the call
		// to the Service Discovery service to get the list of 
		// registered service instances.
		if (options) {
			var fields = options.fields;
			var tags = options.tags;
			var status = options.status;

			if (fields) {
				querySuffix += "&fields=" + fields.join(',');
			}

			if (tags) {
				querySuffix += "&tags=" + tags.join(',');
			}

			if (status) {
				querySuffix += "&status=" + status;
			}
		}

        // Construct the Service Discovery GET API call to 
		// get a list of registered service instances by name
        // that also match the/any input query criteria.
		request({
			url : self.credentials.url + '/api/v1/instances?service_name=' + serviceName + querySuffix,
			headers : {
				'Authorization' : 'Bearer ' + self.credentials.token
			},
			timeout: timeout
		}, function(error, response, body) {
			if (error == null) {
				try { 
					JSON.parse(body);
					callback(error, response, body);
				} catch (err) {
					callback(err	, response, body);
				}
				return;
			}
			callback(error, response, body);
		});
	}
	
	
	/**
	 * Sets the instance selection policy
	 * 
	 * @param {function} policy - The new instance selection policy
	 */
	this.setInstanceSelectionPolicy = function(policy) {
		self.instanceSelectionPolicy = policy;
	}
	
	
	/**
	 * Starts a periodic lookup of the registered service instances
     * for the input service name.  This method will do nothing
	 * if the method was invoked before with the same service name
	 *
	 * @param serviceName - The name of the service instance as it is known 
	 *                      to Service Discovery
	 */
	this.discoverInstances = function(serviceName) {
		
        // Construct the Service Discovery GET API call to 
        // get a list of registered service instances by name
        // that have a status = UP		
		request({
			     url: self.credentials.url + '/api/v1/instances?service_name=' + serviceName + "&status=UP",
			     headers: {'Authorization': 'Bearer ' + self.credentials.token},
			     timeout: timeout
			    }, 
				
				function (error, response, body) {
				  if (error != null) {
				  	  self.emit('error',error);
					  return;
				  }
				
				  if (response.statusCode != 200) {
					  self.emit('error','Server responded with statusCode ' + response.statusCode + ' with body ' + body);
					  return;
				  }
				
				  var instances = null;
				  try {
					    instances = JSON.parse(body).instances;
				  } catch(error) {
					self.emit('error',error);
					return;
				  }
				
				  instanceList = [];
				  for (i in instances) {
					  instanceList.push(instances[i].endpoint.value);
				  }
				
				  // Replace old instance list with new
				  self.instances[serviceName] = instanceList;
		        }
		);
		
		// Regardless of success/failure, schedule a new lookup invocation
		setTimeout(self.discoverInstances, self.refreshInterval * 1000, serviceName);
	}
	
	EventEmitter.call(self);
	
	// Construct a returned object for encapsulation
	var locatorInstanceCtor = function() {
		EventEmitter.call(this);
		this.discoverInstances = self.discoverInstances;
		this.selectInstance = self.selectInstance;
		this.setInstanceSelectionPolicy   = self.setInstanceSelectionPolicy;
		this.lookup = self.lookup;
	};
	util.inherits(locatorInstanceCtor, EventEmitter);
	
	var locatorInstance = new locatorInstanceCtor();
	
	// forward errors to the returned object
	self.on('error',function(error) {
		if (locatorInstance.listeners('error').length > 0) {
			locatorInstance.emit('error',error);
		}
	});
	
	return locatorInstance;
}


/**
 * Random instance selection policy
 *
 * Select a random instance from given array
 */
module.exports.InstanceSelectionRandom = function(instances) {
	if (!instances || instances.length == 0) {
		return null;
	}
	return instances[parseInt(Math.random() * instances.length)];
}


/**
 * Affinity based instance selection policy
 *
 * Receives an instance array (string array), and arguments.  The 
 * arguments are the arguments starting from the 2nd argument passed
 * to the selectInstance function, and the selectInstance function 
 * is expected to pass a string representation of the client 
 * (i.e ip address) which would be used to select the same instance 
 * selected by previous invocations. 
 */
module.exports.InstanceSelectionAffinity = function() {
	instances = arguments[0];
	args = arguments[1];
	if (!instances || instances.length == 0) {
		return null;
	}

	clientId = args[0];
	
	if (!clientId) {
		return ServiceDiscovery.InstanceSelectionRandom(instances);
	}

	var clientHash = hashCode(clientId);

	var selectedInstance = 0;
	var hashDiff = Math.abs(hashCode(instances[0]) - clientHash);
	for (i = 1; i < instances.length; i++) {
		var hash = hashCode(instances[i]);
		var newHashDiff = Math.abs(hashCode(instances[i]) - clientHash);
		if (newHashDiff < hashDiff) {
			selectedInstance = i;
			hashDiff = newHashDiff;
		}
	}
	return instances[selectedInstance];
}


/**
 * Round-Robin based instance selection policy
 *
 * Selects instances in rotation order
 */
module.exports.InstanceSelectionRoundRobin = function(instances) {
	this.instanceToSelect = this.instanceToSelect || 0;
	if (instances.length == 0) {
		return null;
	}
	var selectedIndex = this.instanceToSelect % instances.length;
	this.instanceToSelect++;
	return instances[selectedIndex];
}




/**
              _
             (_)         
    _ __ ___  _ ___  ___ 
   | '_ ` _ \| / __|/ __|
   | | | | | | \__ \ (__ 
   |_| |_| |_|_|___/\___|
 */
 
/**
 * Load credentials from VCAP or input data
 */
function loadCredentials(credentials) {
	
	// If credentials are not available from VCAP data and
	// were not passed in = Error
	if (! process.env.VCAP_SERVICES && ! credentials) {
		throw new Error("VCAP_SERVICES environment variable was not set");
	}
	
	// If credentials were passed in...
	if (credentials) {
		
		// If the URL was not set, assume US Dallas Production Bluemix
		//environment
		if (! credentials.url) {
			credentials.url = "https://servicediscovery.ng.bluemix.net";
		}
		
		// If an authorization token for the provisioned Service Discovery
		// service were not input = Error
		if (! credentials.token) {
			throw new Error("Authorization Token was not supplied in credentials");
		}
		return credentials;
	}
	
	var vcap_services = JSON.parse(process.env.VCAP_SERVICES);
	var serviceDiscoveryInstances = vcap_services.service_discovery;
	if (serviceDiscoveryInstances.length == 0) {
		throw new Error("No service instances found");
	}
	
	credentials = vcap_services.service_discovery[0].credentials;
	serviceDiscoveryTOKEN = credentials.auth_token;
	serviceDiscoveryURL = credentials.url;
	return {
		url : serviceDiscoveryURL,
		token : serviceDiscoveryTOKEN
	}
}


/**
 * Register cleanup handlers
 */
function registerCleanupHandler(cleanupLink,token) {
	process.on('exit', function() {
		cleanup(cleanupLink,token);
	});
	
	process.on('SIGINT', function() {
		process.exit(2);
	});
}


/**
 *
 */
function cleanup(cleanupLink, token) {
	try {
		var res = syncReq('DELETE', cleanupLink, {
			timeout : 5000,
			'headers' : {
				'Authorization' : 'Bearer ' + token
			}
		});
	} catch (e) {

	}
}



module.exports.ServicePublisher = ServicePublisher;
module.exports.ServiceLocator = ServiceLocator;
