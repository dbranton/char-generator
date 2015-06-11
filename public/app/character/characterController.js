angular.module("app")
    .controller('CharacterController', CharacterController);

function CharacterController ($scope, $stateParams, $state, charGenFactory, general, configObj) {
    charGenFactory.Character($stateParams.characterId).get({}, function(data) {
        $scope.character = data.character;
        $scope.character.passivePerception = 10 + parseInt($scope.character.perception);
        $scope.character.proficiencies = $scope.character.armor_prof ?
            $scope.character.armor_prof + ', ' + $scope.character.weapon_prof :
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
        $state.go('dashboard');    // redirect if character does not exist
    });
}