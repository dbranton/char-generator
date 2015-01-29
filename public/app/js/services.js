angular.module('myApp')
    .factory('Authenticate', function($resource){
        return {
            register: function() {
                return $resource("/service/register/")
            },
            login: function() {
                return $resource("/service/authenticate/");
            }
        };
    })
    .factory('Movies', function($resource){
        return $resource("/service/movies");
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
    .factory('CharGenFactory', function($http, $timeout, $resource) {
        var ABILITIES = ['str', 'dex', 'con', 'int', 'wis', 'cha'];
        var MIN_ABILITY = 8;
        var MAX_ABILITY = 15;
        //var ABILITY_MAPPER = {'str':'Strength', 'dex':'Dexterity', 'con':'Constitution', 'int':'Intelligence', 'wis':'Wisdom', 'cha':'Charisma'};

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
        var enabledSkills;
        Character.prototype.updateSkillProficiency = function(skillName, isAdded, disabled) {   // if isAdded is false, then remove skill
            var that = this;
            if (angular.isArray(this.skills)) {
                if (skillName) {
                    angular.forEach(this.skills, function(skill, i) {
                        if (skillName.indexOf(skill.name) !== -1) {
                            if (disabled) {    // skills[i].proficient will already be updated when user checks/unchecks a skill
                                that.skills[i].proficient = isAdded;
                                that.skills[i].disabled = true;
                            }
                            that.updateSkillScore(skill.name);
                            if (isAdded) {  // add skill
                                if (that.classObj.selectedSkills && that.classObj.selectedSkills.indexOf(skill.name) === -1) {
                                    that.classObj.selectedSkills.push(skill.name);
                                    that.classObj.selectedSkills.sort(); // no need to sort a spliced array
                                    that.numSkillsLeft--;
                                }
                                if (that.numSkillsLeft === 0) {
                                    enabledSkills = [];
                                    that.skills.forEach(function(skill) {
                                        if (skill.disabled === false) {
                                            enabledSkills.push(skill.name);   // save currently enabled skills for later
                                        }
                                    });
                                    that.enableSkills(false);  // then disable all skills except the checked ones
                                }
                            } else {    // remove skill
                                _.pull(that.classObj.selectedSkills, skill.name);
                                // remove skill from expertise if it exists
                                if (that.classObj.expertise && that.classObj.expertise.selectedExpertise &&
                                        that.classObj.expertise.selectedExpertise.indexOf(skill.name) !== -1) {
                                    _.pull(that.classObj.expertise.selectedExpertise, skill.name);
                                    if (that.classObj.expertise.type === 'expertise') {
                                        that.numSkillsLeft++; // +4 to +0: 'expertise' only
                                    }
                                } else {
                                    that.numSkillsLeft++;
                                }
                                if (that.numSkillsLeft === 1) {
                                    that.enableSkills(enabledSkills);    // reenable proficient skills that were disabled
                                }
                            }
                        }
                    });
                } else {    // wipe proficiencies for all skills
                    this.skills.forEach(function(skill, i) {
                        that.skills[i].proficient = false;
                        that.updateSkillScore(skill.name);
                    });
                }
            }
            if (this.classObj.num_skills && disabled) { // disable is true if background was selected, or selected High Elf (perception)
                this.numSkillsLeft = parseInt(this.classObj.num_skills);    // resets numSkills since some skills will be automatically selected
            }
            this.getProficientSkills();
        };
        Character.prototype.enableSkills = function(classSkills, backgroundSkills) {   // skills is an array, exceptions is comma separated string
            var that = this;
            if (angular.isArray(classSkills) && this.numSkillsLeft > 0) {
                enabledSkills = [];
                angular.forEach(classSkills, function(skill, i) {
                    for (var index=0; index<that.skills.length; index++) {
                        if (that.skills[index].name === skill) {
                            break;
                        }
                    }
                    if (!backgroundSkills || backgroundSkills.indexOf(classSkills[i]) === -1) {
                        that.skills[index].disabled = false;
                        enabledSkills.push(that.skills[index].name); // ADDED 9/8/2014 in case something broke
                    } else {    // class skill shares with background skill, so disable it
                        that.skills[index].disabled = true;
                    }
                })
            } else {    // disable everything that isn't checked
                angular.forEach(that.skills, function(skill, i) {
                    if (that.skills[i].proficient === false) {
                        that.skills[i].disabled = true;
                    }
                });
            }
        };
        Character.prototype.handleSkills = function() {
            var classSkills = this.classObj.avail_skills ? this.classObj.avail_skills.split(', ') : [];    // disable everything if empty array
            this.updateSkillProficiency(false); // wipe skill proficiencies
            this.enableSkills(false);   // disable all skills
            if (this.background) {
                this.updateSkillProficiency(this.background.skills, true, true);
                this.enableSkills(classSkills, this.background.skills);
            } else {
                this.enableSkills(classSkills);
            }
        };
        Character.prototype.updateSkillScore = function(skillName, isAdded) {    // if no parameter, update all skills
            var abilityMapper = {
                Str: 'str', Dex: 'dex', Con: 'con', Int: 'int', Wis: 'wis', Cha: 'cha'
            };
            var profBonus = 0;
            var that = this;
            var selectedExpertise = this.classObj.expertise ? this.classObj.expertise.selectedExpertise : null;    // array/null
            angular.forEach(this.skills, function(skill, i) {
                if (!skillName || skill.name === skillName) {   // skillName might be an array of skills
                    if (angular.isDefined(isAdded)) {   // means that it is an expertise skill
                        if (selectedExpertise.indexOf(skill.name) !== -1) { // && !skill.proficient
                            if (!skill.proficient) {    // level 1: +0 to +4
                                skill.proficient = true;    // in case expertise skill is not proficient
                                that.classObj.selectedSkills.push(skill.name);
                                that.classObj.selectedSkills.sort();
                            } else if (skillName === skill.name && !skill.disabled &&
                                    that.classObj.expertise.type === 'selected_expertise') {   // level 1: +2 to +4
                                //selectedExpertise[selectedExpertise.length-1]
                                that.numSkillsLeft++;
                                that.enableSkills(enabledSkills);
                            }
                            if (that.classObj.expertise.type === 'selected_expertise') {
                                skill.disabled = true;
                            }
                        } else if (that.classObj.expertise.type === 'selected_expertise' && // removing expertise skill
                                selectedExpertise.indexOf(skill.name) === -1 &&
                                    that.classObj.expertise.list.indexOf(skill.name) !== -1 && skill.proficient) {
                            skill.proficient = false;
                            if (that.numSkillsLeft > 0 && that.classObj.avail_skills.indexOf(skill.name) !== -1) {
                                skill.disabled = false; // only enable skill if it belongs on the class skill list and numSkillsLeft > 0
                            }
                            _.pull(that.classObj.selectedSkills, skill.name);
                            //that.enableSkills(enabledSkills);
                        }
                    }
                    profBonus = skill.proficient ? that.profBonus : 0;
                    that.skills[i].val = profBonus + that.ability[abilityMapper[skill.ability]].mod;
                    if (selectedExpertise && selectedExpertise.indexOf(skill.name) !== -1) {
                        that.skills[i].val += profBonus;
                        //that.enableSkills(enabledSkills);
                    }
                    if (skill.name === "Perception") {
                        that.passivePerception = 10 + that.skills[i].val;   // handle passive perception
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
        };
        Character.prototype.handleSpellcasting = function(objType) {    // classObj or raceObj
            var type = objType ? objType : 'classObj';
            this[type].spellcasting.spellSaveDC = 8 + this.profBonus + this.ability[this[type].spellcasting.spellAbility].mod;
            this[type].spellcasting.spellAttkBonus = this.profBonus + this.ability[this[type].spellcasting.spellAbility].mod;
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
                        that.ability[prop].score += parseInt(featureBonus[prop]);
                        that.ability[prop].max += parseInt(featureBonus[prop]);
                        that.ability[prop].min += parseInt(featureBonus[prop]);
                        that.calculateModifiers(prop);
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
                    } else if (prop === 'tools' || prop === 'savingThrows') {
                        if (that[prop] && that[prop].indexOf(featureBonus[prop]) === -1) {
                            that[prop] += ', ' + featureBonus[prop];
                        } else if (!that[prop]) {
                            that[prop] = featureBonus[prop];
                        }   // else do nothing
                        that[prop] = that[prop].split(', ');
                        that[prop].sort();
                        that[prop] = that[prop].join(', ');
                        if (prop === 'savingThrows') {
                            that.calculateModifiers();
                        }
                    } else if (prop === 'defense') {
                        that.classObj.bonusArmorAbility = featureBonus[prop];   // ex: wis
                        that.armorClass += that.ability[featureBonus[prop]].mod;
                    } else if (prop === 'skills') {
                        that.updateSkillProficiency(featureBonus[prop], true, true);
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
                        returnObj.Spell(bonusArray[0]).get({}, function(response) {
                            that.raceObj.cantrip = response.spell;  // array
                        });
                        //that.raceObj.cantrip = bonusArray[0];
                    } else if (prop === 'bonus_race_cantrip_choice') {  // High Elf bonus cantrip
                        bonusArray = featureBonus[prop].split(', ');
                        that.raceObj.spellcasting = {};
                        that.raceObj.spellcasting.spellAbility = bonusArray[1]; //featureBonus[prop];    // ex: 'int'

                        that.raceObj.spellcasting.classId = bonusArray[0];
                        that.raceObj.spellcasting.maxSpellLevel = 0;
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
                        bonusArray = featureBonus[prop].split(', ');    // ex: "2, Thieves' Tools"
                        if (expertiseArr.indexOf(bonusArray[1]) === -1) {
                            expertiseArr.push(bonusArray[1]);
                        }
                        that.classObj.expertise.type = prop;
                        that.classObj.expertise.numExpertise = bonusArray[0]; // ex: ['Acrobatics', ... , 'Thieves' Tools']
                        that.classObj.expertise.list = expertiseArr;
                    } else if (prop === 'selected_expertise') {
                        bonusArray = featureBonus[prop].split(', ');    // ex: [2, Arcana, History, Nature, Religion]
                        expertiseArr = bonusArray.slice(1); // ex: [Arcana, History, Nature, Religion]
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
                            $timeout(function() {
                                that.classObj.selectedCantrips.push(featureBonus[prop]);    // causes an empty result to show in the cantrips list
                                that.classObj.selectedCantrips.sort();
                            }); // needs to come after render occurs in select2.js
                        }
                        that.classObj.numCantrips++;
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
            this.languages = this.defaultLanguages.split(', ');
            if (this.selectedLanguages) {
                for (var i=0; i<this.selectedLanguages.length; i++) {
                    if (this.selectedLanguages[i]) {
                        this.languages.push(this.selectedLanguages[i]);
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
        // Handles combining background and tool skills
        Character.prototype.handleTools = function() {   // TODO: Refactor
            var classTools, backgroundTools;
            this.tools = [];
            if (this.classObj.tools) {
                classTools = this.classObj.tools.split(', ');
                this.tools = this.tools.concat(classTools);
            }
            if (this.background && this.background.tools) { // background tools can be blank in the database
                backgroundTools = this.background.tools.split(', ');
                this.tools = this.tools.concat(backgroundTools);
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
                return $http.get(locationName + '/service/language_table');
            },
            Races: function() {
                return $resource(locationName + '/service/race_table');
            },
            Backgrounds: function() {
                return $resource(locationName + '/service/background_table');
            },
            Classes: function() {
                return $resource(locationName + '/service/class_table');
            },
            Skills: function() {
                return $resource(locationName + '/service/skills_table');
            },
            Spells: function(classId, maxSpellLevel, school, term) {
                var path = '/service/';
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
                return $resource(locationName + '/service/spells/' + spellId);
            },
            Character: function(characterId) {
                var url = locationName + '/service/character';
                if (characterId) {
                    url += '/' + characterId;
                }
                return $resource(url);
            },
            getPreparedCharacter: function() {
                var charObj = { "name": "Test", "raceObj": { "id": 10, "active": 1, "readable_id": "Human", "name": "Human", "description": "Short-lived but influential far beyond their years, humans have rapidly spread across the worlds of D&D. Most are the descendants of pioneers, conquerors, traders, travelers, refugees, and others on the move. As a result, human lands are home to a mix of people—physically, culturally, religiously, and politically diverse. Hardy or fine, light-skinned or dark, showy or austere, primitive or civilized, devout or impious, humans run the gamut.", "subrace": "", "subrace_desc": "", "ability_score_adjustment": "Your starting ability scores each increase by 1.", "ability_bonus": 1, "ability_name": "all", "size_desc": "Your size is Medium.", "size": "Medium", "speed_desc": "30 feet.", "speed": "30", "language_desc": "You can speak, read, and write Common and one extra language of your choice.", "languages": "Common", "traits": [ { "id": 35, "class_id": 0, "level": 1, "name": "Ability Score Increase", "description": "Your ability scores each increase by 1.", "type": "", "parent_id": "0", "parent_name": "", "benefit_stat": "str : dex : con : int : wis : cha", "benefit_value": "1 : 1 : 1 : 1 : 1 : 1", "per_level": "", "race_id": "Human", "feature_id": 164, "subrace_id": "", "benefit_desc": "" }, { "id": 23, "class_id": 0, "level": 1, "name": "Languages", "description": "You can speak, read, and write Common and one extra language of your choice.", "type": "", "parent_id": "0", "parent_name": "", "benefit_stat": "numLanguages", "benefit_value": "1", "per_level": "", "race_id": "Human", "feature_id": 36, "subrace_id": "", "benefit_desc": "" } ], "racialTraits": [] }, "classObj": { "id": 3, "active": 1, "name": "Rogue", "desc": "Rogues rely on skill, stealth, and their foes' vulnerabilities to get the upper hand in any situation. They have a knack for finding the solution to just about any problem, demonstrating a resourcefulness and versatility that is the cornerstone of any successful adventuring party.", "short_desc": "A scoundrel who uses stealth and trickery to overcome obstacles and enemies", "hit_dice": "8", "primary_ability": "Dexterity", "armor_shield_prof": "Light Armor", "weapon_prof": "Simple Weapons, Hand Crossbows, Longswords, Rapiers, Shortswords", "tools": "Thieves' Tools", "saving_throw_desc": "Dexterity, Intelligence", "saving_throws": "dex, int", "avail_skills_desc": "Choose four from Acrobatics, Athletics, Deception, Insight, Intimidation, Investigation, Perception, Performance, Persuasion, Sleight of Hand, and Stealth", "avail_skills": "Acrobatics, Athletics, Deception, Insight, Intimidation, Investigation, Perception, Performance, Persuasion, Sleight of Hand, Stealth", "num_skills": 4, "type": "class", "features": [ { "id": 175, "class_id": 3, "level": 1, "name": "Expertise", "description": "At 1st level, choose two of your skill proficiencies, or one of your proficiency with thieves' tools. Your proficiency bonus is doubled for any ability check you make that uses either of the chosen proficiencies.<br />\r\nAt 6th level, you can choose two more of your proficiencies (in skills or with thieves' tools) to gain this benefit.", "type": "", "parent_id": "0", "parent_name": "", "benefit_stat": "expertise", "benefit_value": "Thieves' Tools", "per_level": "", "benefits": [ { "id": 104, "class_id": 3, "feature_id": 175, "level": 1, "benefit_desc": "Choose two of your skill proficiencies, or one of your skill proficiencies and your proficiency with thieves' tools. Your proficiency bonus is doubled for any ability check you make that uses either of the chosen proficiencies.", "type": "expertise", "benefit_stat": "expertise", "benefit_value": "2, Thieves' Tools" }, { "id": 163, "class_id": 3, "feature_id": 175, "level": 6, "benefit_desc": "Choose four of your skill proficiencies, or three of your skill proficiencies and your proficiency with thieves' tools. Your proficiency bonus is doubled for any ability check you make that uses either of the chosen proficiencies.", "type": "expertise", "benefit_stat": "expertise", "benefit_value": "4, Thieves' Tools" } ] }, { "id": 128, "class_id": 3, "level": 1, "name": "Sneak Attack", "description": "Beginning at 1st level, you know how to strike subtly and exploit a foe's distraction. Once per turn, you can deal an extra 1d6 damage to one creature you hit with an attack if you have advantage on the attack roll. The attack must use a finesse or a ranged weapon.\r\nYou don't need advantage on the attack roll if another enemy of the target is within 5 feet of it, that enemy isn't incapacitated, and you don't have disadvantage on the attack roll.<br /> The amount of the extra damage increases as you gain levels in this class.", "type": "", "parent_id": "0", "parent_name": "", "benefit_stat": "", "benefit_value": "", "per_level": "", "benefits": [ { "id": 78, "class_id": 3, "feature_id": 128, "level": 1, "benefit_desc": "Once per turn, you can deal an extra 1d6 damage to one creature you hit with an attack if you have advantage on the attack roll. The attack must use a finesse or a ranged weapon.\r\nYou don't need advantage on the attack roll if another enemy of the target is within 5 feet of it, that enemy isn't incapacitated, and you don't have disadvantage on the attack roll.", "type": "", "benefit_stat": "", "benefit_value": "" } ] }, { "id": 176, "class_id": 3, "level": 1, "name": "Thieves' Cant", "description": "During your rogue training you learned thieves' cant, a secret mix of dialect, jargon, and code that allows you to hide messages in seemingly normal conversation. Only another creature that knows thieves' cant understands such messages. It takes four times longer to convey such a message than it does to speak the same idea plainly.\r\nIn addition, you understand a set of secret signs and symbols used to convey short, simple messages, such as whether an area is dangerous or the territory of a thieves' guild, whether loot is nearby, or whether the people in an area are easy marks or will provide a safe house for thieves on the run.", "type": "", "parent_id": "0", "parent_name": "", "benefit_stat": "", "benefit_value": "", "per_level": "", "benefits": [ { "id": 105, "class_id": 3, "feature_id": 176, "level": 1, "benefit_desc": "You know thieves' cant, a secret mix of dialect, jargon, and code that allows you to hide messages in seemingly normal conversation. Only another creature that knows thieves' cant understands such messages. It takes four times longer to convey such a message than it does to speak the same idea plainly.\r\nIn addition, you understand a set of secret signs and symbols used to convey short, simple messages.", "type": "", "benefit_stat": "", "benefit_value": "" } ] }, { "id": 223, "class_id": 3, "level": 2, "name": "Cunning Action", "description": "Starting at 2nd level, your quick thinking and agility allow you to move and act quickly. You can take a bonus action on each of your turns in combat. This action can be used only to take the Dash, Disengage, or Hide action.", "type": "", "parent_id": "0", "parent_name": "", "benefit_stat": "", "benefit_value": "", "per_level": "", "benefits": [ { "id": 150, "class_id": 3, "feature_id": 223, "level": 2, "benefit_desc": "You can take a bonus action on each of your turns in combat. This action can be used only to take the Dash, Disengage, or Hide action.", "type": "", "benefit_stat": "", "benefit_value": "" } ] }, { "id": 103, "class_id": 3, "level": 3, "name": "Roguish Archetype", "description": "At 3rd level, you choose an archetype that you emulate in the exercise of your rogue abilities. Your choice grants you features at 3rd level and then again at 9th, 13th, and 17th level.", "type": "subclass", "parent_id": "0", "parent_name": "", "benefit_stat": "", "benefit_value": "", "per_level": "", "subclasses": [ { "id": 15, "active": 1, "name": "Arcane Trickster", "desc": "Some rogues enhance their fine-honed skills of stealth and agility with magic, learning tricks of enchantment and illusion. These rogues include pickpockets and burglars, but also pranksters and mischief-makers and a significant number of adventurers.", "short_desc": "", "hit_dice": "", "primary_ability": "", "armor_shield_prof": "", "weapon_prof": "", "tools": "", "saving_throw_desc": "", "saving_throws": "", "avail_skills_desc": "", "avail_skills": "", "num_skills": 0, "type": "subclass", "feature_name": "Rogue Scheme", "class_id": 15, "feature_id": 103, "features": [ { "id": 359, "class_id": 15, "level": 3, "name": "Mage Hand Legerdemain", "description": "At 3rd level, you gain the ability to perform the following additional tasks with your <i>mage hand</i>:\r\n<ul>\r\n<li>You can stow one object the <i>mage hand</i> is holding in a container, such as a backpack or pocket, worn or carried by another creature.</li>\r\n<li>You can retrieve an object in a container worn or carried by another creature.</li>\r\n<li>You can use thieves' tools to pick locks and disarm traps at range.</li>\r\n</ul>\r\nYou can perform one of these tasks without being noticed by a creature if you succeed on a Dexterity (Sleight of Hand) check contested by the creature's Wisdom (Perception) check.", "type": "", "parent_id": "", "parent_name": "", "benefit_stat": "", "benefit_value": "", "per_level": "", "benefits": [] }, { "id": 356, "class_id": 15, "level": 3, "name": "Spellcasting", "description": "When you reach 3rd level, you gain the ability to cast spells.", "type": "super_feature", "parent_id": "", "parent_name": "", "benefit_stat": "", "benefit_value": "", "per_level": "", "subfeatures": [ { "id": 357, "class_id": 15, "level": 3, "name": "Cantrips", "description": "You learn three cantrips: <i>mage hand</i> and two other cantrips of your choice from the wizard spell list. You can cast your cantrips at will.<br />\r\nYou learn another wizard cantrip of your choice at 10th and 16th level.", "type": "", "parent_id": "356", "parent_name": "", "benefit_stat": "cantrips", "benefit_value": "4", "per_level": "", "benefits": [ { "id": 545, "class_id": 15, "feature_id": 357, "level": 3, "benefit_desc": "", "type": "cantrips", "benefit_stat": "cantrips : bonus_class_cantrip", "benefit_value": "4, 2 : Mage Hand" }, { "id": 546, "class_id": 15, "feature_id": 357, "level": 10, "benefit_desc": "", "type": "cantrips", "benefit_stat": "cantrips : bonus_class_cantrip", "benefit_value": "4, 3 : Mage Hand" } ] }, { "id": 358, "class_id": 15, "level": 3, "name": "Spellcasting Ability", "description": "Intelligence is your spellcasting ability for your wizard spells, since you learn your spells through dedicated study and memorization. You use your Intelligence whenever a spell refers to your spellcasting ability. In addition, you use your Intelligence modifier when setting the saving throw DC for a wizard spell you cast and when making an attack roll with one.", "type": "", "parent_id": "356", "parent_name": "", "benefit_stat": "", "benefit_value": "", "per_level": "", "benefits": [ { "id": 547, "class_id": 15, "feature_id": 358, "level": 3, "benefit_desc": "", "type": "", "benefit_stat": "spellcasting", "benefit_value": "int" } ] }, { "id": 478, "class_id": 15, "level": 3, "name": "Spells Known of 1st Level and Higher", "description": "You know three 1st-level wizard spells of your choice, two of which you must choose from the enchantment and illusion spells on the <a target=\"_blank\" href=\"/char-gen/index.php/spells?class_id=4\">wizard spell list</a>. \r\nThe Spells Known column of the Arcane Trickster Spellcasting table shows when you learn more wizard spells of 1st level or higher. Each of these spells must be an enchantment or illusion spell of your choice, and must be of a level for which you have spell slots. \r\nThe spells you learn at 8th, 14th, and 20th level can come from any school of magic.", "type": "", "parent_id": "356", "parent_name": "", "benefit_stat": "", "benefit_value": "", "per_level": "", "benefits": [ { "id": 548, "class_id": 15, "feature_id": 478, "level": 3, "benefit_desc": "", "type": "", "benefit_stat": "spells_known : bonus_spells_known", "benefit_value": "4, 1, 2, Enchantment, Illusion : 4, 1, 1" }, { "id": 549, "class_id": 15, "feature_id": 478, "level": 4, "benefit_desc": "", "type": "", "benefit_stat": "spells_known : bonus_spells_known", "benefit_value": "4, 1, 3, Enchantment, Illusion : 4, 1, 1" }, { "id": 550, "class_id": 15, "feature_id": 478, "level": 7, "benefit_desc": "", "type": "", "benefit_stat": "spells_known : bonus_spells_known", "benefit_value": "4, 2, 4, Enchantment, Illusion : 4, 2, 1" }, { "id": 551, "class_id": 15, "feature_id": 478, "level": 8, "benefit_desc": "", "type": "", "benefit_stat": "spells_known : bonus_spells_known", "benefit_value": "4, 2, 4, Enchantment, Illusion : 4, 2, 2" }, { "id": 552, "class_id": 15, "feature_id": 478, "level": 10, "benefit_desc": "", "type": "", "benefit_stat": "spells_known : bonus_spells_known", "benefit_value": "4, 2, 5, Enchantment, Illusion : 4, 2, 2" }, { "id": 553, "class_id": 15, "feature_id": 478, "level": 11, "benefit_desc": "", "type": "", "benefit_stat": "spells_known : bonus_spells_known", "benefit_value": "4, 2, 6, Enchantment, Illusion : 4, 2, 2" }, { "id": 554, "class_id": 15, "feature_id": 478, "level": 13, "benefit_desc": "", "type": "", "benefit_stat": "spells_known : bonus_spells_known", "benefit_value": "4, 3, 7, Enchantment, Illusion : 4, 3, 2" }, { "id": 555, "class_id": 15, "feature_id": 478, "level": 14, "benefit_desc": "", "type": "", "benefit_stat": "spells_known : bonus_spells_known", "benefit_value": "4, 3, 7, Enchantment, Illusion : 4, 3, 3" }, { "id": 556, "class_id": 15, "feature_id": 478, "level": 16, "benefit_desc": "", "type": "", "benefit_stat": "spells_known : bonus_spells_known", "benefit_value": "4, 3, 8, Enchantment, Illusion : 4, 3, 3" }, { "id": 557, "class_id": 15, "feature_id": 478, "level": 19, "benefit_desc": "", "type": "", "benefit_stat": "spells_known : bonus_spells_known", "benefit_value": "4, 4, 9, Enchantment, Illusion : 4, 4, 3" }, { "id": 558, "class_id": 15, "feature_id": 478, "level": 20, "benefit_desc": "", "type": "", "benefit_stat": "spells_known : bonus_spells_known", "benefit_value": "4, 4, 9, Enchantment, Illusion : 4, 4, 4" } ] } ], "benefits": [] }, { "id": 360, "class_id": 15, "level": 9, "name": "Magical Ambush", "description": "Starting at 9th level, if you are hidden from a creature when you cast a spell on it, the creature has disadvantage on any saving throw it makes against the spell this turn.", "type": "", "parent_id": "", "parent_name": "", "benefit_stat": "", "benefit_value": "", "per_level": "", "benefits": [] }, { "id": 361, "class_id": 15, "level": 13, "name": "Versatile Trickster", "description": "At 13th level, you gain the ability to distract targets with your <i>mage hand</i>. As a bonus action on your turn, you can designate a creature within 5 feet of the spectral hand created by the spell. Doing so gives you advantage on attack rolls against that creature until the end of the turn.", "type": "", "parent_id": "", "parent_name": "", "benefit_stat": "", "benefit_value": "", "per_level": "", "benefits": [] }, { "id": 362, "class_id": 15, "level": 17, "name": "Spell Thief", "description": "At 17th level, you gain the ability to magically steal the knowledge of how to cast a spell from another spellcaster. Immediately after a creature casts a spell that targets you or includes you inits area of effect, you can use your reaction to force the creature to make a saving throw with its spellcasting ability modifier. The DC equals your spell save DC. On a failed save, you steal the knowledge of the spell if it is at least 1st level and of a level you can cast. This theft doesn't disrupt the spell itself. For the next 8 hours, you know the spell and can cast it using your spell slots. The creature cannot cast that spell until the 8 hours have passed. Once you steal a spell, you can't use this feature again until you finish a long rest.", "type": "", "parent_id": "", "parent_name": "", "benefit_stat": "", "benefit_value": "", "per_level": "", "benefits": [] } ] }, { "id": 14, "active": 1, "name": "Assassin", "desc": "You focus your training on the grim art of death. Those who adhere to this archetype are diverse: hired killers, spies, bounty hunters, and even specially anointed priests trained to exterminate the enemies of their deity. Stealth, poison, and disguise help you eliminate your foes with deadly efficiency.", "short_desc": "", "hit_dice": "", "primary_ability": "", "armor_shield_prof": "", "weapon_prof": "", "tools": "", "saving_throw_desc": "", "saving_throws": "", "avail_skills_desc": "", "avail_skills": "", "num_skills": 0, "type": "subclass", "feature_name": "Rogue Scheme", "class_id": 14, "feature_id": 103, "features": [ { "id": 106, "class_id": 14, "level": 3, "name": "Assassinate", "description": "Starting at 3rd level, you are at your deadliest when you get the drop on your enemies. After initiative is rolled for a combat, you have advantage on attack rolls against any creature that hasn't taken a turn in the combat yet. In addition, any hit you score against a creature that is surprised is a critical hit. If you use Sneak Attack on such a critical hit, use the maximum result for each Sneak Attack die instead of rolling it.", "type": "", "parent_id": "0", "parent_name": "", "benefit_stat": "", "benefit_value": "", "per_level": "", "benefits": [ { "id": 52, "class_id": 14, "feature_id": 106, "level": 3, "benefit_desc": "After initiative is rolled for a combat, you have advantage on attack rolls against any creature that hasn't taken a turn in the combat yet. In addition, any hit you score against a creature that is surprised is a critical hit. If you use Sneak Attack on such a critical hit, use the maximum result for each Sneak Attack die instead of rolling it.", "type": "", "benefit_stat": "", "benefit_value": "" } ] }, { "id": 105, "class_id": 14, "level": 3, "name": "Bonus Proficiencies", "description": "When you choose this archetype at 3rd level, you gain proficiency with the disguise kit and the poisoner's kit.", "type": "", "parent_id": "0", "parent_name": "", "benefit_stat": "", "benefit_value": "", "per_level": "", "benefits": [ { "id": 51, "class_id": 14, "feature_id": 105, "level": 3, "benefit_desc": "", "type": "", "benefit_stat": "tools", "benefit_value": "Disguise Kit, Poisoner's Kit" } ] }, { "id": 107, "class_id": 14, "level": 9, "name": "Infiltration Expertise", "description": "Starting at 9th level, you can unfailingly create false identities for yourself. You must spend one week and 25 gp to establish the history, profession, and affiliations for an identity. You cannot establish an identity that belongs to someone else. Thereafter, if you adopt the new identity as a disguise, other creatures believe you to be that person until given an obvious reason not to.", "type": "", "parent_id": "0", "parent_name": "", "benefit_stat": "", "benefit_value": "", "per_level": "", "benefits": [ { "id": 53, "class_id": 14, "feature_id": 107, "level": 9, "benefit_desc": "You must spend one week and 25 gp to establish the history, profession, and affiliations for an identity. You cannot establish an identity that belongs to someone else. Thereafter, if you adopt the new identity as a disguise, other creatures believe you to be that person until given an obvious reason not to.", "type": "", "benefit_stat": "", "benefit_value": "" } ] }, { "id": 108, "class_id": 14, "level": 13, "name": "Imposter", "description": "At 13th level, you gain the ability to unerringly mimic another person's speech, writing, and behavior. You must study each of these three components of the person's behavior for at least one hour, listening to speech, examining handwriting, and observing mannerisms. Your ruse is indiscernible to the casual observer. If a wary creature suspects something is amiss, you have advantage on any Charisma (Deception) check you make to avoid detection.", "type": "", "parent_id": "0", "parent_name": "", "benefit_stat": "", "benefit_value": "", "per_level": "", "benefits": [ { "id": 54, "class_id": 14, "feature_id": 108, "level": 13, "benefit_desc": "You gain the ability to unerringly mimic another person's speech, writing, and behavior. You must study each of these three components of the person's behavior for at least one hour, listening to speech, examining handwriting, and observing mannerisms. Your ruse is indiscernible to the casual observer. If a wary creature suspects something is amiss, you have advantage on any Charisma (Deception) check you make to avoid detection.", "type": "", "benefit_stat": "", "benefit_value": "" } ] }, { "id": 109, "class_id": 14, "level": 17, "name": "Death Strike", "description": "Starting at 17th level, you become a master of instant death. When you attack and hit a creature that is surprised, it must make a Constitution saving throw (DC 8 + your Dexterity modifier + your proficiency bonus). On a failed save, double the damage of your attack against the creature.", "type": "", "parent_id": "0", "parent_name": "", "benefit_stat": "", "benefit_value": "", "per_level": "", "benefits": [ { "id": 55, "class_id": 14, "feature_id": 109, "level": 17, "benefit_desc": "When you attack and hit a creature that is surprised, it must make a Constitution saving throw (DC 8 + your Dexterity modifier + your proficiency bonus). On a failed save, double the damage of your attack against the creature.", "type": "", "benefit_stat": "", "benefit_value": "" } ] } ] }, { "id": 17, "active": 1, "name": "Thief", "desc": "You hone your skills in the larcenous arts. Burglars, bandits, cutpurses, and other criminals typically follow this archetype, but so do rogues who prefer to think of themselves as professional treasure seekers, explorers, delvers, and investigators. In addition to improving your agility and stealth, you learn skills useful for delving into ancient ruins, reading unfamiliar languages, and using magic items your normally couldn't employ.", "short_desc": "", "hit_dice": "", "primary_ability": "", "armor_shield_prof": "", "weapon_prof": "", "tools": "", "saving_throw_desc": "", "saving_throws": "", "avail_skills_desc": "", "avail_skills": "", "num_skills": 0, "type": "subclass", "feature_name": "Rogue Scheme", "class_id": 17, "feature_id": 103, "features": [ { "id": 230, "class_id": 17, "level": 3, "name": "Fast Hands", "description": "Starting at 3rd level, you can use the bonus action granted by your Cunning Action to make a Dexterity (Sleight of Hand) check, use your thieves' tools to disarm a trap or open a lock, or take the Use an Object action.", "type": "", "parent_id": "0", "parent_name": "", "benefit_stat": "", "benefit_value": "", "per_level": "", "benefits": [ { "id": 151, "class_id": 17, "feature_id": 230, "level": 3, "benefit_desc": "You can use the bonus action granted by your Cunning Action to make a Dexterity (Sleight of Hand) check, use your thieves' tools to disarm a trap or open a lock, or take the Use an Object action.", "type": "", "benefit_stat": "", "benefit_value": "" } ] }, { "id": 224, "class_id": 17, "level": 3, "name": "Second-Story Work", "description": "When you choose this archetype at 3rd level, you gain the ability to climb faster than normal; climbing no longer costs you extra movement. In addition, when you make a running jump, the distance you cover increases by a number of feet equal to your Dexterity modifier.", "type": "", "parent_id": "0", "parent_name": "", "benefit_stat": "", "benefit_value": "", "per_level": "", "benefits": [ { "id": 145, "class_id": 17, "feature_id": 224, "level": 3, "benefit_desc": "Climbing no longer costs you extra movement. In addition, when you make a running jump, the distance you cover increases by a number of feet equal to your Dexterity modifier.", "type": "", "benefit_stat": "", "benefit_value": "" } ] }, { "id": 226, "class_id": 17, "level": 9, "name": "Supreme Sneak", "description": "Starting at 9th level, you have advantage on a Dexterity (Stealth) check if you move no more than half your speed on the same.", "type": "", "parent_id": "0", "parent_name": "", "benefit_stat": "", "benefit_value": "", "per_level": "", "benefits": [ { "id": 147, "class_id": 17, "feature_id": 226, "level": 9, "benefit_desc": "You have advantage on a Dexterity (Stealth) check if you move no more than half your speed on the same.", "type": "", "benefit_stat": "", "benefit_value": "" } ] }, { "id": 227, "class_id": 17, "level": 13, "name": "Use Magic Device", "description": "By 13th level, you have learned enough about the workings of magic that you can improvise the use of items even when they are not intended for you. You ignore all class, race, and level requirements on the use of magic items.", "type": "", "parent_id": "0", "parent_name": "", "benefit_stat": "", "benefit_value": "", "per_level": "", "benefits": [ { "id": 148, "class_id": 17, "feature_id": 227, "level": 13, "benefit_desc": "You ignore all class, race, and level requirements on the use of magic items.", "type": "", "benefit_stat": "", "benefit_value": "" } ] }, { "id": 228, "class_id": 17, "level": 17, "name": "Thief's Reflexes", "description": "When you reach 17th level, you have become adept at laying ambushes and quickly escaping danger. You can take two turns during the first round of any combat. You take your first turn at your normal initiative and your second turn at your initiative minus 10. You cannot use this feature when you are surprised.", "type": "", "parent_id": "0", "parent_name": "", "benefit_stat": "", "benefit_value": "", "per_level": "", "benefits": [ { "id": 149, "class_id": 17, "feature_id": 228, "level": 17, "benefit_desc": "You can take two turns during the first round of any combat. You take your first turn at your normal initiative and your second turn at your initiative minus 10. You cannot use this feature when you are surprised.", "type": "", "benefit_stat": "", "benefit_value": "" } ] } ] } ] }, { "id": 130, "class_id": 3, "level": 5, "name": "Uncanny Dodge", "description": "Starting at 5th level, when an attacker that you can see hits you with an attack, you can use your reaction to halve the attack's damage against you.", "type": "", "parent_id": "0", "parent_name": "", "benefit_stat": "", "benefit_value": "", "per_level": "", "benefits": [ { "id": 80, "class_id": 3, "feature_id": 130, "level": 5, "benefit_desc": "When an attacker that you can see hits you with an attack, you can use your reaction to halve the attack's damage against you.", "type": "", "benefit_stat": "", "benefit_value": "" } ] }, { "id": 131, "class_id": 3, "level": 7, "name": "Evasion", "description": "Beginning at 7th level, you can nimbly dodge out of the way of certain area effects, such as a red dragon's fiery breath or an <i>ice storm</i> spell. When you are subjected to an effect that allows you to make a Dexterity saving throw to take only half damage, you instead take no damage if you succeed on the saving throw, and only half damage if you fail.", "type": "", "parent_id": "0", "parent_name": "", "benefit_stat": "", "benefit_value": "", "per_level": "", "benefits": [ { "id": 81, "class_id": 3, "feature_id": 131, "level": 7, "benefit_desc": "When you are subjected to an effect that allows you to make a Dexterity saving throw to take only half damage, you instead take no damage if you succeed on the saving throw, and only half damage if you fail.", "type": "", "benefit_stat": "", "benefit_value": "" } ] }, { "id": 177, "class_id": 3, "level": 11, "name": "Reliable Talent", "description": "By 11th level, you have refined your chosen skills until they approach perfection. Whenever you make an ability check that lets you add your proficiency bonus, you can treat a d20 roll of 9 or lower as a 10.", "type": "", "parent_id": "0", "parent_name": "", "benefit_stat": "", "benefit_value": "", "per_level": "", "benefits": [ { "id": 106, "class_id": 3, "feature_id": 177, "level": 11, "benefit_desc": "Whenever you make an ability check that lets you add your proficiency bonus, you can treat a d20 roll of 9 or lower as a 10.", "type": "", "benefit_stat": "", "benefit_value": "" } ] }, { "id": 135, "class_id": 3, "level": 14, "name": "Blindsense", "description": "Starting at 14th level, if you are able to hear, you are aware of the location of any hidden or invisible creature within 10 feet of you.", "type": "", "parent_id": "0", "parent_name": "", "benefit_stat": "", "benefit_value": "", "per_level": "", "benefits": [ { "id": 84, "class_id": 3, "feature_id": 135, "level": 14, "benefit_desc": "If you are able to hear, you are aware of the location of any hidden or invisible creature within 10 feet of you.", "type": "", "benefit_stat": "", "benefit_value": "" } ] }, { "id": 178, "class_id": 3, "level": 15, "name": "Slippery Mind", "description": "By 15th level, you have acquired greater mental strength. You gain proficiency in Wisdom saving throws.", "type": "", "parent_id": "0", "parent_name": "", "benefit_stat": "savingThrows", "benefit_value": "Wisdom", "per_level": "", "benefits": [ { "id": 14, "class_id": 3, "feature_id": 178, "level": 15, "benefit_desc": "", "type": "", "benefit_stat": "savingThrows", "benefit_value": "wis" } ] }, { "id": 179, "class_id": 3, "level": 18, "name": "Elusive", "description": "Beginning at 18th level, you are so evasive that attackers rarely gain the upper hand against you. No attack roll has advantage against you while you aren't incapacitated.", "type": "", "parent_id": "0", "parent_name": "", "benefit_stat": "", "benefit_value": "", "per_level": "", "benefits": [ { "id": 108, "class_id": 3, "feature_id": 179, "level": 18, "benefit_desc": "No attack roll has advantage against you while you aren't incapacitated.", "type": "", "benefit_stat": "", "benefit_value": "" } ] }, { "id": 137, "class_id": 3, "level": 20, "name": "Stroke of Luck", "description": "At 20th level, you have an uncanny knack for succeeding when you need to. If your attack misses a target within range, you can turn the miss into a hit. Alternatively, if you fail an ability check, you can treat the d20 roll as a 20. Once you use this feature, you can't use it again until you finish a short or long rest.", "type": "", "parent_id": "0", "parent_name": "", "benefit_stat": "", "benefit_value": "", "per_level": "", "benefits": [ { "id": 86, "class_id": 3, "feature_id": 137, "level": 20, "benefit_desc": "If your attack misses a target within range, you can turn the miss into a hit. Alternatively, if you fail an ability check, you can treat the d20 roll as a 20. Once you use this feature, you can't use it again until you finish a short or long rest.", "type": "", "benefit_stat": "", "benefit_value": "" } ] } ], "selectedFeatures": [], "selectedSkills": [ "Acrobatics", "Deception", "Investigation", "Perception", "Sleight of Hand", "Stealth", "Thieves' Tools" ], "classFeatures": [ { "id": 104, "name": "Expertise", "benefit": "Choose two of your skill proficiencies, or one of your skill proficiencies and your proficiency with thieves' tools. Your proficiency bonus is doubled for any ability check you make that uses either of the chosen proficiencies." }, { "id": 78, "name": "Sneak Attack", "benefit": "Once per turn, you can deal an extra 1d6 damage to one creature you hit with an attack if you have advantage on the attack roll. The attack must use a finesse or a ranged weapon.\r\nYou don't need advantage on the attack roll if another enemy of the target is within 5 feet of it, that enemy isn't incapacitated, and you don't have disadvantage on the attack roll." }, { "id": 105, "name": "Thieves' Cant", "benefit": "You know thieves' cant, a secret mix of dialect, jargon, and code that allows you to hide messages in seemingly normal conversation. Only another creature that knows thieves' cant understands such messages. It takes four times longer to convey such a message than it does to speak the same idea plainly.\r\nIn addition, you understand a set of secret signs and symbols used to convey short, simple messages." } ], "subclasses": [], "expertise": { "label": "Expertise", "selectedExpertise": [ "Perception", "Stealth" ], "type": "expertise", "numExpertise": "2", "list": [ "Acrobatics", "Deception", "Investigation", "Perception", "Sleight of Hand", "Stealth", "Thieves' Tools" ] }, "bonusLanguages": [] }, "background": { "id": 12, "active": 1, "name": "Criminal", "description": "You are an experienced criminal with a history of breaking the law. You have spent a lot of time among other criminals and still have contacts within the criminal underworld. You're far closer than most people to the world of murder, theft, and violence that pervades the underbelly of civilization, and you have survived up to this point by flouting the rules and regulations of society.", "trait_name": "Criminal Contact", "trait_desc": "You have a contact who acts as your liaison to a network of other criminals. You know how to get messages to and from your contact, even over great distances; specifically, you know the local messengers, corrupt caravan masters, and seedy sailors who can deliver messages for you.", "skills": "Deception, Stealth", "tools": "Playing Cards, Thieves' Tools", "languages": "0", "language_desc": "" }, "selectedLanguages": [ { "id": 2, "name": "Dwarvish", "type": "standard" } ], "languages": "Common, Dwarvish", "numLanguages": 1, "armorClass": 13, "attackMod": null, "hitPoints": 11, "speed": 30, "initiative": 3, "armor": "Light Armor", "weapons": "Simple Weapons, Hand Crossbows, Longswords, Rapiers, Shortswords", "tools": "Playing Cards, Thieves' Tools", "profBonus": 2, "passivePerception": 14, "ability": { "str": { "score": 11, "mod": 0, "bonus": false, "raceBonus": 0, "savingThrow": 0, "min": 9, "max": 16 }, "dex": { "score": 16, "mod": 3, "bonus": false, "raceBonus": 0, "savingThrow": 3, "min": 9, "max": 16 }, "con": { "score": 16, "mod": 3, "bonus": false, "raceBonus": 0, "savingThrow": 3, "min": 9, "max": 16 }, "int": { "score": 12, "mod": 1, "bonus": false, "raceBonus": 0, "savingThrow": 1, "min": 9, "max": 16 }, "wis": { "score": 11, "mod": 0, "bonus": false, "raceBonus": 0, "savingThrow": 0, "min": 9, "max": 16 }, "cha": { "score": 11, "mod": 0, "bonus": false, "raceBonus": 0, "savingThrow": 0, "min": 9, "max": 16 }, "bonusPoints": 0, "bonusPointsLeftArr": [], "pointsLeft": 0 }, "level": 1, "skills": [ { "id": 5, "name": "Acrobatics", "description": "Your Dexterity (Acrobatics) check covers your attempt to stay on your feet in a tricky situation, such as when you're trying to run across a sheet of ice, balance on a tightrope, or stay upright on a rocking ship's deck. Also make a Dexterity (Acrobatics) check to see if you can perform acrobatic stunts, including dives, rolls, somersaults, and flips.", "ability": "Dex", "val": 5, "proficient": true, "disabled": false }, { "id": 24, "name": "Animal Handling", "description": "When there is any question whether you can calm down a domesticated animal, keep a mount from getting spooked, or intuit an animal's intentions, make a Wisdom (Animal Handling) check. You also make a Wisdom (Animal Handling) check to control your mount when you attempt a risky maneuver.", "ability": "Wis", "val": 0, "proficient": false, "disabled": true }, { "id": 12, "name": "Arcana", "description": "Your Intelligence (Arcana) check measures your ability to recall lore about spells, magic items, eldritch symbols, magical traditions, the planes of existence, and the inhabitants of those planes.", "ability": "Int", "val": 1, "proficient": false, "disabled": true }, { "id": 2, "name": "Athletics", "description": "Your Strength (Athletics) check covers difficult situations you encounter while climbing, jumping, or swimming. Examples include the following activities:\r\n<ul>\r\n<li>You attempt to climb a sheer or slippery cliff, avoid hazards while scaling a wall, or cling to a surface while something is trying to knock you off.</li>\r\n<li>You try to jump an unusually long distance or pull off a stunt midjump.</li>\r\n<li>You struggle to swim or stay afloat in treacherous currents, storm-tossed waves, or areas of thick seaweed. Or another creature tries to push or pull you underwater or otherwise interfere with your swimming.</li>\r\n</ul>", "ability": "Str", "val": 0, "proficient": false, "disabled": true }, { "id": 28, "name": "Deception", "description": "Your Charisma (Deception) check determines whether you can convincingly hide the truth, either verbally or through your actions. This deception can encompass everything from misleading others through ambiguity to telling outright lies. Typical situations include trying to fast-talk a guard, con a merchant, earn money through gambling, pass yourself off in a disguise, dull someone's suspicions with false assurances, or maintain a straight face while telling a blatant lie.", "ability": "Cha", "val": 2, "proficient": true, "disabled": true }, { "id": 11, "name": "History", "description": "Your Intelligence (History) check measures your ability to recall lore about historical events, legendary people, ancient kingdoms, past disputes, recent wars, and lost civilizations.", "ability": "Int", "val": 1, "proficient": false, "disabled": true }, { "id": 26, "name": "Insight", "description": "Your Wisdom (Insight) check decides whether you can determine the true intentions of a creature, such as when searching out a lie or predicting someone's next move. Doing so involves gleaning clues from body language, speech habits, and changes in mannerisms.", "ability": "Wis", "val": 0, "proficient": false, "disabled": true }, { "id": 30, "name": "Intimidation", "description": "When you attempt to influence someone through overt threats, hostile actions, and physical violence, make a Charisma (Intimidation) check to intimidate them. Examples include trying to pry information out of a prisoner, convincing street thugs to back down from a confrontation, or using the edge of a broken bottle to convince a sneering vizier to reconsider a decision.", "ability": "Cha", "val": 0, "proficient": false, "disabled": true }, { "id": 21, "name": "Investigation", "description": "When you look around for clues and make deductions based on those clues, you make an Intelligence (Investigation) check. You might deduce the location of a hidden object, discern from the appearance of a wound what kind of weapon dealt it, or determine the weakest point in a tunnel that could cause it to collapse. Poring through ancient scrolls in search of a hidden fragment of knowledge might also call for an Intelligence (Investigation) check.", "ability": "Int", "val": 3, "proficient": true, "disabled": false }, { "id": 23, "name": "Medicine", "description": "A Wisdom (Medicine) check lets you try to stabilize a dying companion or diagnose an illness.", "ability": "Wis", "val": 0, "proficient": false, "disabled": true }, { "id": 16, "name": "Nature", "description": "Your Intelligence (Nature) check measures your ability to recall lore about terrain, plants and animals, the weather, and natural cycles.", "ability": "Int", "val": 1, "proficient": false, "disabled": true }, { "id": 27, "name": "Perception", "description": "Your Wisdom (Perception) check lets you spot, hear, or otherwise detect the presence of something. It measures your general awareness of your surroundings and the keenness of your senses. For example, you might try to hear a conversation through a closed door, eavesdrop under an open window, or hear monsters moving stealthily in the forest. Or you might try to spot things that are obscured or easy to miss, whether they are orcs lying in ambush on a road, thugs hiding in the shadows of an alley, or candlelight under a closed secret door.", "ability": "Wis", "val": 4, "proficient": true, "disabled": false }, { "id": 31, "name": "Performance", "description": "Your Charisma (Performance) check determines how well you can delight an audience with music, dance, acting, storytelling, or some other form of entertainment.", "ability": "Cha", "val": 0, "proficient": false, "disabled": true }, { "id": 32, "name": "Persuasion", "description": "When you attempt to influence someone or a group of people with your tact, social graces, or good nature, make a Charisma (Persuasion) check. Typically, you use persuasion in good faith, to foster friendships, make cordial requests, or exhibit proper etiquette. Examples of persuading others include convincing a chamberlain to let you see the king, negotiating peace between warring tribes, or inspiring a crowd of townsfolk.", "ability": "Cha", "val": 0, "proficient": false, "disabled": true }, { "id": 19, "name": "Religion", "description": "Your Intelligence (Religion) check measures your ability to recall lore about deities, rites and prayers, religious hierarchies, holy symbols, and the practices of secret cults.", "ability": "Int", "val": 1, "proficient": false, "disabled": true }, { "id": 6, "name": "Sleight of Hand", "description": "Whenever you attempt an act of legerdemain or manual trickery, such as planting something on someone else or concealing an object on your person, make a Dexterity (Sleight of Hand) check. You can also make a Dexterity (Sleight of Hand) check to determine whether you can lift a coin purse off another person or slip something out of another person's pocket.", "ability": "Dex", "val": 5, "proficient": true, "disabled": false }, { "id": 9, "name": "Stealth", "description": "Make a Dexterity (Stealth) check when you attempt to conceal yourself from enemies, slink past guards, slip away without being noticed, or sneak up on someone without being seen or heard.", "ability": "Dex", "val": 7, "proficient": true, "disabled": true }, { "id": 33, "name": "Survival", "description": "Make a Wisdom (Survival) check to follow tracks, hunt wild game, guide your group through frozen wastelands, identify signs that owlbears live nearby, predict the weather, or avoid quicksand and other natural hazards.", "ability": "Wis", "val": 0, "proficient": false, "disabled": true } ], "defaultLanguages": "Common", "numSkillsLeft": 0, "proficientSkills": "Acrobatics, Deception, Investigation, Perception, Sleight of Hand, Stealth", "bonusHP": 3 };
                charObj.userId = sessionStorage.userId;
                return charObj;
            },
            generateSpellHtml: function(spellObj) {
                var html = '';
                if (spellObj.level > 0) {
                    html += '<div><i>Level ' + spellObj.level + ' ' + spellObj.type + '</i></div>';
                } else {
                    html += '<div><i>' + spellObj.type + ' Cantrip</i></div>';
                }
                html += '<ul class="list-unstyled">' +
                            '<li><b>Casting Time:</b> ' + spellObj.casting_time + '</li>' +
                            '<li><b>Range:</b> ' + spellObj.range + '</li>' +
                            '<li><b>Components:</b> ' + spellObj.components + '</li>' +
                            '<li><b>Duration:</b> ' + spellObj.duration + '</li>' +
                        '</ul>';
                html += '<div>' + spellObj.description + '</div>';
                return html;
            }
        };
        var character = new Character();
        character.ability = {
            str: {
                score: 10,
                mod: 0,
                bonus: false,
                raceBonus: 0,
                savingThrow: 0,
                min: 8,
                max: 15
            },
            dex: {
                score: 10,
                mod: 0,
                bonus: false,
                raceBonus: 0,
                savingThrow: 0,
                min: 8,
                max: 15
            },
            con: {
                score: 10,
                mod: 0,
                bonus: false,
                raceBonus: 0,
                savingThrow: 0,
                min: 8,
                max: 15
            },
            int: {
                score: 10,
                mod: 0,
                bonus: false,
                raceBonus: 0,
                savingThrow: 0,
                min: 8,
                max: 15
            },
            wis: {
                score: 10,
                mod: 0,
                bonus: false,
                raceBonus: 0,
                savingThrow: 0,
                min: 8,
                max: 15
            },
            cha: {
                score: 10,
                mod: 0,
                bonus: false,
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

// update popover template for binding unsafe html
angular.module("template/popover/popover.html", []).run(["$templateCache", function ($templateCache) {
    $templateCache.put("template/popover/popover.html",
        "<div class=\"popover popover-lg {{placement}}\" ng-class=\"{ in: isOpen(), fade: animation() }\">\n" +
            "  <div class=\"arrow\"></div>\n" +
            "\n" +
            "  <div class=\"popover-inner\">\n" +
            "      <h3 class=\"popover-title\" ng-bind-html=\"title | unsafe\" ng-show=\"title\"></h3>\n" +
            "      <div class=\"popover-content\"ng-bind-html=\"content | unsafe\"></div>\n" +
            "  </div>\n" +
            "</div>\n" +
            "");
}]);