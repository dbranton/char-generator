<?php

class ToolsController extends \BaseController {

    public function __construct() {
        //$this->beforeFilter('serviceAuth');
        $this->beforeFilter('serviceCSRF');
    }

    /**
     * Display a listing of the resource.
     *
     * @return Response
     */
    public function index() {
        return Response::json([
            'tools' => ToolsTable::orderBy('name')->get()->toArray()
        ]);
    }
} 