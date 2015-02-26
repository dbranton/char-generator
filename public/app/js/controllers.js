//var app = angular.module('myApp.controllers', ['ui.router'])

app.controller('homeController', function($scope, $sanitize, $location, $state, Authenticate, Flash, General, CharGenFactory){
    /********
     * Alerts
     ********/
    $scope.alerts = [];
    $scope.closeAlert = function(index) {
        $scope.alerts.splice(index, 1);
    };

    /*******
     * Character Generator
     *******/

    $scope.Math = window.Math;
    $scope.character = CharGenFactory.getNewCharacter();    // defaults to level 1 character if user chooses not to select a level at first

    // Initialize variables
    $scope.racialBonus = {};
    $scope.searchText = ''; // necessary?
    $scope.subclasses = [];
    $scope.selectedExpertise = [];
    $scope.levels = CharGenFactory.getLevels(20);
    $scope.storedCharacter = null;
    //$scope.selectedSpells = [];
    //$scope.bonusSelectedSpells = [];
    $scope.numLanguagesLeft = 0;

    $scope.fillInCharacter = function() {
        $scope.storedCharacter = CharGenFactory.returnStoredCharacter();
        $scope.character.prefillCharacter($scope.storedCharacter);
        $scope.race = $scope.character.raceObj;
        $scope.clazz = $scope.character.classObj;
    };

    $scope.saveCharacter = function() {
        //var stringifiedCharacter = JSON.stringify($scope.character);
        $scope.validating = true;
        if ($scope.charGenForm.$valid) {
            CharGenFactory.Character().save({character: $scope.character},  // called at least 3 times!!!!
                function(data, status, headers, config) {
                    $location.path(locationName + '/dashboard');
                    Flash.show("You have successfully saved your character");
                    //$scope.errorMessage = null;
                },
                function(data, status, headers, config) {
                    $scope.successMessage = null;
                    $scope.errorMessage = data; // html string
                    //$location.hash('wrap');
                    //$anchorScroll();
                }
            );
        }
    };

    $scope.filterByName = function(value) {
        if (value.name) {
            return value.name.toLowerCase().indexOf($scope.searchText.toLowerCase()) !== -1;
        }
    };

    /*$scope.openNewCharDialog = function() {
        opts.templateUrl = 'app/views/dialog_new_character.html';
        opts.controller = DialogNewCharController;
        openDialog('sm');
    };*/
    $scope.changeLevel = function(level) {
        $scope.character.determineLevelBonus(level);
        $scope.$broadcast('handleBroadcast', {checked: true, clazz: $scope.character.classObj});
    };

    $scope.openRaceDialog = function() {
        var opts = {};
        opts.templateUrl = path + '/app/views/dialog_race.html';
        opts.controller = DialogRaceController;
        opts.resolve = {
            raceData: function() { return angular.copy($scope.raceData); },
            raceId: function() { return $scope.character.raceObj.id; }
        };
        General.openDialog(opts);
    };

    $scope.openBackgroundDialog = function() {
        var opts = {};
        opts.templateUrl = path + '/app/views/dialog_background.html';
        opts.controller = DialogBackgroundController;
        opts.resolve = {
            backgroundData: function() { return angular.copy($scope.backgroundData); },
            backgroundId: function() { return $scope.character.background.id; }
        };
        General.openDialog(opts);
    };

    $scope.openClassDialog = function() {
        var opts = {};
        opts.templateUrl = path + '/app/views/dialog_class.html';
        opts.controller = DialogClassController;
        opts.resolve = {
            classData: function() { return angular.copy($scope.classData); },
            classId: function() { return $scope.character.classObj.id; }
        };
        General.openDialog(opts);
    };

    $scope.openSubclassDialog = function() {
        var opts = {};
        opts.templateUrl = path + '/app/views/dialog_class.html';
        opts.controller = DialogSubclassController;
        opts.resolve = {
            subclasses: function() { return angular.copy($scope.character.classObj.subclasses); },
            subclassId: function() { return $scope.character.classObj.subclassObj ? $scope.character.classObj.subclassObj.id : null; }
        };
        General.openDialog(opts);
    };

    $scope.openFeatureDialog = function(selectedFeature, type) {
        var opts = {};
        opts.templateUrl = path + '/app/views/dialog_features.html';
        opts.controller = DialogFeatureController;
        opts.resolve = {
            features: function() { return angular.copy(selectedFeature.choices); },    //$scope.character.classObj.featureChoices
            index: function() { return selectedFeature.index; },
            type: function() { return type; },
            //selectedFeatures: function() { return $scope.character.selectedFeatures; },
            max: function() { return selectedFeature.max; },
            featureIds: function() { return selectedFeature.name ? _.pluck(selectedFeature.name, 'id') : null; }
        };
        General.openDialog(opts);
    };

    /*$scope.openLanguageDialog = function() {
        opts.templateUrl = path + '/app/views/dialog_items.html';
        opts.controller = DialogLanguageController;
        opts.resolve = {
            languageData: function() { return angular.copy($scope.availableLanguages); },
            max: function() { return $scope.select2Languages; },
            languageIds: function() { return $scope.character.selectedLanguages ? _.pluck($scope.character.selectedLanguages, 'id') : null; }
        };
        openDialog();
    };*/

    $scope.openSummary = function() {
        var opts = {};
        opts.templateUrl = path + '/app/views/dialog_summary.html'; //'dialog/summary';
        opts.controller = DialogSummaryController;
        opts.resolve = {
            character: function() { return angular.copy($scope.character); }
        };
        opts.size = 'lg';
        General.openDialog(opts);
    };

    // determines points left
    $scope.incrementAbility = function(ability, value) {    // value can only be 1 or -1
        $scope.character.modifyAbilityScore(ability, value);
    };

    var LANGUAGE_LIST = [];
    $scope.init = function() {
        //$scope.storedCharacter = CharGenFactory.returnStoredCharacter();
        CharGenFactory.Races().get({}, function(data){
            $scope.raceData = data.races;
        });
        CharGenFactory.Backgrounds().get({}, function(data) {
            $scope.backgroundData = data.backgrounds;
        });
        CharGenFactory.Classes().get({}, function(data) {
            $scope.classData = data.classes;
        });
        //$scope.character = CharGenFactory.getPreparedCharacter();   // TODO: REMOVE LATER
    };

    $scope.broadcastObj = function(arr, name, prop) {
        var obj = {checked: true}, data;
        if (name) {
            data = _.findWhere(arr, {name: name})
            if (angular.isDefined(data)) {
                obj[prop] = data;
                $scope.$broadcast('handleBroadcast', obj);
            }
        }
    };
    $scope.broadcastArray = function(selectedObj, prop, type) { // for selecting (multiple) feature choices
        var broadcastObj = {checked: true};
        if (angular.isArray(selectedObj.name) && angular.isArray(selectedObj.choices)) {
            broadcastObj[prop] = selectedObj.name;  //selectedArr;
            broadcastObj.featureIndex = selectedObj.index;
            broadcastObj.type = type;
            $scope.$broadcast('handleBroadcast', broadcastObj);
        }
    };
    $scope.broadcastNonObj = function(name, prop) {  // for selecting cantrips (and maybe languages)
        var string = name;  // for cantrips, its an array, for bonus cantrip, its a string
        var obj = {
            checked: true
        };
        obj[prop] = string;
        $scope.$broadcast('handleBroadcast', obj);
    };

    var getFeatureChoices = function(choices, level, type, index) {  // type is 'classArr' or 'subclassArr'
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

    // mobile only
    $scope.selectItem = function(callBack, arr1, arr2, arr3, modalName) {
        $scope.$parent.Ui.turnOff(modalName);
        callBack.apply(undefined, [arr1, arr2, arr3]);
    };
    // mobile only
    $scope.selectFeature = function(feature) {
        $scope.selectedFeature = feature;
    };

    $scope.$on('handleBroadcast', function(event, args) {
        var features = {};  // reset
        if (args.checked) {
            /*if (!args.subclass && !args.selectedFeature) {
             $scope.character = CharGenFactory.resetCharacter();   // no longer needed
             }*/
            if (args.level) {
                $scope.character = CharGenFactory.getNewCharacter(args.level);
                $scope.race = null;
                $scope.clazz = null;
                $scope.background = null;
                $scope.validating = false;  // reset validation
            }
            //if (args.race && $scope.race) { // only true if user selected a different race
            $scope.character.resetRacialBonuses();
            //}
            if (args.race || args.background) {
                $scope.character.selectedLanguages = []; // reset languages only if race or background is selected
            }
            if (args.race || $scope.race) { // && args.racialTraits) { // args.race is a string of the race's name
                $scope.race = args.race || $scope.race;
                $scope.racialBonus = {};    // reset racial bonuses
                $scope.character.raceObj = $scope.race;
                //$scope.character.racialTraits = args.racialTraits;
                $scope.character.raceObj.racialTraits = []; // reset
                if ($scope.race.traits) {
                    var tempName;
                    angular.forEach($scope.race.traits, function(trait) {
                        if (trait.benefit_desc && trait.level <= $scope.character.level) {
                            if (!tempName || tempName !== trait.name) {
                                $scope.character.raceObj.racialTraits.push(new KeyValue(trait.id, trait.name, trait.benefit_desc));
                                tempName = trait.name;
                            } else {    // for Tiefling's Infernal Legacy
                                $scope.character.raceObj.racialTraits[_.findIndex($scope.character.raceObj.racialTraits, {'name': tempName})] = new KeyValue(trait.id, trait.name, trait.benefit_desc);
                            }
                        }
                        if (trait.benefit_stat) {
                            features[trait.benefit_stat] = trait.benefit_value;
                        }
                        // handle race cantrips (ex: High Elf)
                        /*if (trait.cantrip) {
                            $scope.character.raceObj.cantrip = trait.cantrip;
                        }
                        if (trait.cantrips && !args.selectedBonusCantrip) {    // trait.cantrips is the cantrip list
                            $scope.character.raceObj.cantrips = angular.copy(trait.cantrips);   // populate cantrips list
                        }*/
                    });
                }

                // account for spellcaster's cantrips coinciding with High Elf's bonus cantrip
                if (args.selectedCantrips && $scope.character.classObj.selectedCantrips && $scope.character.raceObj.cantrips) {
                    for (var i=0, ilen=$scope.character.classObj.selectedCantrips.length; i<ilen; i++) {
                        /*if ($scope.character.raceObj.cantrips.getIndexBy('name', $scope.character.classObj.selectedCantrips[i]) !== -1) {
                            $scope.character.raceObj.cantrips.splice($scope.character.raceObj.cantrips.getIndexBy('name', $scope.character.classObj.selectedCantrips[i]), 1);  // filter out selected cantrips (if any) from bonus cantrips list
                        }*/
                        $scope.character.raceObj.cantrips = _.filter($scope.character.raceObj.cantrips, {'name': $scope.character.classObj.selectedCantrips[i]}); // TODO: test this
                    }
                }

                $scope.character.determineRace();   // now takes care of languages
                //$scope.character.racialTraitIds = args.racialTraitIds;
            }
            //if ((args.clazz || $scope.clazz) && !args.subclass && !args.selectedFeature) {
            if (args.clazz || $scope.clazz) {
                $scope.clazz = args.clazz || $scope.clazz;
                if (args.clazz) {
                    $scope.character.classObj = $scope.clazz;   // used to determine if class contains subclasses
                    $scope.selectedFeature = null;    // reset
                    //$scope.character.selectedFeatures = [];       // reset // for featureChoices
                    $scope.character.classObj.selectedFeatures = [];    // reset
                    $scope.selectedChoices = {classArr: [], subclassArr: []}; //[];
                    $scope.character.determineClass();
                }
                if (args.subclass) {
                    $scope.character.classObj.expertise = null; // clear expertise if subclass changed (Knowledge Domain)
                }
                //$scope.character.className = args.clazz.name;
                if (angular.isArray($scope.clazz.features)) {
                    $scope.character.classObj.classFeatures = [];    // reset    //$scope.character.classFeatures = [];    // reset
                    //$scope.character.featureIds = [];  // reset
                    $scope.character.classObj.subclasses = [];    // reset
                    var featureChoiceIdx = 0;   // reset
                    angular.forEach($scope.clazz.features, function(featureObj, idx) {
                        if (featureObj.level <= $scope.character.level) {
                            var tempBenefit = '';
                            if (featureObj.subclasses) {
                                $scope.character.classObj.subclassName = featureObj.name;
                                $scope.character.classObj.subclasses = featureObj.subclasses;
                            }
                            if (angular.isArray(featureObj.benefits)) {
                                angular.forEach(featureObj.benefits, function(benefitObj) {
                                    if (benefitObj.level <= $scope.character.level) {
                                        tempBenefit = benefitObj;
                                    }
                                });
                                if (tempBenefit.benefit_desc !== '') {   // adds benefits that have descriptions to classFeatures list
                                    $scope.character.classObj.classFeatures.push(new KeyValue(tempBenefit.id, featureObj.name, tempBenefit.benefit_desc));
                                }
                                if (tempBenefit.benefit_stat) {
                                    features[tempBenefit.benefit_stat] = tempBenefit.benefit_value;
                                    // give dynamic name for expertise label
                                    if ((args.clazz || args.subclass) && tempBenefit.benefit_stat === 'expertise') {
                                        $scope.character.classObj.expertise = {};
                                        $scope.character.classObj.expertise.label = featureObj.name;
                                        $scope.selectedExpertise = $scope.character.classObj.expertise.selectedExpertise = [];
                                    }
                                }
                                // handle features that provide choices
                                if (tempBenefit.benefit_stat === 'feature_choice') {
                                    if (args.clazz) {
                                        $scope.character.classObj.selectedFeatures[featureChoiceIdx] = {'name': [], 'max': tempBenefit.benefit_value, 'label': featureObj.name, 'index': featureChoiceIdx};
                                        $scope.character.classObj.selectedFeatures[featureChoiceIdx].choices = getFeatureChoices(featureObj.subfeatures, $scope.character.level, 'classArr', featureChoiceIdx);
                                        featureChoiceIdx++;
                                    } else if ($scope.clazz) {  //to account for additional fighting style changing classObj.selectedFeatures
                                        if ($scope.character.classObj.selectedFeatures[featureChoiceIdx].max !== tempBenefit.benefit_value) {
                                            $scope.character.classObj.selectedFeatures[featureChoiceIdx].max = parseInt(tempBenefit.benefit_value);
                                            $scope.character.classObj.selectedFeatures[featureChoiceIdx].name =
                                                $scope.character.classObj.selectedFeatures[featureChoiceIdx].name.slice(0, parseInt(tempBenefit.benfit_value));
                                            if ($scope.selectedChoices.classArr.length > 0) {
                                                $scope.selectedChoices.classArr[featureChoiceIdx] = $scope.selectedChoices.classArr[featureChoiceIdx].slice(0, parseInt(tempBenefit.benefit_value));
                                            }
                                        }
                                        featureChoiceIdx++;
                                    }
                                } else if (angular.isArray(featureObj.subfeatures)) {    // ignore feature_choices
                                    angular.forEach(featureObj.subfeatures, function(subfeature) {
                                        /*if (subfeature.cantrips && !args.selectedCantrips) {    // make sure to not execute when selecting cantrips
                                            $scope.character.classObj.cantrips = angular.copy(subfeature.cantrips);   // populate cantrips list
                                        }*/
                                        if (angular.isArray(subfeature.benefits)) {
                                            angular.forEach(subfeature.benefits, function(benefitObj, idx) {
                                                if (benefitObj.level <= $scope.character.level) {
                                                    tempBenefit = benefitObj;
                                                }
                                            });
                                            if (tempBenefit.benefit_desc !== '') {   // adds benefits that have descriptions to classFeatures list
                                                $scope.character.classObj.classFeatures.push(new KeyValue(tempBenefit.id, subfeature.name, tempBenefit.benefit_desc));
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
                    $scope.currentClassFeatures = $scope.character.classObj.classFeatures;
                }
                // keeps high elf's bonus cantrip from coinciding with spellcaster's cantrips
                if ($scope.character.raceObj.cantrip &&
                        ($scope.character.classObj.cantrips && $scope.character.classObj.cantrips.getIndexBy('name', $scope.character.raceObj.cantrip) !== -1)) {
                    $scope.character.classObj.cantrips.splice($scope.character.classObj.cantrips.getIndexBy('name', $scope.character.raceObj.cantrip), 1);  // remove bonus cantrip (if any) from cantrips list
                } else if ($scope.character.classObj.subclassObj && $scope.character.classObj.subclassObj.cantrips &&
                        $scope.character.classObj.subclassObj.cantrips.getIndexBy('name', $scope.character.raceObj.cantrip) !== -1) {
                    $scope.character.classObj.subclassObj.cantrips.splice($scope.character.classObj.subclassObj.cantrips.getIndexBy('name', $scope.character.raceObj.cantrip), 1);  // remove bonus cantrip (if any) from subclass cantrips list
                }
            }
            if (args.subclass || $scope.character.classObj.subclassObj) {
                if (args.subclass) {
                    $scope.character.classObj.subclassObj = args.subclass;
                    $scope.character.classObj.subclassObj.selectedFeatures = [];    // reset
                    $scope.selectedChoices.subclassArr = [];    // reset
                    $scope.character.classObj.spellcasting = null;
                    //$scope.character.resetSkills();
                }
                var subclassFeatures = [];
                // TODO: change subclass property from benefit to features
                if ($scope.character.classObj.subclassObj.features) {
                    var subclassFeatureChoiceIdx = 0;   // reset
                    angular.forEach($scope.character.classObj.subclassObj.features, function(feature) {
                        if (feature.level <= $scope.character.level) {
                            var tempSubclassBenefit = '';
                            if (angular.isArray(feature.benefits)) {
                                angular.forEach(feature.benefits, function(benefit) {
                                    if (benefit.level <= $scope.character.level) {
                                        tempSubclassBenefit = benefit;
                                    }
                                    if (tempSubclassBenefit.benefit_stat) {
                                        features[tempSubclassBenefit.benefit_stat] = tempSubclassBenefit.benefit_value;
                                        // give dynamic name for expertise label
                                        if (args.subclass && tempSubclassBenefit.benefit_stat.indexOf('selected_expertise') !== -1) {
                                            $scope.character.classObj.expertise = {};
                                            $scope.character.classObj.expertise.label = feature.name;
                                        }
                                    }
                                });
                                if (tempSubclassBenefit.benefit_desc !== '') {
                                    subclassFeatures.push(new KeyValue(tempSubclassBenefit.id, feature.name, tempSubclassBenefit.benefit_desc));
                                }
                                /*if (tempSubclassBenefit.benefit_stat) {
                                 features[tempSubclassBenefit.benefit_stat] = tempSubclassBenefit.benefit_value;
                                 }*/
                            }
                            if (tempSubclassBenefit.benefit_stat === 'feature_choice') {
                                //$scope.character.classObj.featureChoices = feature.subfeatures;
                                if (args.subclass) { // to account for getFeatureChoices possibly broadcasting
                                    $scope.character.classObj.subclassObj.selectedFeatures[subclassFeatureChoiceIdx] = {'name': [], 'max': tempSubclassBenefit.benefit_value, 'label': feature.name, 'index': subclassFeatureChoiceIdx};    // ng-repeat depends on this array
                                    $scope.character.classObj.subclassObj.selectedFeatures[subclassFeatureChoiceIdx].choices = getFeatureChoices(feature.subfeatures, $scope.character.level, 'subclassArr', subclassFeatureChoiceIdx);
                                    subclassFeatureChoiceIdx++;
                                }
                            }
                            // handle subfeatures
                            else if (angular.isArray(feature.subfeatures)) {    // && tempSubclassBenefit.benefit_stat !== 'feature_choice'
                                angular.forEach(feature.subfeatures, function(subfeature) {
                                    /*if (subfeature.cantrips && !args.selectedCantrips) {    // make sure to not execute when selecting cantrips
                                        $scope.character.classObj.subclassObj.cantrips = angular.copy(subfeature.cantrips);   // populate cantrips list
                                    }*/
                                    if (angular.isArray(subfeature.benefits)) {
                                        angular.forEach(subfeature.benefits, function(benefit) {
                                            if (benefit.level <= $scope.character.level) {
                                                tempSubclassBenefit = benefit;
                                            }
                                        });
                                        features[tempSubclassBenefit.benefit_stat] = tempSubclassBenefit.benefit_value;
                                        if (tempSubclassBenefit.description !== '') {
                                            subclassFeatures.push(new KeyValue(tempSubclassBenefit.id, subfeature.name, tempSubclassBenefit.description));
                                        }
                                    }
                                    // filter out coinciding cantrips between high elf's bonus cantrip and cantrip list
                                    /*if ($scope.character.raceObj.cantrip &&
                                            $scope.character.classObj.subclassObj.cantrips.getIndexBy('name', $scope.character.raceObj.cantrip) !== -1) {
                                        $scope.character.classObj.subclassObj.cantrips.splice($scope.character.classObj.subclassObj.cantrips.getIndexBy('name', $scope.character.raceObj.cantrip), 1);
                                    }*/
                                });
                            }
                        }
                    });

                }
            }

            // Handle feature choices
            if (args.selectedFeatures && !isNaN(args.featureIndex)) {
                if ($scope.character.classObj.subclassObj && $scope.character.classObj.subclassObj.bonusFeature &&
                        args.type === $scope.character.classObj.subclassObj.bonusFeature.type &&
                            args.featureIndex === $scope.character.classObj.subclassObj.bonusFeature.index) {
                    args.selectedFeatures.unshift($scope.character.classObj.subclassObj.bonusFeature);
                }
                $scope.selectedChoices[args.type][args.featureIndex] = args.selectedFeatures;
                if (args.type === 'classArr') {
                    $scope.character.classObj.selectedFeatureChoices  = $scope.character.classObj.selectedFeatureChoices || [];
                    $scope.character.classObj.selectedFeatureChoices[args.featureIndex] = args.selectedFeatures;
                } else if (args.type === 'subclassArr') {
                    $scope.character.classObj.subclassObj.selectedFeatureChoices = $scope.character.classObj.subclassObj.selectedFeatureChoices || [];
                    $scope.character.classObj.subclassObj.selectedFeatureChoices[args.featureIndex] = args.selectedFeatures;
                }
            }
            if ($scope.character.classObj.selectedFeatureChoices) {
                addFeatureBenefits(features, $scope.character.classObj.selectedFeatureChoices);
            } else if ($scope.character.classObj.subclassObj && $scope.character.classObj.subclassObj.selectedFeatureChoices) {
                addFeatureBenefits(subclassFeatures, $scope.character.classObj.subclassObj.selectedFeatureChoices); // subclassFeatures is array
            }
            if ($scope.character.classObj.classFeatures) {
                addFeatures($scope, 'classArr', args.featureIndex);
                if ($scope.character.classObj.subclassObj) {
                    addFeatures($scope, 'subclassArr', args.featureIndex);
                    $scope.character.classObj.classFeatures = $scope.currentClassFeatures.concat(subclassFeatures);
                }
            }
            if (args.background || $scope.background) {
                $scope.background = args.background || $scope.background;
                $scope.character.background = $scope.background;
                $scope.character.determineBackground();
            }
            /*if (args.selectedCantrips) {
                $scope.character.classObj.selectedCantrips = args.selectedCantrips; //.split(', ');
                $scope.character.classObj.selectedClassCantrips = angular.copy($scope.character.classObj.selectedCantrips);
            }
            if (args.selectedSpells) {
                $scope.character.classObj.selectedSpells = args.selectedSpells;
            }
            if (args.selectedBonusRaceCantrip) {
                $scope.character.raceObj.cantrip = args.selectedBonusRaceCantrip;
            }*/

            $scope.character.numLanguages = $scope.character.background ? parseInt($scope.character.background.languages) : 0;
            $scope.character.calculateModifiers(); // update ability modifiers

            // needs to be at the very end to alter existing properties
            if (!args.level && !args.selectedFeatures && !args.selectedCantrips && !args.selectedBonusCantrip) {
                $scope.character.resetSkills();
                $scope.character.handleSkills();
            }
            $scope.character.handleFeatureBonuses(features);
            $scope.character.handleTools();
            args.checked = false;
        }
    });


    function addFeatureBenefits(featureObj, selectedFeatures) { // for feature choices that provide benefits
        var benefit, prop = '', value = '';
        if (angular.isArray(selectedFeatures)) {    // selectedFeatures is feature choice types (Fighting Style, Metamagic, etc.)
            angular.forEach(selectedFeatures, function(featureChoices) {   // feature is the choices (Empowered Spell, Heightened Spell, etc.)
                if (angular.isArray(featureChoices)) {
                    angular.forEach(featureChoices, function(feature) {
                        //if (angular.isArray(feature.benefit)) {
                            //benefit = feature.benefit[0];   // assume that feature choice has only one benefit
                            benefit = feature.description;
                            if (benefit.benefit_stat) {
                                if (!prop) {
                                    prop += benefit.benefit_stat;
                                    value += benefit.benefit_value;
                                } else {
                                    prop += ' : ' + benefit.benefit_stat;
                                    value += ' : ' + benefit.benefit_value;
                                }
                                /*if (!featureObj[benefit.benefit_stat]) {
                                 featureObj[benefit.benefit_stat] = benefit.benefit_value;
                                 } else {    // concatentate with ' : '
                                 featureObj[benefit.benefit_stat + ' : ' + benefit.benefit_stat] = benefit.benefit_value + ' : ' + benefit.benefit_value;
                                 }*/
                            }
                        //}
                    });
                }
            });
            featureObj[prop] = value;   // assumes feature choices don't have unique benefit properties
        }
        return featureObj;
    }

    // TODO: possibly move to service
    // adds feature to character object
    function addFeatures($scope, type, featureIndex) {    // classArr or subclassArr
        if (angular.isArray($scope.selectedChoices[type])) {
            var selectedFeaturesArray = []; // expected outcome: array of objects
            var featureChoiceName = '';
            var classFeatures;
            if (type === 'classArr') {
                classFeatures = $scope.character.classObj.selectedFeatures;
            } else if (type === 'subclassArr') {
                classFeatures = $scope.character.classObj.subclassObj.selectedFeatures;
            }
            angular.forEach($scope.selectedChoices[type], function(selectedFeatures, idx) {
                angular.forEach(classFeatures[idx].choices, function(selectedFeature) {
                    if ((selectedFeatures.getIndexBy('id', selectedFeature.id) !== -1 || selectedFeature.locked) &&
                            selectedFeature.level <= $scope.character.level) {
                        if (idx === featureIndex) {
                            selectedFeaturesArray.push(selectedFeature);
                        }
                        if (selectedFeature.parent_name) {
                            featureChoiceName = selectedFeature.parent_name + ' (' + selectedFeature.name + ')';
                        } else {
                            featureChoiceName = selectedFeature.name;
                        }
                        // assume that feature choices have only one benefit
                        $scope.character.classObj.classFeatures.push(new KeyValue(selectedFeature.benefits[0].id, featureChoiceName, selectedFeature.description));
                    }
                });
            });
            if (!isNaN(featureIndex)) {
                if (type === 'classArr' && $scope.character.classObj.selectedFeatures[featureIndex]) {
                    $scope.character.classObj.selectedFeatures[featureIndex].name = selectedFeaturesArray;
                } else if (type === 'subclassArr' && $scope.character.classObj.subclassObj.selectedFeatures[featureIndex]) {
                    $scope.character.classObj.subclassObj.selectedFeatures[featureIndex].name = selectedFeaturesArray;
                }
            }
        }
    }

    function DialogRaceController($scope, $modalInstance, raceData, raceId) {
        $scope.title = 'Select Race';
        $scope.races = raceData;
        $scope.searchText = '';
        $scope.description = 'Click a list item to view more information';
        $scope.features = [];
        $scope.selectedIndex = angular.isNumber(raceId) ? $scope.races.getIndexBy('id', raceId) : null;
        $scope.tempRace = angular.isNumber($scope.selectedIndex) ? $scope.races[$scope.selectedIndex] : '';
        $scope.disabled = !angular.isNumber(raceId);
        $scope.featureType = '';

        $scope.showDescription = function(selectobj) {
            $scope.featureType = 'Race Traits';
            $scope.selectedIndex = selectobj.$index;    // needed to highlight selected item on ui
            $scope.tempRace = selectobj.race;
            $scope.size = '';
            $scope.speed = '';
            $scope.traits = [];
            $scope.disabled = false;
            $scope.description = $scope.tempRace.description;
            //$scope.race_aba = raceObj.ability_score_adjustment;   // was for dialog UI
            //$scope.subrace_aba = subrace.ability_score_adjustment;
            $scope.size = $scope.tempRace.size;
            $scope.speed = $scope.tempRace.speed;
            //$scope.languages = raceObj.languages;
            $scope.racialTraitIds = [];
            angular.forEach($scope.tempRace.traits, function(raceTrait) {
                $scope.traits.push(new KeyValue(raceTrait.id, raceTrait.name, raceTrait.description));
                //$scope.racialTraitIds.push(raceTrait.id);
            });
        };

        $scope.done = function() {
            if ($scope.tempRace) {  // the subrace name
                $scope.$emit('handleEmit', {race: $scope.tempRace, checked: true}); // racialTraits: $scope.traits, racialTraitIds: $scope.racialTraitIds,
                $modalInstance.close();
            } else {
                alert("Please select a race");
            }
        };

        $scope.close = function() {
            $modalInstance.dismiss('cancel');
        };
    }

    function DialogBackgroundController($scope, $modalInstance, backgroundData, backgroundId) {
        $scope.title = 'Select Background';
        $scope.backgrounds = backgroundData;
        $scope.searchText = '';
        $scope.description = 'Click a list item to view more information';
        $scope.features = [];
        $scope.selectedIndex = angular.isNumber(backgroundId) ? $scope.backgrounds.getIndexBy('id', backgroundId) : null;
        $scope.tempBackground = angular.isNumber($scope.selectedIndex) ? $scope.backgrounds[$scope.selectedIndex] : '';
        $scope.disabled = !angular.isNumber(backgroundId);
        $scope.featureType = '';
        //$scope.tempBackground = '';

        $scope.showDescription = function(selectobj) {
            $scope.featureType = 'Background Trait';
            $scope.selectedIndex = selectobj.$index;    // needed to highlight selected item on ui
            $scope.tempBackground = selectobj.background;
            $scope.traitName = '';
            $scope.traitDesc = '';
            //$scope.skills = [];
            $scope.skills = '';
            $scope.disabled = false;
            $scope.description = $scope.tempBackground.desc;
            $scope.traitName = $scope.tempBackground.trait_name;
            $scope.traitDesc = $scope.tempBackground.trait_desc;
            $scope.skills = $scope.tempBackground.skills;
            $scope.tools = $scope.tempBackground.tools;
            $scope.languages = $scope.tempBackground.language_desc;
        };

        $scope.done = function() {
            if ($scope.tempBackground) {
                $scope.$emit('handleEmit', {background: $scope.tempBackground, checked: true});
                $modalInstance.close();
            } else {
                alert("Please select a background");
            }
        };

        $scope.close = function(){
            $modalInstance.dismiss('cancel');
        };
    }

    // the dialog is injected in the specified controller
    function DialogClassController($scope, $modalInstance, classData, classId){
        $scope.classes = classData;
        $scope.searchText = '';
        $scope.title = 'Select Class';
        $scope.description = 'Click a list item to view more information';
        $scope.featureType = '';
        $scope.features = [];
        $scope.tempClass = '';
        $scope.selectedIndex = angular.isNumber(classId) ? $scope.classes.getIndexBy('id', classId) : null;
        $scope.tempClass = angular.isNumber($scope.selectedIndex) ? $scope.classes[$scope.selectedIndex] : '';
        $scope.disabled = !angular.isNumber(classId);

        $scope.showDescription = function(selectobj) {
            $scope.selectedIndex = selectobj.$index;    // needed to highlight selected item on ui
            $scope.tempClass = selectobj.class;
            $scope.featureType = 'Class Features';
            $scope.traits = [];
            $scope.traits2 = [];
            $scope.features = [];
            $scope.disabled = false;
            $scope.description = $scope.tempClass.desc;
            $scope.traitsTitle = "Hit Points";
            $scope.traits.push(new NameDesc("Hit Dice", "1d" + $scope.tempClass.hit_dice + " per " + $scope.tempClass.name + " level"),
                new NameDesc("Hit Points at 1st Level", $scope.tempClass.hit_dice + " + your Constitution modifier"),
                new NameDesc("Hit Points at Higher Levels", "1d" + $scope.tempClass.hit_dice + " + your Constitution modifier per " +
                    $scope.tempClass.name + " level after 1st"));
            $scope.traits2Title = "Proficiencies";
            $scope.traits2.push(new NameDesc("Armor", $scope.tempClass.armor_shield_prof || "None"), new NameDesc("Weapons", $scope.tempClass.weapon_prof || "None"),
                new NameDesc("Tools", $scope.tempClass.tools || "None"), new NameDesc("Saving Throws", $scope.tempClass.saving_throw_desc),
                new NameDesc("Skills", $scope.tempClass.avail_skills_desc));
            if (angular.isArray($scope.tempClass.features)) {
                angular.forEach($scope.tempClass.features, function(obj) {
                    $scope.features.push(new NameDesc(obj.name, obj.description));
                });
            }
        };

        $scope.done = function() {
            if ($scope.tempClass) {
                $scope.$emit('handleEmit', {clazz: $scope.tempClass, checked: true});
                $modalInstance.close();
            } else {
                alert("Please select a class");
            }
        };

        $scope.close = function(){
            $modalInstance.dismiss('cancel');
        };
    }

    function DialogSubclassController($scope, $modalInstance, subclasses, subclassId){
        //$scope.class = character.classObj.name;
        $scope.title = 'Select Subclass';   // change later
        $scope.classes = subclasses;
        $scope.searchText = '';
        $scope.description = 'Click a list item to view more information';
        $scope.featureType = '';
        $scope.features = [];
        $scope.tempSubclass = '';
        $scope.selectedIndex = angular.isNumber(subclassId) ? $scope.classes.getIndexBy('id', subclassId) : null;
        $scope.tempSubclass = angular.isNumber($scope.selectedIndex) ? $scope.classes[$scope.selectedIndex] : '';
        $scope.disabled = !angular.isNumber(subclassId);

        $scope.showDescription = function(selectobj) {
            $scope.selectedIndex = selectobj.$index;    // needed to highlight selected item on ui
            $scope.tempSubclass = selectobj.class;
            $scope.featureType = 'Subclass Features';
            $scope.traits = [];
            $scope.features = [];
            $scope.disabled = false;
            $scope.description = $scope.tempSubclass.desc;
            if (angular.isArray($scope.tempSubclass.features)) {
                angular.forEach($scope.tempSubclass.features, function(obj) {
                    $scope.features.push(new NameDesc(obj.name, obj.description));
                });
            }
        };

        $scope.done = function() {
            if ($scope.tempSubclass) {
                $scope.$emit('handleEmit', {subclass: $scope.tempSubclass, checked: true});
                $modalInstance.close();
            } else {
                alert("Please select a subclass");
            }
        };

        $scope.close = function(){
            $modalInstance.dismiss('cancel');
        };
    }
    // TODO: support multiple selections
    function DialogFeatureController($scope, $modalInstance, features, index, type, max, featureIds) {    // selectedFeatures
        $scope.title = 'Select Feature';
        $scope.values = features;   // needed for UI
        $scope.searchText = '';
        $scope.tempFeatures = [];
        _.each($scope.values, function(obj, index, list) {
            if (obj.locked || (angular.isArray(featureIds) && featureIds.indexOf(obj.id) !== -1)) {
                obj.active = true;
                $scope.tempFeatures.push(obj);
            }
            //obj.active = obj.locked ? true : false;
        });

        $scope.description = 'Click a list item to view more information';
        $scope.max = parseInt(max);
        $scope.disabled = $scope.max - $scope.tempFeatures.length !== 0;
        $scope.featureType = '';

        $scope.showDescription = function(selectobj) {
            $scope.featureType = 'Features';
            $scope.selectedFeature = angular.copy(selectobj.value); // used in UI
            if (!$scope.selectedFeature.locked) {
                if (!$scope.selectedFeature.active && $scope.max - $scope.tempFeatures.length > 0) {
                    $scope.tempFeatures.push($scope.selectedFeature);
                    selectobj.value.active = true;
                } else if ($scope.selectedFeature.active) {
                    $scope.tempFeatures = _.reject($scope.tempFeatures, {'name': $scope.selectedFeature.name});
                    selectobj.value.active = false;
                }
                $scope.disabled = $scope.max - $scope.tempFeatures.length !== 0; // disabled is true if there are still features left to choose
            }
        };

        $scope.done = function() {
            var tempFeatures = '';
            if (angular.isArray($scope.tempFeatures)) {
                // convert tempFeatures to sorted string
                $scope.tempFeatures.sort();
                //tempFeatures = $scope.tempFeatures.join(', ');
                $scope.$emit('handleEmit', {selectedFeatures: $scope.tempFeatures, featureIndex: index, type: type, checked: true});
                $modalInstance.close();
            } else {
                alert("Please select your features");
            }
        };

        $scope.close = function(){
            $modalInstance.dismiss('cancel');
        };
    }

    function DialogSummaryController($scope, $modalInstance, character) {
        var bonusHP = character.bonusHP >= 0 ? '+' + character.bonusHP : character.bonusHP;
        character.hitPointsDesc = character.classObj.hit_dice ? character.hitPoints + ' (' + character.level + 'd' + character.classObj.hit_dice + bonusHP + ')' : '';
        character.speed = character.speed ? character.speed + ' feet' : '';
        character.skillsArr = [];
        if (character.classObj.spellcasting) {
            if (character.classObj.selectedSpells) {
                if (angular.isArray(character.classObj.bonusSelectedSpells)) {
                    character.classObj.selectedSpells = character.classObj.selectedSpells.concat(character.classObj.bonusSelectedSpells);
                }
                _.sortBy(character.classObj.selectedSpells, 'level');
                character.classObj.selectedSpellsByLevel = _.groupBy(character.classObj.selectedSpells, 'level_desc');
            }
        }

        $scope.character = character;
        $scope.close = function() {
            $modalInstance.dismiss('cancel');
        };
    }

    function KeyValue(id, name, benefit, benefit_stat, benefit_value, per_level) {
        this.id = id;
        this.name = name;
        this.benefit = benefit;
        this.benefit_stat = benefit_stat;
        this.benefit_value = benefit_value;
        this.per_level = per_level;
    }
    function NameDesc(name, desc) {
        this.name = name;
        this.benefit = desc;
    }
})

.controller('loginController',function($scope, $sanitize, $location, Authenticate, Flash, $state, $stateParams, $interpolate){

    /********
     * Alerts
     ********/
    $scope.alerts = [];
    $scope.closeAlert = function(index) {
        Flash.clear();
        $scope.alerts.splice(index, 1);
    };

    /********
     * Login
     ********/
    $scope.login = function(){
        $scope.submitted = true;
        if ($scope.loginForm.$valid) {
            Authenticate.login().save({
                'email': $sanitize($scope.email),
                'password': $sanitize($scope.password)
            },function(response) {
                $state.go('dashboard');    // route to character generator screen
                Flash.clear();
                sessionStorage.userId = response.user.id;
                $scope.$emit('handleAuthentication', {userId: response.user.id});
            },function(response){
                $scope.alerts = [{ type: "danger", msg: response.data.message }];
            });
        }
    }


})

.controller('registerController',function($scope,$sanitize,$location,Authenticate,Flash){

    /********
     * Alerts
     ********/
    $scope.alerts = [];
    $scope.closeAlert = function(index) {
        $scope.alerts.splice(index, 1);
    };

    /********
     * Register
     ********/
    $scope.register = function(){
        $scope.submitted = true;
        if ($scope.registerForm.$valid) {
            Authenticate.register().save({
                'email': $sanitize($scope.email),
                'password': $sanitize($scope.password),
                'password_confirmation': $sanitize($scope.password_confirmation),
                'username': $sanitize($scope.username)
            }, function(response) {
                $location.path(locationName + '/login');
                //$scope.alerts = [{type: "success", msg: response.message}];
                Flash.show(response.data.message);
                //Flash.clear();
                //sessionStorage.authenticated = true;
            }, function(response){
                if (angular.isArray(response.data.message)) {
                    $scope.alerts = [];
                    angular.forEach(response.data.message, function(message) {
                        $scope.alerts.push({type: "danger", msg: message});
                    });
                }
            });
        }
    }

})

.controller('dashboardController', function($scope, $location, $modal, CharGenFactory, ngTableParams, Flash){
    if (!sessionStorage.userId){
        $location.path(locationName + '/login');
    } else {
        if ($scope.$parent.flash) {
            $scope.flash = $scope.$parent.flash;
            Flash.clear();  // clear $rootScope.flash
        }
        $scope.tableParams = new ngTableParams({
            page: 1,            // show first page
            count: 10           // count per page
            /*sorting: {

            }*/
        }, {
            counts: [], // hide page counts control
            total: 0,   //$scope.characters.length, // length of data
            getData: function($defer, params) {
                CharGenFactory.Character().get({}, function(data) {
                    $scope.characters = data.characters;
                    // update table params
                    params.total(data.characters.length);
                    // set new data
                    $defer.resolve(data.characters);
                    //$defer.resolve($scope.characters.slice((params.page() - 1) * params.count(), params.page() * params.count()));
                });
            }
        });
    }

    $scope.removeCharacter = function(character) {
        var opts = {
            templateUrl: path + '/app/views/dialog_confirm.html',
            size: 'sm',
            controller: function($scope, $modalInstance) {
                $scope.ok = function () {
                    $modalInstance.close(true);
                };
                $scope.cancel = function () {
                    $modalInstance.dismiss('cancel');
                };
            }
        };
        var confirm = $modal.open(opts);
        confirm.result.then(function(response) {
            CharGenFactory.Character(character.id).delete({}, function(response) {
                if (response.character_id) {
                    _.remove($scope.characters, function(obj) { return obj.id == response.character_id; });
                    $scope.tableParams.reload();
                }
            });
        });
    };
})
.controller('characterController', function($scope, $stateParams, $location, CharGenFactory, General) {
    $scope.openSpellInfoDialog = function(spellObj) {
        var opts = {};
        opts.templateUrl = path + '/app/views/dialog_spell_info.html';
        opts.controller = DialogSpellInfoController;
        opts.resolve = {
            spellObj: function() { return spellObj; }
        };
        //opts.size = 'sm';
        General.openDialog(opts);
    };

    function DialogSpellInfoController($scope, $modalInstance, spellObj) {
        $scope.spellObj = spellObj;

        $scope.close = function() {
            $modalInstance.dismiss('cancel');
        };
    }

    CharGenFactory.Character($stateParams.characterId).get({}, function(data) {
        $scope.character = data.character;
        $scope.character.proficiencies = $scope.character.armor_prof ? $scope.character.armor_prof + ', ' + $scope.character.weapon_prof :
            $scope.character.weapon_prof;
        if ($scope.character.tool_prof) {
            $scope.character.proficiencies += ', ' + $scope.character.tool_prof;
        }
        // handle spells
        if (angular.isArray($scope.character.spells)) {
            _.sortBy($scope.character.spells, 'level');
            $scope.character.spells = _.groupBy($scope.character.spells, 'level');
        }
    }, function(response) {
        $location.path(locationName + '/dashboard');    // redirect if character does not exist
    });
});