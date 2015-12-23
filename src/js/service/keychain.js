'use strict';

var ngModule = angular.module('woServices');
ngModule.service('keychain', Keychain);
module.exports = Keychain;

// hardcore test keypair
var testKeypair = {
    privateKey: {
        _id: '514BEE3B15C7F569',
        userId: 'safewithme.testuser@gmail.com',
        userIds: [{
            name: 'Test User',
            emailAddress: 'safewithme.testuser@gmail.com'
        }],
        encryptedKey: '-----BEGIN PGP PRIVATE KEY BLOCK-----\r\nVersion: OpenPGP.js v1.4.0\r\nComment: Whiteout Mail - https://whiteout.io\r\n\r\n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\r\nNI3KHEXiKMx7Wua+tg==\r\n=1j7z\r\n-----END PGP PRIVATE KEY BLOCK-----'
    },
    publicKey: {
        _id: '514BEE3B15C7F569',
        userId: 'safewithme.testuser@gmail.com',
        userIds: [{
            name: 'Test User',
            emailAddress: 'safewithme.testuser@gmail.com'
        }],
        publicKey: '-----BEGIN PGP PUBLIC KEY BLOCK-----\r\nVersion: OpenPGP.js v1.4.0\r\nComment: Whiteout Mail - https://whiteout.io\r\n\r\nxsBNBFZySAABCADq1lWFckbHf4Rm2tSi6Tf5jGbKhu1aTENB0/C7Hgh5QTWi\r\nV1L8OQnqHvAj8bOJWuetxjPRUVBTain7VbBpOJT6v7AoxBaJAp/VDm/AMn6L\r\no46rO+aTO+2M4leAvp/hMKE4xrxOU5LJ5AkZEsjjWK0kunJRdsCLOONq7xrp\r\n41QkbObU06Q/CH0hi6WoXroui16ngnOypTNicpvIKqsXyNeHxy8dr05vKVA9\r\nrRuBSfKpGg0vQmf+qNsg30boR1zdyg1heN2QOYXIEuHSuB2fWOko3z5o9dAJ\r\n1x2ltVHCSbn3pGyFgE63gqt2cgk+bONWyLWBpzIBVp1vCvTEHrjuT5LFABEB\r\nAAHNKVRlc3QgVXNlciA8c2FmZXdpdGhtZS50ZXN0dXNlckBnbWFpbC5jb20+\r\nwsByBBABCAAmBQJWckgABgsJCAcDAgkQUUvuOxXH9WkEFQgCCgMWAgECGwMC\r\nHgEAACqDB/4tm1zBsHOO0i2arHfF+kZiNKEAIYUO+LxRD9LMr1GpgRVd8faE\r\nk4QESKPUgrtbEwYCZlv1rYUJrSmNpYPPlZi+JS4NnnC9paUYua9b2a7vkHUg\r\nuALTJlLkvKPezL75/0KNWMYHiA/qYL3sK6lbAZNofmlnyBHNY4e1rodBIJu4\r\n8FzPXdHIpiFTTACnlGzW4mzzb70EBlvbc7xzt/kTVJPXHVq6SSQLkdVySOpp\r\nqh2lz3ZU9fxsgXgm6mtk0tb3OMWpcZcVELcsT1dYOUMmyKET6KtHuu1t4mH8\r\nuUK3TvUSbqqjsM2V9W0MBA4E2ak/zv/08z5Y7VrsluBXDsg74TOizsBNBFZy\r\nSAABCAC27kLWUA7p1NWvuxPJdNv3BRxzijQLHK1IVhu9Ub7c96JuVJu5+UBv\r\nVY4WbQB3hJlVx7XDvxyR15cCR+29G0WptVyJKi1d2FRlO2Lm51aBNLPJSSJ2\r\n86RU2Cw2fJVH5bhhN5/UD9Sq0G5+bTbTIQioJLqcI+jI+J0F4F8PFH57FEV+\r\n0s/zYoMOZfPYB2iS1/LBlSgvMHYuZ44yG0xOBTN4mwkPhJfl5EGunRl5yUqY\r\nLH0S41agwCzdvu5WdwuoSf7pKMf6IBAYtlvqsUiT/PI0TFzW5Yk25sAFPfuq\r\nGYMo1OxZwQRW/71TzJWyY5r/xklgZ6SViWLDhOl++Ic801ITABEBAAHCwF8E\r\nGAEIABMFAlZySAEJEFFL7jsVx/VpAhsMAAAduggA333DJ1cjEkiPR6X4qOrX\r\nbLppLI0azkoxpPtAWUd6xxsnAPoJILaoQkr2s5qmXMNVCUUTDf8UlfVzGWct\r\n/5YZ4lufUb3Z7sPy6zAKfRFh2OukL8bwAUEHV659lbiIFwwgqZdqItMHdRH8\r\nPj/gb/kPqFHe66HX6Kg6W/WnGg9b1yibjT0pKCIqD0//1xWhUP71n/ly5Obw\r\n+uk5fPWZ+FkQlPDbbLBZcTgxGGfRElXKw/OJz693ob7hkUbvOkh/mR5jeUS5\r\npSCw3jmFaCOyn8ra6DE5/8we//eU6FiDmG5cDYUbUWpmFdO1xIuRNWTlvi3/\r\nbI/fNI3KHEXiKMx7Wua+tg==\r\n=npPn\r\n-----END PGP PUBLIC KEY BLOCK-----'
    }
};

