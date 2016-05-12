// Licensed under the Apache License. See footer for details.
var fs = require("fs");
var async = require("async");

module.exports = function (server) {

  function seed(model, callback) {
    console.log("Seeding", model.definition.name);
    model.count(function (err, count) {
      if (err) {
        console.log(err);
        callback(null);
      } else if (count == 0) {
        var objects = JSON.parse(fs.readFileSync("./seed/" + model.definition.name.toLowerCase() + ".json"));
        console.log("Injecting", objects.length, model.definition.name);
        model.create(objects, function (err, records) {
          if (err) {
            console.log("Failed to create", model.definition.name, err);
          } else {
            console.log("Created", records.length, model.definition.name);
          }
          callback(null);
        });
      } else {
        console.log("There are already", count, model.definition.name);
        callback(null);
      }
    });
  };

  var router = server.loopback.Router();
  router.post('/api/v1/demo/initialize',
    function (req, res) {
      async.waterfall(
        [ //
          server.models.Supplier,
          server.models.Product,
          server.models.DistributionCenter,
          server.models.Inventory,
          server.models.Retailer,
          server.models.Shipment,
          server.models.LineItem,
        ].map(function (model) {
          return function (callback) {
            seed(model, callback);
          };
        }),
        function (err, result) {
          if (err) {
            console.log(err);
          } else {
            console.log("Inject complete");
          }
          res.redirect('/explorer');
        });
    });

  router.post('/api/v1/demo/reset',
    function (req, res) {
      async.waterfall(
        [
          server.models.Supplier,
          server.models.Product,
          server.models.DistributionCenter,
          server.models.Inventory,
          server.models.Retailer,
          server.models.Shipment,
          server.models.LineItem,
        ].map(function (model) {
          return function (callback) {
            console.log("Deleting all", model.definition.name);
            model.destroyAll(function (err, result) {
              callback(err);
            });
          };
        }),
        function (err, result) {
          if (err) {
            console.log(err);
          } else {
            console.log("Reset complete");
          }
          res.redirect('/explorer');
        });
    });
  server.use(router);
};
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