// Licensed under the Apache License. See footer for details.
var winston = require("winston");
var async = require("async");

/**
 * Validates integrity constraints.
 */
module.exports = function (Model, options) {
  winston.info("Enabling integrity checks on", Model.modelName);

  function checkForeignKey(instance, targetModelName, targetForeignKey, callback) {
    var targetId = instance[targetForeignKey];
    var targetModel = Model.app.models[targetModelName];
    winston.debug("Looking for a", targetModelName, "with id", targetId);

    var filter = {
      where: {
        id: targetId
      }
    };

    // if we are targeting an isolated model,
    // also make sure the target object is from the same demo
    if (instance.demoId && targetModel.isIsolated) {
      filter.where.demoId = instance.demoId;
    }

    targetModel.findOne(filter, function (err, instance) {
      if (err) {
        callback(err);
      } else if (!instance) {
        var notExists = new Error(targetModelName + " with id " + targetId + " does not exist");
        notExists.status = 422;
        callback(notExists);
      } else {
        callback(null);
      }
    });
  }

  // listen to all save events
  Model.observe("before save", function checkIntegrity(ctx, next) {
    // the instance to work with, depends on whether we are updating one instance or multiple
    // https://docs.strongloop.com/display/public/LB/Operation+hooks#Operationhooks-Accessingtheaffectedinstance
    var instance = ctx.instance || ctx.currentInstance;

    // collect all integrity checks to perform here
    var integrityChecks = [];

    // look at integrity checks implied by relations
    Object.keys(Model.definition.settings.relations).forEach(function (relationName) {
      var relation = Model.definition.settings.relations[relationName];
      // check if the object pointed by the foreign key actually exists
      if (relation.type === "belongsTo" && instance[relation.foreignKey]) {
        integrityChecks.push(function (callback) {
          checkForeignKey(instance, relation.model, relation.foreignKey, callback);
        });
      }
    });

    // run all checks
    async.waterfall(integrityChecks, function (err, result) {
      if (err) {
        next(err);
      } else {
        next();
      }
    });
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
