angular.module('app')
    .factory('general', function($rootScope, $modal, $resource, configObj) {
        var deviceType = configObj.deviceType,
            locationName = configObj.locationName;
        return {
            register: function() {
                return $resource(locationName + "service/register/")
            },
            login: function() {
                return $resource(locationName + "service/authenticate/");
            },
            showMsg: function(message){
                $rootScope.flash = message;
            },
            clearMsg: function(){
                $rootScope.flash = "";
            },
            setSessionStorageProp: function(prop, val) {
                try {
                    sessionStorage[prop] = val;
                    return true;
                } catch (err) {
                    return false;
                }
            },
            openDialog: function openDialog(opts) {
                var localOpts = {
                    backdrop: true,
                    keyboard: true,
                    backdropClick: true
                };
                $.extend(localOpts, opts)
                if (deviceType === 'phone') {
                    localOpts.windowClass = 'modal-overlay';
                }
                return $modal.open(localOpts);
            },
            DialogItemsController: function($scope, $modalInstance, items, max, itemIds, title, featureType) {
                $scope.title = title;
                $scope.items = items;
                $scope.searchText = '';
                $scope.description = 'Click a list item to view more information';
                $scope.tempItems = [];
                _.each($scope.items, function(obj, index, list) {
                    if (obj.locked || (angular.isArray(itemIds) && itemIds.indexOf(obj.id) !== -1)) {
                        obj.active = true;
                        $scope.tempItems.push(obj);
                    } else {
                        obj.active = false;
                    }
                });

                $scope.description = 'Click a list item to view more information';
                $scope.max = parseInt(max);
                $scope.disabled = $scope.max  - $scope.tempItems.length > 0;
                $scope.featureType = featureType;

                $scope.showDescription = function(selectobj) {
                    $scope.selectedItem = angular.copy(selectobj.item); // used in UI
                    if (!$scope.selectedItem.locked) {
                        if (!$scope.selectedItem.active && $scope.max - $scope.tempItems.length > 0) {
                            $scope.tempItems.push($scope.selectedItem);
                            selectobj.item.active = true;
                        } else if ($scope.selectedItem.active) {
                            $scope.tempItems = _.reject($scope.tempItems, {'name': $scope.selectedItem.name});
                            selectobj.item.active = false;
                        }
                        $scope.disabled = $scope.max - $scope.tempItems.length > 0; // disabled is true if there are still features left to choose
                    }
                };

                $scope.done = function() {
                    if (angular.isArray($scope.tempItems)) {
                        $modalInstance.close($scope.tempItems);
                    }
                };

                $scope.close = function(){
                    $modalInstance.dismiss('cancel');
                };
            }
        };
    });