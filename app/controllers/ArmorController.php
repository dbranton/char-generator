<?php

class ArmorController extends \BaseController {

    //public $weaponsList = array();

    public function __construct() {
        $this->beforeFilter('serviceCSRF');
    }

    /**
     * Send back all armor as JSON
     *
     * @return Response
     */
    public function index() {
        $armor_types = DB::table('armor_table')
            ->where('active', '=', '1')
            ->where('armor_type', '=', 'armor_type')
            ->orderBy('sequence')
            ->get();
        $light_armor = DB::table('armor_table')
            ->where('active', '=', '1')
            ->where('armor_type', '=', 'light_armor')
            ->orderBy('sequence')
            ->get();
        $medium_armor = DB::table('armor_table')
            ->where('active', '=', '1')
            ->where('armor_type', '=', 'medium_armor')
            ->orderBy('sequence')
            ->get();
        $heavy_armor = DB::table('armor_table')
            ->where('active', '=', '1')
            ->where('armor_type', '=', 'heavy_armor')
            ->orderBy('sequence')
            ->get();
        $shields = DB::table('armor_table')
            ->where('active', '=', '1')
            ->where('armor_type', '=', 'shields')
            ->orderBy('sequence')
            ->get();
        return Response::json([
            'armorTypes' => $armor_types,
            'lightArmor' => $light_armor,
            'mediumArmor' => $medium_armor,
            'heavyArmor' => $heavy_armor,
            'shields' => $shields
        ]);
    }
} 