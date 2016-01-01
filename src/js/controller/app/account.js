'use strict';

var AccountCtrl = function($scope, $q, $timeout, $location, auth, keychain, pgp, appConfig, download, dialog, privateKey, email) {
    var userId = auth.emailAddress;
    if (!userId) {
        return;
    }

    //
    // scope state
    //

    $scope.state.account = {
        toggle: function(to) {
            $scope.state.lightbox = (to) ? 'account' : undefined;
        }
    };

    //
    // scope variables
    //

    var keyParams = pgp.getKeyParams();

    $scope.eMail = userId;
    $scope.keyId = keyParams._id.slice(8);
    var fpr = keyParams.fingerprint;
    $scope.fingerprint = fpr.slice(0, 4) + ' ' + fpr.slice(4, 8) + ' ' + fpr.slice(8, 12) + ' ' + fpr.slice(12, 16) + ' ' + fpr.slice(16, 20) + ' ' + fpr.slice(20, 24) + ' ' + fpr.slice(24, 28) + ' ' + fpr.slice(28, 32) + ' ' + fpr.slice(32, 36) + ' ' + fpr.slice(36);
    $scope.keysize = keyParams.bitSize;
    $scope.publicKeyUrl = appConfig.config.hkpUrl + '/pks/lookup?op=get&search=0x' + keyParams._id;

    //
    // scope functions
    //

    $scope.exportKeyFile = function() {
        return $q(function(resolve) {
            resolve();

        }).then(function() {
            return keychain.getUserKeyPair(userId);

        }).then(function(keys) {
            var keyId = keys.publicKey._id;
            var file = userId + '_' + keyId.substring(8, keyId.length);

            download.createDownload({
                content: keys.publicKey.publicKey + '\r\n' + keys.privateKey.encryptedKey,
                filename: file + '.asc',
                contentType: 'text/plain'
            });

        }).catch(dialog.error);
    };

    $scope.checkKeySyncStatus = function() {
        return $q(function(resolve) {
            resolve();

        }).then(function() {
            // check key sync status
            return privateKey.isSynced();

        }).then(function(synced) {
            if (synced) {
                return;
            }

            dialog.confirm({
                title: 'Key backup',
                message: 'Your encryption key is not backed up. Back up now?',
                positiveBtnStr: 'Backup',
                negativeBtnStr: 'Not now',
                showNegativeBtn: true,
                callback: function(granted) {
                    if (granted) {
                        // logout of the current session
                        email.onDisconnect().then(function() {
                            // send to key upload screen
                            $timeout(function() {
                                $location.path('/login-privatekey-upload');
                            });
                        });
                    }
                }
            });

        }).catch(dialog.error);
    };

};

module.exports = AccountCtrl;