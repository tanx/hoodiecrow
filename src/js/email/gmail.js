'use strict';

var ngModule = angular.module('woEmail');
ngModule.service('gmail', Gmail);
module.exports = Gmail;

//
//
// Constants
//
//

var FOLDER_DB_TYPE = 'folders';

//
//
// Gmail Service
//
//

/**
 * This module wraps the REST based Google Mail api and provides the same high-level api
 * as the Email module, which orchestrates everything around the handling of encrypted mails:
 * PGP de-/encryption, receiving via Gmail api, sending via Gmail api, MIME parsing, local db persistence
 */
function Gmail(keychain, pgp, accountStore, pgpbuilder, mailreader, dialog, appConfig, auth) {
    this._keychain = keychain;
    this._pgp = pgp;
    this._devicestorage = accountStore;
    this._pgpbuilder = pgpbuilder;
    this._mailreader = mailreader;
    this._dialog = dialog;
    this._appConfig = appConfig;
    this._auth = auth;
}

/**
 * Initializes the gmail dao:
 * - assigns _account
 * - initializes _account.folders with the content from memory
 *
 * @param {String} options.account.emailAddress The user's id
 * @param {String} options.account.realname The user's id
 * @return {Promise}
 * @resolve {Object} keypair
 */
Gmail.prototype.init = function(options) {
    var self = this;

    self._account = options.account;
    self._account.busy = 0; // >0 triggers the spinner
    self._account.online = false;
    self._account.loggingIn = false;

    // fetch folders from idb
    return self._devicestorage.listItems(FOLDER_DB_TYPE, true).then(function(stored) {
        self._account.folders = stored[0] || [];
        return self._initFolders();
    });
};