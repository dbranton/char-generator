<?php

class RaceController extends \BaseController {

    public $raceList = array();
    public $featureList = array();
    public $subfeatureList = array();

    public function __construct() {
        //$this->beforeFilter('serviceAuth');
        $this->beforeFilter('serviceCSRF');
    }

    /**
     * Send back all races as JSON
     *
     * @return Response
     */
    public function index() {
        $races = RaceTable::where('active', '=', '1')
            ->where('subrace', '=', '')->orderBy('name')->get()->toArray();
        foreach ($races as $race) {
            $raceObj = $race;
            $subraces = RaceTable::where('active', '=', '1')->where('name', '=', $race['name'])->where('subrace', '!=', '')
                ->orderBy('name')->get()->toArray();
            if (!empty($subraces)) {
                foreach ($subraces as $subrace) {
                    $raceObj['subrace_id'] = (int) $subrace['id'];
                    unset($raceObj['subrace']);
                    unset($raceObj['subrace_desc']);
                    $raceObj['parent'] = $subrace['name'];
                    $raceObj['name'] = $subrace['subrace'];
                    $features = FeaturesTable::join('race_features', 'features_table.id', '=', 'race_features.feature_id')
                        ->where('race_features.race_id', '=', $raceObj['readable_id'])
                        ->where('subrace_id', '=', '')
                        ->orWhere('subrace_id', '=', $raceObj['subrace_id'])
                        ->orderBy('name')
                        ->get()
                        ->toArray();
                    $raceObj['traits'] = $features;

                    $this->raceList[] = $raceObj;   // push to array
                };
            } else {
                $this->featureList = array();    // reset
                $features = FeaturesTable::join('race_features', 'features_table.id', '=', 'race_features.feature_id')
                    ->where('race_features.race_id', '=', $raceObj['readable_id'])
                    ->where('subrace_id', '=', '')
                    ->orderBy('name')
                    ->get()
                    ->toArray();
                foreach ($features as $feature) {
                    if ($feature['parent_id'] == '' || $feature['parent_id'] == '0' || empty($feature['parent_id'])) {
                        $feature = $this->_handleSubFeatures($features, $feature);
                        $feature['benefit_desc'] = str_replace('href', 'spell-info-dialog', $feature['benefit_desc']);
                        $this->featureList[] = $feature;
                    }
                }

                $raceObj['subrace_id'] = $raceObj['id'];
                $raceObj['parent'] = $raceObj['name'];
                $raceObj['traits'] = $this->featureList;    //$features;
                $this->raceList[] = $raceObj;
            }
        };

        return Response::json([
            'races' => $this->raceList
        ]);
    }

    private function _handleSubFeatures($features, $feature) {
        if ($feature['type'] == 'super_feature' || $feature['type'] == 'super_feature_alt') {
            $this->subfeatureList = array();  // reset
            foreach ($features as $subfeature) {
                if ($subfeature['parent_id'] == $feature['feature_id']) {
                    $this->subfeatureList[] = $subfeature;
                }
            }
            $feature['subfeatures'] = $this->subfeatureList;
        }
        return $feature;
    }

    /**
     * Show the form for creating a new resource.
     *
     * @return Response
     */
    public function create()
    {
        //
    }

    /**
     * Store a newly created resource in storage.
     *
     * @return Response
     */
    public function store()
    {
        //
    }

    /**
     * Display the specified resource.
     *
     * @param  int  $id
     * @return Response
     */
    public function show($id)
    {
        //
    }

    /**
     * Show the form for editing the specified resource.
     *
     * @param  int  $id
     * @return Response
     */
    public function edit($id)
    {
        //
    }

    /**
     * Update the specified resource in storage.
     *
     * @param  int  $id
     * @return Response
     */
    public function update($id)
    {
        //
    }

    /**
     * Remove the specified resource from storage.
     *
     * @param  int  $id
     * @return Response
     */
    public function destroy($id)
    {
        //
    }
}