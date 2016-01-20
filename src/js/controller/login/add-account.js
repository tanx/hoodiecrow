'use strict';

const AddAccountCtrl = function($scope, $location, $routeParams, $q, auth, gmailClient, dialog) {
    !$routeParams.dev && !auth.isInitialized() && $location.path('/'); // init app

    $scope.signInWithGoogle = function() {
        return $q(resolve => {
            $scope.busy = true;
            $scope.errMsg = undefined; // reset error msg
            resolve();

        }).then(() => gmailClient.login({ // get oauth credentials
            prompt: 'select_account'
        })).catch(dialog.error);
    };
};

export default AddAccountCtrl;