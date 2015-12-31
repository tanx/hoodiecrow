'use strict';

var ngModule = angular.module('woServices');
ngModule.service('publicKey', PublicKey);
module.exports = PublicKey;

function PublicKey(pgp) {
    this._pgp = pgp;
    this._hkp = pgp.getHKPClient();
}

/**
 * Find the user's corresponding public key
 */
PublicKey.prototype.get = function(keyId) {
    return this._get({
        keyId: keyId
    }).then(function(key) {
        if (key && key._id !== keyId) {
            throw new Error('Key ID of fetched public key does not match!');
        }
        return key;
    });
};

/**
 * Find the user's corresponding public key by email
 */
PublicKey.prototype.getByUserId = function(userId) {
    return this._get({
        query: userId
    });
};

PublicKey.prototype._get = function(options) {
    var self = this;

    return self._hkp.lookup(options).then(function(publicKeyArmored) {
        if (!publicKeyArmored) {
            return;
        }
        var keyParams = self._pgp.getKeyParams(publicKeyArmored);
        return {
            _id: keyParams._id,
            userId: keyParams.userId,
            userIds: keyParams.userIds,
            publicKey: publicKeyArmored,
            source: self._hkp._baseUrl.split('://')[1]
        };
    });
};

/**
 * Persist the user's publc key
 */
PublicKey.prototype.put = function(pubkey) {
    return this._hkp.upload(pubkey.publicKey);
};