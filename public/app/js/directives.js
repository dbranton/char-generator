angular.module('myApp')
    .directive('uiSelect', function (){
        return {
            restrict: 'EA',
            require: 'uiSelect',
            link: function($scope, $element, $attributes, ctrl) {
                var superSelect = ctrl.select,
                    superRemoveChoice = ctrl.removeChoice;

                $attributes.$observe('max', function(value) {
                    $scope.$select.limit = (angular.isDefined(value)) ? parseInt(value, 10) : undefined;
                });
                $scope.$watch('$select.selected', function(newValue, oldValue) {
                    if (newValue && oldValue && (oldValue.length > newValue.length)) {    // on reset of selections, call removeChoice
                        showHideMaxMsg();
                    }
                });
                ctrl.select = function() {
                    if (ctrl.multiple && (ctrl.selected.length+1) < ctrl.limit) {   // needs to add one to account for selected not getting updated yet
                        ctrl.closeOnSelect = false; // keep dropdown open until user reaches limit
                    } else {
                        ctrl.closeOnSelect = true;
                    }
                    superSelect.apply(ctrl, arguments);
                    if(ctrl.multiple && ctrl.limit !== undefined && ctrl.selected.length >= ctrl.limit) {
                        $($element).find('.ui-select-choices').hide();  // show list
                        $($element).find('.select2-drop').append(   // show max capacity message
                            '<div class="max-msg bg-warning">You can only select ' + ctrl.limit + ' item(s)</div>'
                        );
                    }
                };
                function showHideMaxMsg() {
                    if(ctrl.multiple && ctrl.limit !== undefined && ctrl.selected.length < ctrl.limit) {
                        $($element).find('.ui-select-choices').show();   // show list and show max capacity message
                        $($element).find('.max-msg').remove();  // remove message
                    }
                }
                ctrl.removeChoice = function() {
                    superRemoveChoice.apply(ctrl, arguments);
                    showHideMaxMsg();
                };
            }
        }
    })
	.directive('pwCheck', [function () {
		return {
			require: 'ngModel',
			link: function (scope, elem, attrs, ctrl) {
				var firstPassword = '#' + attrs.pwCheck;
				elem.add(firstPassword).on('keyup', function () {
					scope.$apply(function () {
						var v = elem.val()===$(firstPassword).val();
						ctrl.$setValidity('pwmatch', v);
					});
				});
			}
		}
	}])
    .directive('skills', function() {
        function returnTemplate(element, attrs) {
            if (deviceType === 'phone' || deviceType === 'tablet') {
                return '<div class="list-group">' +
                    '<label class="list-group-item" ng-repeat="skill in character.skills" ng-class="{active: skill.proficient, disabled: skill.disabled}">' +
                    '<input type="checkbox" name="skill[]" value="{{skill.name}}" ng-checked="skill.proficient" ng-disabled="skill.disabled" ng-model="skill.proficient" ng-change="selectSkill(skill)" /> ' +
                    '<span ng-show="skill.val >= 0">+</span>{{skill.val}} {{skill.name}} ({{skill.ability}})' +
                    '</label>' +
                    '</div>';
            } else {
                return '<div class="list-group">' +
                        '<label class="list-group-item" ng-repeat="skill in character.skills" ng-class="{active: skill.proficient, disabled: skill.disabled}">' +
                            '<input type="checkbox" name="skill[]" value="{{skill.name}}" ng-checked="skill.proficient" ng-disabled="skill.disabled" ng-model="skill.proficient" ng-change="selectSkill(skill)" /> ' +
                            '<span ng-show="skill.val >= 0">+</span>{{skill.val}} <span tooltip-placement="right" tooltip-html-unsafe="{{skill.description}}">{{skill.name}} ({{skill.ability}})</span>' +
                        '</label>' +
                    '</div>';
            }
        }
        return {
            restrict: 'E',
            template: returnTemplate,
            link: function(scope, element, attrs) {
                scope.selectSkill = function(skill) {
                    scope.character.updateSkillProficiency(skill.name, skill.proficient);
                };
            }
        };
    })
    .directive('languages', function(CharGenFactory, General, $modal) {
        return {
            restrict: 'A',
            require: 'ngModel',
            link: function(scope, element, attrs, ngModel) {
                function DialogLanguageController($scope, $modalInstance, languageData, max, languageIds, title, featureType) {
                    General.DialogItemsController.apply(undefined, arguments);
                }
                var LANGUAGE_LIST = [];
                CharGenFactory.getLanguages().success(function(data) {
                    LANGUAGE_LIST = data.languages;
                    scope.availableLanguages = angular.copy(LANGUAGE_LIST);
                });

                scope.openLanguageDialog = function() {
                    var opts = {
                        backdrop: true,
                        keyboard: true,
                        backdropClick: true,
                        templateUrl: path + '/app/views/dialog_items.html',
                        controller: DialogLanguageController,
                        resolve: {
                            languageData: function() { return scope.availableLanguages; },
                            max: function() { return parseInt(attrs.max) || 1; },
                            languageIds: function() { return scope.character.selectedLanguages ?
                                _.pluck(scope.character.selectedLanguages, 'id') : null; },
                            title: function() { return 'Select Language(s)'; },
                            featureType: function() { return 'Languages'; }
                        }
                    };
                    if (deviceType === 'phone') {
                        opts.windowClass = 'modal-overlay';
                    }
                    $modal.open(opts).result.then(function(selectedLanguages) {
                        ngModel.$setViewValue(selectedLanguages);
                        //scope.character.selectedLanguages = selectedLanguages;
                    });
                };

                scope.$watch(attrs.languages, function(newValue) {  // watches numLanguages
                    if (angular.isDefined(newValue)) {//} && $scope.character.background) {
                        scope.character.selectedLanguages = scope.character.selectedLanguages || [];
                        scope.select2Languages = newValue; // represents the 'max' attribute for select2
                        scope.numLanguagesLeft = scope.character.numLanguages - scope.character.selectedLanguages.length;
                        //$scope.selectedLanguages.length = newValue; //determineNumItems('#chosenLanguages', newValue);
                    }
                });
                scope.$watch(attrs.ngModel, function(newValue, oldValue) {   // triggered whenever a language is selected
                    if ((angular.isArray(newValue) && angular.isArray(oldValue)) && scope.character.raceObj.name) {   // requires race
                        scope.character.selectedLanguages = scope.character.selectedLanguages || oldValue;
                        var selectedLanguages = _.pluck(newValue, 'name') || _.pluck(oldValue, 'name');
                        var languages = scope.character.defaultLanguages ? scope.character.defaultLanguages.split(', ') : [];
                        languages = languages.concat(selectedLanguages);
                        languages = scope.character.classObj.bonusLanguages ? languages.concat(scope.character.classObj.bonusLanguages) : languages;
                        languages.sort();
                        scope.character.languages = languages.join(', ');
                        scope.numLanguagesLeft = scope.character.numLanguages - selectedLanguages.length;
                    }
                });

                scope.$watch('character.raceObj.languages', function(newValue) {
                    if (newValue) {
                        scope.availableLanguages = _.filter(LANGUAGE_LIST, function(language) {
                            return newValue.indexOf(language.name) === -1;
                        });
                    }
                });

                //bonus language support
                scope.$watch(attrs.bonusLanguages, function(newValue, oldValue) {
                    if (angular.isArray(newValue)) {
                        var languageList = [];
                        var oldLanguageList = angular.copy(scope.availableLanguages);
                        angular.forEach(oldLanguageList, function(language) {
                            if (!scope.character.classObj.bonusLanguages || scope.character.classObj.bonusLanguages.indexOf(language) === -1) {
                                languageList.push(language);    // only show languages that aren't already taken
                            }
                        });
                        scope.availableLanguages = languageList;
                    }
                });

            }
        }
    })
    .directive('tools', function(CharGenFactory, General, $modal) {
        return {
            restrict: 'EA',
            require: 'ngModel',
            link: function(scope, element, attrs, ngModel) {
                scope.availableTools = [];
                var TOOLS_LIST = [];
                CharGenFactory.getTools().success(function(data) {
                    TOOLS_LIST = data.tools;
                    scope.availableTools = angular.copy(TOOLS_LIST);
                });

                function DialogToolController($scope, $modalInstance, toolData, max, toolIds, title, featureType) {
                    General.DialogItemsController.apply(undefined, arguments);
                }
                scope.openToolDialog = function() {
                    var opts = {
                        backdrop: true,
                        keyboard: true,
                        backdropClick: true,
                        templateUrl: path + '/app/views/dialog_items.html',
                        controller: DialogToolController,
                        resolve: {
                            toolData: function() {
                                return _.filter(scope.availableTools, function(obj) {
                                    return obj.parent === "Artisan's Tools";
                                })
                            },
                            max: function() { return parseInt(attrs.max) || 1; },
                            toolIds: function() {
                                return scope.character.selectedTools ? _.pluck(scope.character.selectedTools, 'id') : null;
                            },
                            title: function() { return 'Select Tool'; },
                            featureType: function() { return 'Tools'; }
                        }
                    };
                    if (deviceType === 'phone') {
                        opts.windowClass = 'modal-overlay';
                    }
                    $modal.open(opts).result.then(function(selectedTools) {
                        ngModel.$setViewValue(selectedTools);
                    });
                };
                scope.$watch(attrs.ngModel, function(newValue, oldValue) {
                    if (angular.isArray(newValue)) {
                        scope.character.handleTools(newValue);
                    }
                });
            }
        };
    })
    .directive('expertise', function(General, $modal) {
        return {
            restrict: 'A',
            require: 'ngModel',
            link: function(scope, element, attrs, ngModel) {
                scope.$watch(attrs.ngModel, function(newVal, oldVal) {
                    var items, isAdded, pluckedNewVal, pluckedOldVal;
                    if (angular.isArray(newVal)) {
                        pluckedNewVal = _.pluck(newVal, 'name');
                        pluckedOldVal = oldVal ? _.pluck(oldVal, 'name')  : [];
                        if (scope.character.classObj.expertise) {
                            scope.character.classObj.expertise.selectedExpertise = newVal;
                        }
                        if (newVal.length > oldVal.length) {
                            isAdded = true;
                            items = _.difference(pluckedNewVal, pluckedOldVal);
                        } else if (newVal.length < oldVal.length) {
                            isAdded = false;    // remove
                            items = _.difference(pluckedOldVal, pluckedNewVal);
                        }
                        angular.forEach(items, function(item) {
                            scope.character.updateSkillScore(item, isAdded);
                        });
                    }
                });
                // synchronize with the ngModel
                scope.$watch('character.classObj.expertise.selectedExpertise', function(newVal, oldVal) {
                    if (newVal) {
                        scope.selectedExpertise = newVal;
                    }
                });

                function DialogExpertiseController($scope, $modalInstance, expertiseData, max, expertiseIds, title, featureType) {
                    General.DialogItemsController.apply(undefined, arguments);
                }
                scope.openExpertiseDialog = function() {
                    var opts = {
                        backdrop: true,
                        keyboard: true,
                        backdropClick: true,
                        templateUrl: path + '/app/views/dialog_items.html',
                        controller: DialogExpertiseController,
                        resolve: {
                            expertiseData: function() {
                                return _.sortBy(scope.character.classObj.expertise.list, 'name')
                            },
                            max: function() { return parseInt(attrs.max) || 1; },
                            expertiseIds: function() {
                                return scope.selectedExpertise ? _.pluck(scope.selectedExpertise, 'id') : null;
                            },
                            title: function() { return 'Select Proficiencies'; },
                            featureType: function() { return 'Proficiencies'; }
                        }
                    };
                    if (deviceType === 'phone') {
                        opts.windowClass = 'modal-overlay';
                    }
                    $modal.open(opts).result.then(function(selectedTools) {
                        ngModel.$setViewValue(selectedTools);
                    });
                };
            }
        }
    })
    .directive('select2Spellcasting', function(CharGenFactory) {
        return {
            restrict: 'A',
            require: 'ngModel',
            //scope: {},
            link: function(scope, element, attrs, ngModel) {
                var list = attrs.list;
                scope.$parent[list] = [];
                scope.refreshSpells = function(term) {
                    var spellcastingObj = scope.$eval(attrs.select2Spellcasting) || {};
                    if (spellcastingObj.class_id) {
                        var classId = spellcastingObj.classId,
                            maxSpellLevel = spellcastingObj.maxSpellLevel,
                            schools = spellcastingObj.restrictedSchools;
                        CharGenFactory.Spells(classId, maxSpellLevel, schools).get({}, function(response) {
                            scope.spells = response.spells;
                        });
                    }
                };

                scope.$watch(attrs.select2Spellcasting, function(newVal, oldVal) {
                    if (newVal && newVal.classId && !angular.equals(newVal, oldVal)) {
                        var classId = newVal.classId, maxSpellLevel = newVal.maxSpellLevel,
                            school = newVal.restrictedSchools;
                        CharGenFactory.Spells(classId, maxSpellLevel, school).get({}, function(response) {
                            /*if (angular.isArray(bonusCantrip)) {

                            } else if (angular.isObject(bonusCantrip)) {
                                scope[list] = _.reject(response.data.spells, {'spell_id': bonusCantrip.id});// filter out bonusCantrip from list
                            } else {*/
                                scope.$parent[list] = response.spells;
                            //}
                        });
                    }
                });
                scope.$watch(attrs.ngModel, function(newVal, oldVal) {
                    var primarySpells = null, bonusSpells = null;
                    if (angular.isArray(newVal)) {
                        /*if (attrs.bonus) {
                            bonusSpells = scope.$eval(attrs.bonus) || [];
                            scope.character.classObj.selectedSpells = bonusSpells.concat(newVal);
                        } else if (attrs.primary) {
                            primarySpells = scope.$eval(attrs.primary) || [];
                            scope.character.classObj.selectedSpells = primarySpells.concat(newVal);

                        } else {
                            throw new Error('this element has no child or parent');
                        }*/
                    } else if (angular.isObject(newVal)) {  // single select
                        // TODO: work on this
                        if (attrs.bonus) {

                        } else if (attrs.primary) {
                            primarySpells = scope.$eval(attrs.primary) || [];
                        }
                        //scope.character[attrs.ngModel] = newVal;  // needs to be able to be removed when changing race/class

                    }
                });
            }
        }
    })
    .directive('spellDialog', function(CharGenFactory, $modal) {
        function DialogSpellController($scope, $modalInstance, list, numSpells, spellIds) {
            $scope.title = 'Select Spells';
            $scope.tempSpells = [];
            var preselectSpells = function(arr) {
                if (spellIds) {
                    angular.forEach(arr, function(obj) {
                        if (spellIds.indexOf(obj.id) !== -1) {
                            obj.active = true;
                            $scope.tempSpells.push(obj);
                        }
                    });
                }
            };
            if (list[0].level > 0) {
                $scope.spells = _.groupBy(angular.copy(list), 'level_desc');
                preselectSpells($scope.spells);
            } else {
                $scope.cantrips = angular.copy(list);
                preselectSpells($scope.cantrips);
            }
            $scope.searchText = '';
            $scope.description = 'Click a list item to view more information';
            $scope.featureType = '';
            $scope.selectedIndex = '';
            $scope.disabled = !angular.isArray(spellIds);
            $scope.spellsLeft = angular.copy(numSpells);

            $scope.showDescription = function(selectobj, dontSelect) {
                $scope.selectedIndex = selectobj.$index;
                $scope.selectedSpell = angular.copy(selectobj.spell);
                $scope.typeDescription = $scope.selectedSpell.level === 0 ? $scope.selectedSpell.type + ' Cantrip' :
                    'Level ' + $scope.selectedSpell.level + ' ' + $scope.selectedSpell.type;    // consider adding new property on server-side
                if (!dontSelect) {
                    if (!$scope.selectedSpell.active && $scope.spellsLeft - $scope.tempSpells.length > 0) {
                        $scope.tempSpells.push($scope.selectedSpell); //.name
                        selectobj.spell.active = true;
                    } else if ($scope.selectedSpell.active) {
                        $scope.tempSpells.splice($scope.tempSpells.indexOf($scope.selectedSpell.name), 1); // remove cantrip
                        selectobj.spell.active = false;
                    }
                    $scope.disabled = $scope.spellsLeft - $scope.tempSpells.length !== 0; // disabled is true if there are still cantrips left to choose
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
                if (angular.isArray($scope.tempSpells)) {
                    $modalInstance.close($scope.tempSpells);
                } else {
                    alert("Please select your spells");   // should be impossible to get here since button is disabled
                }
            };

            $scope.close = function(){
                $modalInstance.dismiss('cancel');
            };
        }
        function returnTemplate(element, attrs) {
            var placeholder = attrs.placeholder || 'spell(s)';
            if (deviceType === 'phone' || deviceType === 'tablet') {
                return '<div>' +
                    '<a href="" class="btn btn-block" ng-click="openSpellDialog()" ng-class="selectedCantrips ? \'btn-primary\' : \'btn-default\'">' +
                        '<span ng-if="!selectedCantrips">Select your ' + placeholder + '</span>' +
                        '<span ng-if="selectedCantrips.length > 1">{{selectedCantrips.length}} ' + placeholder + ' selected</span>' +
                        '<span ng-if="selectedCantrips.length == 1">{{selectedCantrips[0].name}}</span>' +
                    '</a>' +
                '</div>';
            } else {
                return  '<label class="hide-mobile input-group-addon btn btn-default" ng-click="openSpellDialog()">' +
                    '<span class="fa fa-columns"></span>' +
                    '</label>';
            }
        }

        return {
            restrict: 'EA',
            replace: true,
            require: "?ngModel",
            template: returnTemplate,
            scope: {
                select2Spellcasting: '=',
                list: '=',
                otherSpell: '='
            },
            link: function(scope, element, attrs, ngModel) {
                scope.openSpellDialog = function() {
                    var spellObj = scope.select2Spellcasting;
                    var list = scope.list;
                    var otherSpell = scope.otherSpell;
                    if (angular.isArray(otherSpell)) {
                        var spellIds = _.pluck(otherSpell, 'id');
                        list = _.reject(list, function(item) {
                            return spellIds.indexOf(item.id) !== -1;
                        });
                    } else if (angular.isObject(otherSpell)) {
                        list = _.reject(list, {'id': otherSpell.id});
                    }
                    var opts = {
                        backdrop: true,
                        keyboard: true,
                        backdropClick: true,
                        templateUrl: path + '/app/views/dialog_spells.html',
                        controller: DialogSpellController,
                        resolve: {
                            //classId: function() { return spellObj.classId; },
                            //maxSpellLevel: function() { return spellObj.maxSpellLevel; },
                            list: function() { return list; },
                            numSpells: function() { return spellObj.numSpellsKnown || 1; },
                            spellIds: function() { return ngModel.$viewValue ? _.pluck(ngModel.$viewValue, 'id') : null; }
                            //schools: function() { return spellObj.restrictedSchools || null; }
                        }
                    };
                    if (deviceType === 'phone') {
                        opts.windowClass = 'modal-overlay';
                    }
                    $modal.open(opts).result.then(function(selectedSpells) {
                        var spellIds = _.pluck(selectedSpells, 'id'); // [12, 42, 52, ...]
                        ngModel.$setViewValue(_.filter(list, function(spell) {
                            return _.indexOf(spellIds, spell.id) > -1;
                        }));
                        scope.selectedCantrips = ngModel.$viewValue;
                    });
                };
            }
        };
    });