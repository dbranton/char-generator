<?php

class FeatsController extends \BaseController {

    public function __construct() {
        $this->beforeFilter('serviceCSRF');
    }

    /**
     * Display a listing of the resource.
     *
     * @return Response
     */
    public function index() {
        $feats = FeatsTable::where('active', '=', '1')
            ->orderBy('name')->get()->toArray();

        return Response::json([
            'feats' => $feats
        ]);
    }

} 