'use strict';

var LoginCtrl = function($scope, $timeout, $location, updateHandler, account, auth, email, privateKey, dialog, appConfig, oauth, gmailClient) {

    //
    // Scope functions
    //

    $scope.init = function() {
        // initialize the auth module
        return auth.init().then(function() {

            // show login screen if no oauth token either stored locally or caught via oauthCallback
            if (!auth.oauthToken && !oauth.accessToken) {
                return $scope.goTo('/add-account');
            }

            // make sure we have valid credentials
            return gmailClient.login().then(function() {
                // initiate the account by initializing the email dao and user storage
                return account.init({
                    emailAddress: auth.emailAddress,
                    realname: auth.realname
                }).then(function(availableKeys) {
                    return redirect(availableKeys);
                });
            });

        }).catch(dialog.error);
    };

    function redirect(availableKeys) {
        if (availableKeys && availableKeys.publicKey && availableKeys.privateKey) {
            // public and private key available, try empty passphrase
            var passphraseIncorrect;
            return email.unlock({
                keypair: availableKeys,
                passphrase: undefined
            }).catch(function() {
                passphraseIncorrect = true;
                // passphrase set... ask for passphrase
                return $scope.goTo('/login-existing');

            }).then(function() {
                if (passphraseIncorrect) {
                    return;
                }
                // no passphrase set... go to main screen
                return auth.storeCredentials().then(function() {
                    return $scope.goTo('/account');
                });
            });
        }

        // no local key, check for synced private key
        var privateKeySynced;
        return privateKey.init().then(function() {
            return privateKey.isSynced();
        }).then(function(synced) {
            privateKeySynced = synced;
            // logout of imap
            return privateKey.destroy();
        }).then(function() {
            // key is not synced ... continue to keygen/import
            if (!privateKeySynced) {
                return $scope.goTo('/login-initial');
            }
            // key is synced ... continue to private key download
            return $scope.goTo('/login-privatekey-download');
        });
    }

    $scope.goTo = function(location) {
        return $timeout(function() {
            $location.path(location);
        });
    };

    //
    // Start the app
    //

    // check for app update
    updateHandler.checkForUpdate();

    // init the app
    if (!appConfig.preventAutoStart) {
        $scope.init();
    }

};

module.exports = LoginCtrl;