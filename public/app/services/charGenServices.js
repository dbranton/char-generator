angular.module('app')
    .factory('charGenFactory', function($http, $timeout, $resource, configObj) {
        var locationName = configObj.locationName;
        var deviceType = configObj.deviceType;
        var ABILITIES = ['str', 'dex', 'con', 'int', 'wis', 'cha'];
        var MIN_ABILITY = 8;
        var MAX_ABILITY = 15;
        var ABILITY_MAPPER = [
            {id:'str', name:'Strength'},
            {id:'dex', name:'Dexterity'},
            {id:'con', name:'Constitution'},
            {id:'int', name:'Intelligence'},
            {id:'wis', name:'Wisdom'},
            {id:'cha', name:'Charisma'}
        ];
        var ARMOR_MAPPER = {};
        var WEAPON_MAPPER = {};
        var TOOL_MAPPER = {
            artisans_tools: 'Artisan\'s Tools',
            gaming_set: 'Gaming Set',
            musical_instrument: 'Musical Instrument'
        };

        function Character() {
            this.name = null,
            this.ideal = {};
            this.raceObj = {};
            this.classObj = {}; // contains subclasses property
            this.background = {};   // & background.skills
            //this.selectedSkills = [], // now in classObj
            this.selectedLanguages = [],
            //this.proficientSkills = '', // same as selectedSkills except in string form
            this.languages = [];
            this.numLanguages = 0;
            this.numBonusLanguages = 0;
            //alignment = null;
            this.armorClass = null;
            this.attackMod = null;
            this.savingThrows = null;
            this.hitPoints = null;
            this.speed = null;
            this.initiative = null;
            this.armor = null;
            this.weapons = null;
            this.tools = '';
            this.size = null;
            this.profBonus = 0;
            this.passivePerception = 10;
            this.selectedFeats = [];
            this.featureStats = {};
            this.selectedExpertise = [];
            this.selectedBonusAbilities = [];
            this.feats = [];
            this.backstory = '';
        }
        Character.prototype.updateSkillProficiency = function(skillName, isAdded, disabled) {   // if isAdded is false, then remove skill
            var that = this;
            if (angular.isArray(this.skills)) {
                if (skillName) {
                    angular.forEach(this.skills, function(skill, i) {
                        if (skillName.indexOf(skill.readable_id) !== -1) {
                            if (disabled) {    // skills[i].proficient will already be updated when user checks/unchecks a skill
                                that.skills[i].proficient = isAdded;
                                that.skills[i].disabled = true;
                            }
                            that.updateSkillScore(skill.readable_id);
                            if (isAdded) {  // add skill
                                if (that.classObj.selectedSkills && _.findIndex(that.classObj.selectedSkills, 'id', skill.id) === -1) {
                                    that.classObj.selectedSkills.push({id: skill.id, readable_id: skill.readable_id, name: skill.name});
                                    if (!disabled) {    // disabled is true if skill comes from background, so dont change skillsLeft if so
                                        if (!that.bonusSkills || (that.bonusSkills && (that.raceObj.numSkillChoices - that.bonusSkills.length === 0))) {
                                            that.numSkillsLeft--;
                                        } else {
                                            that.bonusSkills.push(skill.readable_id);
                                            if (that.bonusSkills.length === that.raceObj.numSkillChoices) {
                                                that.enableSkills(false);   // first disable all skills
                                                that.enableSkills(true); // then enable class-only skills
                                            }
                                        }
                                    }
                                }
                                if (that.numSkillsLeft === 0 ||
                                        (that.bonusSkills && (that.numSkillsLeft + that.raceObj.numSkillChoices - that.bonusSkills.length === 0))) {
                                    that.enableSkills(false);  // disable all skills except the checked ones
                                }
                            } else {    // remove skill
                                _.remove(that.classObj.selectedSkills, {'id': skill.id});
                                // remove skill from expertise if it exists
                                if (that.classObj.expertise && that.classObj.expertise.selectedExpertise &&
                                        _.findIndex(that.classObj.expertise.selectedExpertise, 'id', skill.id) !== -1) {
                                    _.remove(that.classObj.expertise.selectedExpertise, {'id': skill.id});
                                    if (that.classObj.expertise.type === 'expertise') {
                                        that.numSkillsLeft++; // +4 to +0: 'expertise' only
                                    }
                                } else {
                                    if (!that.bonusSkills || that.bonusSkills.indexOf(skill.readable_id) === -1) {
                                        that.numSkillsLeft++;
                                    } else {
                                        that.bonusSkills.splice(that.bonusSkills.indexOf(skillName), 1);
                                        if (that.raceObj.numSkillChoices - that.bonusSkills.length === 1) { // re-enable all skills
                                            that.enableSkills(true);
                                        }
                                    }
                                }
                                if (that.numSkillsLeft === 1) {
                                    that.enableSkills(true); // reenable proficient skills that were disabled
                                }
                            }
                        }
                    });
                } else {    // wipe proficiencies for all skills
                    this.skills.forEach(function(skill, i) {
                        that.skills[i].proficient = false;
                        that.updateSkillScore(skill.readable_id);
                    });
                }
            }
            this.getProficientSkills();
        };
        Character.prototype.enableSkills = function(enableSkills) {   // skills is an array, exceptions is comma separated string
            var that = this, currentSkill = '';
            var backgroundSkills = that.background.skills;
            var raceBonusSkill = that.raceObj.bonusSkill;   // ex: 'perception'
            var classSkills = [];
            if (enableSkills === true) {
                if (that.classObj.avail_skills && (!that.raceObj.numSkillChoices ||
                        (that.raceObj.numSkillChoices - that.bonusSkills.length === 0))) {
                    classSkills = that.classObj.avail_skills.split(', ');
                } else if (that.bonusSkills && (that.raceObj.numSkillChoices - that.bonusSkills.length > 0)) {
                    classSkills = _.pluck(that.skills, 'readable_id');
                }
                angular.forEach(that.skills, function(skill, idx) {
                    currentSkill = skill.readable_id;
                    // only enable skill if it is a class skill, not a race bonus skill, and is not a background skill
                    if (classSkills.indexOf(currentSkill) !== -1
                            && (raceBonusSkill !== currentSkill)
                            && (!backgroundSkills || _.findIndex(backgroundSkills, 'readable_id', currentSkill) === -1)) {
                        that.skills[idx].disabled = false;
                    }
                });
            } else if (enableSkills === false) {    // disable everything that isn't checked
                angular.forEach(that.skills, function(skill, i) {
                    if (that.skills[i].proficient === false) {
                        that.skills[i].disabled = true;
                    }
                });
            }
        };
        Character.prototype.handleSkills = function() {
            if (this.classObj.avail_skills && !this.raceObj.numSkillChoices) {
                this.bonusSkills = null;
            } else if (this.raceObj.numSkillChoices) {
                this.bonusSkills = [];
            }
            this.updateSkillProficiency(false); // wipe skill proficiencies
            this.resetSkills();
            this.enableSkills(false);   // disable all skills
            if (this.background.skills) {
                this.updateSkillProficiency(_.pluck(this.background.skills, 'readable_id'), true, true);
                //this.enableSkills(classSkills, this.background.skills);
            }
            if (this.raceObj.bonusSkill) {
                this.updateSkillProficiency(this.raceObj.bonusSkill, true, true);
            }
            this.enableSkills(true);
        };
        Character.prototype.updateSkillScore = function(skillName, isAdded) {    // if no parameter, update all skills
            var abilityMapper = {
                Str: 'str', Dex: 'dex', Con: 'con', Int: 'int', Wis: 'wis', Cha: 'cha'
            };
            var profBonus = 0;
            var that = this;
            var selectedExpertise = this.classObj.expertise ? this.classObj.expertise.selectedExpertise : null;    // array/null
            angular.forEach(this.skills, function(skill, i) {
                if (!skillName || skill.readable_id === skillName) {   // skillName might be an array of skills
                    if (angular.isDefined(isAdded)) {   // means that it is an expertise skill
                        if (_.findIndex(selectedExpertise, 'id', skill.id) !== -1) { // && !skill.proficient
                            if (!skill.proficient) {    // level 1: +0 to +4
                                skill.proficient = true;    // in case expertise skill is not proficient
                                that.classObj.selectedSkills.push({id: skill.id, readable_id: skill.readable_id, name: skill.name});
                                //that.classObj.selectedSkills.sort();
                            } else if (skillName === skill.readable_id && !skill.disabled &&
                                    that.classObj.expertise.type === 'selected_expertise') {   // level 1: +2 to +4
                                //selectedExpertise[selectedExpertise.length-1]
                                that.numSkillsLeft++;
                                that.enableSkills(true);
                            }
                            if (that.classObj.expertise.type === 'selected_expertise') {
                                skill.disabled = true;
                            }
                        } else if (that.classObj.expertise.type === 'selected_expertise' && // removing expertise skill
                                _.findIndex(selectedExpertise, 'id', skill.id) === -1 &&
                                    _.findIndex(that.classObj.expertise.list, 'id', skill.id) !== -1 && skill.proficient) {
                            skill.proficient = false;
                            if (that.numSkillsLeft > 0 && that.classObj.avail_skills.indexOf(skill.name) !== -1) {
                                skill.disabled = false; // only enable skill if it belongs on the class skill list and numSkillsLeft > 0
                            }
                            _.remove(that.classObj.selectedSkills, {'id': skill.id});
                            //that.enableSkills(enabledSkills);
                        }
                    }
                    profBonus = skill.proficient ? that.profBonus : 0;
                    that.skills[i].val = profBonus + that.ability[abilityMapper[skill.ability]].mod;
                    if (that.classObj.jackOfAllTrades && profBonus === 0) {
                        that.skills[i].val += Math.floor(that.profBonus/2);
                    }
                    if (selectedExpertise && _.findIndex(selectedExpertise, 'id', skill.id) !== -1) {
                        that.skills[i].val += profBonus;
                        //that.enableSkills(enabledSkills);
                    }
                    if (skill.name === "Perception") {
                        that.passivePerception = 10 + parseInt(that.skills[i].val);   // handle passive perception
                    }
                }
            });
        };
        Character.prototype.getProficientSkills = function() {
            var profSkillsArray = [];
            this.skills.forEach(function(skill) {
                if (skill.proficient) {
                    profSkillsArray.push(skill.name);
                }
            });
            this.proficientSkills = profSkillsArray.join(', ');
        };
        Character.prototype.calculateSavingThrows = function(ability) {
            var bonus = 0;
            if (this.savingThrows && this.savingThrows.indexOf(ability) !== -1) {
                bonus = this.profBonus;
            }
            return this.ability[ability].mod + bonus;
        };
        Character.prototype.calculateModifiers = function(ability) {
            if (ability) {
                this.ability[ability].mod = Math.floor((this.ability[ability].adjScore - 10) / 2);
                this.ability[ability].savingThrow = this.calculateSavingThrows(ability);
            } else {    // apply to all abilities
                this.ability.str.mod = returnModifier(this.ability.str.score);
                this.ability.dex.mod = returnModifier(this.ability.dex.score);
                this.ability.con.mod = returnModifier(this.ability.con.score);
                this.ability.int.mod = returnModifier(this.ability.int.score);
                this.ability.wis.mod = returnModifier(this.ability.wis.score);
                this.ability.cha.mod = returnModifier(this.ability.cha.score);
                var that = this;
                ABILITIES.forEach(function(ability) {
                    that.ability[ability].savingThrow = that.calculateSavingThrows(ability);
                });
            }
            this.updateSkillScore();    // called to update because modifier changes might affect scores
            // update spellcasting stats if any
            if (this.raceObj.spellcasting && (!ability || this.raceObj.spellcasting.spellAbility === ability)) {
                this.handleSpellcasting('raceObj');
            };
            if (this.classObj.spellcasting && (!ability || this.classObj.spellcasting.spellAbility === ability)) {
                this.handleSpellcasting();
            }
            // handle dexterity-specific stats
            if (!ability || ability === 'dex') {
                this.initiative = this.handleInitiative();
                this.armorClass = 10 + this.ability.dex.mod;
            }
            if (!ability || ability === 'con') {
                this.handleHitPoints();
            }
            if (this.classObj.bonusArmorAbility) {
                this.armorClass = 10 + this.ability.dex.mod + this.ability[this.classObj.bonusArmorAbility].mod;
            }

            function returnModifier(score) {
                return Math.floor((score - 10) / 2);
            }
        };
        Character.prototype.modifyAbilityScore = function(ability, value, min, max, pointsLeft, isBonus) {
            var diff = this.ability[ability].max - MAX_ABILITY,
                currValue = this.ability[ability].adjScore, abilityCost,
                //pointsLeft = this.ability.pointsLeft,
                currValueMinusDiff = currValue - diff;
            if (pointsLeft > 0 && (value > 0 && currValue < max) || (value < 0 && currValue > min)) {
                if (!isBonus && ((value > 0 && currValueMinusDiff >= 13 && pointsLeft <= 1) ||
                    (value > 0 && currValueMinusDiff >= 15 && pointsLeft <= 2))) {
                    // do nothing
                } else {
                    if (value > 0) {    // value == 1
                        if (isBonus) {
                            this.ability[ability].bonusPoints += 1;
                            this.ability.bonusPoints -= 1;
                        } else {
                            if (currValueMinusDiff >= 15) {
                                abilityCost = 3;
                            } else if (currValueMinusDiff >= 13) {
                                abilityCost = 2;
                            } else if (currValueMinusDiff < 13) {
                                abilityCost = 1;
                            }
                            this.ability.pointsLeft -= abilityCost;
                        }
                    } else {    // value == -1
                        if (isBonus) {
                            this.ability[ability].bonusPoints -= 1;
                            this.ability.bonusPoints += 1;
                        } else {
                            if (currValueMinusDiff > 15) {
                                abilityCost = 3;
                            } else if (currValueMinusDiff > 13) {
                                abilityCost = 2;
                            } else if (currValueMinusDiff <= 13) {
                                abilityCost = 1;
                            }
                            this.ability.pointsLeft += abilityCost;
                        }
                    }
                    updateScore(this, ability, value, isBonus);
                }
            }
            function updateScore(character, ability, value, isBonus) {
                if (isBonus) {
                    character.ability[ability].adjScore += value;
                } else {
                    character.ability[ability].score += value;
                    character.ability[ability].adjScore = character.ability[ability].score;
                }
                character.ability[ability].mod = Math.floor((character.ability[ability].score-10)/2);
                character.calculateModifiers(ability);
            }
        };
        Character.prototype.resetRacialBonuses = function() {
            var diff = 0;
            var that = this;
            angular.forEach(ABILITIES, function(ability) {
                diff = that.ability[ability].max - MAX_ABILITY; // ex: 0, 1, or 2
                if (diff > 0) {
                    that.ability[ability].score -= diff;
                    that.ability[ability].adjScore = that.ability[ability].score;
                    that.calculateModifiers(ability);
                    that.ability[ability].max = MAX_ABILITY;
                    that.ability[ability].min = MIN_ABILITY;
                }
            });
            // handle bonus abilities from Half-Elf or Human variant
            if (angular.isArray(that.raceObj.selectedBonusAbilities)) {
                angular.forEach(that.raceObj.selectedBonusAbilities, function(obj, idx) {
                    that.increaseAbilityScore(obj.id, 1);
                });
            }
        };
        Character.prototype.handleSpellcasting = function(objType) {    // classObj or raceObj
            var type = objType ? objType : 'classObj';
            this[type].spellcasting.spellSaveDC = 8 + this.profBonus + this.ability[this[type].spellcasting.spellAbility].mod;
            this[type].spellcasting.spellAttkBonus = this.profBonus + this.ability[this[type].spellcasting.spellAbility].mod;
        };
        Character.prototype.increaseAbilityScore = function(ability, value) {
            this.ability[ability].score += value;
            this.ability[ability].max += value;
            this.ability[ability].min += value;
            this.ability[ability].adjScore = this.ability[ability].score;
            this.calculateModifiers(ability);
        };
        Character.prototype.handleFeatureBonuses = function() {
            var featureStats = this.featureStats,
                bonusArray = [], characterArray = [], that = this,
                featureBonus, expertiseArr, bonusSpells = [];
            // *** Reset
            this.numBonusLanguages = 0;
            this.handleLanguages();
            this.resetRacialBonuses();
            this.armor = this.mapArmor(this.classObj.armor_prof);   // needs to be here to reset
            this.weapons = this.mapWeapons(this.classObj.weapon_prof);   //this.classObj.weapon_prof;
            this.classObj.bonusLanguages = [];  //reset
            if (angular.isArray(that.classObj.selectedFeatures)) {
                angular.forEach(that.classObj.selectedFeatures, function(feature) {
                    feature.max = feature.initMax;
                });
            }
            this.bonusInitiative = 0;   // reset
            // *** end reset
            for (var featureType in featureStats) {
                featureBonus = angular.copy(featureStats[featureType]);
                for (var bonusProp in featureBonus) {
                    var propArray = bonusProp.split(' : ');  // usually results in one item
                    propArray.forEach(function(prop, ind) {
                        featureBonus[prop] = featureBonus[bonusProp].split(' : ')[ind];
                        if (prop === 'baseSpeed') {
                            that.speed = parseInt(featureBonus[prop]);
                        } else if (that[prop] !== null && (prop === 'armorClass' || prop === 'attackMod' ||
                            prop === 'speed')) {
                            that[prop] += parseInt(featureBonus[prop]); // character prop needs to exist to add
                        } else if (prop === 'initiative') {
                            that.bonusInitiative = parseInt(featureBonus[prop]);
                            that.initiative = that.handleInitiative();
                        } else if (prop === 'numLanguages') {
                            that.numBonusLanguages += parseInt(featureBonus[prop]);
                            that.handleLanguages();
                        } else if (that[prop] !== null && prop === 'hitPoints') {   // assume hitPoint bonuses apply every level
                            that[prop] += (that.level * (parseInt(featureBonus[prop])));    // multiply hitPoint bonus by level
                        } else if (ABILITIES.indexOf(prop) !== -1) {    // ex: 'str', 'dex', etc.
                            //bonusArray = featureBonus[bonusProp].split(', ');   // primarily for human "1, 1, 1, 1, 1, 1" becomes an array
                            that.increaseAbilityScore(prop, parseInt(featureBonus[prop]));
                        } else if (prop === 'any') {
                            that.raceObj.bonusAbilities = _.reject(ABILITY_MAPPER, {'id': featureBonus[prop]});
                        } else if (prop === 'armor') {  // handles armor proficiency
                            bonusArray = featureBonus[prop].split(', ');
                            angular.forEach(bonusArray, function(armorProf) {
                                if (_.findIndex(that[prop], 'readable_id', armorProf) === -1) {
                                    that[prop] = that[prop].concat(that.mapArmor(armorProf));
                                }
                            });
                        } else if (prop === 'weapons') {    // handles weapon proficiency
                            if (_.findIndex(that[prop], 'readable_id', 'martial_weapon') === -1) {
                                bonusArray = featureBonus[prop].split(', ');    // ex: ['longsword', 'shortsword', 'shortbow', 'longbow']

                                if (bonusArray.indexOf('martial_weapon') !== -1 &&
                                        _.findIndex(that[prop], 'readable_id', 'simple_weapon') !== -1) {
                                    that[prop] = [that[prop][_.findIndex(that[prop], 'readable_id', 'simple_weapon')], that.mapWeapons('martial_weapon')[0]];
                                } else {
                                    bonusArray.forEach(function(weaponProf) {
                                        var weaponObj = that.mapWeapons(weaponProf)[0];
                                        if (_.findIndex(that[prop], 'readable_id', weaponProf) === -1
                                                && !(weaponObj.weapon_type === 'simple_weapon'
                                                && _.findIndex(that[prop], 'readable_id', 'simple_weapon') !== -1)) {
                                            that[prop].push(weaponObj);
                                        }
                                    });
                                }
                            }
                        } else if (prop === 'tools') { // e.g. Dwarf
                            that.raceObj.bonusTool = featureBonus[prop];
                            that.handleTools();
                        } else if (prop === 'tool_choice') {    // e.g. Battle Master
                            bonusArray = featureBonus[prop].split(', ');    // e.g. [artisans_tools, 1]
                            that.classObj.tool_choices = bonusArray[0];
                            that.classObj.toolName = TOOL_MAPPER[that.classObj.tool_choices];
                            that.classObj.numToolChoices = parseInt(bonusArray[1]);
                            that.classObj.selectedTools = [];    // reset; prevents user from selecting anything if reset (maximum limit exceeded)
                        } else if (prop === 'savingThrows') {
                            that.calculateModifiers();
                        } else if (prop === 'defense') {
                            that.classObj.bonusArmorAbility = featureBonus[prop];   // ex: wis
                            that.armorClass += that.ability[featureBonus[prop]].mod;
                        } else if (prop.indexOf('Feat') !== -1) {
                            that.classObj.featType = prop;
                            that.classObj.numFeats = parseInt(featureBonus[prop]);
                        } else if (prop === 'skills') {
                            that.raceObj.bonusSkill = featureBonus[prop];
                        } else if (prop === 'bonus_skill_choices') { // can only come from raceFeatures for now
                            that.raceObj.numSkillChoices = parseInt(featureBonus[prop]);  // e.g. 2
                        } else if (prop === 'jack_of_all_trades') {
                            that.classObj.jackOfAllTrades = true;
                            that.updateSkillScore();
                        } else if (prop === 'cantrips') {
                            bonusArray = featureBonus[prop].split(', ');
                            that.classObj.cantrip = {
                                classId: bonusArray[0],
                                maxSpellLevel: 0,
                                numSpellsKnown: parseInt(bonusArray[1])
                            }
                        } else if (prop === 'spells_known') {   // ex: sorcerer, 1, 2: 1 is max spell level and 2 is number of spells known
                            bonusArray = featureBonus[prop].split(', ');
                            that.classObj.spellcasting.classId = bonusArray[0];
                            that.classObj.spellcasting.maxSpellLevel = bonusArray[1];
                            that.classObj.spellcasting.numSpellsKnown = parseInt(bonusArray[2]);
                            if (bonusArray[3] && bonusArray[4]) {
                                that.classObj.spellcasting.restrictedSchools = [bonusArray[3], bonusArray[4]];  // ex: Abjuration, Evocation
                            }
                        } else if (prop === 'bonus_spells_known') {   // ex: wizard, 2, 2: 2 is max spell level and 2 is number of spells known
                            bonusArray = featureBonus[prop].split(', ');
                            that.classObj.spellcasting.bonus = {    // expects spellcasting to exist
                                classId: bonusArray[0],
                                maxSpellLevel: bonusArray[1],
                                numSpellsKnown: parseInt(bonusArray[2])
                            };
                        } else if (prop.indexOf('bonus_spell') !== -1) {    // ex: warlock mystic arcanum (warlock, 6 - means warlock spell list, spell level)
                            //bonusArray = featureBonus[prop].split(', ');
                            bonusSpells.push({
                                classId: featureBonus[prop],
                                spellLevel: parseInt((prop.split('-'))[1]),
                                numSpellsKnown: 1
                            });
                            that.classObj.spellcasting.bonusSpells = that.classObj.spellcasting.bonusSpells || bonusSpells;
                        } else if (prop === 'bonus_race_cantrip') {  // assume this always comes before spellcasting if it exists
                            bonusArray = featureBonus[prop].split(', ');    // '6, cha' becomes an ['6', 'cha'] where 6 is spell_id
                            that.raceObj.spellcasting = {};
                            that.raceObj.spellcasting.spellAbility = bonusArray[1];
                            that.handleSpellcasting('raceObj');
                            if (!that.raceObj.cantrip || parseInt(bonusArray[0]) !== that.raceObj.cantrip[0].id) {
                                returnObj.Spell(bonusArray[0]).get({}, function(response) {
                                    that.raceObj.cantrip = response.spell;  // array
                                });
                            }
                            //that.raceObj.cantrip = bonusArray[0];
                        } else if (prop === 'bonus_race_cantrip_choice') {  // High Elf bonus cantrip
                            bonusArray = featureBonus[prop].split(', ');
                            that.raceObj.spellcasting = undefined;  // hack
                            that.raceObj.spellcasting = {
                                classId: bonusArray[0],
                                maxSpellLevel: 0,
                                spellAbility: bonusArray[1]
                            };
                            //that.raceObj.spellcasting.spellAbility = bonusArray[1]; //featureBonus[prop];    // ex: 'int'
                            //that.raceObj.spellcasting.classId = bonusArray[0];
                            //that.raceObj.spellcasting.maxSpellLevel = 0;

                            //that.classObj.spellcasting.numSpellsKnown = 1;

                            that.handleSpellcasting('raceObj');
                        } else if (prop === 'spellcasting') {
                            that.classObj.spellcasting = that.classObj.spellcasting || {};
                            that.classObj.spellcasting.spellAbility = featureBonus[prop];    //ABILITY_MAPPER[featureBonus[prop]];
                            if (that.classObj.selectedClassCantrips) {  // incase you switch from a race with bonus cantrip to one without one
                                that.classObj.selectedCantrips = angular.copy(that.classObj.selectedClassCantrips)
                            }
                            /*if (that.raceObj.spellcasting &&
                                    that.raceObj.spellcasting.spellAbility === that.classObj.spellcasting.spellAbility) {  // the race's bonus cantrip spell ability is the same as the spellcasting classes' spell ability
                                that.classObj.selectedClassCantrips = that.classObj.selectedClassCantrips || [];
                                //that.classObj.selectedCantrips.push(that.raceObj.cantrip);
                                that.classObj.selectedCantrips = that.classObj.selectedClassCantrips.concat(that.raceObj.cantrip);  // uses concat so selectedClassCantrips does not change
                                that.classObj.selectedCantrips.sort();
                                that.raceObj.spellcasting = null;
                            }*/
                            that.handleSpellcasting();
                        } else if (prop === 'expertise') {
                            expertiseArr = that.classObj.selectedSkills; //angular.copy(that.selectedSkills);
                            bonusArray = featureBonus[prop].split(', ');    // ex: [2]
                            that.classObj.expertise.type = prop;
                            that.classObj.expertise.numExpertise = bonusArray[0]; // ex: 2
                            that.classObj.expertise.list = expertiseArr;
                        } else if (prop === 'selected_expertise') {
                            bonusArray = featureBonus[prop].split(', ');
                            expertiseArr = _.map(_.rest(bonusArray), function(item) { return parseInt(item); });    // ex: [12, 11, 16, 19]
                            angular.forEach(that.skills, function(skillObj, idx) {
                                if (expertiseArr.indexOf(skillObj.id) !== -1) {
                                    expertiseArr[expertiseArr.indexOf(skillObj.id)] = {id: skillObj.id, name: skillObj.name};
                                }
                            });
                            that.classObj.expertise.type = prop;
                            that.classObj.expertise.numExpertise = bonusArray[0];
                            that.classObj.expertise.list = expertiseArr;
                        } else if (prop === 'additional_feature') { // ex: Fighting Style
                            angular.forEach(that.classObj.selectedFeatures, function(feature) {
                                if (feature.label === featureBonus[prop]) {
                                    feature.max = feature.initMax + 1;  // = 2;    // assume feature_choices is 1
                                }
                            });
                        } else if (prop === 'bonus_class_cantrip_choice') { // ex: Circle of the Moon bonus druid cantrip
                            that.classObj.numCantrips += parseInt(featureBonus[prop]);    // usually 1
                        } else if (prop === 'bonus_class_cantrip') {    // for Light Domain bonus cantrip (light)
                            that.classObj.selectedCantrips = that.classObj.selectedCantrips || [];
                            if (that.classObj.selectedCantrips.indexOf(featureBonus[prop]) === -1) {
                                that.classObj.cantrip.bonusCantrip = featureBonus[prop];
                                /*$timeout(function() {
                                    that.classObj.selectedCantrips.push(featureBonus[prop]);    // causes an empty result to show in the cantrips list
                                    that.classObj.selectedCantrips.sort();
                                });*/ // needs to come after render occurs in select2.js
                            }
                            //that.classObj.numCantrips++;
                            that.classObj.cantrip.numSpellsKnown++;
                            // Doesn't work for Arcane Trickster, since cantrips is in classObj.subclassObj
                            /*angular.forEach(that.classObj.cantrips, function(cantrip, idx, cantrips) {
                             if (cantrip.name === featureBonus[prop]) {
                             cantrips.splice(idx, 1);    // potentially dangerous
                             }
                             });*/
                        } else if (prop === 'bonus_language') {
                            that.classObj.bonusLanguages.push(featureBonus[prop]);
                        }
                    });
                }
            }
        };
        Character.prototype.determineLevelBonus = function(level) {
            var index = level - 1,
                PROFICIENCY_ARRAY = [2, 2, 2, 2, 3, 3, 3, 3, 4, 4, 4, 4, 5, 5, 5, 5, 6, 6, 6, 6],
                ABILITY_BONUS_ARRAY = [0, 0, 0, 2, 2, 2, 2, 4, 4, 4, 4, 6, 6, 6, 6, 8, 8, 8, 10, 10];
                //FEATS_ARRAY = [0, 0, 0, 1, 1, 1, 1, 2, 2, 2, 2, 3, 3, 3, 3, 4, 4, 4, 5, 5];
            this.profBonus = PROFICIENCY_ARRAY[index];
            this.ability.bonusPoints = ABILITY_BONUS_ARRAY[index];
            //this.numFeats = FEATS_ARRAY[index];
        };
        Character.prototype.determineRace = function(raceObj) {
            var that = this, tempName, features = {}, racialTrait = {}, tempBenefit = null;
            that.raceObj = raceObj;
            that.speed = parseInt(this.raceObj.speed);
            that.size = this.raceObj.size_value;
            that.defaultLanguages = this.raceObj.languages || '';
            that.languages = that.defaultLanguages.split(', ');
            that.selectedLanguages = [];    // reset
            that.selectedBonusAbilities = [];   // reset
            //this.handleLanguages();
            if (that.raceObj.traits) {
                that.raceObj.racialTraits = []; // reset
                angular.forEach(that.raceObj.traits, function(trait) {
                    racialTrait = {
                        id: trait.id,
                        name: trait.name,
                        benefit: trait.benefit_desc
                    };

                    // for Dragonborn Draconic Ancestry
                    /*if (trait.type === 'super_feature') {
                        angular.forEach(trait.subfeatures, function(subfeature) {
                            if (subfeature.level <= that.level) {
                                tempBenefit = subfeature;
                            }
                        });
                        that.raceObj.featureChoices = {
                            //'name': [],
                            'list': trait.subfeatures,
                            'label': trait.name
                        };
                    }*/

                    if (trait.benefit_desc && trait.level <= that.level) {
                        if (!tempName || tempName !== trait.name) {
                            that.raceObj.racialTraits.push(racialTrait);
                            tempName = trait.name;
                        } else {    // for Tiefling's Infernal Legacy
                            that.raceObj.racialTraits[_.findIndex(that.raceObj.racialTraits, {'name': tempName})] = racialTrait;
                        }
                    }
                    if (trait.benefit_stat) {
                        features[trait.benefit_stat] = trait.benefit_value;
                    }
                    // handle race cantrips (ex: High Elf)
                    /*if (trait.cantrip) {
                     that.raceObj.cantrip = trait.cantrip;
                     }
                     if (trait.cantrips && !args.selectedBonusCantrip) {    // trait.cantrips is the cantrip list
                     that.raceObj.cantrips = angular.copy(trait.cantrips);   // populate cantrips list
                     }*/
                });
            }
            that.featureStats.race = features;
            //that.handleSkills();
            that.handleFeatureBonuses();
            that.handleSkills();
        };
        Character.prototype.determineBackground = function(backgroundObj) {
            this.background = backgroundObj;
            this.selectedLanguages = [];    // reset
            this.background.numToolChoices = 0;  // reset
            if (this.background.tool_choices) { // ex: artisans_tools, gaming_set, or musical_instrument
                this.background.numToolChoices++;
                this.background.selectedTools = [];    // reset
                this.background.toolName = TOOL_MAPPER[this.background.tool_choices];  // ex: Artisan's Tools
            }
            this.handleTools();
            //this.numLanguages = this.background ? parseInt(this.background.languages) : 0;
            this.handleLanguages();
            this.handleSkills();
        };
        Character.prototype.determineClass = function(classObj) {    // handles hp and saving throws
            var that = this, features = {}, featureChoiceIdx = 0, classFeature = {};
            that.classObj = classObj;
            that.classObj.classFeatures = [];
            that.classObj.selectedFeatures = [];    // for feature choices
            that.classObj.subclasses = [];    // reset subclass list, if any
            that.handleHitPoints();
            that.savingThrows = this.classObj.saving_throws;   // e.g. "wis, cha"
            that.initiative = this.handleInitiative();
            that.armorClass = 10 + this.ability.dex.mod;
            that.numSkillsLeft = parseInt(this.classObj.num_skills);
            that.classObj.selectedSkills = [];
            that.classObj.numToolChoices = 0;  // reset
            if (that.classObj.tool_choices) { // ex: artisans_tools, gaming_set, or musical_instrument
                that.classObj.numToolChoices = parseInt(that.classObj.tool_choices.split(', ')[1]);
                that.classObj.tool_choices = that.classObj.tool_choices.split(', ')[0];
                that.classObj.selectedTools = [];    // reset
                that.classObj.toolName = TOOL_MAPPER[that.classObj.tool_choices];
            }
            that.handleArmor();
            that.handleWeapons();
            that.handleTools();
            if (angular.isArray(that.classObj.features)) {
                //$scope.character.featureIds = [];  // reset
                angular.forEach(that.classObj.features, function(featureObj, idx) {
                    if (featureObj.level <= that.level) {
                        var tempBenefit = '';
                        if (featureObj.subclasses) {
                            that.classObj.subclassName = featureObj.name;
                            that.classObj.subclasses = featureObj.subclasses;
                        }
                        if (angular.isArray(featureObj.benefits)) {
                            angular.forEach(featureObj.benefits, function(benefitObj) {
                                if (benefitObj.level <= that.level) {
                                    tempBenefit = benefitObj;
                                }
                            });
                            classFeature = {
                                id: tempBenefit.id,
                                name: featureObj.name,
                                benefit: tempBenefit.benefit_desc
                            };
                            if (tempBenefit.benefit_desc) {   // adds benefits that have descriptions to selectedFeatures list
                                that.classObj.classFeatures.push(classFeature);
                            }
                            if (tempBenefit.benefit_stat) {
                                features[tempBenefit.benefit_stat] = tempBenefit.benefit_value;
                                // give dynamic name for expertise label
                                if (tempBenefit.benefit_stat === 'expertise') {
                                    that.classObj.expertise = {};
                                    that.classObj.expertise.label = featureObj.name;
                                    that.selectedExpertise = that.classObj.expertise.selectedExpertise = [];
                                }
                            }
                            // handle features that provide choices
                            if (tempBenefit.benefit_stat === 'feature_choice') {
                                that.classObj.selectedFeatures[featureChoiceIdx] = {
                                    'name': [],
                                    'initMax': parseInt(tempBenefit.benefit_value),
                                    'max': parseInt(tempBenefit.benefit_value),
                                    'label': featureObj.name,
                                    'index': featureChoiceIdx
                                };
                                that.classObj.selectedFeatures[featureChoiceIdx].choices = that.getFeatureChoices(featureObj.subfeatures, that.level, 'classArr', featureChoiceIdx);
                                featureChoiceIdx++;
                            } else if (angular.isArray(featureObj.subfeatures)) {    // ignore feature_choices
                                angular.forEach(featureObj.subfeatures, function(subfeature) {
                                    /*if (subfeature.cantrips && !args.selectedCantrips) {    // make sure to not execute when selecting cantrips
                                     $scope.character.classObj.cantrips = angular.copy(subfeature.cantrips);   // populate cantrips list
                                     }*/
                                    if (angular.isArray(subfeature.benefits)) {
                                        angular.forEach(subfeature.benefits, function(benefitObj, idx) {
                                            if (benefitObj.level <= that.level) {
                                                tempBenefit = benefitObj;
                                            }
                                        });
                                        classFeature = {
                                            id: tempBenefit.id,
                                            name: subfeature.name,
                                            benefit: tempBenefit.benefit_desc
                                        };
                                        if (tempBenefit.benefit_desc) {   // adds benefits that have descriptions to classFeatures list
                                            that.classObj.classFeatures.push(classFeature);
                                        }
                                        if (tempBenefit.benefit_stat) {
                                            features[tempBenefit.benefit_stat] = tempBenefit.benefit_value;
                                        }
                                        tempBenefit = {};   // reset
                                    }
                                });
                            }
                            tempBenefit = {};   // reset
                        }
                    }
                });
            }
            that.classObj.charFeatures = angular.copy(that.classObj.classFeatures);
            /*if (that.featureStats.subclass) {
                delete that.featureStats.subclass;
            }*/
            /*if (that.featureStats.features) {
                delete that.featureStats.features;
            }*/
            for (var prop in that.featureStats) {   // delete any feature choice benefits and subclass benefits
                if (that.featureStats.hasOwnProperty(prop) && prop !== 'race') {
                    delete that.featureStats[prop];
                }
            }
            that.featureStats.clazz = features;
            that.handleFeatureBonuses();
            // needs to come after handleFeatureBonuses to account for racial bonus skills
            that.handleSkills();
        };
        Character.prototype.determineSubclass = function(subclassObj) {
            var that = this,
                features = {},
                subclassFeatureChoiceIdx = 0,
                tempSubclassBenefit= '',
                subclassFeature = {};
            that.classObj.subclassObj = subclassObj;
            that.classObj.subclassObj.selectedFeatures = [];    // for feature choices
            that.classObj.subclassObj.classFeatures = [];

            if (angular.isArray(that.classObj.selectedFeatures)) {
                angular.forEach(that.classObj.selectedFeatures, function(feature) {
                    feature.name = [];  // wipe out all selected class features to account for changing from lvl 10+ champion
                });
            }

            if (angular.isArray(that.classObj.subclassObj.features)) {
                angular.forEach(that.classObj.subclassObj.features, function(feature) {
                    if (feature.level <= that.level) {
                        if (angular.isArray(feature.benefits)) {
                            angular.forEach(feature.benefits, function(benefit) {
                                if (benefit.level <= that.level) {
                                    tempSubclassBenefit = benefit;
                                }
                                if (tempSubclassBenefit.benefit_stat) {
                                    features[tempSubclassBenefit.benefit_stat] = tempSubclassBenefit.benefit_value;
                                    // give dynamic name for expertise label
                                    if (tempSubclassBenefit.benefit_stat.indexOf('selected_expertise') !== -1) {
                                        that.classObj.expertise = {};
                                        that.classObj.expertise.label = feature.name;
                                    }
                                }
                            });
                            subclassFeature = {
                                id: tempSubclassBenefit.id,
                                name: feature.name,
                                benefit: tempSubclassBenefit.benefit_desc
                            };
                            if (tempSubclassBenefit.benefit_desc) {
                                that.classObj.subclassObj.classFeatures.push(subclassFeature);
                            }
                            /*if (tempSubclassBenefit.benefit_stat) {
                             features[tempSubclassBenefit.benefit_stat] = tempSubclassBenefit.benefit_value;
                             }*/
                        }
                        if (tempSubclassBenefit.benefit_stat === 'feature_choice') {
                            that.classObj.subclassObj.selectedFeatures[subclassFeatureChoiceIdx] = {
                                'name': [],
                                'initMax': parseInt(tempSubclassBenefit.benefit_value),
                                'max': parseInt(tempSubclassBenefit.benefit_value),
                                'label': feature.name,
                                'index': subclassFeatureChoiceIdx
                            };    // ng-repeat depends on this array
                            that.classObj.subclassObj.selectedFeatures[subclassFeatureChoiceIdx].choices = that.getFeatureChoices(feature.subfeatures, that.level, 'subclassArr', subclassFeatureChoiceIdx);
                            subclassFeatureChoiceIdx++;
                        }
                        // handle subfeatures
                        else if (angular.isArray(feature.subfeatures)) {    // && tempSubclassBenefit.benefit_stat !== 'feature_choice'
                            angular.forEach(feature.subfeatures, function(subfeature) {
                                /*if (subfeature.cantrips && !args.selectedCantrips) {    // make sure to not execute when selecting cantrips
                                 $scope.character.classObj.subclassObj.cantrips = angular.copy(subfeature.cantrips);   // populate cantrips list
                                 }*/
                                if (angular.isArray(subfeature.benefits)) {
                                    angular.forEach(subfeature.benefits, function(benefit) {
                                        if (benefit.level <= that.level) {
                                            tempSubclassBenefit = benefit;
                                        }
                                    });
                                    features[tempSubclassBenefit.benefit_stat] = tempSubclassBenefit.benefit_value;
                                    subclassFeature = {
                                        id: tempSubclassBenefit.id,
                                        name: subfeature.name,
                                        benefit: tempSubclassBenefit.description
                                    };
                                    if (tempSubclassBenefit.description) {
                                        that.classObj.subclassObj.classFeatures.push(subclassFeature);
                                    }
                                }
                                // filter out coinciding cantrips between high elf's bonus cantrip and cantrip list
                                /*if ($scope.character.raceObj.cantrip &&
                                 _.findIndex($scope.character.classObj.subclassObj.cantrips, 'name', $scope.character.raceObj.cantrip) !== -1) {
                                 $scope.character.classObj.subclassObj.cantrips.splice(_.findIndex($scope.character.classObj.subclassObj.cantrips, 'name', $scope.character.raceObj.cantrip), 1);
                                 }*/
                            });
                        }
                    }
                });

                that.classObj.charFeatures = that.classObj.classFeatures.concat(that.classObj.subclassObj.classFeatures);
                for (var prop in that.featureStats) {
                    if (that.featureStats.hasOwnProperty(prop) && prop !== 'race' && prop !== 'clazz') {
                        delete that.featureStats[prop];
                    }
                }
                that.featureStats.subclass = features;
                that.handleFeatureBonuses();
            }
        };
        Character.prototype.getFeatureChoices = function(choices, level, type, index) { // type is 'classArr' or 'subclassArr'
            var tempArr = [];
            angular.forEach(choices, function(feature) {
                if (feature.level <= level && feature.benefit_stat !== 'bonus_feature') {
                    tempArr.push(feature);
                } else if (feature.benefit_stat === 'bonus_feature') {   // ex: Elemental Attunement
                    feature.locked = true;
                    tempArr.push(feature);
                }
            });
            return tempArr;
        };
        Character.prototype.determineFeatures = function(classFeatures, classObj, index) {
            var that = this,
                featureChoiceName = '',
                featureDesc = '',
                selectedFeaturesArray = [],
                featureObj = {};

            that.featureStats.features = that.featureStats.features || {};
            if (angular.isArray(classFeatures)) {
                angular.forEach(classFeatures, function(selectedFeature) {
                    if (selectedFeature.level <= that.level) {
                        if (selectedFeature.parent_name) {
                            featureChoiceName = selectedFeature.parent_name + ' (' + selectedFeature.name + ')';
                        } else {
                            featureChoiceName = selectedFeature.name;
                        }
                        if (angular.isArray(selectedFeature.benefits)) {
                            angular.forEach(selectedFeature.benefits, function(benefit, idx) {
                                if (benefit.level <= that.level) {
                                    featureDesc = selectedFeature.benefits[idx].benefit_desc;
                                    delete that.featureStats['feature-' + selectedFeature.parent_id];   // so that changing feature won't persist benefits
                                    if (selectedFeature.benefits[idx].benefit_stat) {
                                        that.featureStats['feature-' + selectedFeature.parent_id] = {};
                                        that.featureStats['feature-' + selectedFeature.parent_id][selectedFeature.benefits[idx].benefit_stat] = selectedFeature.benefits[idx].benefit_value;
                                    }
                                }
                            });
                        } else {
                            featureDesc = selectedFeature.description;
                        }
                        featureObj = {
                            id: selectedFeature.benefits[0].id, // assume that feature choices have only one benefit
                            parentId: selectedFeature.parent_id,
                            name: featureChoiceName,
                            benefit: featureDesc
                        };
                        classObj.classFeatures = _.reject(classObj.classFeatures, 'parentId', featureObj.parentId);
                        classObj.classFeatures.push(featureObj);

                        selectedFeaturesArray.push({id: selectedFeature.id, name: selectedFeature.name});
                    }
                });
                // for making it show up on the button
                classObj.selectedFeatures[index].name = selectedFeaturesArray;
            }

            //that.featureStats.features = that.featureStats.features || {};

            // warning: might overwrite existing feature benefits
            //that.featureStats.features = that.addFeatureBenefits(that.featureStats.features, that.classObj.selectedFeatureChoices);
            that.handleFeatureBonuses();

            if (that.classObj.subclassObj) {
                that.classObj.charFeatures = that.classObj.classFeatures.concat(that.classObj.subclassObj.classFeatures);
            } else {
                that.classObj.charFeatures = angular.copy(that.classObj.classFeatures);
            }
        };
        Character.prototype.handleInitiative = function() {
            var initiative = this.ability.dex.mod;
            if (angular.isDefined(this.bonusInitiative)) {
                initiative += this.bonusInitiative;
            }
            return initiative;
        }
        Character.prototype.handleLanguages = function() {
            this.numLanguages = this.background.languages ? parseInt(this.background.languages) + this.numBonusLanguages : this.numBonusLanguages;
        };
        Character.prototype.handleHitPoints = function() {
            var hpPerLevel;
            if (this.classObj.hit_dice) {
                hpPerLevel = Math.ceil(((parseInt(this.classObj.hit_dice))+1)/2);   // ex: if HD=10, then hpPerLevel is 6
                this.hitPoints = parseInt(this.classObj.hit_dice) + this.ability.con.mod;
                this.bonusHP = this.ability.con.mod;
                if (this.level > 1) {
                    for (var i=1; i<this.level; i++) {
                        this.hitPoints += hpPerLevel + this.ability.con.mod;
                        this.bonusHP += this.ability.con.mod;
                    }
                }
            }
        };
        Character.prototype.getArmor = function() {
            returnObj.Armor().get({}, function(response) {
                ARMOR_MAPPER = response;
            });
        };
        Character.prototype.getWeapons = function() {
            returnObj.Weapons().get({}, function(response) {
                WEAPON_MAPPER = response;
            });
        };
        Character.prototype.getSkills = function() {
            var that = this;
            if (!that.skills) {
                returnObj.Skills().get({}, function(response) {
                    setSkillDefaults(response.skills);
                    newCharacter.skills = response.skills;
                });
            } else {
                setSkillDefaults(that.skills)
            }

            function setSkillDefaults(response) {
                angular.forEach(response, function(skill) {
                    skill.val = 0;
                    skill.proficient = false;
                    skill.disabled = true;
                });
                that.skills = response;
                that.skills1 = response.slice(0, response.length/2);
                that.skills2 = response.slice(response.length/2, response.length);
            }
        };
        Character.prototype.resetSkills = function() {
            this.numSkillsLeft = parseInt(this.classObj.num_skills);
            if (this.classObj.selectedSkills) {
                this.classObj.selectedSkills.length = 0; // so that expertise continues to bind to selectedSkills
            }
            if (this.selectedExpertise) {
                this.selectedExpertise = [];
            }
        };
        Character.prototype.mapArmor = function(givenArmor) {
            var armorProf = [];
            if (givenArmor) {
                angular.forEach(ARMOR_MAPPER.armorTypes, function(obj) {
                    if (givenArmor.indexOf(obj.readable_id) !== -1) {
                        armorProf.push(obj);
                    }
                });
            }
            return armorProf;
        };
        Character.prototype.mapWeapons = function(givenWeapons) {
            var weaponProf = [];
            if (givenWeapons) {
                for (var prop in WEAPON_MAPPER) {
                    if (WEAPON_MAPPER.hasOwnProperty(prop)) {
                        angular.forEach(WEAPON_MAPPER[prop], function(obj) {
                            if (givenWeapons.indexOf(obj.readable_id) !== -1) {
                                weaponProf.push(obj);
                            }
                        });
                    }
                }
            }
            return weaponProf;
        };
        Character.prototype.handleArmor = function() {

        };
        Character.prototype.handleWeapons = function() {
            this.classObj.weapons = angular.isString(this.classObj.weapons) ? this.classObj.weapons.split(', ') : [];

        };
        Character.prototype.handleTools = function() {
            var raceTools, classTools, backgroundTools;
            this.tools = [];
            if (this.raceObj.bonusTool) {
                raceTools = this.raceObj.bonusTool.split(', ');
                this.tools = this.tools.concat(raceTools);
            }
            if (this.classObj.tools) {
                classTools = _.pluck(this.classObj.tools, 'name');
                this.tools = this.tools.concat(classTools);
            }
            if (this.background.tools) { // background tools can be blank in the database
                backgroundTools = _.pluck(this.background.tools, 'name');
                this.tools = this.tools.concat(backgroundTools);
            }
            if (angular.isArray(this.background.selectedTools)) {
                this.tools = this.tools.concat(_.pluck(this.background.selectedTools, 'name'));
            }
            if (angular.isArray(this.classObj.selectedTools)) {
                this.tools = this.tools.concat(_.pluck(this.classObj.selectedTools, 'name'));
            }
            this.tools = $.unique(this.tools);  // remove potential duplicates
            this.tools.sort();
            this.tools = this.tools.join(', '); // return to a string
        };
        Character.prototype.determineIdeal = function(idealObj) {
            this.ideal = idealObj;
        };
        Character.prototype.prefillCharacter = function(storedCharacter) {
            for (var prop in storedCharacter) {
                if (storedCharacter.hasOwnProperty(prop)) {
                    this[prop] = storedCharacter[prop];
                }
            }
        };

        var returnObj = {
            getNewCharacter: function(level) {
                var charLevel = level ? level : 1;
                character = angular.copy(newCharacter); // resets character
                character.getSkills();
                character.getArmor();
                character.getWeapons();
                character.level = charLevel;
                character.levelDesc = "Level " + character.level;
                character.calculateModifiers(); // recalculate ability modifiers
                character.determineLevelBonus(charLevel);
                character.userId = sessionStorage.userId;
                return character;
            },
            /*returnStoredCharacter: function() {
                return localStorageService.get('character');
            },
            storeCharacter: function() {
                localStorageService.set('character', JSON.stringify(character));
            },*/
            getLanguages: function() {
                return $http.get(locationName + 'service/language_table');
            },
            getTools: function() {
                return $http.get(locationName + 'service/tools_table');
            },
            Races: function() {
                return $resource(locationName + 'service/race_table');
            },
            Backgrounds: function() {
                return $resource(locationName + 'service/background_table');
            },
            Classes: function() {
                return $resource(locationName + 'service/class_table');
            },
            Skills: function() {
                return $resource(locationName + 'service/skills_table');
            },
            Feats: function() {
                return $resource(locationName + 'service/feats_table');
            },
            Armor: function() {
                return $resource(locationName + 'service/armor_table');
            },
            Weapons: function() {
                return $resource(locationName + 'service/weapons_table');
            },
            Spells: function(classId, maxSpellLevel, school, term) {
                var path = locationName + 'service/';
                path += ((maxSpellLevel === 0) ? 'cantrips/' + classId : 'spells_table/' + classId + '/' + maxSpellLevel);
                path += ((school) ? '/' + school : '');
                path += ((term) ? '/' + term : '');
                return $resource(path);
            },
            SpellsByLevel: function(classId, spellLevel, term) {
                var path = locationName + 'service/';
                path += 'spells_by_level/' + classId + '/' + spellLevel;
                path += ((term) ? '/' + term : '');
                return $resource(path);
            },
            /*getSpellsBySchool: function(classId, maxSpellLevel, school, term) {
                var path = '/service/';
                path += 'spells_by_school/' + classId + '/' + maxSpellLevel + '/' + school;
                path += ((term) ? '/' + term : '');
                return $http.get(path);
            },*/
            Spell: function(spellId) {
                return $resource(locationName + 'service/spells/' + spellId);
            },
            Character: function(characterId) {
                var url = locationName + 'service/character';
                if (characterId) {
                    url += '/' + characterId;
                }
                return $resource(url);
            }
        };
        var character = new Character();
        (function () {
            character.ability = {
                bonusPoints: 0, // for Ability Score Improvement
                pointsLeft: 15  // 27 points to spend with all 8s
            };
            angular.forEach(ABILITIES, function(ability) {
                character.ability[ability] = {
                    score: 10,
                    adjScore: 10,
                    mod: 0,
                    bonus: false,
                    bonusPoints: 0,
                    raceBonus: 0,
                    savingThrow: 0,
                    min: 8,
                    max: 15
                };
            })
        }());
        var newCharacter = angular.copy(character); // for creating new character

        function returnHttpProp(path) {
            return $http({
                url: window.location.pathname + path,
                method: "GET",
                cache: true
            });
        }
        return returnObj;
    });