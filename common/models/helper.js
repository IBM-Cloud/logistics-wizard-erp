// Licensed under the Apache License. See footer for details.
var winston = require("winston");

/**
 * Helper module.
 * @module model.helper
 */
module.exports = {
  /**
   * Disables all remote methods on a model.
   * @param Model - The model to process.
   */
  hideAll: function (Model) {
    Model.disableRemoteMethod("find", true);
    Model.disableRemoteMethod("findById", true);
    Model.disableRemoteMethod("create", true);
    Model.disableRemoteMethod("upsert", true);
    Model.disableRemoteMethod("deleteById", true);
    Model.disableRemoteMethod("updateAll", true);
    Model.disableRemoteMethod("updateAttributes", false);
    Model.disableRemoteMethod("createChangeStream", true);
    Model.disableRemoteMethod("count", true);
    Model.disableRemoteMethod("findOne", true);
    Model.disableRemoteMethod("exists", true);
    Model.disableRemoteMethod("replaceOrCreate", true);
    Model.disableRemoteMethod("upsertWithWhere", true);
    Model.disableRemoteMethod("replaceById", true);
  },
  /**
   * Disables all write methods on a model, keeping only the GET.
   * @param Model - The model to process.
   */
  readOnly: function (Model) {
    Model.disableRemoteMethod("create", true);
    Model.disableRemoteMethod("upsert", true);
    Model.disableRemoteMethod("deleteById", true);
    Model.disableRemoteMethod("updateAll", true);
    Model.disableRemoteMethod("updateAttributes", false);
    Model.disableRemoteMethod("createChangeStream", true);
    Model.disableRemoteMethod("count", true);
    Model.disableRemoteMethod("findOne", true);
    Model.disableRemoteMethod("exists", true);
    Model.disableRemoteMethod("replaceOrCreate", true);
    Model.disableRemoteMethod("upsertWithWhere", true);
    Model.disableRemoteMethod("replaceById", true);
  },
  /**
   * Keeps only the simple GET/POST/PUT/DELETE methods.
   * @param Model - The model to process.
   */
  simpleCrud: function (Model) {
    Model.disableRemoteMethod("upsert", true);
    Model.disableRemoteMethod("updateAll", true);
    Model.disableRemoteMethod("createChangeStream", true);
    Model.disableRemoteMethod("count", true);
    Model.disableRemoteMethod("findOne", true);
    Model.disableRemoteMethod("exists", true);
    Model.disableRemoteMethod("replaceOrCreate", true);
    Model.disableRemoteMethod("upsertWithWhere", true);
    Model.disableRemoteMethod("replaceById", true);
  },
  /**
   * Keeps only the GET methods for the given relation
   * @param Model - The model to process.
   * @param relation - The relation to alter.
   */
  readOnlyRelation: function (Model, relation) {
    Model.disableRemoteMethod("__create__" + relation, false);
    Model.disableRemoteMethod("__updateById__" + relation, false);
    Model.disableRemoteMethod("__destroyById__" + relation, false);
    Model.disableRemoteMethod("__delete__" + relation, false);
    Model.disableRemoteMethod("__count__" + relation, false);
    Model.disableRemoteMethod("__findById__" + relation, false);
    Model.disableRemoteMethod("__link__" + relation, false);
    Model.disableRemoteMethod("__unlink__" + relation, false);
    Model.disableRemoteMethod("__exists__" + relation, false);
  },
  /**
   * Hides the given relation from the Model remote methods.
   * @param Model - The model to process.
   * @param relation - The relation to hide.
   */
  hideRelation: function (Model, relation) {
    Model.disableRemoteMethod("__create__" + relation, false);
    Model.disableRemoteMethod("__get__" + relation, false);
    Model.disableRemoteMethod("__update__" + relation, false);
    Model.disableRemoteMethod("__destroy__" + relation, false);
    Model.disableRemoteMethod("__delete__" + relation, false);
    Model.disableRemoteMethod("__updateById__" + relation, false);
    Model.disableRemoteMethod("__destroyById__" + relation, false);
    Model.disableRemoteMethod("__count__" + relation, false);
    Model.disableRemoteMethod("__findById__" + relation, false);
    Model.disableRemoteMethod("__link__" + relation, false);
    Model.disableRemoteMethod("__unlink__" + relation, false);
    Model.disableRemoteMethod("__exists__" + relation, false);
  },
  /**
   * Begins a transaction for the given model.
   *
   * Similar to Model.beginTransaction but in case the model is using the in-memory data source
   * that has no support for transaction, it returns a dummy transaction object and logs a warning.
   * @param Model - The model to begin a transaction for
   * @param callback - (err, tx)
   */
  beginTransaction: function (Model, callback) {
    if (Model.dataSource.adapter.name == "memory") {
      winston.warn("Creating a fake transaction object for in-memory connector with model", Model.modelName);
      callback(null, {
        commit: function (callback) {
          winston.warn("Commit on a fake transaction");
          callback(null);
        },
        rollback: function (callback) {
          winston.warn("Rollback on a fake transaction");
          callback(null);
        }
      });
    } else {
      Model.beginTransaction({
          isolationLevel: Model.Transaction.SERIALIZABLE
        },
        function (err, tx) {
          callback(err, tx);
        }
      );
    }
  }
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
