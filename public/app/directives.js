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
                name = angular.isDefined(attrs.multiple) ? '{{$item.name}}' : '{{$select.selected.name}}',
                filter = attrs.filter ? ' | ' + attrs.filter : '';
            if (!angular.isDefined(attrs.select) || deviceType === 'phone' || deviceType === 'tablet') {
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
            } else {
                htmlString += '<div>' +
                    '<ui-select ng-model="' + attrs.ngModel + '"' +
                    'ng-change="' + attrs.change + '"' +
                    multiple + ' ' + max +
                    'theme="select2"' +
                    'reset-search-input="false"' +
                    'style="width: 100%;">' +
                    '<ui-select-match placeholder="' + attrs.placeholder + '">' + name + '</ui-select-match>' +
                    '<ui-select-choices repeat="item in ' + attrs.data + ' | filter: {name: $select.search}' + filter + '">' +
                    '   <div ng-bind-html="item.name | highlight: $select.search"></div>' +
                    '</ui-select-choices>' +
                    '</ui-select>' +
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
           return function(scope, elem, attrs){
             var showOptions = false;
             $drag.bind(elem, {
               constraint: {
                 maxX: 0,
                 minY: 0,
                 maxY: 0
               },
               move: function(c) {
                 if(c.right <= c.width) { //((5 * c.width) / 6)
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
           };
         }
       };
    })
    .directive('skills', function(configObj) {
        function returnTemplate(element, attrs) {
            if (configObj.deviceType === 'phone' || configObj.deviceType === 'tablet') {
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
                            '<span ng-show="skill.val >= 0">+</span>{{skill.val}} {{skill.name}} ({{skill.ability}}) <i class="fa fa-info-circle pull-right" tooltip-placement="left" tooltip-html-unsafe="{{skill.description}}"></i>' +
                        '</label>' +
                    '</div>';
            }
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
    .directive('languages', function(charGenFactory, general, $modal) {
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
                    scope.availableLanguages = angular.copy(LANGUAGE_LIST);
                });

                scope.openLanguageDialog = function() {
                    var opts = {
                        templateUrl: '/app/views/dialog_items.html',
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
    .directive('tools', function($modal, charGenFactory, general) {
        return {
            restrict: 'EA',
            require: 'ngModel',
            link: function(scope, element, attrs, ngModel) {
                scope.availableTools = [];
                var TOOLS_LIST = [];
                charGenFactory.getTools().success(function(data) {
                    TOOLS_LIST = data.tools;
                    scope.availableTools = angular.copy(TOOLS_LIST);
                });

                function DialogToolController($scope, $modalInstance, toolData, max, toolIds, title, featureType) {
                    general.DialogItemsController.apply(undefined, arguments);
                }
                scope.openToolDialog = function() {
                    var opts = {
                        templateUrl: '/app/views/dialog_items.html',
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
                    general.openDialog(opts).result.then(function(selectedTools) {
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
    .directive('bonusAbility', function(general, $modal) {
        return {
            restrict: 'A',
            require: 'ngModel',
            link: function(scope, element, attrs, ngModel) {
                var ability, val = 0;
                scope.character.raceObj.selectedBonusAbilities = [];
                scope.$watch(attrs.ngModel, function(newVal, oldVal) {
                    if (angular.isArray(newVal)) {
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
                        templateUrl: '/app/views/dialog_items.html',
                        controller: DialogBonusAbilityController,
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
    .directive('expertise', function(general, $modal, configObj) {
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
                // synchronize with the ngModel
                /*scope.$watch('character.classObj.expertise.selectedExpertise', function(newVal, oldVal) {
                    if (newVal) {
                        scope.selectedExpertise = newVal;
                    }
                });*/

                function DialogExpertiseController($scope, $modalInstance, expertiseData, max, expertiseIds, title, featureType) {
                    general.DialogItemsController.apply(undefined, arguments);
                }
                scope.openExpertiseDialog = function() {
                    var opts = {
                        templateUrl: '/app/views/dialog_items.html',
                        controller: DialogExpertiseController,
                        resolve: {
                            expertiseData: function() {
                                return _.sortBy(scope.character.classObj.expertise.list, 'name');
                            },
                            max: function() { return parseInt(attrs.max) || 1; },
                            expertiseIds: function() {
                                return scope.selectedExpertise ? _.pluck(scope.selectedExpertise, 'id') : null;
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
            /*scope: {
                ngModel: '=?'
            },*/
            link: function(scope, element, attrs, ngModel) {
                var list = attrs.list;
                scope[list] = [];
                scope.refreshSpells = function(term) {
                    var spellcastingObj = scope.$eval(attrs.select2Spellcasting) || {};
                    if (spellcastingObj.class_id) {
                        var classId = spellcastingObj.classId,
                            maxSpellLevel = spellcastingObj.maxSpellLevel,
                            schools = spellcastingObj.restrictedSchools;
                        charGenFactory.Spells(classId, maxSpellLevel, schools).get({}, function(response) {
                            scope.spells = response.spells;
                        });
                    }
                };

                scope.$watch(attrs.select2Spellcasting, function(newVal, oldVal) {
                    if (newVal && newVal.classId && (!angular.equals(newVal, oldVal) || newVal === oldVal)) {
                        var classId = newVal.classId, maxSpellLevel = newVal.maxSpellLevel,
                            school = newVal.restrictedSchools;
                        charGenFactory.Spells(classId, maxSpellLevel, school).get({}, function(response) {
                            scope[list] = response.spells;
                            if (scope.$select) {
                                scope.$select.selected = [];
                            }
                            if (newVal.bonusCantrip) {
                                angular.forEach(scope[list], function(spellObj, idx) {
                                    if (spellObj.readable_id === newVal.bonusCantrip) {
                                        //spellObj.disabled = true;
                                        scope[list][idx].disabled = true;
                                        if (scope.$select) {    // only applies to non-mobile
                                            scope.$select.select(spellObj);
                                        } else {    // for mobile only
                                            ngModel.$setViewValue([spellObj]);
                                        }
                                        //scope.$select.selected = [spellObj];
                                    }
                                });
                            }
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
    .directive('spellDialog', function(charGenFactory, $modal, $compile, configObj, general) {
        function DialogSpellController($scope, $modalInstance, list, numSpells, selectedSpells) { // spellIds is an array of objects
            $scope.title = 'Select Spells';
            $scope.tempSpells = [];
            //var spellIds = _.pluck(selectedSpells, 'readable_id');
            var preselectSpells = function(arr) {
                var spellIdx = -1;
                if (selectedSpells) {
                    angular.forEach(arr, function(spell) {
                        spellIdx = _.findIndex(selectedSpells, {'readable_id': spell.readable_id});
                        if (angular.isObject(spell) && spellIdx !== -1) {
                            spell.active = true;
                            if (selectedSpells[spellIdx].disabled) {
                                spell.disabled = true;
                            }
                            $scope.tempSpells.push(spell);
                        } else if (angular.isArray(spell)) {
                            angular.forEach(spell, function(obj) {
                                var test = _.findIndex(selectedSpells, 'readable_id', obj.readable_id);
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
        function returnTemplate(attrs) {
            var placeholder = attrs.placeholder || 'spell(s)';
            return '<div>' +
                '<a href="" class="btn btn-block" ng-click="openSpellDialog()" ng-class="selectedCantrips ? \'btn-primary\' : \'btn-default\'">' +
                    '<span ng-if="!selectedCantrips">Select your ' + placeholder + '</span>' +
                    '<span ng-if="selectedCantrips.length > 1">{{selectedCantrips.length}} ' + placeholder + ' selected</span>' +
                    '<span ng-if="selectedCantrips.length == 1">{{selectedCantrips[0].name}}</span>' +
                '</a>' +
            '</div>';
        }

        return {
            restrict: 'EA',
            replace: true,
            require: "?ngModel",
            //template: returnTemplate,
            scope: {
                select2Spellcasting: '=',
                list: '=',
                otherSpell: '='
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
                        scope.selectedCantrips = ngModel.$viewValue;
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