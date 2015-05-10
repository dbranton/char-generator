<?php

class ClassController extends \BaseController {

    public $classList = array();
    public $subclassList = array();
    public $featureList = array();
    public $subfeatureList = array();
    public $subclassFeatureList = array();

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
        $classes = ClassTable::where('active', '=', '1')
            ->where('type', '=', 'class')->orderBy('name')->get()->toArray();
        foreach ($classes as $class) {
            $this->featureList = array();    // reset
            $features = $this->_getClassFeatures($class);
            foreach ($features as $feature) {
                if ($feature['parent_id'] == '0' || empty($feature['parent_id'])) {
                    $this->subfeatureList = array();    // reset
                    $classLevelBenefits = $this->_getClassBenefits($feature);
                    $feature = $this->_handleSubFeatures($features, $feature);
                    if ($feature['type'] == 'subclass') {
                        $subclasses = ClassTable::select('class_table.*')
                            ->join('subclass_features', 'class_table.readable_id', '=', 'subclass_features.class_id')
                            ->where('active', '=', '1')
                            ->where('subclass_features.feature_id', '=', $feature['id'])
                            ->orderBy('name')
                            ->get()
                            ->toArray();
                        $this->subclassList = array();  // reset
                        foreach ($subclasses as $subclass) {
                            $subclassFeatures = $this->_getClassFeatures($subclass);
                            $this->subclassFeatureList = array(); // reset
                            foreach ($subclassFeatures as $subclassFeature) {
                                if ($subclassFeature['parent_id'] == '0' || empty($subclassFeature['parent_id'])) {
                                    $subclassFeature = $this->_handleSubFeatures($subclassFeatures, $subclassFeature);
                                    $subclassFeature['benefits'] = $this->_getClassBenefits($subclassFeature);
                                    $this->subclassFeatureList[] = $subclassFeature;
                                }
                            }
                            $subclass['features'] = $this->subclassFeatureList;
                            $this->subclassList[] = $subclass;
                        }
                        $feature['subclasses'] = $this->subclassList;
                    }
                    if (!empty($classLevelBenefits)) {
                        $feature['benefits'] = $classLevelBenefits;
                    }
                    $this->featureList[] = $feature;
                }
            }
            $class['features'] = $this->featureList;
            $this->classList[] = $class;
        };
        return Response::json([
            'classes' => $this->classList
        ]);
    }

    private function _getClassFeatures($classObj) {
        return FeaturesTable::where('features_table.class_id', '=', $classObj['id'])
            ->orderBy('level')
            ->orderBy('name')
            ->get()
            ->toArray();
    }

    private function _getClassBenefits($feature) {
        $classBenefits = DB::table('class_features')
            ->where('feature_id', '=', $feature['id'])
            ->orderBy('level')
            ->get();
        // replace any hrefs in benefit_desc with spell-info-dialog attribute to be used by angular
        foreach ($classBenefits as $classBenefit) {
            $classBenefit->benefit_desc = str_replace('href', 'spell-info-dialog', $classBenefit->benefit_desc);
        }
        return $classBenefits;
    }

    private function _handleSubFeatures($features, $feature) {
        if ($feature['type'] == 'super_feature' || $feature['type'] == 'super_feature_alt') {
            $this->subfeatureList = array();  // reset
            foreach ($features as $subfeature) {
                if ($subfeature['parent_id'] == $feature['id']) {
                    $subfeature['benefits'] = $this->_getClassBenefits($subfeature);
                    $this->subfeatureList[] = $subfeature;
                }
            }
            $feature['subfeatures'] = $this->subfeatureList;
        }
        return $feature;
    }
} 