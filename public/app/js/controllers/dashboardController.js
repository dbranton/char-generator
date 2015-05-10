angular.module('app')
        .controller('DashboardController', DashboardController);
    function DashboardController($scope, $modal, charGenFactory, ngTableParams, general, configObj) {
        var path = configObj.path;
        if ($scope.$parent.flash) {
            $scope.flash = $scope.$parent.flash;
            general.clearMsg();  // clear $rootScope.flash
        }
        $scope.tableParams = new ngTableParams({
            page: 1,            // show first page
            count: 10           // count per page
            /*sorting: {

             }*/
        }, {
            counts: [], // hide page counts control
            total: 0,   //$scope.characters.length, // length of data
            getData: function($defer, params) {
                charGenFactory.Character().get({}, function(data) {
                    $scope.characters = data.characters;
                    // update table params
                    params.total(data.characters.length);
                    // set new data
                    $defer.resolve(data.characters);
                    //$defer.resolve($scope.characters.slice((params.page() - 1) * params.count(), params.page() * params.count()));
                });
            }
        });

        $scope.removeCharacter = function(character) {
            var opts = {
                templateUrl: path + '/app/views/dialog_confirm.html',
                size: 'sm',
                controller: function($scope, $modalInstance) {
                    $scope.ok = function () {
                        $modalInstance.close(true);
                    };
                    $scope.cancel = function () {
                        $modalInstance.dismiss('cancel');
                    };
                }
            };
            var confirm = $modal.open(opts);
            confirm.result.then(function(response) {
                charGenFactory.Character(character.id).delete({}, function(response) {
                    if (response.character_id) {
                        _.remove($scope.characters, function(obj) { return obj.id == response.character_id; });
                        $scope.tableParams.reload();
                    }
                });
            });
        };
    }