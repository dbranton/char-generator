/**
 * AngularJS default filter with the following expression:
 * "person in people | filter: {name: $select.search, age: $select.search}"
 * performs a AND between 'name: $select.search' and 'age: $select.search'.
 * We want to perform a OR.
 */
app.filter('joinBy', function() {
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
    .filter('unsafe', ['$sce', function ($sce) {
        return function (val) {
            return $sce.trustAsHtml(val);
        };
    }]);