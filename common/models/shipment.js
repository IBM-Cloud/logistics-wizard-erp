// Licensed under the Apache License. See footer for details.
var helper = require("./helper.js");
var winston = require("winston");

module.exports = function (Shipment) {
  Shipment.disableRemoteMethod("findById", true);
  Shipment.disableRemoteMethod("upsert", true);
  Shipment.disableRemoteMethod("deleteById", true);
  Shipment.disableRemoteMethod("updateAll", true);
  Shipment.disableRemoteMethod("updateAttributes", false);
  Shipment.disableRemoteMethod("createChangeStream", true);
  Shipment.disableRemoteMethod("count", true);
  Shipment.disableRemoteMethod("findOne", true);
  Shipment.disableRemoteMethod("exists", true);

  helper.hideRelation(Shipment, "address");
  helper.hideRelation(Shipment, "demo");
  helper.crudRelation(Shipment, "items");

  function applyShipmentUpdate(shipment, shipmentUpdate, cb) {
    switch (shipmentUpdate.status) {
      case "APPROVED":
        if (shipment.status != "NEW") {
          var invalidStatus = new Error("Shipment already approved");
          invalidStatus.status = 400;
          return cb(invalidStatus);
        } else {
          shipment.status = "APPROVED";
        }
        break;
      case "IN_TRANSIT":
        if (shipment.status != "IN_TRANSIT" && shipment.status != "APPROVED") {
          var invalidStatus = new Error("Shipment has not been approved or is not in transit");
          invalidStatus.status = 400;
          return cb(invalidStatus);
        } else {
          shipment.status = "IN_TRANSIT";
          shipment.estimatedTimeOfArrival = shipmentUpdate.estimatedTimeOfArrival;
          shipment.currentLocation = shipmentUpdate.currentLocation;
        }
        break;
      case "DELIVERED":
        if (shipment.status != "IN_TRANSIT") {
          var invalidStatus = new Error("Shipment is not in transit");
          invalidStatus.status = 400;
          return cb(invalidStatus);
        } else {
          shipment.status = "DELIVERED";
          shipment.currentLocation = shipmentUpdate.currentLocation;
        }
        break;
      default:
        var invalidStatus = new Error("Invalid status: " + shipmentUpdate.status);
        invalidStatus.status = 400;
        return cb(invalidStatus);
    }

    shipment.save(function (err, updatedShipment) {
      cb(err, updatedShipment);
    });
  };

  Shipment.updateShipmentStatus = function (token, shipmentId, shipmentUpdate, cb) {
    winston.info("User", token.userId, "is updating shipment", shipmentId);
    Shipment.app.models.ERPUser.findById(token.userId, function (err, user) {
      if (err) {
        return cb(err);
      } else {
        Shipment.findOne({
          where: {
            id: shipmentId,
            demoId: user.demoId
          }
        }, function (err, shipment) {
          if (err) {
            cb(err);
          } else if (!shipment) {
            var notFound = new Error("Shipment does not exist");
            notFound.status = 404;
            cb(notFound);
          } else {
            applyShipmentUpdate(shipment, shipmentUpdate, cb);
          }
        });
      }
    });
  }

  Shipment.remoteMethod("updateShipmentStatus", {
    description: "Updates the status of a shipment as it moves along the supply-chain.",
    http: {
      path: "/:id",
      verb: "PUT"
    },
    accessType: 'WRITE',
    accepts: [
      {
        arg: "token",
        type: "AccessToken",
        http: function (ctx) {
          return ctx.req.accessToken;
        }
      },
      {
        arg: "id",
        type: "number",
        required: true,
        http: {
          source: "path"
        }
      },
      {
        arg: "data",
        type: "Shipment",
        description: "The update to apply to the Shipment. Only status, estimatedTimeOfArrival and currentLocation can be updated",
        required: true,
        http: {
          source: "body"
        }
      }
    ],
    returns: {
      arg: "data",
      type: "Shipment",
      root: true
    }
  });

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
