'use strict';

var AddAccountCtrl = function($scope, $location, $routeParams, $q, auth, gmailClient, dialog) {
    !$routeParams.dev && !auth.isInitialized() && $location.path('/'); // init app

    $scope.signInWithGoogle = function() {
        return $q(function(resolve) {
            $scope.busy = true;
            $scope.errMsg = undefined; // reset error msg
            resolve();

        }).then(function() {
            // get oauth credentials
            return gmailClient.login({
                prompt: 'select_account'
            });

        }).catch(dialog.error);
    };
};

module.exports = AddAccountCtrl;