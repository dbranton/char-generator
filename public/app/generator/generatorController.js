angular.module('app')
    .controller('GeneratorController', GeneratorController);

    function GeneratorController($scope, $state, general, charGenFactory, configObj, WizardHandler) {
        var path = configObj.path;
        var numSteps = 5;
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
        $scope.character = charGenFactory.getNewCharacter();    // defaults to level 1 character if user chooses not to select a level at first

        // Initialize variables
        var nextTitle = 'Next';
        $scope.nextTitle = nextTitle;
        $scope.racialBonus = {};
        $scope.subclasses = [];
        $scope.storedCharacter = null;
        $scope.numLanguagesLeft = 0;

        $scope.fillInCharacter = function() {
            $scope.storedCharacter = charGenFactory.returnStoredCharacter();
            $scope.character.prefillCharacter($scope.storedCharacter);
            $scope.race = $scope.character.raceObj;
            $scope.clazz = $scope.character.classObj;
        };

        $scope.saveCharacter = function() {
            //var stringifiedCharacter = JSON.stringify($scope.character);
            $scope.validating = true;
            if ($scope.charGenForm.$valid) {
                charGenFactory.Character().save({character: $scope.character},  // called at least 3 times!!!!
                    function(data, status, headers, config) {
                        $state.go('dashboard');
                        general.showMsg("You have successfully saved your character");
                        //$scope.errorMessage = null;
                    },
                    function(data, status, headers, config) {
                        $scope.successMessage = null;
                        $scope.errorMessage = data; // html string
                    }
                );
            }
        };

        $scope.openNewCharDialog = function() {
            var opts = {};
            opts.noOverlay = true;
            opts.templateUrl = '/app/views/dialog_new_character.html';
            opts.controller = DialogNewCharController;
            opts.size = 'sm';
            opts.resolve = {
                level: function() { return $scope.character.level; }
            }
            general.openDialog(opts).result.then(function(level) {
                $scope.character = charGenFactory.getNewCharacter(level);
            });
        };

        $scope.openRaceDialog = function() {
            var opts = {};
            opts.templateUrl = '/app/views/dialog_item.html';
            opts.controller = DialogRaceController;
            opts.resolve = {
                raceData: function() { return angular.copy($scope.raceData); },
                raceId: function() { return $scope.character.raceObj.readable_id || undefined; }
            };
            general.openDialog(opts).result.then(function(raceObj) {
                $scope.character.determineRace(raceObj);
            });
        };

        $scope.openBackgroundDialog = function() {
            var opts = {};
            opts.templateUrl = '/app/views/dialog_item.html';
            opts.controller = DialogBackgroundController;
            opts.resolve = {
                backgroundData: function() { return angular.copy($scope.backgroundData); },
                backgroundId: function() { return $scope.character.background.readable_id || undefined; }
            };
            general.openDialog(opts).result.then(function(backgroundObj) {
                $scope.character.determineBackground(backgroundObj);
            });
        };

        $scope.openClassDialog = function() {
            var opts = {};
            opts.templateUrl = '/app/views/dialog_item.html';
            opts.controller = DialogClassController;
            opts.resolve = {
                classData: function() { return angular.copy($scope.classData); },
                classId: function() { return $scope.character.classObj.readable_id || undefined; }
            };
            general.openDialog(opts).result.then(function(classObj) {
                $scope.character.determineClass(classObj);
            });
        };

        $scope.openSubclassDialog = function() {
            var opts = {};
            opts.templateUrl = '/app/views/dialog_item.html';
            opts.controller = DialogSubclassController;
            opts.resolve = {
                subclasses: function() { return angular.copy($scope.character.classObj.subclasses); },
                subclassId: function() { return $scope.character.classObj.subclassObj ? $scope.character.classObj.subclassObj.readable_id : undefined; },
                subclassType: function() { return $scope.character.classObj.subclassName; }
            };
            general.openDialog(opts).result.then(function(subclassObj) {
                $scope.character.determineSubclass(subclassObj);
            });
        };

        $scope.openFeatureDialog = function(selectedFeature, classObj, index) {    // classObj can be classObj or classObj.subclassObj
            var opts = {};
            opts.templateUrl = '/app/views/dialog_items.html';
            opts.controller = DialogFeatureController;
            opts.resolve = {
                features: function() { return angular.copy(selectedFeature.choices); },    //$scope.character.classObj.featureChoices
                //classObj: function() { return classObj; },
                //index: function() { return selectedFeature.index; },
                //type: function() { return type; },
                //selectedFeatures: function() { return $scope.character.selectedFeatures; },
                max: function() { return selectedFeature.max; },
                featureIds: function() { return selectedFeature.name ? _.pluck(selectedFeature.name, 'id') : null; }
            };
            general.openDialog(opts).result.then(function(featureArray) {
                $scope.character.determineFeatures(featureArray, classObj, index);
            });
        };

        $scope.openIdealDialog = function() {
            var opts = {};
            opts.templateUrl = '/app/views/dialog_item.html';
            opts.controller = DialogIdealController;
            opts.resolve = {
                ideals: function() { return angular.copy($scope.character.background.ideals); },
                idealId: function() { return $scope.character.ideal.id || undefined; }
            };
            general.openDialog(opts).result.then(function(idealObj) {
                $scope.character.determineIdeal(idealObj);
            });
        };

        $scope.isFirstStep = function() {
            var stepNumber = WizardHandler.wizard().currentStepNumber();
            return stepNumber === 1;
        };

        $scope.validateStep = function() {
            var stepNumber = WizardHandler.wizard().currentStepNumber();
            switch (stepNumber) {
                case 1:
                    return validateStep1();
                case 2:
                    return validateStep2();
                case 3:
                    return validateStep3();
                case 4:
                    return validateStep4();
                default:
                    return true;
            }
        };

        function validateStep1() {
            var char = $scope.character;
            if (char.raceObj.name && char.background.name && char.classObj.name) {
                return true;
            } else {
                return false;
            }
        }

        function validateStep2() {
            return true;
            /*var char = $scope.character;
            if (!char.raceObj.numSkillChoices && char.numSkillsLeft === 0 ||
                (angular.isArray(char.bonusSkills) && char.numSkillsLeft + char.raceObj.numSkillChoices - char.bonusSkills.length === 0)) {
                return true;
            } else {
                return false;
            }*/
        }

        function validateStep3() {
            var char = $scope.character;
            if ((!char.classObj.subclasses.length ||
                (char.classObj.subclasses.length && char.classObj.subclassObj && char.classObj.subclassObj.name))) {
                return true;
            } else {
                return false;
            }
        }

        function validateStep4() {
            return $scope.character.name ? true : false;
        }

        $scope.init = function() {
            $scope.progress = 0;
            //$scope.storedCharacter = charGenFactory.returnStoredCharacter();
            charGenFactory.Races().get({}, function(data){
                $scope.raceData = data.races;
                $scope.progress += 33;
                hideLoading($scope.progress)
            });
            charGenFactory.Backgrounds().get({}, function(data) {
                $scope.backgroundData = data.backgrounds;
                $scope.progress += 33;
                hideLoading($scope.progress)
            });
            charGenFactory.Classes().get({}, function(data) {
                $scope.classData = data.classes;
                $scope.progress += 33;
                hideLoading($scope.progress)
            });

            function hideLoading(progress) {
                if (progress >= 99) {
                    $scope.hideLoading = true;
                }
            }
        };

        $scope.$watch('character.classObj.selectedSpells' , function(newVal, oldVal) {
            var selectedSpells = [];
            if (angular.isArray(newVal)) {
                selectedSpells = angular.copy(newVal);
                if (angular.isArray($scope.character.classObj.bonusSelectedSpells)) {
                    selectedSpells = $scope.character.classObj.selectedSpells.concat($scope.character.classObj.bonusSelectedSpells);
                }
                if (angular.isArray($scope.character.classObj.spellcasting.bonusSpells)) {
                    angular.forEach($scope.character.classObj.spellcasting.bonusSpells, function(spellObj) {
                        if (spellObj.selectedSpell[0]) {
                            selectedSpells.push(spellObj.selectedSpell[0]);  // assumes only one bonus spell
                        }
                    });
                }
                _.sortBy(selectedSpells, 'level');
                $scope.character.classObj.selectedSpellsByLevel = _.groupBy(selectedSpells, 'level_desc');
            }
        });

        $scope.$watch(function() {
            return WizardHandler.wizard().currentStepNumber();
        }, function(newVal, oldVal) {
            if (angular.isDefined(newVal)) {
                $scope.nextTitle = nextTitle;
                if (angular.isNumber(newVal) && newVal > oldVal) {

                    if (newVal === numSteps) {
                        $scope.nextTitle = 'Submit Character';
                    }
                }
            }
        });

        $scope.hasArmorProf = function() {
            return _.findIndex($scope.character.armor, 'readable_id', 'light_armor') !== -1;
        };

        function DialogNewCharController($scope, $modalInstance, level) {
            $scope.level = level;
            $scope.done = function() {
                if ($scope.newCharForm.$invalid) {
                    $scope.showError = true;
                } else {
                    $modalInstance.close($scope.level);
                }
            };
            $scope.close = function() {
                $modalInstance.dismiss('cancel');
            };
        }

        function DialogRaceController($scope, $modalInstance, raceData, raceId) {
            $scope.title = 'Select Race';
            $scope.items = raceData;
            $scope.searchText = '';
            $scope.description = 'Click a list item to view more information';
            $scope.features = [];
            $scope.selectedIndex = angular.isDefined(raceId) ? _.findIndex($scope.items, 'readable_id', raceId) : null;
            $scope.tempItem = angular.isNumber($scope.selectedIndex) ? $scope.items[$scope.selectedIndex] : '';
            $scope.featureType = '';
            $scope.feature = {
                url: path + "/app/views/partials/dialog_race.html"
            };

            $scope.showDescription = function(selectobj, dontSelect) {
                var uniqueTraits = [];
                $scope.infoObj = selectobj.item;
                if (!dontSelect) {
                    $scope.selectedIndex = selectobj.$index;    // needed to highlight selected item on ui
                    $scope.tempItem = $scope.infoObj;
                }
                $scope.featureType = $scope.infoObj.name + ' Traits';
                $scope.size = '';
                $scope.speed = '';
                $scope.traits = [];
                $scope.description = $scope.infoObj.description;
                //$scope.race_aba = raceObj.ability_score_adjustment;   // was for dialog UI
                //$scope.subrace_aba = subrace.ability_score_adjustment;
                $scope.size = $scope.infoObj.size;
                $scope.speed = $scope.infoObj.speed + ' ft.';
                //$scope.languages = raceObj.languages;
                $scope.racialTraitIds = [];
                uniqueTraits = _.uniq($scope.infoObj.traits, 'feature_id');
                angular.forEach(uniqueTraits, function(raceTrait) {
                    $scope.traits.push(new KeyValue(raceTrait.id, raceTrait.name, raceTrait.description));
                    //$scope.racialTraitIds.push(raceTrait.id);
                });
            };

            $scope.showInfo = function(selectobj) {
                if (selectobj) {
                    $scope.showDescription(selectobj, true);
                    $scope.isInfoExpanded = true;
                } else {
                    $scope.isInfoExpanded = false;
                }
            };

            if ($scope.tempItem) {
                $scope.showDescription({item: $scope.tempItem, $index: $scope.selectedIndex});
            }

            $scope.done = function() {
                if ($scope.tempItem) {  // the subrace name
                    $modalInstance.close($scope.tempItem);
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
            $scope.items = backgroundData;
            $scope.searchText = '';
            $scope.description = 'Click a list item to view more information';
            $scope.features = [];
            $scope.selectedIndex = angular.isDefined(backgroundId) ? _.findIndex($scope.items, 'readable_id', backgroundId) : null;
            $scope.tempItem = angular.isNumber($scope.selectedIndex) ? $scope.items[$scope.selectedIndex] : '';
            $scope.featureType = '';
            $scope.feature = {
                url: path + "/app/views/partials/dialog_background.html"
            };
            //$scope.tempBackground = '';

            $scope.showDescription = function(selectobj, dontSelect) {
                $scope.infoObj = selectobj.item;
                if (!dontSelect) {
                    $scope.selectedIndex = selectobj.$index;    // needed to highlight selected item on ui
                    $scope.tempItem = $scope.infoObj;
                }
                $scope.featureType = $scope.infoObj.name + ' Features';
                $scope.traitName = '';
                $scope.traitDesc = '';
                //$scope.skills = [];
                $scope.skills = '';
                $scope.description = $scope.infoObj.desc;
                $scope.traitName = $scope.infoObj.trait_name;
                $scope.traitDesc = $scope.infoObj.trait_desc;
                $scope.skills = _.pluck($scope.infoObj.skills, 'name').join(', ');
                $scope.tools = $scope.infoObj.tools_desc;
                $scope.languages = $scope.infoObj.language_desc;
            };

            $scope.showInfo = function(selectobj) {
                if (selectobj) {
                    $scope.showDescription(selectobj, true);
                    $scope.isInfoExpanded = true;
                } else {
                    $scope.isInfoExpanded = false;
                }
            };

            if ($scope.tempItem) {
                $scope.showDescription({item: $scope.tempItem, $index: $scope.selectedIndex});
            }

            $scope.done = function() {
                if ($scope.tempItem) {
                    $modalInstance.close($scope.tempItem);
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
            $scope.items = classData;
            $scope.searchText = '';
            $scope.title = 'Select Class';
            $scope.description = 'Click a list item to view more information';
            $scope.featureType = '';
            $scope.features = [];
            $scope.tempClass = '';
            $scope.selectedIndex = angular.isDefined(classId) ? _.findIndex($scope.items, 'readable_id', classId) : null;
            $scope.tempItem = angular.isNumber($scope.selectedIndex) ? $scope.items[$scope.selectedIndex] : '';
            $scope.feature = {
                url: path + "/app/views/partials/dialog_class.html"
            };

            $scope.showDescription = function(selectobj, dontSelect) {
                $scope.infoObj = selectobj.item;
                if (!dontSelect) {
                    $scope.selectedIndex = selectobj.$index;    // needed to highlight selected item on ui
                    $scope.tempItem = $scope.infoObj;
                }
                $scope.featureType = $scope.infoObj.name + ' Features';
                $scope.traits = [];
                $scope.traits2 = [];
                $scope.features = [];
                $scope.description = $scope.infoObj.desc;
                $scope.traitsTitle = "Hit Points";
                $scope.traits.push(new NameDesc("Hit Dice", $scope.infoObj.hit_dice_desc),
                    new NameDesc("Hit Points at 1st Level", $scope.infoObj.hp_first_desc),
                    new NameDesc("Hit Points at Higher Levels", $scope.infoObj.hp_higher_desc));
                $scope.traits2Title = "Proficiencies";
                $scope.traits2.push(new NameDesc("Armor", $scope.infoObj.armor_prof_desc), new NameDesc("Weapons", $scope.infoObj.weapon_prof_desc),
                    new NameDesc("Tools", $scope.infoObj.tool_desc), new NameDesc("Saving Throws", $scope.infoObj.saving_throw_desc),
                    new NameDesc("Skills", $scope.infoObj.avail_skills_desc));
                if (angular.isArray($scope.infoObj.features)) {
                    angular.forEach($scope.infoObj.features, function(obj) {
                        $scope.features.push(new NameDesc(obj.name, obj.description));
                    });
                }
            };

            $scope.showInfo = function(selectobj) {
                if (selectobj) {
                    $scope.showDescription(selectobj, true);
                    $scope.isInfoExpanded = true;
                } else {
                    $scope.isInfoExpanded = false;
                }
            };

            if ($scope.tempItem) {
                $scope.showDescription({item: $scope.tempItem, $index: $scope.selectedIndex});
            }

            $scope.done = function() {
                if ($scope.infoObj) {
                    $modalInstance.close($scope.infoObj);
                } else {
                    alert("Please select a class");
                }
            };

            $scope.close = function(){
                $modalInstance.dismiss('cancel');
            };
        }

        function DialogSubclassController($scope, $modalInstance, subclasses, subclassId, subclassType){
            var subclassType = subclassType || 'Subclass';
            $scope.title = 'Select ' + subclassType;
            $scope.items = subclasses;
            $scope.searchText = '';
            $scope.description = 'Click a list item to view more information';
            $scope.featureType = '';
            $scope.features = [];
            $scope.selectedIndex = angular.isDefined(subclassId) ? _.findIndex($scope.items, 'readable_id', subclassId) : null;
            $scope.tempItem = angular.isNumber($scope.selectedIndex) ? $scope.items[$scope.selectedIndex] : '';
            $scope.feature = {
                url: path + "/app/views/partials/dialog_class.html"
            };

            $scope.showDescription = function(selectobj, dontSelect) {
                $scope.infoObj = selectobj.item;
                if (!dontSelect) {
                    $scope.selectedIndex = selectobj.$index;    // needed to highlight selected item on ui
                    $scope.tempItem = $scope.infoObj;
                }
                $scope.featureType = $scope.infoObj.name + ' Features';
                $scope.traits = [];
                $scope.features = [];
                $scope.description = $scope.infoObj.desc;
                if (angular.isArray($scope.infoObj.features)) {
                    angular.forEach($scope.infoObj.features, function(obj) {
                        $scope.features.push(new NameDesc(obj.name, obj.description));
                    });
                }
            };

            $scope.showInfo = function(selectobj) {
                if (selectobj) {
                    $scope.showDescription(selectobj, true);
                    $scope.isInfoExpanded = true;
                } else {
                    $scope.isInfoExpanded = false;
                }
            };

            if ($scope.tempItem) {
                $scope.showDescription({item: $scope.tempItem, $index: $scope.selectedIndex});
            }

            $scope.done = function() {
                if ($scope.tempItem) {
                    $modalInstance.close($scope.tempItem);
                } else {
                    alert("Please select a subclass");
                }
            };

            $scope.close = function(){
                $modalInstance.dismiss('cancel');
            };
        }

        function DialogFeatureController($scope, $modalInstance, features, max, featureIds) {    // selectedFeatures
            var parentFeature = angular.isArray(features) ? features[0].parent_name : 'Feature';
            $scope.title = 'Select ' + parentFeature;
            $scope.items = _.sortBy(features, 'name');   // needed for UI
            $scope.searchText = '';
            $scope.tempItems = [];
            _.each($scope.items, function(obj, index, list) {
                if (obj.locked || (angular.isArray(featureIds) && featureIds.indexOf(obj.id) !== -1)) {
                    obj.active = true;
                    $scope.tempItems.push(obj);
                }
                //obj.active = obj.locked ? true : false;
            });

            $scope.description = 'Click a list item to view more information';
            $scope.max = parseInt(max);
            $scope.disabled = $scope.max - $scope.tempItems.length !== 0;
            $scope.featureType = '';

            $scope.showDescription = function(selectobj, dontSelect) {
                $scope.featureType = parentFeature;
                $scope.selectedItem = angular.copy(selectobj.item); // used in UI
                if (!$scope.selectedItem.locked && !dontSelect) {
                    if (!$scope.selectedItem.active && $scope.max - $scope.tempItems.length > 0) {
                        $scope.tempItems.push($scope.selectedItem);
                        selectobj.item.active = true;
                    } else if ($scope.selectedItem.active) {
                        $scope.tempItems = _.reject($scope.tempItems, {'name': $scope.selectedItem.name});
                        selectobj.item.active = false;
                    }
                    $scope.disabled = $scope.max - $scope.tempItems.length !== 0; // disabled is true if there are still features left to choose
                }
            };

            $scope.showInfo = function(selectobj) {
                if (selectobj) {
                    $scope.showDescription(selectobj, true);
                    $scope.isInfoExpanded = true;
                } else {
                    $scope.isInfoExpanded = false;
                }
            };

            $scope.done = function() {
                if (angular.isArray($scope.tempItems)) {
                    $modalInstance.close($scope.tempItems);
                } else {
                    alert("Please select your features");
                }
            };

            $scope.close = function(){
                $modalInstance.dismiss('cancel');
            };
        }

        function DialogIdealController($scope, $modalInstance, ideals, idealId) {
            $scope.title = 'Select Ideal';
            $scope.items = ideals;   // needed for UI
            $scope.selectedIndex = angular.isNumber(idealId) ? _.findIndex($scope.items, 'id', idealId) : null;
            $scope.tempItem = angular.isNumber($scope.selectedIndex) ? $scope.items[$scope.selectedIndex] : '';
            $scope.feature = {
                url: path + "/app/views/partials/dialog_description.html"
            };
            $scope.showDescription = function(selectobj, dontSelect) {
                $scope.infoObj = selectobj.item;
                if (!dontSelect) {
                    $scope.selectedIndex = selectobj.$index;    // needed to highlight selected item on ui
                    $scope.tempItem = $scope.infoObj;
                }
                $scope.traitTitle = $scope.infoObj.name;
                $scope.traitDesc = $scope.infoObj.description;
            };

            if ($scope.tempItem) {
                $scope.showDescription({item: $scope.tempItem, $index: $scope.selectedIndex});
            }

            $scope.showInfo = function(selectobj) {
                if (selectobj) {
                    $scope.showDescription(selectobj, true);
                    $scope.isInfoExpanded = true;
                } else {
                    $scope.isInfoExpanded = false;
                }
            };

            $scope.done = function() {
                if ($scope.tempItem) {
                    $modalInstance.close($scope.tempItem);
                } else {
                    alert("Please select your ideal");
                }
            };

            $scope.close = function(){
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
    }