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
            var nameArr = [];
            var hasSequence = _.find(input, 'sequence');
            if (hasSequence) {
                nameArr = _.chain(input).sortBy('sequence').pluck('name').value();
            } else {
                nameArr = _.chain(input).sortBy('name').pluck('name').value();
            } // after .chain: .sortBy('name')
            return nameArr.join(delimiter || ', ');
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
    .filter('filterLanguages', function() {
        return function(items, defaultLanguages) {
            if (defaultLanguages) {
                return _.filter(items, function(language) {
                    return defaultLanguages.indexOf(language.name) === -1;
                });
            }
            return items;
        };
    })
    .filter('filterTools', function() {
        return function(items, toolType, characterTools) {
            if (toolType) {
                return _.filter(items, function(item) {
                    return toolType === item.parent_id && (!characterTools || characterTools.indexOf(item.name) === -1);
                });
            }
            return items;
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