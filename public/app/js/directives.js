angular.module('myApp')
    .directive('uiSelect', function (){
        return {
            restrict: 'EA',
            require: 'uiSelect',
            link: function($scope, $element, $attributes, ctrl) {
                $attributes.$observe('max', function(value) {
                    $scope.$select.limit = (angular.isDefined(value)) ? parseInt(value, 10) : undefined;
                });
                var superSelect = ctrl.select,
                    superRemoveChoice = ctrl.removeChoice;
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
                ctrl.removeChoice = function() {
                    superRemoveChoice.apply(ctrl, arguments);
                    if(ctrl.multiple && ctrl.limit !== undefined && ctrl.selected.length < ctrl.limit) {
                        $($element).find('.ui-select-choices').show();   // show list and show max capacity message
                        $($element).find('.max-msg').remove();  // remove message
                    }
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
        return {
            restrict: 'E',
            template: '<div class="skillUI" ng-repeat="skill in character.skills">' +
                '<label><input type="checkbox" name="skill[]" value="{{skill.name}}" ng-checked="skill.proficient" ng-disabled="skill.disabled" ng-model="skill.proficient" ng-change="selectSkill(skill)" /> <span ng-show="skill.val >= 0">+</span>{{skill.val}} {{skill.name}} ({{skill.ability}})</label>' +
                '</div>',
            link: function(scope, element, attrs) {
                scope.selectSkill = function(skill) {
                    scope.character.updateSkillProficiency(skill.name, skill.proficient);
                };
            }
        };
    })
    .directive('languages', function(CharGenFactory) {
        return {
            restrict: 'A',
            require: 'ngModel',
            link: function(scope, element, attrs, ngModel) {
                var LANGUAGE_LIST = [];
                CharGenFactory.getLanguages().success(function(data) {
                    LANGUAGE_LIST = data.languages;
                    scope.availableLanguages = angular.copy(LANGUAGE_LIST);
                });
                scope.$watch(attrs.languages, function(newValue) {  // watches numLanguages
                    if (angular.isDefined(newValue)) {//} && $scope.character.background) {
                        scope.character.selectedLanguages = scope.character.selectedLanguages || [];
                        scope.select2Languages = newValue; // represents the 'max' attribute for select2
                        scope.numLanguagesLeft = scope.character.numLanguages - scope.character.selectedLanguages.length;
                        //$scope.selectedLanguages.length = newValue; //determineNumItems('#chosenLanguages', newValue);
                    }
                });
                scope.$watch('character.selectedLanguages', function(newValue, oldValue) {   // triggered whenever a language is selected
                    if ((angular.isArray(newValue) && angular.isArray(oldValue) && newValue.length !== oldValue.length) && scope.character.raceObj.name) {   // requires race
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
                // move to language directive
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
    .directive('expertise', function() {
        return {
            restrict: 'A',
            require: 'ngModel',
            link: function(scope, element, attrs, ngModel) {
                scope.$watch(attrs.ngModel, function(newVal, oldVal) {
                    var item, isAdded;
                    if (angular.isArray(newVal)) {
                        if (scope.character.classObj.expertise) {
                            scope.character.classObj.expertise.selectedExpertise = newVal;
                        }
                        if (newVal.length > oldVal.length) {
                            isAdded = true;
                            item = _.difference(newVal, oldVal)[0];
                        } else if (newVal.length < oldVal.length) {
                            isAdded = false;    // remove
                            item = _.difference(oldVal, newVal)[0];
                        }
                        scope.character.updateSkillScore(item, isAdded);
                    }
                });
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
                    if (newVal && newVal.classId) {
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
        function DialogSpellController($scope, $modalInstance, list, numSpells) {
            $scope.title = 'Select Spells';
            if (list[0].level === 0) {
                $scope.cantrips = angular.copy(list);
            } else {
                $scope.spells = _.groupBy(angular.copy(list), 'level_desc');
            }
            $scope.description = 'Click a list item to view more information';
            $scope.featureType = '';
            $scope.tempSpells = [];
            $scope.disabled = true;
            $scope.spellsLeft = angular.copy(numSpells);

            $scope.showDescription = function(selectobj) {
                $scope.selectedIndex = selectobj.$index;
                $scope.selectedSpell = angular.copy(selectobj.spell);
                $scope.typeDescription = $scope.selectedSpell.level === 0 ? $scope.selectedSpell.type + ' Cantrip' :
                    'Level ' + $scope.selectedSpell.level + ' ' + $scope.selectedSpell.type;    // consider adding new property on server-side
                if (!$scope.selectedSpell.active && $scope.spellsLeft - $scope.tempSpells.length > 0) {
                    $scope.tempSpells.push($scope.selectedSpell); //.name
                    selectobj.spell.active = true;
                } else if ($scope.selectedSpell.active) {
                    $scope.tempSpells.splice($scope.tempSpells.indexOf($scope.selectedSpell.name), 1); // remove cantrip
                    selectobj.spell.active = false;
                }
                $scope.disabled = $scope.spellsLeft - $scope.tempSpells.length !== 0; // disabled is true if there are still cantrips left to choose
            };
            $scope.done = function() {
                var tempSpells = '';
                if (angular.isArray($scope.tempSpells)) {
                    //$scope.tempSpells = numSpells === 1 ? $scope.tempSpells[0] : $scope.tempSpells;
                    //$scope.$emit('spellEmit', {selectedSpells: $scope.tempSpells});
                    //$scope.$broadcast('broadcastSpells', $scope.tempSpells);
                    $modalInstance.close($scope.tempSpells);
                } else {
                    alert("Please select your spells");   // should be impossible to get here since button is disabled
                }
            };

            $scope.close = function(){
                $modalInstance.dismiss('cancel');
            };
        }
        return {
            restrict: 'EA',
            replace: true,
            require: "?ngModel",
            template: '<label class="input-group-addon btn btn-default" ng-click="openSpellDialog()">' +
                '<span class="fa fa-columns"></span>' +
                '</label>',
            scope: {
                //spellObj: '=',
                //list: '='
            },
            link: function(scope, element, attrs, ngModel) {
                //if (!attrs.spellObj) throw new Error('The spell-obj attribute is required!');
                var uiSelect = element.parent().find('ui-select'),
                    spellObjAttr = uiSelect.attr('select2-spellcasting'),
                    listAttr = uiSelect.attr('list');
                scope.openSpellDialog = function() {
                    var spellObj = scope.$parent.$eval(spellObjAttr);//scope.spellObj;
                    var list = scope.$parent.$eval(listAttr + 'Filtered');
                    var opts = {
                        backdrop: true,
                        keyboard: true,
                        backdropClick: true,
                        templateUrl: 'app/views/dialog_spells.html',
                        controller: DialogSpellController,
                        resolve: {
                            //classId: function() { return spellObj.classId; },
                            //maxSpellLevel: function() { return spellObj.maxSpellLevel; },
                            list: function() { return list; },
                            numSpells: function() { return spellObj.numSpellsKnown || 1; }
                            //schools: function() { return spellObj.restrictedSchools || null; }
                        }
                    };
                    $modal.open(opts).result.then(function(selectedSpells) {
                        var spellIds = _.pluck(selectedSpells, 'id'); // [12, 42, 52, ...]
                        ngModel.$setViewValue(_.filter(list, function(spell) {
                            return _.indexOf(spellIds, spell.id) > -1;
                        }));
                    });
                };
            }
        };
    });