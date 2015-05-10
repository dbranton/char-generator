<?php

class WeaponsController extends \BaseController {

    //public $weaponsList = array();

    public function __construct() {
        $this->beforeFilter('serviceCSRF');
    }

    /**
     * Send back all backgrounds as JSON
     *
     * @return Response
     */
    public function index() {
        $weapons = DB::table('weapons_table')
            ->where('active', '=', '1')
            ->orderBy('name')
            ->get();
        return Response::json([
            'weapons' => $weapons
        ]);
    }
} 