// Licensed under the Apache License. See footer for details.
var winston = require("winston");

module.exports = function (Model, options) {

  // assign demo id to the new instances of model objects
  Model.observe('before save', function (ctx, next) {
    winston.debug(ctx.Model.modelName, "before save");

    var inst = ctx.instance || ctx.currentInstance;
    if (inst.demoId) {
      next();
    } else {
      var loopbackContext = Model.app.loopback.getCurrentContext();
      if (!loopbackContext) { // no context to find a demoId, we can't proceed
        next(new Error("No demoId specified"));
      } else {
        var currentUser = loopbackContext.get('currentUser');
        if (!currentUser) { // no current user to find a demoId, we can't proceed
          next(new Error("No demoId specified"));
        } else {
          inst.demoId = currentUser.demoId;
          next();
        }
      }
    }
  });

  // take the demoId from the currentUser and
  // inject it in the where query for this object
  Model.observe('access', function (ctx, next) {
    winston.debug(ctx.Model.modelName, "before access");

    var demoIdSpecified = false;

    // first infer the demoId from the currentUser
    var loopbackContext = Model.app.loopback.getCurrentContext();
    if (loopbackContext) {
      var currentUser = loopbackContext.get('currentUser');
      if (currentUser) {
        if (ctx.query.where) {
          ctx.query.where.demoId = currentUser.demoId;
        } else {
          ctx.query.where = {
            demoId: currentUser.demoId
          };
        }
        demoIdSpecified = true;
      }
    }

    // if we were not able to find a current user, this might be coming
    // from an internal call or from the "Demo" API that does not require a user,
    // just make sure a demoId was specified anyway in the query
    if (!demoIdSpecified && ctx.query.where && ctx.query.where.demoId) {
      demoIdSpecified = true;
    }

    if (!demoIdSpecified) {
      winston.warn(ctx.Model.modelName, "no demoId found");
    }
    
    next();
  });

}
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
