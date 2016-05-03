# Basic configuration with the Logistics Wizard ERP simulator

The simulator runs as a Cloud Foundry app in Bluemix.

It is recommended that you create a dedicated space in Bluemix to the Logistics Wizard app. This way you have a simple way to view all the runtimes and services involved in the app.

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

## Deploying the simulator

### Deploying the simulator automatically

1. Use the Deploy to Bluemix button to create an instance of the ERP simulator.

  [![Deploy to Bluemix](https://bluemix.net/deploy/button.png)](https://bluemix.net/deploy)
  
1. Once deployed, the target space is populated with
  * a Service Discovery **logistics-wizard-discovery**
  * a database **logistics-wizard-erp-database**
  * the ERP simulator app **logistics-wizard-erp**
  
  Note: if a service with the name already exists in the space, it will be reused.

## Working with the sample data set

The simulator comes with a sample data set and a simple user interface to initialize the database with this data set.

1. Connect to the deployed simulator

1. Log in as an administrator

1. Use the option to reset the database and to load the sample data set

## Building an API with Swagger and Loopback.io

### Swagger

The ERP service API is designed with Swagger and defined [here](spec.yaml).

Swagger is a simple yet powerful representation of a RESTful API. The Swagger specification has been donated to the [Open API Initiative](https://github.com/OAI/OpenAPI-Specification) as part of an effort to define a standard specification format for REST APIs.

1. Review the API specification in the online [Swagger Editor](http://editor.swagger.io/#/?import=https://raw.githubusercontent.com/IBM-Bluemix/logistics-wizard-erp/master/spec.yaml).

### Loopback

The ERP simulator uses [Loopback](https://strongloop.com/) for its implementation. LoopBack is a highly-extensible, open-source Node.js framework that enables you to:
  * Create dynamic end-to-end REST APIs with little or no coding.
  * Access data from major relational databases, MongoDB, SOAP and REST APIs.
  * Incorporate model relationships and access controls for complex APIs.
  * Use geolocation, file, and push services for mobile apps.
  * Easily create client apps using Android, iOS, and JavaScript SDKs.
  * Run your application on-premises or in the cloud.

1. Connect to http://<your-erp-service-url>/explorer/ to look at the ERP service API.

This API has been generated using the [Swagger generator](https://docs.strongloop.com/display/public/LB/Swagger+generator) included in Loopback.

### Registering with a Service Discovery
* how to integrate with a Service Discovery service in a microservice architecture

### Configuring auto-scaling
* how to configure auto-scaling to cope with additional load

### Managing ERP service failures and loss of connectivity
* lost of connectivity between the ERP service and its database
* lost of connectivity between the other services and the ERP service