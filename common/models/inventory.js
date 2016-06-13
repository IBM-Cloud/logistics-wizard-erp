// Licensed under the Apache License. See footer for details.
var helper = require("./helper.js");

module.exports = function(Inventory) {
  helper.simpleCrud(Inventory);
  helper.hideRelation(Inventory, "demo");
};
