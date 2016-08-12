# Logistics Wizard ERP

[![Codacy Badge](https://api.codacy.com/project/badge/Grade/1918ce5ef7fa4b7c95c55d4328cbaa18)](https://www.codacy.com/app/IBM-Bluemix/logistics-wizard-erp?utm_source=github.com&amp;utm_medium=referral&amp;utm_content=IBM-Bluemix/logistics-wizard-erp&amp;utm_campaign=Badge_Grade)
[![Coverage Status](https://coveralls.io/repos/github/IBM-Bluemix/logistics-wizard-erp/badge.svg?branch=master)](https://coveralls.io/github/IBM-Bluemix/logistics-wizard-erp?branch=master)

**WORK IN PROGRESS**

This service is part of the larger [Logistics Wizard](https://github.com/IBM-Bluemix/logistics-wizard) project.

## Overview

With the Logistics Wizard app, we focus on the planning and delivery of products from distribution centers to retail locations. The Logistics Wizard ERP service defines a subset of a full ERP system data model and the API to access this system.

### API Definition

The API and data models are defined in [this Swagger 2.0 file](spec.yaml). You can view this file in the [Swagger Editor](http://editor.swagger.io/#/?import=https://raw.githubusercontent.com/IBM-Bluemix/logistics-wizard-erp/master/spec.yaml
).

The API allows to:
* log in and get access tokens;
* get the list of Products, Distribution Centers, Retailers;
* create, retrieve, update, delete Shipments.

The API defines the following roles:
* supply chain manager - can view all data and manage Shipments
* retail store manager - can view all data except Inventory and Suppliers

### Logistics Wizard ERP Simulator

This project includes an ERP simulator implementing the API and data models defined above. With the simulator we remove the dependency on a real ERP giving us more flexibility to demonstrate edge cases like connectivity failures.

## Supported use cases

The ERP service can be used to demonstrate different capabilities and configuration of IBM Bluemix.

### Basic configuration to support for the use cases of the other services

In this configuration, the ERP service is only providing access to the data. We deploy the ERP simulator as a regular Clound Foundry app in Bluemix and connect it to the rest of the system.

This configuration illustrates:
* how to integrate with a Service Discovery service in a microservice architecture
* how to document an API with Swagger.io
* how to quickly implement an API with Loopback.io
* how to configure auto-scaling to cope with additional load
* how to manage failures of a backend service and how to recover when it becomes available again
  * lost of connectivity between the ERP service and its database
  * lost of connectivity between the other services and the ERP service

[**>>> Follow these instructions to deploy and work with this configuration.**](README-BASIC.md)

### Hybrid configuration to access a on-prem ERP service

In this configuration, the Secure Gateway sits between the ERP service and the other services. All calls to the ERP service go through the Secure Gateway. We don't require a real on-prem ERP system, the ERP simulator is used.

This configuration illustrates:
* how to expose an on-prem service outside of the enterprise
* how to configure the security settings of the Secure Gateway

[**>>> Follow these instructions to deploy and work with the hybrid configuration.**](README-HYBRID.md)

## License

See [License.txt](License.txt) for license information.

[bluemix_signup_url]: https://console.ng.bluemix.net/?cm_mmc=GitHubReadMe
