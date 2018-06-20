[Logistics Wizard](https://github.com/IBM-Cloud/logistics-wizard/tree/master#logistics-wizard-overview) / [Architecture](https://github.com/IBM-Cloud/logistics-wizard/tree/master#architecture) / logistics-wizard-erp

# Logistics Wizard ERP

The Logistics Wizard ERP service provides APIs to simulate working with an ERP system's data.

### API Definition

The API and data models are defined in [this Swagger 2.0 file](spec.yaml). You can view this file using the [Swagger Editor](http://editor.swagger.io/#/?import=https://raw.githubusercontent.com/IBM-Cloud/logistics-wizard-erp/master/spec.yaml
).

The API exposes the following methods:
* log in and get access tokens
* get the list of Products, Distribution Centers, Retailers
* create, retrieve, update, delete Shipments

The API defines the following roles:
* supply chain manager - can view all data and manage Shipments
* retail store manager - can view all data except Inventory and Suppliers

### Logistics Wizard ERP Simulator

This project includes an ERP simulator that implements the API and data models defined above. The simulator removes the dependency on a real ERP providing an opportunity to demonstrate edge cases like connectivity failures.

## Supported use cases

### Cloud-native configuration to access a public ERP service

In this configuration, the ERP service is only providing access to the data. You deploy the ERP simulator as a Cloud Foundry app in IBM Cloud and connect it to the rest of the system.

This configuration illustrates:
* how to document an API with Swagger.io
* how to quickly implement an API with Loopback.io
* how to configure auto-scaling to cope with additional load
* how to manage failures of a backend service and how to recover
  * lost connectivity between the ERP service and its database
  * lost connectivity between the other services and the ERP service

[**Follow these instructions to deploy and work with the cloud-native configuration.**](README-BASIC.md)

### Hybrid configuration to access an on-prem ERP service

In this configuration, a Secure Gateway sits between the ERP service and the other services. All calls to the ERP service go through the Secure Gateway. Again a real on-prem ERP system is unnecessary, the ERP simulator is used.

This configuration illustrates:
* how to expose an on-prem service outside of the enterprise
* how to configure the security settings of the Secure Gateway

[**Follow these instructions to deploy and work with the hybrid configuration.**](README-HYBRID.md)

## License

See [License.txt](License.txt) for license information.

## Status

| **master** | [![Build Status](https://travis-ci.org/IBM-Cloud/logistics-wizard-erp.svg?branch=master)](https://travis-ci.org/IBM-Cloud/logistics-wizard-erp) [![Coverage Status](https://coveralls.io/repos/github/IBM-Cloud/logistics-wizard-erp/badge.svg?branch=master)](https://coveralls.io/github/IBM-Cloud/logistics-wizard-erp?branch=master) |
| ----- | ----- |
| **dev** | [![Build Status](https://travis-ci.org/IBM-Cloud/logistics-wizard-erp.svg?branch=dev)](https://travis-ci.org/IBM-Cloud/logistics-wizard-erp) [![Coverage Status](https://coveralls.io/repos/github/IBM-Cloud/logistics-wizard-erp/badge.svg?branch=dev)](https://coveralls.io/github/IBM-Cloud/logistics-wizard-erp?branch=dev)|

[bluemix_signup_url]: https://console.ng.bluemix.net/?cm_mmc=GitHubReadMe
