angular.module('myApp')
    .factory('Authenticate', function($resource){
        return {
            register: function() {
                return $resource(locationName + "service/register/")
            },
            login: function() {
                return $resource(locationName + "service/authenticate/");
            }
        };
    })
    .factory('Flash', function($rootScope){
        return {
            show: function(message){
                $rootScope.flash = message;
            },
            clear: function(){
                $rootScope.flash = "";
            }
        }
    })
    .factory('General', function($modal) {
        return {
            setSessionStorageProp: function(prop, val) {
                try {
                    sessionStorage[prop] = val;
                    return true;
                } catch (err) {
                    return false;
                }
            },
            openDialog: function openDialog(opts) {
                var localOpts = {
                    backdrop: true,
                    keyboard: true,
                    backdropClick: true
                };
                $.extend(localOpts, opts)
                if (deviceType === 'phone') {
                    localOpts.windowClass = 'modal-overlay';
                }
                $modal.open(localOpts);
            },
            DialogItemsController: function($scope, $modalInstance, items, max, itemIds, title, featureType) {
                $scope.title = title;
                $scope.items = items;
                $scope.searchText = '';
                $scope.description = 'Click a list item to view more information';
                $scope.tempItems = [];
                _.each($scope.items, function(obj, index, list) {
                    if (obj.locked || (angular.isArray(itemIds) && itemIds.indexOf(obj.id) !== -1)) {
                        obj.active = true;
                        $scope.tempItems.push(obj);
                    } else {
                        obj.active = false;
                    }
                });

                $scope.description = 'Click a list item to view more information';
                $scope.max = parseInt(max);
                $scope.disabled = $scope.max  - $scope.tempItems.length > 0;
                $scope.featureType = featureType;

                $scope.showDescription = function(selectobj) {
                    $scope.selectedItem = angular.copy(selectobj.item); // used in UI
                    if (!$scope.selectedItem.locked) {
                        if (!$scope.selectedItem.active && $scope.max - $scope.tempItems.length > 0) {
                            $scope.tempItems.push($scope.selectedItem);
                            selectobj.item.active = true;
                        } else if ($scope.selectedItem.active) {
                            $scope.tempItems = _.reject($scope.tempItems, {'name': $scope.selectedItem.name});
                            selectobj.item.active = false;
                        }
                        $scope.disabled = $scope.max - $scope.tempItems.length > 0; // disabled is true if there are still features left to choose
                    }
                };

                $scope.done = function() {
                    if (angular.isArray($scope.tempItems)) {
                        $modalInstance.close($scope.tempItems);
                    }
                };

                $scope.close = function(){
                    $modalInstance.dismiss('cancel');
                };
            }
        };
    })
    .factory('CharGenFactory', function($http, $timeout, $resource) {
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

        Array.prototype.getIndexBy = function (name, value) {
            for (var i = 0; i < this.length; i++) {
                if (this[i][name] == value) {
                    return i;
                }
            }
            return -1;
        };

        function Character() {
            this.name = null,
            this.raceObj = {};
            this.classObj = {}; // contains subclasses property
            this.background = {};   // & background.skills
            //this.selectedSkills = [], // now in classObj
            this.selectedLanguages = [],
            //this.proficientSkills = '', // same as selectedSkills except in string form
            this.languages = null;
            this.numLanguages = 0;
            //alignment = null;
            this.armorClass = null;
            this.attackMod = null;
            this.savingThrows = null;
            this.hitPoints = null;
            this.speed = null;
            this.initiative = null;
            this.armor = null;
            this.weapons = null;
            this.tools = null;
            this.size = null;
            this.profBonus = 0;
            this.passivePerception = 10;
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
                                if (that.classObj.selectedSkills && that.classObj.selectedSkills.getIndexBy('id', skill.id) === -1) {
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
                                        that.classObj.expertise.selectedExpertise.getIndexBy('id', skill.id) !== -1) {
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
                            && (!backgroundSkills || backgroundSkills.indexOf(currentSkill) === -1)) {
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
            this.enableSkills(false);   // disable all skills
            if (this.background) {
                this.updateSkillProficiency(_.pluck(this.background.skills, 'readable_id'), true, true);
                //this.enableSkills(classSkills, this.background.skills);
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
                        if (selectedExpertise.getIndexBy('id', skill.id) !== -1) { // && !skill.proficient
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
                                selectedExpertise.getIndexBy('id', skill.id) === -1 &&
                                    that.classObj.expertise.list.getIndexBy('id', skill.id) !== -1 && skill.proficient) {
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
                    if (selectedExpertise && selectedExpertise.getIndexBy('id', skill.id) !== -1) {
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
                this.ability[ability].mod = Math.floor((this.ability[ability].score - 10) / 2);
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
                this.initiative = this.ability.dex.mod;
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
        Character.prototype.modifyAbilityScore = function(ability, value) {
            var diff = this.ability[ability].max - MAX_ABILITY,
                currValue = this.ability[ability].score, abilityCost,
                pointsLeft = this.ability.pointsLeft,
                currValueMinusDiff = currValue - diff;
            if (pointsLeft > 0 && (value > 0 && currValue < this.ability[ability].max) || (value < 0 && currValue > this.ability[ability].min)) {
                if ((value > 0 && currValueMinusDiff >= 13 && pointsLeft <= 1) ||
                    (value > 0 && currValueMinusDiff >= 15 && pointsLeft <= 2)) {
                    // do nothing
                } else {
                    if (value > 0) {    // value == 1
                        if (currValueMinusDiff >= 15) {
                            abilityCost = 3;
                        } else if (currValueMinusDiff >= 13) {
                            abilityCost = 2;
                        } else if (currValueMinusDiff < 13) {
                            abilityCost = 1;
                        }
                        this.ability.pointsLeft -= abilityCost;
                    } else {    // value == -1
                        if (pointsLeft === 0 && this.ability.bonusPointsLeftArr.indexOf(ability) !== -1) {
                            this.ability.bonusPointsLeftArr.splice(this.ability.bonusPointsLeftArr.indexOf(ability), 1);    // remove from array
                            this.ability[ability].bonusPoints -= 1;
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
                    updateScore(this, ability, value);
                }
            } else if (pointsLeft === 0) {
                if (this.ability[ability].score < 20 && this.ability.bonusPoints - this.ability.bonusPointsLeftArr.length > 0) {
                    updateScore(this, ability, value); // increment ability and push to array to store where the bonus point went
                    //this.ability.bonusPointsLeftArr.push({"ability": ability, "score": this.ability[ability].score});
                    this.ability.bonusPointsLeftArr.push(ability);  // ex: ['str', 'str']
                    this.ability[ability].bonusPoints += 1;
                }
            }
            function updateScore(character, ability, value) {
                character.ability[ability].score += value;
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
            this.calculateModifiers(ability);
        };
        Character.prototype.handleFeatureBonuses = function(featureBonus) {
            var bonusArray = [], characterArray = [], that = this, expertiseArr;
            this.armor = this.classObj.armor_shield_prof;
            this.weapons = this.classObj.weapon_prof;
            this.classObj.bonusLanguages = [];  //reset
            for (var bonusProp in featureBonus) {
                var propArray = bonusProp.split(' : ');  // usually results in one item
                propArray.forEach(function(prop, ind) {
                    featureBonus[prop] = featureBonus[bonusProp].split(' : ')[ind];
                    if (prop === 'baseSpeed') {
                        that.speed = parseInt(featureBonus[prop]);
                    } else if (that[prop] !== null && (prop === 'initiative' || prop === 'armorClass' || prop === 'attackMod' ||
                        prop === 'speed' || prop === 'numLanguages')) {
                        that[prop] += parseInt(featureBonus[prop]); // character prop needs to exist to add
                    } else if (that[prop] !== null && prop === 'hitPoints') {   // assume hitPoint bonuses apply every level
                        that[prop] += (that.level * (parseInt(featureBonus[prop])));    // multiply hitPoint bonus by level
                    } else if (ABILITIES.indexOf(prop) !== -1) {    // ex: 'str', 'dex', etc.
                        //bonusArray = featureBonus[bonusProp].split(', ');   // primarily for human "1, 1, 1, 1, 1, 1" becomes an array
                        that.increaseAbilityScore(prop, parseInt(featureBonus[prop]));
                    } else if (prop === 'any') {
                        that.raceObj.bonusAbilities = _.reject(ABILITY_MAPPER, {'id': featureBonus[prop]});
                    } else if (prop === 'armor' || prop === 'weapons') {
                        var allResults = '';
                        if (prop === 'armor') {
                            allResults = 'All Armor';
                        } else if (prop === 'weapons') {
                            allResults = 'Martial Weapons';
                        }
                        if (that[prop] && that[prop] !== 'None') {
                            if (that[prop].indexOf(allResults) === -1) {
                                bonusArray = featureBonus[prop].split(', ');    // ex: ['longsword', 'shortsword', 'shortbow', 'longbow']
                                characterArray = that[prop].split(', ');   // ex: ['Simple weapons', 'martial weapons']
                                bonusArray.forEach(function(weapon) {
                                    if (that[prop].indexOf(weapon) === -1) {
                                        characterArray.push(weapon);
                                    }
                                });
                                that[prop] = characterArray.join(', ');
                            }
                        } else {
                            that[prop] = featureBonus[prop];
                        }
                    } else if (prop === 'tools') { // e.g. Dwarf
                        that.raceObj.bonusTool = featureBonus[prop];
                    } else if (prop === 'tool_choice') {    // e.g. Battle Master
                        bonusArray = featureBonus[prop].split(', ');    // e.g. [0] = Artisan's Tools, [1] = 1
                        that.numToolChoices += parseInt(bonusArray[1]);
                        that.selectedTools = [];    // reset; prevents user from selecting anything if reset (maximum limit exceeded)
                    } else if (prop === 'savingThrows') {
                        that.calculateModifiers();
                    } else if (prop === 'defense') {
                        that.classObj.bonusArmorAbility = featureBonus[prop];   // ex: wis
                        that.armorClass += that.ability[featureBonus[prop]].mod;
                    } else if (prop === 'skills') {
                        that.updateSkillProficiency(featureBonus[prop], true, true);
                        that.raceObj.bonusSkill = featureBonus[prop];
                    } else if (prop === 'bonus_skill_choices') { // can only come from raceFeatures for now
                        that.raceObj.numSkillChoices = parseInt(featureBonus[prop]);  // e.g. 2
                    } else if (prop === 'cantrips') {
                        bonusArray = featureBonus[prop].split(', ');
                        that.classObj.cantrip = {
                            classId: bonusArray[0],
                            maxSpellLevel: 0,
                            numSpellsKnown: parseInt(bonusArray[1])
                        }
                    } else if (prop === 'spells_known') {   // ex: 28, 1, 2: 28 is class_id, 1 is max spell level and 2 is number of spells known
                        bonusArray = featureBonus[prop].split(', ');
                        that.classObj.spellcasting.classId = bonusArray[0];
                        that.classObj.spellcasting.maxSpellLevel = bonusArray[1];
                        that.classObj.spellcasting.numSpellsKnown = parseInt(bonusArray[2]);
                        if (bonusArray[3] && bonusArray[4]) {
                            that.classObj.spellcasting.restrictedSchools = [bonusArray[3], bonusArray[4]];  // ex: Abjuration, Evocation
                        }
                    } else if (prop === 'bonus_spells_known') {   // ex: 4, 2, 2: 4 is class_id, 2 is max spell level and 2 is number of spells known
                        bonusArray = featureBonus[prop].split(', ');
                        that.classObj.spellcasting.bonus = {    // expects spellcasting to exist
                            classId: bonusArray[0],
                            maxSpellLevel: bonusArray[1],
                            numSpellsKnown: parseInt(bonusArray[2])
                        };
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
                                feature.max++;  // = 2;    // assume feature_choices is 1
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
                    } else if (prop === 'bonus_language') { // not ready yet
                        if (that.languages.indexOf(featureBonus[prop]) === -1) {
                            that.classObj.bonusLanguages.push(featureBonus[prop]);

                            bonusArray = that.languages.split(', ');
                            bonusArray.push(featureBonus[prop]);
                            bonusArray.sort();
                            that.languages = bonusArray.join(', ');
                        }
                    }
                    /*else if (prop === 'languages') {    // taken care of by determineRace
                     that.defaultLanguages = featureBonus[prop]; // string
                     that.languages = featureBonus[prop].split(', ');
                     if (that.selectedLanguages) {
                     for (var i=0; i<that.selectedLanguages.length; i++) {
                     if (that.selectedLanguages[i]) {
                     that.languages.push(that.selectedLanguages[i]);
                     }
                     }
                     }
                     that.languages.sort();
                     that.languages = that.languages.join(', ');
                     }*/
                });
            }
        };
        Character.prototype.determineLevelBonus = function(level) {
            var index = level - 1,
                PROFICIENCY_ARRAY = [2, 2, 2, 2, 3, 3, 3, 3, 4, 4, 4, 4, 5, 5, 5, 5, 6, 6, 6, 6],
                ABILITY_BONUS_ARRAY = [0, 0, 0, 2, 2, 2, 2, 4, 4, 4, 4, 6, 6, 6, 6, 8, 8, 8, 10, 10];
            this.profBonus = PROFICIENCY_ARRAY[index];
            this.ability.bonusPoints = ABILITY_BONUS_ARRAY[index];
        };
        Character.prototype.determineRace = function() {    // change abilityObj name
            this.speed = parseInt(this.raceObj.speed);
            this.size = this.raceObj.size_value;
            this.defaultLanguages = this.raceObj.languages || ''; // string
            this.handleLanguages();
        };
        Character.prototype.handleLanguages = function() {
            this.languages = this.defaultLanguages.split(', ');
            if (this.selectedLanguages) {
                for (var i=0; i<this.selectedLanguages.length; i++) {
                    if (this.selectedLanguages[i]) {
                        this.languages.push(this.selectedLanguages[i].name);
                    }
                }
            }
            this.languages.sort();
            this.languages = this.languages.join(', ');
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
            }
        }
        Character.prototype.resetSkills = function() {
            if (this.classObj) {
                this.numSkillsLeft = parseInt(this.classObj.num_skills);
                this.classObj.selectedSkills = [];
            }
        };
        Character.prototype.determineClass = function() {    // handles hp and saving throws
            this.handleHitPoints();
            this.savingThrows = this.classObj.saving_throws;   // e.g. "wis, cha"
            this.initiative = this.ability.dex.mod;
            this.armorClass = 10 + this.ability.dex.mod;
            this.numSkillsLeft = parseInt(this.classObj.num_skills);
            this.classObj.selectedSkills = [];
        };
        Character.prototype.determineBackground = function() {
            this.numToolChoices = 0;  // reset
            if (this.background.num_tool_choices > 0) {
                this.numToolChoices++;
                this.selectedTools = [];    // reset
            }
        };
        Character.prototype.handleTools = function(selectedTools) {
            var raceTools, classTools, backgroundTools;
            this.tools = [];
            if (this.raceObj.bonusTool) {
                raceTools = this.raceObj.bonusTool.split(', ');
                this.tools = this.tools.concat(raceTools);
            }
            if (this.classObj.tools) {
                classTools = this.classObj.tools.split(', ');
                this.tools = this.tools.concat(classTools);
            }
            if (this.background && this.background.tools && this.background.num_tool_choices < 1) { // background tools can be blank in the database
                backgroundTools = this.background.tools.split(', ');
                this.tools = this.tools.concat(backgroundTools);
            } else if (angular.isArray(selectedTools)) {
                this.tools = this.tools.concat(_.pluck(selectedTools, 'name'));
            }
            this.tools = $.unique(this.tools);  // remove potential duplicates
            this.tools.sort();
            this.tools = this.tools.join(', '); // return to a string
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
                character.level = charLevel;
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
            getLevels: function(max) {
                return _.range(1, 21);
            },
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
            Spells: function(classId, maxSpellLevel, school, term) {
                var path = locationName + 'service/';
                path += ((maxSpellLevel === 0) ? 'cantrips/' + classId : 'spells_table/' + classId + '/' + maxSpellLevel);
                path += ((school) ? '/' + school : '');
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
        character.ability = {
            str: {
                score: 10,
                mod: 0,
                bonus: false,
                bonusPoints: 0,
                raceBonus: 0,
                savingThrow: 0,
                min: 8,
                max: 15
            },
            dex: {
                score: 10,
                mod: 0,
                bonus: false,
                bonusPoints: 0,
                raceBonus: 0,
                savingThrow: 0,
                min: 8,
                max: 15
            },
            con: {
                score: 10,
                mod: 0,
                bonus: false,
                bonusPoints: 0,
                raceBonus: 0,
                savingThrow: 0,
                min: 8,
                max: 15
            },
            int: {
                score: 10,
                mod: 0,
                bonus: false,
                bonusPoints: 0,
                raceBonus: 0,
                savingThrow: 0,
                min: 8,
                max: 15
            },
            wis: {
                score: 10,
                mod: 0,
                bonus: false,
                bonusPoints: 0,
                raceBonus: 0,
                savingThrow: 0,
                min: 8,
                max: 15
            },
            cha: {
                score: 10,
                mod: 0,
                bonus: false,
                bonusPoints: 0,
                raceBonus: 0,
                savingThrow: 0,
                min: 8,
                max: 15
            },
            bonusPoints: 0, // for Ability Score Improvement
            bonusPointsLeftArr: [],
            pointsLeft: 15  // 27 points to spend with all 8s
        };
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