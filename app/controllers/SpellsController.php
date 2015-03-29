<?php

class SpellsController extends \BaseController {

    public function __construct() {
        //$this->beforeFilter('serviceAuth');
        $this->beforeFilter('serviceCSRF');
    }

    public function index() {
        // do nothing
    }

    public function getSpellsBy($classId, $maxSpellLevel, $term='') {
        $spells = SpellsTable::select('spells_table.*')->join('class_spells', 'spells_table.id', '=', 'class_spells.spell_id')
            ->where('class_spells.class_id', '=', $classId)
            ->where('level', '>', '0')
            ->where('level', '<=', $maxSpellLevel)
            ->where('name', 'LIKE', '%' . $term . '%')
            ->orderBy('level')
            ->orderBy('name')
            ->get()
            ->toArray();
        foreach($spells as &$spell) {
            $spell['level_desc'] = 'Level ' . $spell['level'];
        }
        return Response::json([
            'spells' => $spells
        ]);
    }

    public function getSpellsBySchool($classId, $maxSpellLevel,
             $school='Abjuration,Conjuration,Divination,Enchantment,Evocation,Illusion,Necromancy,Transmutation', $term='') {
        $schoolArr = explode(',', $school);
        $spells = SpellsTable::select('spells_table.*')->join('class_spells', 'spells_table.id', '=', 'class_spells.spell_id')
            ->where('class_spells.class_id', '=', $classId)
            ->where('level', '>', '0')
            ->where('level', '<=', $maxSpellLevel)
            ->whereIn('type', $schoolArr)
            ->where('name', 'LIKE', '%' . $term . '%')
            ->orderBy('level')
            ->orderBy('name')
            ->get()
            ->toArray();
        foreach($spells as &$spell) {
            $spell['level_desc'] = 'Level ' . $spell['level'];
        }
        return Response::json([
            'spells' => $spells
        ]);
    }

    public function getCantrips($classId, $term='') {
        $cantrips = DB::table('spells_table as st')->select('st.*')->join('class_spells', 'st.id', '=', 'class_spells.spell_id')
            ->where('class_spells.class_id', '=', $classId)
            ->where('level', '=', '0')
            ->where('name', 'LIKE', '%' . $term . '%')
            ->orderBy('name')
            ->get();
        return Response::json([
            'spells' => $cantrips
        ]);
    }

    public function getSpell($spellId) {
        return Response::json([
            'spell' => SpellsTable::where('readable_id', '=', $spellId)->get()->toArray()    //was 'id'
        ]);
    }

} 