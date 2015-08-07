<?php

/*
|--------------------------------------------------------------------------
| Application Routes
|--------------------------------------------------------------------------
|
| Here is where you can register all of the routes for an application.
| It's a breeze. Simply tell Laravel the URIs it should respond to
| and give it the Closure to execute when that URI is requested.
|
*/

/** all API routes go first, any uncaught routes go to index */
Route::group(array('prefix' => 'service'), function() {
    Route::resource('authenticate', 'AuthenticationController');
    //Route::resource('movies', 'MovieController');
    Route::resource('register', 'UsersController');
    Route::resource('character', 'CharacterController');
    Route::resource('skills_table', 'SkillController');
    Route::resource('race_table', 'RaceController');
    Route::resource('background_table', 'BackgroundController');
    Route::resource('class_table', 'ClassController');
    Route::resource('feats_table', 'FeatsController');
    Route::resource('language_table', 'LanguageController');
    Route::resource('tools_table', 'ToolsController');
    Route::resource('armor_table', 'ArmorController');
    Route::resource('weapons_table', 'WeaponsController');
    Route::get('spells_table/{class_id}/{max_spell_level}/{term?}', 'SpellsController@getSpellsBySchool'); //->where(array('class_id' => '[0-9]+', 'max_spell_level' => '[0-9]+', 'term' => '[a-z]+'));
    Route::get('spells_by_level/{class_id}/{spell_level}/{term?}', 'SpellsController@getSpellsByLevel');
    Route::get('cantrips/{class_id}/{term?}', 'SpellsController@getCantrips');
    Route::get('slots/{class_id}/{level}', 'SpellsController@getSpellSlots'); // for some reason, had a problem with having an underscore in the route name
    Route::get('spells/{spell_id}', 'SpellsController@getSpell');
    //Route::get('spells_by_school/{class_id}/{max_spell_level}/{school}/{term?}', 'SpellsController@getSpellsBySchool');
});


Route::any('{all}', function($uri) {
	return View::make('index');
})->where('all', '.*');