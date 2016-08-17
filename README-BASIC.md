# Basic configuration with the Logistics Wizard ERP simulator

In the basic configuration, the simulator runs as a Cloud Foundry app in Bluemix.

![Architecture](http://g.gravizo.com/g?
  digraph G {
    node [fontname = "helvetica"]
    rankdir=BT
    simulator -> discovery [label="1 - Registers and sends heartbeat"]
    simulator -> database [label="4 - CRUD operations"]
    others -> simulator [label="3 - Call ERP service"]
    others -> discovery [label="2 - Obtain reference to ERP service"]
    {rank=same; simulator -> database [style=invis] }
    {rank=same; discovery -> others [style=invis] }
    /* services on top */
    {rank=source; others, discovery }
    /* styling */
    simulator [shape=rect label="ERP service"]
    discovery [shape=circle width=1 fixedsize=true style=filled color="%234E96DB" fontcolor=white label="Service\\nDiscovery"]
    database [shape=circle width=1 fixedsize=true style=filled color="%234E96DB" fontcolor=white label="Database"]
    others [shape=rect style=filled color="%2324B643" fontcolor=white label="Other Services"]
  }
)

## Running the simulator on Bluemix

1. If you do not already have a Bluemix account, [sign up here][bluemix_signup_url]

1. Download and install the [Cloud Foundry CLI][cloud_foundry_url] tool

1. Clone the app and its submodules to your local environment from your terminal using the following command:

	```
	git clone https://github.com/IBM-Bluemix/logistics-wizard-erp.git
	```

1. `cd` into this newly created directory

1. Open the `manifest.yml` file and change the `host` value to something unique.

  The host you choose will determinate the subdomain of your application's URL:  `<host>.mybluemix.net`
  
1. Connect to Bluemix in the command line tool and follow the prompts to log in.

	```
	cf api https://api.ng.bluemix.net
	cf login
	```

1. Create a new Service Discovery service

  ```
  cf create-service service_discovery free lw-service-discovery
  ```
  
1. Create a new ElephantSQL service

  ```
  cf create-service elephantsql turtle logistics-wizard-erp-db
  ```
  
1. Push the app to Bluemix.

	```
	cf push
	```

And voila! You now have your very own instance of simulator running on Bluemix.

## Running the simulator locally

1. Get the code locally

  ```
  git clone https://github.com/IBM-Bluemix/logistics-wizard-erp.git
  ```

1. Change to the checkout directory

1. Get the application dependencies

  ```
  npm install
  ```

1. Start the application

  ```
  npm start
  ```

At that point the application runs with an in-memory database.
You lose all changes when you stop the app. Let's configure a persistent storage.

### Using a persistent in-memory database

1. Create the file **server/datasources.local.json** with the following content:

  ```
  {
    "db": {
      "name": "db",
      "connector": "memory",
      "file": "in-memory-database.json"
    }
  }
  ```

1. Start the application

  ```
  npm start
  ```
  
The data is now persisted in *in-memory-database.json*.

### Using PostgreSQL

1. Create a new ElephantSQL service

  ```
  cf create-service elephantsql turtle logistics-wizard-erp-db
  ```

1. Create a set of credentials

  ```
  cf create-service-key logistics-wizard-erp-db erp
  ```
  
1. Retrieve the credentials

  ```
  cf service-key logistics-wizard-erp-db erp
  ```
  
  Note that ElephantSQL returns a **uri** but the Loopback connector requires
  more parameters that can be extracted from the **uri**. The **uri** looks like:

  ```
  "uri": "postgres://<username>:<password>@<host>:<port>/<database>"
  ```
  
1. Create the file **server/datasources.local.json** with the following content, replacing the placeholders
with values extracted from the **uri**. 

  ```
  {
    "db": {
      "name": "db",
      "connector": "postgresql",
      "database": "<database>",
      "host": "<host>",
      "port": "<port>",
      "username": "<username>",
      "password": "<password>",
      "max": 3
    }
  }
  ```
  
  Note: **max** defines the number of connections that can be established to the database.
  If you are seeing a "too many connections" error on app startup, check out the [explanation and solution in the FAQ](https://github.com/IBM-Bluemix/logistics-wizard/wiki/FAQ#the-erp-simulator-app-is-throwing-a-too-many-connections-error-on-startup)
 
  
1. Start the application

  ```
  npm start
  ```

The data is now persisted in ElephantSQL. You can use the same structure for the databases.local.json
if you work with your own PostgreSQL database.

## Building an API with Loopback and Swagger

The ERP simulator uses [Loopback](https://strongloop.com/) for its implementation.
LoopBack is a highly-extensible, open-source Node.js framework that enables you to:
  * Create dynamic end-to-end REST APIs with little or no coding.
  * Access data from major relational databases, MongoDB, SOAP and REST APIs.
  * Incorporate model relationships and access controls for complex APIs.
  * Use geolocation, file, and push services for mobile apps.
  * Easily create client apps using Android, iOS, and JavaScript SDKs.
  * Run your application on-premises or in the cloud.

From the Loopback model definition, we derived a [Swagger specification](spec.yaml),
initially generated with ```slc loopback:export-api-def -o spec.yaml```.

Swagger is a simple yet powerful representation of a RESTful API.
The Swagger specification has been donated to the [Open API Initiative](https://github.com/OAI/OpenAPI-Specification)
as part of an effort to define a standard specification format for REST APIs.

To review the API specification, open the [Swagger Editor](http://editor.swagger.io/#/?import=https://raw.githubusercontent.com/IBM-Bluemix/logistics-wizard-erp/master/spec.yaml).

### Code Structure

| File | Description |
| ---- | ----------- |
|[**Loopback models**](common/models)|Contains JSON definitions of the object model and implementation of remote methods.|
|[**integrity.js**](common/mixins/integrity.js)|A mixin to check foreign key constraints.|
|[**isolated.js**](common/mixins/isolated.js)|A mixin to isolate data per demo environment.|
|[**seed**](seed)|Seed data loaded into the database at startup and when new demo environments are created.|
|[**boot**](server/boot)|Startup scripts including table creation, static data injection, registration with service discovery.|
|[**datasources.local.js**](server/datasources.local.js)|Initializes data sources (database, service discovery) from a local file or by reading the Cloud Foundry VCAP_SERVICES.|
|[**datasources.local.template.json**](server/datasources.local.template.json)|Template file to define local data sources.|
  
[bluemix_signup_url]: http://ibm.biz/logistics-wizard-signup
[cloud_foundry_url]: https://github.com/cloudfoundry/cli