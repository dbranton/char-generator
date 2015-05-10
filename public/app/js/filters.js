/**
 * AngularJS default filter with the following expression:
 * "person in people | filter: {name: $select.search, age: $select.search}"
 * performs a AND between 'name: $select.search' and 'age: $select.search'.
 * We want to perform a OR.
 */
angular
    .module('app')
    .filter('joinBy', function() {
        return function(input, delimiter) {
            var nameArr = _.chain(input).sortBy('name').pluck('name').value();
            return (nameArr || []).join(delimiter || ', ');
        };
    })
    .filter('addPlus', function() {
        return function(val) {
            return val >= 0 ? '+' + val : val;
        }
    })
    .filter('ability', function() {
        return function(val) {
            var abilityMapper = {
                str: 'Strength',
                dex: 'Dexterity',
                con: 'Constitution',
                int: 'Intelligence',
                wis: 'Wisdom',
                cha: 'Charisma'
            }
            return abilityMapper[val];
        }
    })
    .filter('filterSpells', function() {
        return function(items, spells) {
            if (angular.isArray(spells)) {
                var spellIds = _.pluck(spells, 'id');
                return _.reject(items, function(item) {
                    return spellIds.indexOf(item.id) !== -1;
                });
            } else if (angular.isObject(spells)) {
                return _.reject(items, {'id': spells.id});
            }
            return items;
        };
    })
    .filter('filterTools', function() {
        return function(items, character) {
            var parentTool;
            if (character.numToolChoices > 0) {
                parentTool = "Artisan's Tools"; //character.background.tools;
                return _.filter(items, function(item) {
                    return parentTool.indexOf(item.parent) !== -1 && (!character.tools || character.tools.indexOf(item.name) === -1);
                });
            }
            return items;
        };
    })
    .filter('filterFeats', function() {
        return function(items, character) {
            return _.filter(items, function(item) {
                return !item.prereq_stat || (handlePrereq(item.prereq_stat, character));
            });

            function handlePrereq(prereqStat, character) {
                var prereq = prereqStat.split(', '),
                    stat = prereq[0], val;
                switch(stat) {
                    case 'minStat':
                        val = prereq[1];
                        return character.ability[val].score >= 13;
                    case 'profReq':

                        return;
                    case 'spellReq':

                        return;
                    default:
                        return true;
                }
            }
            //return items;
        };
    })
    .filter('filterWeapons', function() {
        return function(items, style) {
            return _.filter(items, function(item) {
                return item.style.indexOf(style) !== -1;
            });
        };
    })
    .filter('unsafe', ['$sce', function ($sce) {
        return function (val) {
            return $sce.trustAsHtml(val);
        };
    }]);