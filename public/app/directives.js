angular
    .module('app')
    .directive('uiSelect', function (){
        return {
            restrict: 'EA',
            require: 'uiSelect',
            link: function($scope, $element, $attributes, ctrl) {
                var superSelect = ctrl.select,
                    superRemoveChoice = ctrl.removeChoice,
                    superSizeSearchInput = ctrl.sizeSearchInput;

                ctrl.sizeSearchInput = function() {
                    superSizeSearchInput.apply(ctrl, arguments);
                    ctrl.searchInput.css('width', '200px');
                };

                $attributes.$observe('max', function(value) {
                    $scope.$select.limit = (angular.isDefined(value)) ? parseInt(value, 10) : undefined;
                });
                $scope.$watch('$select.selected', function(newValue) {
                    if (ctrl.limit && newValue) {
                        if (newValue && (ctrl.limit > newValue.length)) {    // on reset of selections, call removeChoice
                            hideMaxMsg();
                        } else if (ctrl.limit === newValue.length) {
                            showMaxMsg();
                        }
                    }
                });
                ctrl.select = function() {
                    if (ctrl.multiple && (ctrl.selected.length+1) < ctrl.limit) {   // needs to add one to account for selected not getting updated yet
                        ctrl.closeOnSelect = false; // keep dropdown open until user reaches limit
                    } else {
                        if (arguments.length < 3 && ctrl.selected.length >= ctrl.limit) {  // prevent enter/tab events if limit reached
                            return;
                        }
                        ctrl.closeOnSelect = true;
                    }
                    superSelect.apply(ctrl, arguments);
                    if(ctrl.multiple && ctrl.limit !== undefined && ctrl.selected.length >= ctrl.limit) {
                        showMaxMsg();
                    }
                };
                function showMaxMsg() {
                    if (!$($element).find('.select2-drop').find('.max-msg')[0]) {
                        $($element).find('.ui-select-choices').hide();  // hide list
                        $($element).find('.select2-drop').append(   // show max capacity message
                            '<div class="max-msg bg-warning">You can only select ' + ctrl.limit + ' item(s)</div>'
                        );
                    }
                }
                function hideMaxMsg() {
                    if(ctrl.multiple && ctrl.limit !== undefined && ctrl.selected.length < ctrl.limit) {
                        $($element).find('.ui-select-choices').show();   // show list
                        $($element).find('.max-msg').remove();  // remove message
                    }
                }
                ctrl.removeChoice = function() {
                    superRemoveChoice.apply(ctrl, arguments);
                    hideMaxMsg();
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
    .directive('selectModal', function($compile, configObj) {
        function returnTemplate(element, attrs, deviceType) {
            var htmlString = '',
                multiple = angular.isDefined(attrs.multiple) ? "multiple" : "",
                max = attrs.max ? 'max="{{' + attrs.max + '}}"' : "",
                name = angular.isDefined(attrs.multiple) ? '{{$item.name}}' : '{{$select.selected.name}}'
            if (angular.isDefined(attrs.multiple)) {
                htmlString = '<div>' +
                    '<a href="" class="btn btn-block" ng-click="' + attrs.click + '" ' +
                    'ng-class="' + attrs.name + '.length ? \'btn-primary\' : \'btn-default\'"' +
                    //'ng-model="character.selectedTools"
                    max + '>' +
                        '<span ng-if="' + attrs.name + '.length == 0">' + attrs.placeholder + '</span>' +
                        '<span ng-if="' + attrs.name + '.length == 1">{{' + attrs.name + '[0].name}}</span>' +
                        '<span ng-if="' + attrs.name + '.length > 1">{{' + attrs.name + '.length}} items selected</span>' +
                    '</a>' +
                    '</div>';
            } else {
                htmlString = '<div>' +
                   '<a href="" class="btn btn-block" ng-click="' + attrs.click + '"' +
                   'ng-class="' + attrs.name + ' ? \'btn-primary\' : \'btn-default\'">' +
                    '<span ng-if="!' + attrs.name + '">' + attrs.placeholder + '</span>' +
                    '{{' + attrs.name + '}}' +
                    '</a>' +
                    '</div>';
            }
            return htmlString;
        }
        return {
            restrict: 'EA',
            link: function(scope, element, attrs, ngModel) {
                var deviceType = configObj.deviceType,
                    template = returnTemplate(element, attrs, deviceType);
                element.append($compile(template)(scope));
            }
        };
    })
    .directive('dragToReveal', function($drag, $parse, $timeout){
        return {
            restrict: 'A',
            compile: function(elem, attrs) {
                var dismissFn = $parse(attrs.dragToDismiss);
                return function(scope, elem, attrs) {
                    var showOptions = false;
                    if ($(elem).parents('.modal-overlay').length) {
                        $drag.bind(elem, {
                           constraint: {
                             maxX: 0,
                             minY: 0,
                             maxY: 0
                           },
                           move: function(c) {
                             if(c.right <= c.width && !showOptions) { //((5 * c.width) / 6)
                               showOptions = true;
                               elem.next().removeClass('invisible');
                             } else if (c.left >= -(c.width/6) && showOptions) {
                               showOptions = false;
                               elem.next().addClass('invisible');
                             }
                           },
                           cancel: function(){
                           },
                           end: function(c, undo, reset) {
                             var optionsWidth = 58; // expects 58px
                             if (showOptions) {
                               var e = angular.element(elem)[0],
                                   tOrig = $drag.Transform.fromElement(e);
                               tOrig.mtx[0][2] = -(optionsWidth);
                               tOrig.set(e);
                             } else {
                               reset();
                             }
                           }
                        });
                    }
                };
            }
        };
    })
    .directive('skills', function(configObj) {
        function returnTemplate(element, attrs) {
            var skills = 'character.skills';
            if (attrs.col === '1') {
                skills = 'character.skills1';
            } else if (attrs.col === '2') {
                skills = 'character.skills2';
            }
            return '<div class="list-group">' +
                    '<label class="list-group-item" ng-repeat="skill in ' + skills + '" ng-class="{active: skill.proficient, disabled: skill.disabled}">' +
                        '<input type="checkbox" name="skill[]" value="{{skill.name}}" ng-checked="skill.proficient" ng-disabled="skill.disabled" ng-model="skill.proficient" ng-change="selectSkill(skill)" /> ' +
                        '<span ng-show="skill.val >= 0">+</span>{{skill.val}} {{skill.name}} ({{skill.ability}}) <i class="fa fa-info-circle pull-right hide-mobile" tooltip-placement="left" tooltip-html-unsafe="{{skill.description}}"></i>' +
                    '</label>' +
                '</div>';
        }
        return {
            restrict: 'EA',
            template: returnTemplate,
            link: function(scope, element, attrs) {
                scope.selectSkill = function(skill) {
                    scope.character.updateSkillProficiency(skill.readable_id, skill.proficient);
                };
            }
        };
    })
    .directive('bonusSkills', function(charGenFactory, general) {
        return {
            restrict: 'A',
            require: 'ngModel',
            link: function(scope, element, attrs, ngModel) {
                function DialogSkillsController($scope, $modalInstance, skillsData, max, skillIds, title, featureType) {
                    general.DialogItemsController.apply(undefined, arguments);
                }

                scope.$watch('character.classObj.subclassObj.selectedSkills', function(newVal, oldVal) {
                    if (oldVal && !newVal) {
                        // remove old selected skills
                        _.forEach(oldVal, function(skill) {
                            scope.character.skills[_.findIndex(scope.character.skills, 'readable_id', skill.readable_id)].proficient = false;
                        });
                    }
                });

                scope.openBonusSkillsDialog = function() {
                    var skillsData = angular.copy(scope.$eval(attrs.data));
                    if (scope.character.classObj.subclassObj.selectedSkills) {
                        _.forEach(skillsData, function(skill) {
                            if (_.findIndex(scope.character.classObj.subclassObj.selectedSkills, 'readable_id', skill.readable_id) !== -1) {
                                skill.proficient = false;
                            }
                        });
                    }
                    skillsData = _.filter(skillsData, 'proficient', false);
                    _.forEach(skillsData, function(skill) {
                        skill.disabled = false;
                    });
                    var opts = {
                        noOverlay: true,
                        templateUrl: '/app/views/dialog_items_sm.html',
                        controller: DialogSkillsController,
                        size: 'sm',
                        resolve: {
                            skillsData: function() { return skillsData; },
                            max: function() { return parseInt(scope.$eval(attrs.max)) || 1; },
                            skillIds: function() { return scope.character.classObj.subclassObj.selectedSkills ?
                                _.pluck(scope.character.classObj.subclassObj.selectedSkills, 'id') : null; },
                            title: function() { return 'Select Skills'; },
                            featureType: function() { return 'Skills'; }
                        }
                    };
                    general.openDialog(opts).result.then(function(selectedLanguages) {
                        if (scope.character.classObj.subclassObj.selectedSkills) {
                            _.forEach(scope.character.classObj.subclassObj.selectedSkills, function(skill) {
                                scope.character.skills[_.findIndex(scope.character.skills, 'readable_id', skill.readable_id)].proficient = false;
                            });
                        }
                        ngModel.$setViewValue(selectedLanguages);
                        selectedBonuSkills = selectedLanguages;
                        scope.character.updateSkillProficiency(_.pluck(selectedLanguages, 'readable_id'), true, true);
                    });
                };
            }
        };
    })
    .directive('languages', function(charGenFactory, general) {
        return {
            restrict: 'A',
            require: 'ngModel',
            link: function(scope, element, attrs, ngModel) {
                function DialogLanguageController($scope, $modalInstance, languageData, max, languageIds, title, featureType) {
                    general.DialogItemsController.apply(undefined, arguments);
                }
                var LANGUAGE_LIST = [];
                charGenFactory.getLanguages().success(function(data) {
                    LANGUAGE_LIST = data.languages;
                    scope.availableLanguages = angular.copy(data.languages);
                });

                scope.openLanguageDialog = function() {
                    scope.availableLanguages = _.filter(LANGUAGE_LIST, function(language) {
                        var defaultLanguages = scope.character.raceObj.languages; // ex: "filter: character.raceObj.languages"
                        return defaultLanguages.indexOf(language.name) === -1;
                    });
                    var opts = {
                        noOverlay: true,
                        templateUrl: '/app/views/dialog_items_sm.html',
                        controller: DialogLanguageController,
                        size: 'sm',
                        resolve: {
                            languageData: function() { return scope.availableLanguages; },
                            max: function() { return parseInt(scope.$eval(attrs.max)) || 1; },
                            languageIds: function() { return scope.character.selectedLanguages ?
                                _.pluck(scope.character.selectedLanguages, 'id') : null; },
                            title: function() { return 'Select Language(s)'; },
                            featureType: function() { return 'Languages'; }
                        }
                    };
                    general.openDialog(opts).result.then(function(selectedLanguages) {
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
                        var bonusLanguages = scope.$eval(attrs.bonusLanguages);
                        scope.character.selectedLanguages = scope.character.selectedLanguages || oldValue;
                        var selectedLanguages = _.pluck(newValue, 'name') || _.pluck(oldValue, 'name');
                        var languages = scope.character.defaultLanguages ? scope.character.defaultLanguages.split(', ') : [];
                        languages = languages.concat(selectedLanguages);
                        if (bonusLanguages && languages.indexOf(bonusLanguages[0]) === -1) {  // assume only one bonus language
                            languages = languages.concat(bonusLanguages);
                        }
                        languages.sort();
                        scope.character.languages = languages;
                        scope.numLanguagesLeft = scope.character.numLanguages - selectedLanguages.length;
                    }
                });

                //bonus language support
                scope.$watch(attrs.bonusLanguages, function(newVal, oldVal) { //'character.classObj.bonusLanguages'
                    if (angular.isArray(newVal) && newVal.length > 0) {
                        var languages = scope.character.defaultLanguages.split(', ');
                        languages = languages.concat(scope.character.selectedLanguages);
                        angular.forEach(newVal, function(language) {
                            if (languages.indexOf(language) === -1) {
                                languages.push(language);
                            }
                        });
                        scope.character.languages = languages;
                        scope.character.languages.sort();
                    } else if (!newVal && oldVal) {
                        angular.forEach(oldVal, function(language) {
                            if (scope.character.defaultLanguages.indexOf(language) === -1) {
                                scope.character.languages.splice(scope.character.languages.indexOf(language), 1);
                            }
                        });
                    }
                });

                /*scope.$watch(attrs.bonusLanguages, function(newValue) {
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
                });*/

            }
        }
    })
    .directive('tools', function(charGenFactory, general) {
        return {
            restrict: 'EA',
            require: 'ngModel',
            scope: {
                toolChoices: '=',
                other: '=',
                character: '='
            },
            link: function(scope, element, attrs, ngModel) {
                scope.availableTools = [];
                var TOOLS_LIST = [];
                charGenFactory.getTools().success(function(data) {
                    TOOLS_LIST = data.tools;
                    scope.availableTools = angular.copy(TOOLS_LIST);
                });

                /*scope.$watch(attrs.toolChoices, function(toolType) {
                    if (toolType) {
                        scope.availableTools = _.filter(TOOLS_LIST, function(tool) {
                            return tool.parent_id === toolType && (!scope.character.tools || scope.character.tools.indexOf(scope.other.name) === -1);
                        });
                    }
                });*/

                function DialogToolController($scope, $modalInstance, toolData, max, toolIds, title, featureType) {
                    general.DialogItemsController.apply(undefined, arguments);
                }
                scope.$parent.openToolDialog = function(type, otherTool) {   // 'background' or 'classObj'
                    var max = scope.character[type].numToolChoices;
                    var toolType = scope.character[type].tool_choices;  // ex: 'gaming_set'
                    var availableTools = _.filter(TOOLS_LIST, function(tool) {
                        return tool.parent_id === toolType;
                    });
                    if (angular.isArray(otherTool)) {
                        var otherToolIds = _.pluck(otherTool, 'id');
                        availableTools = _.reject(availableTools, function(item) {
                            return otherToolIds.indexOf(item.id) !== -1;
                        });
                    }
                    var opts = {
                        noOverlay: true,
                        templateUrl: '/app/views/dialog_items_sm.html',
                        controller: DialogToolController,
                        size: 'sm',
                        resolve: {
                            toolData: function() { return availableTools; },
                            max: function() { return parseInt(max) || 1; },
                            toolIds: function() {
                                return scope.character[type].selectedTools ? _.pluck(scope.character[type].selectedTools, 'id') : null;
                            },
                            title: function() { return 'Select Tool'; },
                            featureType: function() { return 'Tools'; }
                        }
                    };
                    general.openDialog(opts).result.then(function(selectedTools) {
                        //ngModel.$setViewValue(selectedTools); // doesn't work with multiple tools directives
                        scope.character[type].selectedTools = selectedTools;
                    });
                };
                scope.$watch(attrs.ngModel, function(newValue) {
                    if (angular.isArray(newValue)) {
                        scope.character.handleTools();
                    }
                });
            }
        };
    })
    .directive('bonusAbility', function(general) {
        return {
            restrict: 'A',
            require: 'ngModel',
            link: function(scope, element, attrs, ngModel) {
                var ability, val = 0;
                //scope.character.raceObj.selectedBonusAbilities = [];
                scope.$watch(attrs.ngModel, function(newVal, oldVal) {
                    if (angular.isArray(newVal) && angular.isArray(oldVal) && oldVal.length - newVal.length !== 2) {
                        scope.character.raceObj.selectedBonusAbilities = newVal;
                        if (angular.isArray(oldVal)) {
                            angular.forEach(oldVal, function(ability) {
                                scope.character.increaseAbilityScore(ability.id, -1);
                            });
                        }
                        if (angular.isArray(newVal)) {
                            angular.forEach(newVal, function(ability) {
                                scope.character.increaseAbilityScore(ability.id, 1);
                            });
                        }
                    }
                });

                function DialogBonusAbilityController($scope, $modalInstance, bonusAbilities, max, bonusAbilityIds, title, featureType) {
                    general.DialogItemsController.apply(undefined, arguments);
                }
                scope.openBonusAbilityDialog = function() {
                    var opts = {
                        noOverlay: true,
                        templateUrl: '/app/views/dialog_items_sm.html',
                        controller: DialogBonusAbilityController,
                        size: 'sm',
                        resolve: {
                            bonusAbilities: function() {
                                return scope.character.raceObj.bonusAbilities;
                            },
                            max: function() { return 2; },
                            bonusAbilityIds: function() {
                                return scope.character.raceObj.selectedBonusAbilities ? _.pluck(scope.character.raceObj.selectedBonusAbilities, 'id') : null;
                            },
                            title: function() { return 'Select BonusAbilities'; },
                            featureType: function() { return 'Abilities'; }
                        }
                    };
                    general.openDialog(opts).result.then(function(selectedAbilities) {
                        ngModel.$setViewValue(selectedAbilities);
                    });
                };
            }
        }
    })
    .directive('expertise', function(general, configObj) {
        return {
            restrict: 'A',
            require: 'ngModel',
            link: function(scope, element, attrs, ngModel) {
                scope.$watch(attrs.ngModel, function(newVal, oldVal) {
                    if (angular.isArray(newVal)) {
                        if (scope.character.classObj.expertise) {
                            scope.character.classObj.expertise.selectedExpertise = newVal;
                        }
                        if (angular.isArray(oldVal)) {
                            angular.forEach(oldVal, function(item) {
                                scope.character.updateSkillScore(item.readable_id, false);
                            });
                        }
                        angular.forEach(newVal, function(item) {
                            scope.character.updateSkillScore(item.readable_id, true);
                        });
                    }
                });

                function DialogExpertiseController($scope, $modalInstance, expertiseData, max, expertiseIds, title, featureType) {
                    general.DialogItemsController.apply(undefined, arguments);
                }
                scope.openExpertiseDialog = function() {
                    var opts = {
                        noOverlay: true,
                        templateUrl: '/app/views/dialog_items_sm.html',
                        controller: DialogExpertiseController,
                        size: 'sm',
                        resolve: {
                            expertiseData: function() {
                                return _.sortBy(scope.character.classObj.expertise.list, 'name');
                            },
                            max: function() { return parseInt(scope.$eval(attrs.max)) || 1; },
                            expertiseIds: function() {
                                return scope.character.classObj.expertise.selectedExpertise ? _.pluck(scope.character.classObj.expertise.selectedExpertise, 'id') : null;
                            },
                            title: function() { return 'Select Proficiencies'; },
                            featureType: function() { return 'Proficiencies'; }
                        }
                    };
                    general.openDialog(opts).result.then(function(selectedTools) {
                        ngModel.$setViewValue(selectedTools);
                    });
                };
            }
        }
    })
    .directive('abilityTable', function(charGenFactory, configObj) {
        return {
            restrict: 'EA',
            templateUrl: configObj.path + '/app/views/partials/ability_score_table.html',
            scope: {
                character: '=',
                pointsleft: '@',
                bonus: '@'
            },
            link: function(scope, element, attrs, ngModel) {

                // determines points left
                scope.incrementAbility = function(ability, value) {    // value can only be 1 or -1
                    var min = scope.character.ability[ability].min,
                        max = scope.character.ability[ability].max;
                    if (scope.bonus) {
                        min = scope.character.ability[ability].score;
                        max = 20;
                    }
                    scope.character.modifyAbilityScore(ability, value, min, max, scope.pointsleft, scope.bonus);
                };
            }
        };
    })
    .directive('select2Spellcasting', function(charGenFactory) {
        return {
            restrict: 'A',
            require: 'ngModel',
            link: function(scope, element, attrs, ngModel) {
                var list = attrs.list;
                scope[list] = [];

                scope.$watch(attrs.select2Spellcasting, function(newVal, oldVal) {
                    if (newVal && newVal.classId && (!angular.equals(newVal, oldVal) || newVal === oldVal)) {
                        var classId = newVal.classId, maxSpellLevel = newVal.maxSpellLevel, spellLevel = newVal.spellLevel,
                            school = newVal.restrictedSchools;
                        if (angular.isDefined(maxSpellLevel)) {
                            charGenFactory.Spells(classId, maxSpellLevel, school).get({}, function(response) {
                                scope[list] = response.spells;
                                ngModel.$setViewValue([]);  // reset
                                if (newVal.bonusCantrip) {
                                    angular.forEach(scope[list], function(spellObj, idx) {
                                        if (spellObj.readable_id === newVal.bonusCantrip) {
                                            //spellObj.disabled = true;
                                            scope[list][idx].disabled = true;
                                            ngModel.$setViewValue([spellObj]);
                                        }
                                    });
                                }
                            });
                        } else if (angular.isDefined(spellLevel)) {
                            charGenFactory.SpellsByLevel(classId, spellLevel).get({}, function(response) {
                                scope[list] = response.spells;
                            });
                        }
                    }
                });
            }
        }
    })
    .directive('spellDialog', function(charGenFactory, $compile, configObj, general) {
        function DialogSpellController($scope, $modalInstance, list, numSpells, selectedSpells) { // spellIds is an array of objects
            $scope.title = 'Select Spells';
            $scope.tempSpells = [];
            //var spellIds = _.pluck(selectedSpells, 'readable_id');
            var preselectSpells = function(arr) {
                var spellIdx = -1;
                if (selectedSpells) {
                    angular.forEach(arr, function(spell) {
                        spellIdx = _.findIndex(selectedSpells, 'readable_id', spell.readable_id);
                        if (angular.isObject(spell) && spellIdx !== -1 && !angular.isArray(spell)) {
                            spell.active = true;
                            if (selectedSpells[spellIdx].disabled) {
                                spell.disabled = true;
                            }
                            $scope.tempSpells.push(spell);
                        } else if (angular.isArray(spell)) {
                            angular.forEach(spell, function(obj) {
                                if (_.findIndex(selectedSpells, 'readable_id', obj.readable_id) !== -1) {
                                    obj.active = true;
                                    $scope.tempSpells.push(obj);
                                }
                            });
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
            $scope.disabled = !angular.isArray(selectedSpells);
            $scope.spellsLeft = angular.copy(numSpells);

            $scope.showDescription = function(selectobj, dontSelect) {
                $scope.selectedIndex = selectobj.$index;
                $scope.selectedSpell = angular.copy(selectobj.spell);
                $scope.typeDescription = $scope.selectedSpell.level === 0 ? $scope.selectedSpell.type + ' Cantrip' :
                    'Level ' + $scope.selectedSpell.level + ' ' + $scope.selectedSpell.type;    // consider adding new property on server-side
                if (!dontSelect && !$scope.selectedSpell.disabled) {
                    if (!$scope.selectedSpell.active && $scope.spellsLeft - $scope.tempSpells.length > 0) {
                        $scope.tempSpells.push($scope.selectedSpell); //.name
                        selectobj.spell.active = true;
                    } else if ($scope.selectedSpell.active) {
                        $scope.tempSpells.splice(_.findIndex($scope.tempSpells, 'name', $scope.selectedSpell.name), 1); // remove cantrip
                        selectobj.spell.active = false;
                    }
                    $scope.disabled = $scope.tempSpells.length === 0; // only disable if no spells have been selected
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
        function returnTemplate(attrs) {
            var placeholder = attrs.placeholder || 'spell(s)';
            return '<div>' +
                '<a href="" class="btn btn-block" ng-click="openSpellDialog()" ng-class="' + attrs.ngModel + '.length ? \'btn-primary\' : \'btn-default\'">' +
                    //'<span ng-if="!' + attrs.ngModel + '">THIS IS A TEST {{' + attrs.ngModel + '}}</span>' +
                    '<span ng-if="!' + attrs.ngModel + ' || ' + attrs.ngModel + '.length === 0">Select your ' + placeholder + '</span>' +
                    '<span ng-if="' + attrs.ngModel + '.length > 1">{{' + attrs.ngModel + '.length}} ' + placeholder + ' selected</span>' +
                    '<span ng-if="' + attrs.ngModel + '.length == 1">{{' + attrs.ngModel + '[0].name}}</span>' +
                '</a>' +
            '</div>';
        }

        return {
            restrict: 'EA',
            replace: true,
            require: "?ngModel",
            //template: returnTemplate,
            scope: {    // necessary to prevent the same spell directives from overwriting each other
                select2Spellcasting: '=',
                list: '=',
                otherSpell: '=',
                character: '=',
                bonusSpell: '='
            },
            link: function(scope, element, attrs, ngModel) {
                var template = returnTemplate(attrs);
                element.prepend($compile(template)(scope));
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
                        templateUrl: '/app/views/dialog_spells.html',
                        controller: DialogSpellController,
                        resolve: {
                            //classId: function() { return spellObj.classId; },
                            //maxSpellLevel: function() { return spellObj.maxSpellLevel; },
                            list: function() { return list; },
                            numSpells: function() { return spellObj.numSpellsKnown || 1; },
                            selectedSpells: function() { return ngModel.$viewValue; }
                            //schools: function() { return spellObj.restrictedSchools || null; }
                        }
                    };
                    general.openDialog(opts).result.then(function(selectedSpells) {
                        var spellIds = _.pluck(selectedSpells, 'readable_id'); // [12, 42, 52, ...]
                        ngModel.$setViewValue(_.filter(list, function(spell) {
                            return _.indexOf(spellIds, spell.readable_id) > -1;
                        }));
                        //ngModel.$setViewValue(selectedSpells);

                        /*if (character.classObj.selectedSpells) {
                            if (angular.isArray(character.classObj.bonusSelectedSpells)) {
                                character.classObj.selectedSpells = character.classObj.selectedSpells.concat(character.classObj.bonusSelectedSpells);
                            }
                            if (angular.isArray(character.classObj.spellcasting.bonusSpells)) {
                                angular.forEach(character.classObj.spellcasting.bonusSpells, function(spellObj) {
                                    character.classObj.selectedSpells.push(spellObj.selectedSpell[0]);  // assumes only one bonus spell
                                });
                            }
                            _.sortBy(character.classObj.selectedSpells, 'level');
                            character.classObj.selectedSpellsByLevel = _.groupBy(character.classObj.selectedSpells, 'level_desc');
                        }*/

                    });
                };
            }
        };
    })
    .directive('spellInfoDialog', function(general, charGenFactory) {
        function DialogSpellController($scope, $modalInstance, spellId) {
            $scope.title = 'Select Spells';
            charGenFactory.Spell(spellId).get({}, function(response) {
                $scope.spellObj = response.spell[0];
            });
            $scope.close = function(){
                $modalInstance.dismiss('cancel');
            };
        }
        return {
            restrict: 'EA',
            link: function(scope, element, attrs) {
                element.on('click', function(event) {
                    scope.openSpellInfoDialog(attrs.spellInfoDialog);
                });
                scope.openSpellInfoDialog = function(spellId) {
                    var opts = {
                        templateUrl: '/app/views/dialog_spell_info.html',
                        controller: DialogSpellController,
                        resolve: {
                            spellId: function() { return spellId; }
                        }
                    };
                    general.openDialog(opts);
                };
            }
        };
    })
    .directive('feats', function(general, charGenFactory) {
        return {
            restrict: 'A',
            require: 'ngModel',
            link: function(scope, element, attrs, ngModel) {
                scope.featsData = [];
                charGenFactory.Feats().get({}, function(data) {
                    scope.combatFeat = data.combatFeats;
                    scope.skillFeat = data.skillFeats;
                });

                scope.$watch('character.ability.pointsLeft', function(newVal) {
                    if (angular.isDefined(newVal)) {
                        ngModel.$setViewValue(filterFeats(ngModel.$viewValue));
                    }
                });
                scope.$watch('character.armor', function(newVal) {
                    if (angular.isDefined(newVal)) {
                        ngModel.$setViewValue(filterFeats(ngModel.$viewValue));
                    }
                });

                scope.$watch('character.classObj.name', function(newVal) {
                    if (angular.isDefined(newVal)) {
                        ngModel.$setViewValue([]);
                    }
                });

                function DialogFeatsController($scope, $modalInstance, featsData, max, featIds, title, featureType) {
                    general.DialogItemsController.apply(undefined, arguments);
                    var oldShowDescription = $scope.showDescription;
                    $scope.showDescription = function() {
                        oldShowDescription.apply(this, arguments);
                        if (this.item.prerequisite) {
                            $scope.selectedItem.description = '<div><i>' + this.item.prerequisite + '</i></div>';
                        } else {
                            $scope.selectedItem.description = '';
                        }
                        $scope.selectedItem.description += '<div>' + this.item.benefit_desc + '</div>';
                    };
                }

                function filterFeats(items) {
                    return _.filter(items, function(item) {
                        return !item.prereq_stat || (handlePrereq(item.prereq_stat, scope.character));
                    });
                }

                function disableFeats(items) {
                    var feats = angular.copy(items);
                    angular.forEach(feats, function(item) {
                        if (!handlePrereq(item.prereq_stat, scope.character)) {
                            item.disabled = true;
                        }
                    });
                    return feats;
                }

                function handlePrereq(prereqStat, character) {
                    var prereq = prereqStat.split(', '),
                        stat = prereq[0], val;
                    switch(stat) {
                        case 'minStat':
                            val = prereq[1];
                            return character.ability[val].score >= 13;
                        case 'profReq':
                            val = prereq[1];    // ex: medium_armor
                            return _.findIndex(character.armor, 'readable_id', val) !== -1;
                        case 'spellReq':
                            return angular.isDefined(character.raceObj.spellcasting) ||
                                angular.isDefined(character.classObj.spellcasting);
                        default:
                            return true;
                    }
                }

                scope.openFeatsDialog = function(featType) {
                    var featsData = disableFeats(scope[featType]);  //filterFeats(scope.featsData);
                    var opts = {
                        templateUrl: '/app/views/dialog_items.html',
                        controller: DialogFeatsController,
                        resolve: {
                            featsData: function() {
                                return featsData; //scope.featsData;
                            },
                            max: function() { return parseInt(scope.$eval(attrs.max)) || 1; },
                            featIds: function() {
                                return _.pluck(ngModel.$viewValue, 'id');
                            },
                            title: function() { return 'Select Feats'; },
                            featureType: function() { return ''; }
                        }
                    };
                    general.openDialog(opts).result.then(function(selectedFeats) {
                        var features = {}, benefitArray = [];
                        ngModel.$setViewValue(selectedFeats);
                        angular.forEach(selectedFeats, function(feat) {
                            if (feat.benefit) {
                                benefitArray = feat.benefit.split(', ');    // ex: initiative, 5
                                features[benefitArray[0]] = benefitArray[1];
                            }
                        });
                        scope.character.featureStats.feats = features;
                        scope.character.handleFeatureBonuses();
                    });
                };
            }
        };
    })
    .directive('armorEquip', function(general, charGenFactory) {
        return {
            restrict: 'A',
            require: 'ngModel',
            link: function(scope, element, attrs, ngModel) {
                var ARMOR_MAPPER = {};
                charGenFactory.Armor().get({}, function(response) {
                    ARMOR_MAPPER = response;
                });
                function DialogArmorController($scope, $modalInstance, armorData, armorId, title) {
                    $scope.title = title;
                    $scope.items = armorData;
                    $scope.tempItem = null;
                    $scope.disabled = !$scope.tempItem;

                    $scope.selectArmor = function(selectobj, index) {
                        $scope.tempItem = angular.copy(selectobj); // used in UI
                        $scope.selectedIndex = index;
                        $scope.disabled = false;
                    };

                    $scope.done = function() {
                        $modalInstance.close($scope.tempItem);
                    };

                    $scope.close = function(){
                        $modalInstance.dismiss('cancel');
                    };
                }
                scope.$watch('character.armor', function(newVal, oldVal) {
                    if (newVal) {
                        ngModel.$setViewValue(null);
                    }
                });
                scope.openArmorDialog = function() {
                    var armorData = ARMOR_MAPPER.lightArmor;
                    if (_.findIndex(scope.character.armor, 'readable_id', 'medium_armor') !== -1) {
                        armorData = armorData.concat(ARMOR_MAPPER.mediumArmor);
                    }
                    if (_.findIndex(scope.character.armor, 'readable_id', 'heavy_armor') !== -1) {
                        armorData = armorData.concat(ARMOR_MAPPER.heavyArmor);
                    }
                    var opts = {
                        templateUrl: '/app/views/dialog_armor.html',
                        controller: DialogArmorController,
                        resolve: {
                            armorData: function() {
                                return armorData;
                            },
                            armorId: function() {
                                return ngModel.$viewValue ? ngModel.$viewValue.id : null;
                            },
                            title: function() { return 'Select Armor'; }
                        }
                    };
                    general.openDialog(opts).result.then(function(selectedArmor) {
                        ngModel.$setViewValue(selectedArmor);
                        scope.character.calculateArmorClass();
                    });
                };
            }
        };
    })
    .directive('weaponEquip', function(general, charGenFactory) {
        return {
            restrict: 'A',
            require: 'ngModel',
            link: function(scope, element, attrs, ngModel) {
                var WEAPON_MAPPER = {};
                charGenFactory.Weapons().get({}, function(response) {
                    WEAPON_MAPPER = response;
                });
                function DialogWeaponController($scope, $modalInstance, weaponData, weaponId, title) {
                    $scope.title = title;
                    $scope.items = weaponData;
                    $scope.tempItem = null;
                    $scope.disabled = !$scope.tempItem;

                    $scope.selectWeapon = function(selectobj, index) {
                        $scope.tempItem = angular.copy(selectobj); // used in UI
                        $scope.selectedIndex = index;
                        $scope.disabled = false;
                    };

                    $scope.done = function() {
                        $modalInstance.close($scope.tempItem);
                    };

                    $scope.close = function(){
                        $modalInstance.dismiss('cancel');
                    };
                }
                scope.openWeaponDialog = function() {
                    var weaponData = [], weaponProf = scope.character.weapons;
                    angular.forEach(WEAPON_MAPPER.simpleWeapons, function(weapon) {
                        if (_.findIndex(weaponProf, 'readable_id', 'simple_weapon') !== -1 ||
                                _.findIndex(weaponProf, 'readable_id', weapon.readable_id) !== -1) {
                            if (!attrs.filter || (attrs.filter === 'ranged' && weapon.style !== 'ranged')) {
                                weaponData.push(weapon);
                            }
                        }
                    });
                    angular.forEach(WEAPON_MAPPER.martialWeapons, function(weapon) {
                        if (_.findIndex(weaponProf, 'readable_id', 'martial_weapon') !== -1 ||
                            _.findIndex(weaponProf, 'readable_id', weapon.readable_id) !== -1) {
                            if (!attrs.filter || (attrs.filter === 'ranged' && weapon.style !== 'ranged')) {
                                weaponData.push(weapon);
                            }
                        }
                    });
                    weaponData = _.sortBy(weaponData, 'name');
                    var opts = {
                        templateUrl: '/app/views/dialog_weapon.html',
                        controller: DialogWeaponController,
                        resolve: {
                            weaponData: function() {
                                return weaponData;
                            },
                            weaponId: function() {
                                return ngModel.$viewValue ? ngModel.$viewValue.id : null;
                            },
                            title: function() { return 'Select Weapon'; }
                        }
                    };
                    general.openDialog(opts).result.then(function(selectedWeapon) {
                        var properties = selectedWeapon.properties.split(', '),
                            modifier = scope.character.ability.str.mod,
                            rangeDesc = '', range = '', reach = 5, meleeRanged = '';
                        if (selectedWeapon.style === 'melee') {
                            meleeRanged = 'Melee Weapon Attack';
                            rangeDesc = 'reach ';
                        } else if (selectedWeapon.style === 'ranged') {
                            meleeRanged = 'Ranged Weapon Attack';
                            modifier = scope.character.ability.dex.mod;
                        }
                        angular.forEach(properties, function(property) {
                            if (property === 'Finesse' &&
                                    scope.character.ability.str.mod < scope.character.ability.dex.mod) {
                                modifier = scope.character.ability.dex.mod;
                            } else if (property === 'Reach') {
                                reach += 5;
                            } else if (property.indexOf('range') !== -1 && selectedWeapon.style === 'melee') {
                                meleeRanged = 'Melee or Ranged Weapon Attack';
                                reach += ' ft. or ' + property.substring(property.indexOf('(')+1, property.indexOf(')'));
                            } else if (property.indexOf('range') !== -1 && selectedWeapon.style === 'ranged') {
                                reach = property.substring(property.indexOf('(')+1, property.indexOf(')'));
                            }
                        })
                        selectedWeapon.meleeRanged = meleeRanged;
                        selectedWeapon.attack = scope.character.profBonus + modifier;
                        selectedWeapon.damage = selectedWeapon.damage_medium + ' + ' + modifier;
                        selectedWeapon.reach = rangeDesc + reach + ' ft.';
                        ngModel.$setViewValue(selectedWeapon);
                    });
                };
            }
        };
    })
    .directive('compile', ['$compile', function ($compile) {
        return function(scope, element, attrs) {
            scope.$watch(
                function(scope) {
                    // watch the 'compile' expression for changes
                    return scope.$eval(attrs.compile);
                },
                function(value) {
                    // when the 'compile' expression changes
                    // assign it into the current DOM
                    element.html(value);

                    // compile the new DOM and link it to the current
                    // scope.
                    // NOTE: we only compile .childNodes so that
                    // we don't get into infinite loop compiling ourselves
                    $compile(element.contents())(scope);
                }
            );
        };
    }]);