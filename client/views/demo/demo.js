// Licensed under the Apache License. See footer for details.
(function () {

  var app = angular.module('erpApp');

  app.config(function ($stateProvider, $urlRouterProvider) {
    $stateProvider
      .state('demo', {
        url: '/demo',
        templateUrl: 'views/demo/new.html'
      })
      .state('demo/view', {
        url: '/demo/:guid',
        templateUrl: 'views/demo/view.html'
      });
  });

  app.controller('NewDemoController', ['$scope', '$state', 'Demo', function ($scope, $state, Demo) {
    console.log("NewDemoController()");

    $scope.newDemo = function () {
      console.log("Creating new Demo environment");
      Demo.newDemo({
          name: $("#name").val()
        },
        function (demo) {
          console.log(demo);
          $state.go('demo/view', {
            guid: demo.guid
          });
        },
        function (res) {
          console.log(res);
        });
    };

    $scope.injectData = function () {
      Demo.seed(function () {
        console.log("Seeded");
      }, function (res) {
        console.log(res);
      });
    };

    $scope.resetData = function () {
      Demo.reset(function () {
        console.log("Reset complete");
      }, function (res) {
        console.log(res);
      });
    };

  }]);

  app.controller('ViewDemoController', ['$scope', '$state', '$stateParams', 'Demo', function ($scope, $state, $stateParams, Demo) {
    console.log("ViewDemoController()");

    $scope.demo = {};
    $scope.retailers = [];

    function load() {
      Demo.findByGuid({
        guid: $stateParams.guid
      }, function (demo) {
        $scope.demo = demo;
      }, function (res) {
        console.log(res);
      });

      Demo.retailers({
        guid: $stateParams.guid
      }, function (retailers) {
        $scope.retailers = retailers;
      }, function (res) {
        console.log("error", res);
      });
    }

    load();

    $scope.loginAs = function (user) {
      Demo.loginAs({
        guid: $scope.demo.guid
      }, {
        userId: user.id
      }, function (accessToken) {
        console.log("Received", accessToken);
        $("#token-" + user.id).html(accessToken.id);
      }, function (res) {
        console.log(res);
      });
    }

    $scope.addUser = function () {
      Demo.createUserByGuid({
        guid: $scope.demo.guid,
      }, {
        retailerId: $("#retailerId").val()
      }, function (demo) {
        load();
      }, function (res) {
        console.log(res);
      });
    }

    $scope.deleteDemo = function () {
      Demo.deleteByGuid({
        guid: $scope.demo.guid
      }, function () {
        console.log("Deleted demo");
        $state.go("demo");
      }, function (res) {
        console.log(res);
      });
    }


  }]);

})();
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
