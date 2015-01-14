<!DOCTYPE html>
<html lang="en">

<head>
	<meta http-equiv="Content-Type" content="text/html;charset=utf-8">
	<meta name="viewport" content="width=device-width, initial-scale=1.0">
	<meta name="description" content="">
	<meta name="Daniel Branton" content="">
	<title>Character Generator</title>
	<link href="//netdna.bootstrapcdn.com/font-awesome/4.0.3/css/font-awesome.css" rel="stylesheet">
	<link href="/assets/style.min.css" rel="stylesheet">
    <link href="/assets/style.css" rel="stylesheet">
    <base href="/">
</head>

<body ng-app="myApp">

<nav class="navbar navbar-inverse navbar-fixed-top" role="navigation">
	<div class="container">
		<div class="navbar-header">
			<button type="button" class="navbar-toggle" data-toggle="collapse" data-target=".navbar-ex1-collapse">
				<span class="sr-only">Toggle navigation</span>
				<span class="icon-bar"></span>
				<span class="icon-bar"></span>
				<span class="icon-bar"></span>
			</button>
			<a class="navbar-brand" href="/">Character Generator</a>
		</div>

		<!-- Collect the nav links, forms, and other content for toggling -->
		<div class="collapse navbar-collapse navbar-ex1-collapse">
			<ul class="nav navbar-nav navbar-right">
                <li ng-show="userId"><a href="/dashboard">DASHBOARD</a></li>
				<li ng-hide="userId"><a href="/login">LOGIN</a></li>
                <li ng-show="userId"><a href="/login" ng-click="logout()">LOGOUT</a></li>
				<li><a href="/register">REGISTER</a></li>
				<li><a href="/about">ABOUT</a></li>
			</ul>
		</div>
		<!-- /.navbar-collapse -->
	</div>
	<!-- /.container -->
</nav>

<div class="container" style="margin-top:59px;">
	<div ui-view></div>

	<hr>

	<footer>
		<div class="row">
			<div class="col-lg-12">
				<p>Copyright &copy; Daniel Branton 2014</p>
			</div>
		</div>
	</footer>

</div>
<!-- /.container -->

<script src="/assets/script.min.js"></script>
<script src="/assets/js/select.js"></script>

<script src="/app/js/app.js"></script>
<script src="/app/js/controllers.js"></script>
<script src="/app/js/directives.js"></script>
<script src="/app/js/filters.js"></script>
<script src="/app/js/services.js"></script>
<script>
	angular.module("myApp").constant("CSRF_TOKEN", '<?php echo csrf_token(); ?>');
</script>

</body>

</html>