'use strict';

var AddAccountCtrl = function($scope, $location, $routeParams, $q, oauth, gmailClient, dialog) {
    !$routeParams.dev && oauth.accessToken && $location.path('/'); // init app

    $scope.signInWithGoogle = function() {
        return $q(function(resolve) {
            $scope.busy = true;
            $scope.errMsg = undefined; // reset error msg
            resolve();

        }).then(function() {
            // TODO: remove test email address after testing
            oauth._loginHint = 'safewithme.testuser@gmail.com';
            // get email address and oauth token
            return gmailClient.login();

        }).catch(dialog.error);
    };
};

module.exports = AddAccountCtrl;