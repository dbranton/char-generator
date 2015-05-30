angular.module("app",['ngResource','ngSanitize', 'ngRoute', 'ui.bootstrap', 'ui.router', 'ui.select',
        'ngTable', 'angular-loading-bar', 'mobile-angular-ui.core.fastclick', 'mobile-angular-ui.gestures',
        'mgo-angular-wizard', 'appConfig', 'oc.lazyLoad'])

	.config(['$stateProvider', '$urlRouterProvider', '$locationProvider', 'configObjProvider',
            function($stateProvider, $urlRouterProvider, $locationProvider, configObjProvider){

		$locationProvider.html5Mode(true);

        var deviceType = configObjProvider.deviceType,
            locationName = configObjProvider.locationName,
            path = configObjProvider.path;

        function loadCtrl($ocLazyLoad, ctrlPath) {
            var fullPath = path + ctrlPath;
            var test = $ocLazyLoad.getModuleConfig('app');
            if (!$ocLazyLoad.isLoaded('generatorController.js')) {
                return $ocLazyLoad.load(fullPath);
            }
        }

		// Now set up the states
		$stateProvider
			.state('generator', {
				url: locationName,
				templateUrl: path + "/app/generator/generator.html",
				controller: 'GeneratorController',
                resolve: { // Any property in resolve should return a promise and is executed before the view is loaded
                    loadMyCtrl: ['$ocLazyLoad', function($ocLazyLoad) {
                        return loadCtrl($ocLazyLoad, '/app/generator/generatorController.js');
                    }]
                }
			})
			.state('dashboard', {
				url: locationName + "dashboard",
				templateUrl: path + "/app/dashboard/dashboard.html",
				controller: 'DashboardController',
                resolve: { // Any property in resolve should return a promise and is executed before the view is loaded
                    loadMyCtrl: ['$ocLazyLoad', function($ocLazyLoad) {
                        return loadCtrl($ocLazyLoad, '/app/dashboard/dashboardController.js');
                    }]
                }
			})
            .state('character', {
                url: locationName + "character/:characterId",
                templateUrl: path + "/app/character/dashboard.character.html",
                controller: 'CharacterController',
                resolve: { // Any property in resolve should return a promise and is executed before the view is loaded
                    loadMyCtrl: ['$ocLazyLoad', function($ocLazyLoad) {
                        return loadCtrl($ocLazyLoad, '/app/character/characterController.js');
                    }]
                }
            })
			.state('login', {
				url: locationName + "login",
				templateUrl: path + "/app/login/login.html",
				controller: 'LoginController',
                resolve: { // Any property in resolve should return a promise and is executed before the view is loaded
                    loadMyCtrl: ['$ocLazyLoad', function($ocLazyLoad) {
                        return loadCtrl($ocLazyLoad, '/app/login/loginController.js');
                    }]
                }
			})
			.state('register', {
				url: locationName + "register",
				templateUrl: path + "/app/register/register.html",
				controller: 'RegisterController',
                resolve: { // Any property in resolve should return a promise and is executed before the view is loaded
                    loadMyCtrl: ['$ocLazyLoad', function($ocLazyLoad) {
                        return loadCtrl($ocLazyLoad, '/app/register/registerController.js');
                    }]
                }
			});

        $urlRouterProvider.otherwise(locationName);
	}])

	.config(function($httpProvider){

		var interceptor = function($rootScope, $location, $q, configObj){
            var success = function(response){
                return response;
            };

            var error = function(response){
                var locationName = configObj.locationName;
                if (response.status === 401){
                    delete sessionStorage.authenticated;
                    if ($location.path() !== locationName + 'register') {
                        $location.path(locationName + 'login');
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

	.run(function($rootScope, $http, $state, CSRF_TOKEN, general){

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
        $rootScope.$on('$stateChangeStart', function(evt, toState) {
            if ((toState.name === 'generator' || toState.name === 'dashboard' || toState.name === 'character') &&
                !$rootScope.userId) {
                $state.go('login');
                evt.preventDefault();
            }
        });
        $rootScope.userId = sessionStorage.userId || null;

        //FastClick.attach(document.body);

        $rootScope.logout = function() {
            delete sessionStorage.userId;
            general.showMsg("Successfully logged out");
            $rootScope.userId = null;
        }
	});