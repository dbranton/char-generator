angular.module("app")
    .controller('CharacterController', CharacterController);

function CharacterController ($scope, $stateParams, $state, charGenFactory, general, configObj) {
    var path = configObj.path;
    $scope.openSpellInfoDialog = function(spellObj) {
        var opts = {};
        opts.templateUrl = path + '/app/views/dialog_spell_info.html';
        opts.controller = DialogSpellInfoController;
        opts.resolve = {
            spellObj: function() { return spellObj; }
        };
        //opts.size = 'sm';
        general.openDialog(opts);
    };

    function DialogSpellInfoController($scope, $modalInstance, spellObj) {
        $scope.spellObj = spellObj;

        $scope.close = function() {
            $modalInstance.dismiss('cancel');
        };
    }

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