var helper = require("./helper.js");

module.exports = function (ErpUser) {
  // remove all remote API methods, leaving only login/logout and token management
  helper.readOnly(ErpUser);
  ErpUser.disableRemoteMethod('find', true);
  ErpUser.disableRemoteMethod('findById', true);
  ErpUser.disableRemoteMethod('confirm', true);
  ErpUser.disableRemoteMethod('resetPassword', true);
};
