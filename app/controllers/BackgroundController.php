<?php

class BackgroundController extends \BaseController {

    public function __construct() {
        $this->beforeFilter('serviceAuth');
        $this->beforeFilter('serviceCSRF');
    }

    /**
     * Send back all backgrounds as JSON
     *
     * @return Response
     */
    public function index() {
        $backgrounds = BackgroundTable::orderBy('name')->where('active', '=', '1')->get()->toArray();

        return Response::json([
            'backgrounds' => $backgrounds
        ]);
    }
} 