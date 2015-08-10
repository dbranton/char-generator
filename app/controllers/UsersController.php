<?php

class UsersController extends \BaseController {

    /**
     * Create a new instance of the UsersController
     *
     * @return void
     */
    public function __construct()
    {
        $this->beforeFilter('serviceCSRF', array('on' => 'post'));
    }

    public function index()
    {
        //return View::make('register.index');
    }

    /**
     * Create a new user
     */
    public function store() {
        $user = new User;
        $user->username = Input::get('username');
        $user->email = Input::get('email');
        $user->password = Input::get('password');
        $user->password_confirmation = Input::get('password_confirmation');
        if ($user->save()) {
            // validation has passed and saved, display success message
            return Response::json([
                'status' => 'success',
                'message' => 'You have successfully registered!'
            ], 202);
        } else {
            // validation has failed, display error messages
            return Response::json([
                'status' => 'error',
                'message' => $user->errors()->all()
            ], 401);
        }
    }

} 