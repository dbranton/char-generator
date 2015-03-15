<!DOCTYPE html>
<html lang="en">
<?php
    $path = gethostname() === 'gator3222.hostgator.com' ? '/char-generator/public' : '';
    $detect = new Agent;
    $deviceType = ($detect->isMobile() ? ($detect->isTablet() ? 'tablet' : 'phone') : 'computer');
?>
<head>
	<meta http-equiv="Content-Type" content="text/html;charset=utf-8">
	<meta name="viewport" content="width=device-width, initial-scale=1.0">
	<meta name="description" content="">
	<meta name="Daniel Branton" content="">
	<title>Character Generator</title>
	<!--<link href="//netdna.bootstrapcdn.com/font-awesome/4.3.0/css/font-awesome.min.css" rel="stylesheet">-->
    <link href="<?php echo $path; ?>/assets/font-awesome/css/font-awesome.min.css" rel="stylesheet">
	<link href="<?php echo $path; ?>/assets/style.min.css" rel="stylesheet">
    <link href="<?php echo $path; ?>/assets/style.css" rel="stylesheet">
    <base href="/">
</head>

<body ng-app="myApp">
<div class="scrollable" style="padding-top:40px;">
<!-- HEADER -->
<div class="scrollable-header">
<nav class="navbar-static-top navbar-inverse" role="navigation"> <!--navbar-fixed-top-->
	<div class="container">
		<div class="navbar-header">
			<button type="button" class="navbar-toggle" data-toggle="collapse" data-target=".navbar-ex1-collapse">
				<span class="sr-only">Toggle navigation</span>
				<span class="icon-bar"></span>
				<span class="icon-bar"></span>
				<span class="icon-bar"></span>
			</button>
			<a class="navbar-brand" ui-sref="home">Character Generator</a>
		</div>

		<!-- Collect the nav links, forms, and other content for toggling -->
		<div class="collapse navbar-collapse navbar-ex1-collapse">
			<ul class="nav navbar-nav navbar-right">
                <li ng-show="userId"><a ui-sref="dashboard">Dashboard</a></li>
				<li ng-hide="userId"><a ui-sref="login">Login</a></li>
                <li ng-show="userId"><a ui-sref="login" ng-click="logout()">Logout</a></li>
				<li><a ui-sref="register">Register</a></li>
				<li><a ui-sref="about">About</a></li>
			</ul>
		</div>
		<!-- /.navbar-collapse -->
	</div>
	<!-- /.container -->
</nav>
    </div>
<div class=" scrollable-content">
    <div class="container">
        <div class="">
            <!--<div class="app-content">-->
                <ui-view></ui-view>
            <!--</div>-->
        </div>

        <hr>

        <footer class="">
            <div class="row">
                <div class="col-lg-12">
                    <p>Copyright &copy; Daniel Branton <?php echo date("Y") ?></p>
                </div>
            </div>
        </footer>
    </div>
</div>
</div>
<div ui-yield-to="modals"></div>

<script src="<?php echo $path; ?>/assets/script.min.js"></script>

<script src="<?php echo $path; ?>/app/js/app.js"></script>
<script src="<?php echo $path; ?>/app/js/controllers.js"></script>
<script src="<?php echo $path; ?>/app/js/directives.js"></script>
<script src="<?php echo $path; ?>/app/js/filters.js"></script>
<script src="<?php echo $path; ?>/app/js/services.js"></script>
<script>
	angular.module("myApp").constant("CSRF_TOKEN", '<?php echo csrf_token(); ?>');
    var hostname = '<?php echo gethostname(); ?>';
    var locationName = '/', location2Name = '', path = '';
    var deviceType = '<?php echo $deviceType ?>';
    if (hostname === 'gator3222.hostgator.com') {
        locationName = '/char-generator/';
        location2Name = 'public';
        path = '/char-generator/public';
    }
</script>

</body>

</html>