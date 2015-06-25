<?php

class WeaponsController extends \BaseController {

    //public $weaponsList = array();

    public function __construct() {
        $this->beforeFilter('serviceCSRF');
    }

    /**
     * Send back all weapons as JSON
     *
     * @return Response
     */
    public function index() {
        $weapon_types = DB::table('weapons_table')
            ->where('active', '=', '1')
            ->where('weapon_type', '=', 'weapon_type')
            ->get();
        $simple_weapons = DB::table('weapons_table')
            ->where('active', '=', '1')
            ->where('weapon_type', '=', 'simple_weapon')
            ->orderBy('name')
            ->get();
        $martial_weapons = DB::table('weapons_table')
            ->where('active', '=', '1')
            ->where('weapon_type', '=', 'martial_weapon')
            ->orderBy('name')
            ->get();
        return Response::json([
            'weaponTypes' => $weapon_types,
            'simpleWeapons' => $simple_weapons,
            'martialWeapons' => $martial_weapons
        ]);
    }
} 