var DB_PUBLICKEY = 'publickey',
    DB_PRIVATEKEY = 'privatekey';

/**
 * A high-level Data-Access Api for handling Keypair synchronization
 * between the cloud service and the device's local storage
 */
function Keychain(accountLawnchair, publicKey, privateKey, crypto, pgp, dialog, appConfig) {
    this._lawnchairDAO = accountLawnchair;
    this._publicKeyDao = publicKey;
    this._privateKeyDao = privateKey;
    this._crypto = crypto;
    this._pgp = pgp;
    this._dialog = dialog;
    this._appConfig = appConfig;
}

//
// Public key functions
//

/**
 * Display confirmation dialog to request a public key update
 * @param  {Object}   params.newKey   The user's updated public key object
 * @param  {String}   params.userId   The user's email address
 */
Keychain.prototype.requestPermissionForKeyUpdate = function(params, callback) {
    var str = this._appConfig.string;
    var message = params.newKey ? str.updatePublicKeyMsgNewKey : str.updatePublicKeyMsgRemovedKey;
    message = message.replace('{0}', params.userId);

    this._dialog.confirm({
        title: str.updatePublicKeyTitle,
        message: message,
        positiveBtnStr: str.updatePublicKeyPosBtn,
        negativeBtnStr: str.updatePublicKeyNegBtn,
        showNegativeBtn: true,
        callback: callback
    });
};

/**
 * Checks for public key updates of a given user id
 * @param {String} options.userId The user id (email address) for which to check the key
 * @param {String} options.overridePermission (optional) Indicates if the update should happen automatically (true) or with the user being queried (false). Defaults to false
 */
