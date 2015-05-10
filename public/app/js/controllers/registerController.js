angular.module("app")
    .controller('RegisterController', RegisterController);

function RegisterController($scope, $sanitize, $state, general) {

    /********
     * Alerts
     ********/
    $scope.alerts = [];
    $scope.closeAlert = function(index) {
        $scope.alerts.splice(index, 1);
    };

    /********
     * Register
     ********/
    $scope.register = function(){
        $scope.submitted = true;
        if ($scope.registerForm.$valid) {
            general.register().save({
                'email': $sanitize($scope.email),
                'password': $sanitize($scope.password),
                'password_confirmation': $sanitize($scope.password_confirmation),
                'username': $sanitize($scope.username)
            }, function(response) {
                $state.go('login');
                //$scope.alerts = [{type: "success", msg: response.message}];
                general.showMsg(response.data.message);
                //general.clearMsg();
                //sessionStorage.authenticated = true;
            }, function(response){
                if (angular.isArray(response.data.message)) {
                    $scope.alerts = [];
                    angular.forEach(response.data.message, function(message) {
                        $scope.alerts.push({type: "danger", msg: message});
                    });
                }
            });
        }
    }

};