// Licensed under the Apache License. See footer for details.
/*global require, describe, it, before, after */
var supertest = require("supertest");
var nock = require("nock");

// load default behaviors for unit tests
require("./unittest.js");

describe("Users", function () {

  var loopback;
  var app;

  before(function (done) {
    loopback = require("loopback");
    app = require("..");
    app.use(loopback.rest());

    // a fake service discovery service that will be mocked by "nock" later on.
    app.dataSources.servicediscovery = {
      settings: {
        "serviceName": "lw-erp",
        "serviceEndpoint": "http://fakeurl:3000",
        "credentials": {
          "token": "dummyToken",
          "url": "https://fakeservicediscovery"
        }
      }
    };

    if (!app.booted) {
      app.once("booted", function () {
        done();
      });
    } else {
      done();
    }
  });

  after(function (done) {
    done();
  });

  it("registers with the Service Discovery", function (done) {
    // fake the registration reply
    nock("https://fakeservicediscovery")
      .post("/api/v1/instances")
      .reply(200, {
        id: 'b6f38ca82f163d30',
        ttl: 300,
        links: {
          self: 'https://fakeservicediscovery/api/v1/instances/b6f38ca82f163d30',
          heartbeat: 'https://fakeservicediscovery/api/v1/instances/b6f38ca82f163d30/heartbeat'
        }
      });

    // intercept the registration confirmation
    app.once("servicediscovery.registered", function () {
      done();
    });

    // fake application start, it will trigger the service discovery registration
    app.emit("started");
  });

});

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