Keychain.prototype.refreshKeyForUserId = function(options) {
    var self = this,
        userId = options.userId,
        overridePermission = options.overridePermission;

    // get the public key corresponding to the userId
    return self.getReceiverPublicKey(userId).then(function(localKey) {
        if (!localKey || !localKey._id) {
            // there is no key available, no need to refresh
            return;
        }
        // no need to refresh manually imported public keys
        if (localKey.imported) {
            return localKey;
        }
        // check if the key id still exists on the key server
        return checkKeyExists(localKey);
    });

    // checks if the user's key has been revoked by looking up the key id
    function checkKeyExists(localKey) {
        return self._publicKeyDao.getByUserId(userId).then(function(cloudKey) {
            if (cloudKey && cloudKey._id === localKey._id) {
                // the key is present on the server, all is well
                return localKey;
            }
            // the key has changed, update the key
            return updateKey(localKey, cloudKey);

        }).catch(function(err) {
            if (err && err.code === 42) {
                // we're offline, we're done checking the key
                return localKey;
            }
            throw err;
        });
    }

    function updateKey(localKey, newKey) {
        // the public key has changed, we need to ask for permission to update the key
        if (overridePermission) {
            // don't query the user, update the public key right away
            return permissionGranted(localKey, newKey);
        } else {
            return requestPermission(localKey, newKey);
        }
    }

    function requestPermission(localKey, newKey) {
        return new Promise(function(resolve, reject) {
            // query the user if the public key should be updated
            self.requestPermissionForKeyUpdate({
                userId: userId,
                newKey: newKey
            }, function(granted) {
                if (!granted) {
                    // permission was not given to update the key, so don't overwrite the old one!
                    resolve(localKey);
                    return;
                }
                // permission was granted by the user
                permissionGranted(localKey, newKey).then(resolve).catch(reject);
            });
        });
    }

    function permissionGranted(localKey, newKey) {
        // permission to update the key was given, so delete the old one and persist the new one
        return self.removeLocalPublicKey(localKey._id).then(function() {
            if (!newKey) {
                // error or no new key to save
                return;
            }
            // persist the new key and return it
            return self.saveLocalPublicKey(newKey).then(function() {
                return newKey;
            });
        });
    }
};

/**
 * Look up a reveiver's public key by user id
 * @param userId [String] the receiver's email address
 */
Keychain.prototype.getReceiverPublicKey = function(userId) {
    var self = this;

    // search local keyring for public key
    return self._lawnchairDAO.list(DB_PUBLICKEY).then(function(allPubkeys) {
        var userIds;
        // query primary email address
        var pubkey = _.findWhere(allPubkeys, {
            userId: userId
        });
        // query mutliple userIds
        if (!pubkey) {
            for (var i = 0, match; i < allPubkeys.length; i++) {
                userIds = self._pgp.getKeyParams(allPubkeys[i].publicKey).userIds;
                match = _.findWhere(userIds, {
                    emailAddress: userId
                });
                if (match) {
                    pubkey = allPubkeys[i];
                    break;
                }
            }
        }
        // that user's public key is already in local storage
        if (pubkey && pubkey._id) {
            return pubkey;
        }
        // no public key by that user id in storage
        // find from cloud by email address
        return self._publicKeyDao.getByUserId(userId).then(onKeyReceived).catch(onError);
    });

    function onKeyReceived(cloudPubkey) {
        if (!cloudPubkey) {
            // public key has been deleted without replacement
            return;
        }
        // persist and return cloud key
        return self.saveLocalPublicKey(cloudPubkey).then(function() {
            return cloudPubkey;
        });
    }

    function onError(err) {
        if (err && err.code === 42) {
            // offline
            return;
        }
        throw err;
    }
};

//
// Keypair functions
//

/**
 * Gets the local user's key either from local storage
 * or fetches it from the cloud. The private key is encrypted.
 * If no key pair exists, null is returned.
 * return [Object] The user's key pair {publicKey, privateKey}
 */
Keychain.prototype.getUserKeyPair = function( /*userId*/ ) {

    // TODO: remove after testing
    return new Promise(function(resolve) {
        resolve(testKeypair);
    });

    // var self = this;

    // // search for user's public key locally
    // return self._lawnchairDAO.list(DB_PUBLICKEY).then(function(allPubkeys) {
    //     var pubkey = _.findWhere(allPubkeys, {
    //         userId: userId
    //     });

    //     if (pubkey && !pubkey.source) {
    //         // that user's public key is already in local storage...
    //         // sync keypair to the cloud
    //         return syncKeypair(pubkey._id);
    //     }

    //     // no public key by that user id in storage
    //     // find from cloud by email address
    //     return self._publicKeyDao.getByUserId(userId).then(function(cloudPubkey) {
    //         if (cloudPubkey && !cloudPubkey.source) {
    //             // there is a public key for that user already in the cloud...
    //             // sync keypair to local storage
    //             return syncKeypair(cloudPubkey._id);
    //         }

    //         // continue without keypair... generate or import new keypair
    //     });
    // });

    // function syncKeypair(keypairId) {
    //     var savedPubkey, savedPrivkey;
    //     // persist key pair in local storage
    //     return self.lookupPublicKey(keypairId).then(function(pub) {
    //         savedPubkey = pub;

    //         // persist private key in local storage
    //         return self.lookupPrivateKey(keypairId);

    //     }).then(function(priv) {
    //         savedPrivkey = priv;

    //     }).then(function() {
    //         var keys = {};

    //         if (savedPubkey && savedPubkey.publicKey) {
    //             keys.publicKey = savedPubkey;
    //         }
    //         if (savedPrivkey && savedPrivkey.encryptedKey) {
    //             keys.privateKey = savedPrivkey;
    //         }

    //         return keys;
    //     });
    // }
};

