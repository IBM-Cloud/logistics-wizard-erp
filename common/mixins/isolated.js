// Licensed under the Apache License. See footer for details.
var winston = require("winston");

/**
 * Overrides checkAccess to inject the demoId of the current user in create and queries
 * in order to limit the visibility of objects between demo environments
 */
module.exports = function (Model, options) {

  // mark the model as isolated
  Model.isIsolated = true;

  function injectDemoId(user, token, modelId, sharedMethod, ctx, callback) {
    // if we are create a new object
    // then inject the demoId of the current user
    if ("create" == sharedMethod.name) {
      ctx.req.remotingContext.args.data.demoId = user.demoId;
    }
    // if we are creating an object through a relation /Model/:id/relation
    // then inject the demoId of the current user
    else if (sharedMethod.name.indexOf("__create__") == 0) {
      ctx.req.remotingContext.args.data.__data.demoId = user.demoId;
    }

    // inject the demoId in the filter "where" clause
    if (!ctx.args.filter) {
      ctx.args.filter = {};
    }
    if (!ctx.args.filter.where) {
      ctx.args.filter.where = {};
    }

    ctx.args.filter.where.demoId = user.demoId;

    // let the regular check happens,
    // we ensured that the demoId will be added to new item and to any query
    Model.__checkAccess(token, modelId, sharedMethod, ctx, callback);
  }

  // keep the old version of checkAccess
  Model.__checkAccess = Model.checkAccess;

  // define our own
  Model.checkAccess = function (token, modelId, sharedMethod, ctx, callback) {
    var model = this;

    if (!token) {
      return Model.__checkAccess(token, modelId, sharedMethod, ctx, callback);
    }

    // find the user behind the token
    Model.app.models.ERPUser.findById(token.userId, function (err, user) {
      if (err) {
        return callback(err);
      }

      // if there is an instance behind this call,
      // it should already be within the user demo environment
      if (ctx.instance) {
        // if it does not have a demoId, this is unexpected as
        // this mixin should only be installed on objects specific to a demo environment
        if (!ctx.instance.demoId) {
          winston.error(model.modelName, "Instance has no demoId!", ctx.instance);
          return callback(new Error("Object is not attached to a demo"));
        } else if (ctx.instance.demoId != user.demoId) {
          // if it has a different demoId then this user is not allowed to access it
          var notFound = new Error("Object not found in this demo");
          notFound.status = 404;
          return callback(notFound);
        }
      }

      // there is no instance but a modelId is specified
      // this is typically the case in calls like /Model/id/relations
      if (!ctx.instance && modelId) {
        // find the instance
        Model.findById(modelId, function (err, object) {
          if (object && object.demoId != user.demoId) {
            // if it has a different demoId then this user is not allowed to access it
            var notFound = new Error("Object not found in this demo");
            notFound.status = 404;
            return callback(notFound);
          } else {
            // otherwise proceed to inject the demoId where needed
            injectDemoId(user, token, modelId, sharedMethod, ctx, callback);
          }
        });
      } else {
        // otherwise proceed to inject the demoId where needed
        injectDemoId(user, token, modelId, sharedMethod, ctx, callback);
      }

    });
  };

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
