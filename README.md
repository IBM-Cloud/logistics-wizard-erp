# Logistics Wizard ERP

**WORK IN PROGRESS**

This module is part of the larger [Logistics Wizard](https://github.com/IBM-Bluemix/logistics-wizard) project.

## Overview

With the Logistics Wizard app, we focus on the planning and delivery of products from distribution centers to retail locations. The Logistics Wizard ERP module defines a subset of a full ERP system data model and the API to access this system.

![Architecture](http://g.gravizo.com/g?
  /**
   *@opt inferrel
   *@opt collpackages java.util.*
   *@opt inferdep
   *@opt inferdepinpackage
   *@opt hide java.*
   *@opt all
   *@opt !constructors
   *@opt !operations
   *@hidden
   */
  class UMLOptions {
  }
  /**
   *@hidden
   */
  class UMLNoteOptions{}
  /**
   */
  class Supplier {
    String name;
  }
  /**
   */
  class Product {
    String name;
    Supplier supplier;
  }
  /**
   */
  class LineItem {
    Product product;
    int quantity;
  }
  /**
   */
  class Shipment {
    LineItem[] items;
    DistributionCenter from;
    RetailLocation to;
    ShipmentStatus status;
    Date createdAt;
    Date updatedAt;
    Date deliveredAt;
    Address currentLocation;
    Date estimatedTimeOfArrival;
  }
  /**
   */
  enum ShipmentStatus {
    NEW, ACCEPTED, IN_TRANSIT, SHIPPED
  }
  /**
   */
  class Address {
    String city;
    String state;
    String country;
    long latitude;
    long longitude;
  }
  /**
   */
  class DistributionCenter {
    Address location;
    User manager;
  }
  /**
   */
  class User {
    String name;
  }
  /**
   */
  class Retailer {
    Address location;
    User manager;
  }
  /**
   */
  class Inventory {
    Product product;
    DistributionCenter dc;
    int quantity;
  }
)

The API and data models are defined in [this Swagger 2.0 file](spec.yaml). You can view this file in the [Swagger Editor](http://editor.swagger.io/#/?import=https://raw.githubusercontent.com/IBM-Bluemix/logistics-wizard-erp/master/spec.yaml
).

The API allows to:
* get the list of Products, Distribution Centers, Retailers, 
* create, retrieve, update, delete Shipments.

The API defines the following roles:
* supply chain manager - can manage Shipments
* auditor - can only view data

## Logistics Wizard ERP Simulator

This module includes a simulator application implementing the API and data models defined above.

### Deploying the simulator automatically

TODO

### Deploying the simulator manually

TODO

### Running the simulator locally

TODO

## License

See [License.txt](License.txt) for license information.

[bluemix_signup_url]: https://console.ng.bluemix.net/?cm_mmc=GitHubReadMe