/**
 * Checks to see if the user's key pair is stored both
 * locally and in the cloud and persist arccordingly
 * @param [Object] The user's key pair {publicKey, privateKey}
 */
Keychain.prototype.putUserKeyPair = function(keypair) {
    var self = this;

    // validate input
    if (!keypair || !keypair.publicKey || !keypair.privateKey || !keypair.publicKey.userId || keypair.publicKey.userId !== keypair.privateKey.userId) {
        return new Promise(function() {
            throw new Error('Cannot put user key pair: Incorrect input!');
        });
    }

    // don't check the user's own public key for deletion in refreshKeyForUserId
    keypair.publicKey.imported = true;

    // store public key locally
    return self.saveLocalPublicKey(keypair.publicKey).then(function() {
        // persist public key in cloud storage
        return self._publicKeyDao.put(keypair.publicKey);
    }).then(function() {
        // store private key locally
        return self.saveLocalPrivateKey(keypair.privateKey);
    });
};

/**
 * Uploads the public key
 * @param {Object} publicKey The user's public key
 * @return {Promise}
 */
Keychain.prototype.uploadPublicKey = function(publicKey) {
    var self = this;

    // validate input
    if (!publicKey || !publicKey.userId || !publicKey.publicKey) {
        return new Promise(function() {
            throw new Error('Cannot upload user key pair: Incorrect input!');
        });
    }

    return self._publicKeyDao.put(publicKey);
};

//
// Helper functions
//

Keychain.prototype.lookupPublicKey = function(id) {
    var self = this,
        cloudPubkey;

    if (!id) {
        return new Promise(function() {
            throw new Error('ID must be set for public key query!');
        });
    }

    // lookup in local storage
    return self._lawnchairDAO.read(DB_PUBLICKEY + '_' + id).then(function(pubkey) {
        if (pubkey) {
            return pubkey;
        }

        // fetch from cloud storage
        return self._publicKeyDao.get(id).then(function(pub) {
            cloudPubkey = pub;
            // cache public key in cache
            return self.saveLocalPublicKey(cloudPubkey);
        }).then(function() {
            return cloudPubkey;
        });
    });
};

/**
 * List all the locally stored public keys
 */
Keychain.prototype.listLocalPublicKeys = function() {
    // search local keyring for public key
    return this._lawnchairDAO.list(DB_PUBLICKEY);
};

Keychain.prototype.removeLocalPublicKey = function(id) {
    return this._lawnchairDAO.remove(DB_PUBLICKEY + '_' + id);
};

Keychain.prototype.lookupPrivateKey = function(id) {
    // lookup in local storage
    return this._lawnchairDAO.read(DB_PRIVATEKEY + '_' + id);
};

Keychain.prototype.saveLocalPublicKey = function(pubkey) {
    // persist public key (email, _id)
    var pkLookupKey = DB_PUBLICKEY + '_' + pubkey._id;
    return this._lawnchairDAO.persist(pkLookupKey, pubkey);
};

Keychain.prototype.saveLocalPrivateKey = function(privkey) {
    // persist private key (email, _id)
    var prkLookupKey = DB_PRIVATEKEY + '_' + privkey._id;
    return this._lawnchairDAO.persist(prkLookupKey, privkey);
};