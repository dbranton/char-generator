<?php

class SkillController extends \BaseController {

    public function __construct() {
        //$this->beforeFilter('serviceAuth');
        $this->beforeFilter('serviceCSRF');
    }

    /**
     * Send back all skills as JSON
     *
     * @return Response
     */
    public function index() {
        $skills = SkillTable::orderBy('name')->get()->toArray();

        return Response::json([
            'skills' => $skills
        ]);
    }
}