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
        $combat_feats = FeatsTable::where('active', '=', '1')
            ->where('type', '=', 'combat')
            ->orderBy('name')->get()->toArray();
        $skill_feats = FeatsTable::where('active', '=', '1')
            ->where('type', '=', 'skill')
            ->orderBy('name')->get()->toArray();

        return Response::json([
            'combatFeats' => $combat_feats,
            'skillFeats' => $skill_feats
        ]);
    }

} 