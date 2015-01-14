<?php

class Character extends Eloquent {

    protected $fillable = array();  //'username', 'email', 'password_confirmation');
    protected $guarded = array('id');

    /**
     * The database table used by the model.
     *
     * @var string
     */
    protected $table = 'character_table';

    /**
     * The rules used to validate the model
     *
     * @var array
     */
    public static $rules = array(
        //'username'=>'required|alpha|min:2',
        //'email'=>'required|email|unique:users',
        //'password'=>'required|alpha_num|between:6,12|confirmed',
        //'password_confirmation'=>'required|alpha_num|between:6,12'
    );

    /**
     * The attributes excluded from the model's JSON form.
     *
     * @var array
     */
    //protected $hidden = array('password');
}