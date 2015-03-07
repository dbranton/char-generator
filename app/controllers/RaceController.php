<?php

class RaceController extends \BaseController {

    public $raceList = array();

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
                $features = FeaturesTable::join('race_features', 'features_table.id', '=', 'race_features.feature_id')
                    ->where('race_features.race_id', '=', $raceObj['readable_id'])
                    ->where('subrace_id', '=', '')
                    ->orderBy('name')
                    ->get()
                    ->toArray();
                $raceObj['subrace_id'] = $raceObj['id'];
                $raceObj['traits'] = $features;
                $this->raceList[] = $raceObj;
            }
        };

        return Response::json([
            'races' => $this->raceList
        ]);
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