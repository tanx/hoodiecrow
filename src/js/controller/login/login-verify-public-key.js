'use strict';

var PublicKeyVerifierCtrl = function($scope, $location, $q, auth, publickeyVerifier) {

    $scope.persistKeypair = function() {
        return $q(function(resolve) {
            resolve();

        }).then(function() {
            // persist keypair
            return publickeyVerifier.persistKeypair();

        }).then(function() {
            // persist credentials locally (needs private key to encrypt imap password)
            return auth.storeCredentials();

        }).then(function() {
            $location.path('/account'); // go to main account screen
        });
    };

    // upload public key and persist keypair in keychain
    publickeyVerifier.uploadPublicKey().then($scope.persistKeypair);
};

module.exports = PublicKeyVerifierCtrl;