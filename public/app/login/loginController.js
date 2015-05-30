angular.module("app")
    .controller('LoginController', LoginController);

function LoginController($scope, $sanitize, general, $state){

    /********
     * Alerts
     ********/
    $scope.alerts = [];
    $scope.closeAlert = function(index) {
        general.clearMsg();
        $scope.alerts.splice(index, 1);
    };

    /********
     * Login
     ********/
    $scope.login = function(){
        $scope.submitted = true;
        if ($scope.loginForm.$valid) {
            general.login().save({
                'email': $sanitize($scope.email),
                'password': $sanitize($scope.password)
            },function(response) {
                general.setSessionStorageProp('userId', response.user.id);
                $scope.$emit('handleAuthentication', {userId: response.user.id});
                $state.go('dashboard');
                general.clearMsg();
            },function(response){
                $scope.alerts = [{ type: "danger", msg: response.data.message }];
            });
        }
    }

}