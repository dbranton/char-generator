var app = angular.module("myApp",['ngResource','ngSanitize', 'ngRoute', 'ui.bootstrap', 'ui.router', 'ui.select', 'ngTable'])

	.config(['$stateProvider', '$urlRouterProvider', '$locationProvider',function($stateProvider, $urlRouterProvider, $locationProvider){

		$locationProvider.html5Mode(true);

		$urlRouterProvider.otherwise("/");

		// Now set up the states
		$stateProvider
			.state('home', {
				url: "/",
				templateUrl: "/app/views/character_generator.html",
				controller: 'homeController'
			})
			.state('dashboard', {
				url: "/dashboard",
				templateUrl: "/app/views/dashboard.html",
				controller: 'dashboardController'
			})
            .state('character', {
                url: "/character/:characterId",
                templateUrl: "/app/views/dashboard.character.html",
                controller: 'characterController'
            })
			.state('login', {
				url: "/login",
				templateUrl: "/app/views/login.html",
				controller: 'loginController'
			})
			.state('register', {
				url: "/register",
				templateUrl: "/app/views/register.html",
				controller: 'registerController'
			})

	}])

	.config(function($httpProvider){

		var interceptor = function($rootScope,$location,$q,Flash){
            var success = function(response){
                return response;
            };

            var error = function(response){
                if (response.status === 401){
                    delete sessionStorage.authenticated;
                    if ($location.path() !== '/register') {
                        $location.path('/login');
                    }
                    //Flash.show(response.data.message);    // handled now in the controllers
                }
                return $q.reject(response);
            };
            return function(promise){
                return promise.then(success, error);
            };
		};
		$httpProvider.interceptors.push(interceptor);

	})

	.run(function($rootScope, $http, CSRF_TOKEN, Flash){

		$http.defaults.headers.common['csrf_token'] = CSRF_TOKEN;
        /*
         Receive emitted message and broadcast it.
         Event names must be distinct or browser will blow up!
         */
        $rootScope.$on('handleEmit', function(event, args) {
            $rootScope.$broadcast('handleBroadcast', args);
        });
        $rootScope.$on('handleAuthentication', function(event, args) {
            $rootScope.userId = args.userId;
        });
        $rootScope.userId = sessionStorage.userId || null;

        $rootScope.logout = function() {
            delete sessionStorage.userId;
            Flash.show("Successfully logged out");
            $rootScope.userId = null;
        }
	});