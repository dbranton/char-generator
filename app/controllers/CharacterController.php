<?php

class CharacterController extends \BaseController {

    /**
     * Create a new instance of the CharactersController
     *
     * @return void
     */
    public function __construct() {
        $this->beforeFilter('serviceAuth');
    }

    /**
     * Get all user's characters
     *
     * @return Response
     */
    public function index() {
        $user = Auth::user();
        if (isset($user['id'])) {
            return Response::json([
                'characters' => Character::where('user_id', '=', $user['id'])->orderBy('created_at', 'desc')->get()->toArray()
            ]);
        }
    }

    public function destroy($character_id) {
        $user = Auth::user();
        if (isset($user['id'])) {
            $character = Character::where('user_id', '=', $user['id'])->where('id', '=', $character_id);
            $character->delete();
            return Response::json([
                'success' => true,
                'user_id' => $user['id'],
                'character_id' => $character_id
            ]);
        }
    }

    public function show($character_id) {
        $user = Auth::user();
        if (isset($user['id'])) {
            $character = Character::select('character_table.*', 'background_table.trait_name', 'background_table.trait_desc')
                ->join('background_table', 'character_table.background', '=', 'background_table.name')
                ->where('user_id', '=', $user['id'])->where('character_table.id', '=', $character_id)->first()->toArray();
            if (!empty($character['racial_trait_ids'])) {
                $character['traits'] = DB::table('race_features as rf')
                    ->select('rf.benefit_desc', 'features_table.name')
                    ->join('features_table', 'features_table.id', '=', 'rf.feature_id')
                    ->whereIn('rf.id', explode(', ', $character['racial_trait_ids']))
                    ->orderBy('name')
                    ->get();
                // replace any hrefs in benefit_desc with spell-info-dialog attribute to be used by angular
                foreach ($character['traits'] as $trait) {
                    $trait->benefit_desc = str_replace('href', 'spell-info-dialog', $trait->benefit_desc);
                }
            }
            if (!empty($character['class_feature_ids'])) {
                $character['features'] = DB::table('class_features as cf')
                    ->select('cf.benefit_desc',
                        DB::raw("(CASE
                            WHEN parent_name = '' THEN name
						    ELSE CONCAT(parent_name, ' (', name, ')') END)
						    AS name"
                        )
                    )
                    ->join('features_table', 'features_table.id', '=', 'cf.feature_id')
                    ->whereIn('cf.id', explode(', ', $character['class_feature_ids']))
                    ->orderBy('name')
                    ->get();
                // replace any hrefs in benefit_desc with spell-info-dialog attribute to be used by angular
                foreach ($character['features'] as $feature) {
                    $feature->benefit_desc = str_replace('href', 'spell-info-dialog', $feature->benefit_desc);
                }
            }
            if (!empty($character['cantrips'])) {
                $character['cantrips'] = DB::table('spells_table')
                    ->whereIn('spells_table.id', explode(', ', $character['cantrips']))
                    ->orderBy('name')
                    ->get();
            }
            if (!empty($character['bonus_cantrip'])) {
                $character['bonus_cantrip'] = DB::table('spells_table')
                    ->whereIn('spells_table.id', explode(', ', $character['bonus_cantrip']))
                    ->orderBy('name')
                    ->get();
            }
            if (!empty($character['spells'])) {
                $character['spells'] = DB::table('spells_table')
                    ->whereIn('spells_table.id', explode(', ', $character['spells']))
                    ->orderBy('level')
                    ->orderBy('name')
                    ->get();
            }
            return Response::json([
                'character' => $character
            ]);
        }
    }

    /**
     * Store a newly created resource in storage.
     */
    public function store() {
        $user = Auth::user();
        $character = Input::get('character');
        $data = array(
            'user_id' => $user['id'],   //$character['userId'],
            'name' => $character['name'],
            'race' => $character['raceObj']['name'],
            'background' => $character['background']['name'],
            'class' => $character['classObj']['name'],
            'level' => $character['level'],
            'size' => $character['raceObj']['size'],
            'speed' => $character['speed'],
            'proficiency_bonus' => $character['profBonus'],
            'initiative' => $character['initiative'],
            'hit_points' => $character['hitPoints'],
            'hit_dice' => $character['classObj']['hit_dice'],
            'armor_class' => $character['armorClass'],
            'armor_prof' => $character['armor'],
            'weapon_prof' => $character['weapons'],
            'tool_prof' => $character['tools'],
            'languages' => $character['languages'],
            'strength' => $character['ability']['str']['adjScore'],
            'dexterity' => $character['ability']['dex']['adjScore'],
            'constitution' => $character['ability']['con']['adjScore'],
            'intelligence' => $character['ability']['int']['adjScore'],
            'wisdom' => $character['ability']['wis']['adjScore'],
            'charisma' => $character['ability']['cha']['adjScore'],
            'str_mod' => $character['ability']['str']['mod'],
            'dex_mod' => $character['ability']['dex']['mod'],
            'con_mod' => $character['ability']['con']['mod'],
            'int_mod' => $character['ability']['int']['mod'],
            'wis_mod' => $character['ability']['wis']['mod'],
            'cha_mod' => $character['ability']['cha']['mod'],
            'saving_throws' => $character['classObj']['saving_throws'],
            'str_save' => $character['ability']['str']['savingThrow'],
            'dex_save' => $character['ability']['dex']['savingThrow'],
            'con_save' => $character['ability']['con']['savingThrow'],
            'int_save' => $character['ability']['int']['savingThrow'],
            'wis_save' => $character['ability']['wis']['savingThrow'],
            'cha_save' => $character['ability']['cha']['savingThrow'],
            'senses' => $character['passivePerception'],
            'skills' => $character['proficientSkills'],
            'acrobatics' => $character['skills'][0]['val'],
            'animal_handling' => $character['skills'][1]['val'],
            'arcana' => $character['skills'][2]['val'],
            'athletics' => $character['skills'][3]['val'],
            'deception' => $character['skills'][4]['val'],
            'history' => $character['skills'][5]['val'],
            'insight' => $character['skills'][6]['val'],
            'intimidation' => $character['skills'][7]['val'],
            'investigation' => $character['skills'][8]['val'],
            'medicine' => $character['skills'][9]['val'],
            'nature' => $character['skills'][10]['val'],
            'perception' => $character['skills'][11]['val'],
            'performance' => $character['skills'][12]['val'],
            'persuasion' => $character['skills'][13]['val'],
            'religion' => $character['skills'][14]['val'],
            'sleight_of_hand' => $character['skills'][15]['val'],
            'stealth' => $character['skills'][16]['val'],
            'survival' => $character['skills'][17]['val'],
            'date_added' => date("m/d/Y")
        );
        if (isset($character['raceObj']['racialTraits'])) {
            $racialTraitIds = array_map(function($val) {
                return $val['id'];
            }, $character['raceObj']['racialTraits']);
            $data['racial_trait_ids'] = implode(', ', $racialTraitIds);
        }
        if (isset($character['classObj']['charFeatures'])) {
            $classFeatureIds = array_map(function($val) {
                return $val['id'];
            }, $character['classObj']['charFeatures']);
            $data['class_feature_ids'] = implode(', ', $classFeatureIds);
        }
        if (isset($character['classObj']['subclassObj']['name'])) {
            $data['pseudo_class'] = $character['classObj']['subclassObj']['name'];
        }
        if (isset($character['classObj']['spellcasting'])) {
            $data['spell_ability'] = $character['classObj']['spellcasting']['spellAbility'];
            $data['spell_save_dc'] = $character['classObj']['spellcasting']['spellSaveDC'];
            $data['spell_attk_bonus'] = $character['classObj']['spellcasting']['spellAttkBonus'];
            if (isset($character['classObj']['selectedCantrips'])) {
                $cantripIds = array_map(function($val) {
                    return $val['id'];
                }, $character['classObj']['selectedCantrips']);
                $data['cantrips'] = implode(', ', $cantripIds);
            }
            if (isset($character['classObj']['selectedSpells'])) {
                $spellIds = array_map(function($val) {
                    return $val['id'];
                }, $character['classObj']['selectedSpells']);
                $data['spells'] = implode(', ', $spellIds);
            }
        }
        if (isset($character['raceObj']['spellcasting']) && isset($character['raceObj']['cantrip'])) {
            $bonusCantripIds = array_map(function($val) {
                return $val['id'];
            }, $character['raceObj']['cantrip']);
            if ($data['spell_ability'] == $character['raceObj']['spellcasting']['spellAbility']) {
                $cantripIds = isset($cantripIds) ? $cantripIds : array();
                $data['cantrips'] = implode(', ', array_merge($cantripIds, $bonusCantripIds));
            } else  {
                $data['bonus_spell_ability'] = $character['raceObj']['spellcasting']['spellAbility'];
                $data['bonus_spell_save_dc'] = $character['raceObj']['spellcasting']['spellSaveDC'];
                $data['bonus_spell_attk_bonus'] = $character['raceObj']['spellcasting']['spellAttkBonus'];
                $data['bonus_cantrip'] = implode(', ', $bonusCantripIds);
            }
        }
        if (isset($character['classObj']['selectedExpertise'])) {
            $data['expertise'] = implode(', ', $character['classObj']['selectedExpertise']);
        }


        Character::create($data);
        /*return Response::json([
                'status' => 'success',
                'data' => $data
            ]
        );*/

        /*$credentials = array(
            'name' => $character->name,
            'race' => $character->raceObj->name,
            'background' => $character->background->name,
            'class' => $character->classObj->name
        );*/
        /*if ($character->save()) {
            // validation has passed and saved, display success message
            return Response::json([
                    'status' => 'success',
                    'message' => 'You have successfully registered!'],
                202
            );
        } else {
            // validation has failed, display error messages
            return Response::json(
                [
                    'status' => 'error',
                    'message' => $character->errors()->all()
                ],
                401
            );
        }*/
    }


} 