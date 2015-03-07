<?php

class SkillController extends \BaseController {

    public $skillsList = array();

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
        foreach ($skills as $skill) {
            $skill['id'] = (int) $skill['id'];
            $this->skillsList[] = $skill;
        }
        return Response::json([
            'skills' => $this->skillsList
        ]);
    }
}