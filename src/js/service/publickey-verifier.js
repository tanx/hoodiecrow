'use strict';

var ngModule = angular.module('woServices');
ngModule.service('publickeyVerifier', PublickeyVerifier);
module.exports = PublickeyVerifier;

function PublickeyVerifier(keychain) {
    this._keychain = keychain;
}

//
// Public API
//

PublickeyVerifier.prototype.uploadPublicKey = function() {
    if (this.keypair && this.hkpUpload) {
        return this._keychain.uploadPublicKey(this.keypair.publicKey);
    }
    return new Promise(function(resolve) {
        resolve();
    });
};

PublickeyVerifier.prototype.persistKeypair = function() {
    if (this.keypair) {
        return this._keychain.putUserKeyPair(this.keypair);
    }
    return new Promise(function(resolve) {
        resolve();
    });
};