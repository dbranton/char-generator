<?php

class BackgroundController extends \BaseController {

    public $backgroundList = array();
    public $skillList = array();
    public $toolList = array();

    public function __construct() {
        //$this->beforeFilter('serviceAuth');
        $this->beforeFilter('serviceCSRF');
    }

    /**
     * Send back all backgrounds as JSON
     *
     * @return Response
     */
    public function index() {
        $backgrounds = BackgroundTable::orderBy('name')->where('active', '=', '1')->get()->toArray();
        foreach ($backgrounds as $background) {
            $this->skillList = array();
            $skillList = $this->_getSkills(explode(', ', $background['skills']));
            $background['skills'] = $skillList;
            $toolList = $this->_getTools(explode(', ', $background['tools']));
            $background['tools'] = $toolList;
            $backgroundList[] = $background;
        }
        return Response::json([
            'backgrounds' => $backgroundList
        ]);
    }

    private function _getSkills($skills) {
        return SkillTable::whereIn('readable_id', $skills)
            ->orderBy('name')
            ->get()
            ->toArray();
    }

    private function _getTools($tools) {
        return ToolsTable::whereIn('readable_id', $tools)
            ->orderBy('name')
            ->get()
            ->toArray();
    }
} 