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

// var SYNC_TYPE_NEW = 'new';
// var SYNC_TYPE_DELETED = 'deleted';
// var SYNC_TYPE_MSGS = 'messages';

// well known folders
var FOLDER_TYPE_INBOX = 'Inbox';
// var FOLDER_TYPE_SENT = 'Sent';
// var FOLDER_TYPE_DRAFTS = 'Drafts';
// var FOLDER_TYPE_TRASH = 'Trash';
// var FOLDER_TYPE_FLAGGED = 'Flagged';

// var MSG_ATTR_UID = 'uid';
// var MSG_ATTR_MODSEQ = 'modseq';
// var MSG_PART_ATTR_CONTENT = 'content';
// var MSG_PART_TYPE_ATTACHMENT = 'attachment';
// var MSG_PART_TYPE_ENCRYPTED = 'encrypted';
// var MSG_PART_TYPE_SIGNED = 'signed';
// var MSG_PART_TYPE_TEXT = 'text';
// var MSG_PART_TYPE_HTML = 'html';

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

/**
 * Unlocks the keychain by either decrypting an existing private key or generating a new keypair
 * @param {String} options.passphrase The passphrase to decrypt the private key
 */
Gmail.prototype.unlock = function(options) {
    var self = this,
        generatedKeypair;

    if (options.keypair) {
        // import existing key pair into crypto module
        return handleExistingKeypair(options.keypair);
    }

    // no keypair for is stored for the user... generate a new one
    return self._pgp.generateKeys({
        emailAddress: self._account.emailAddress,
        realname: options.realname,
        keySize: self._account.asymKeySize,
        passphrase: options.passphrase
    }).then(function(keypair) {
        generatedKeypair = keypair;
        // import the new key pair into crypto module
        return self._pgp.importKeys({
            passphrase: options.passphrase,
            privateKeyArmored: generatedKeypair.privateKeyArmored,
            publicKeyArmored: generatedKeypair.publicKeyArmored
        });

    }).then(function() {
        // persist newly generated keypair
        return {
            publicKey: {
                _id: generatedKeypair.keyId,
                userId: self._account.emailAddress,
                publicKey: generatedKeypair.publicKeyArmored
            },
            privateKey: {
                _id: generatedKeypair.keyId,
                userId: self._account.emailAddress,
                encryptedKey: generatedKeypair.privateKeyArmored
            }
        };

    }).then(setPrivateKey);

    function handleExistingKeypair(keypair) {
        return new Promise(function(resolve) {
            var privKeyParams = self._pgp.getKeyParams(keypair.privateKey.encryptedKey);
            var pubKeyParams = self._pgp.getKeyParams(keypair.publicKey.publicKey);

            // check if key IDs match
            if (!keypair.privateKey._id || keypair.privateKey._id !== keypair.publicKey._id || keypair.privateKey._id !== privKeyParams._id || keypair.publicKey._id !== pubKeyParams._id) {
                throw new Error('Key IDs dont match!');
            }

            // check that key userIds contain email address of user account
            var matchingPrivUserId = _.findWhere(privKeyParams.userIds, {
                emailAddress: self._account.emailAddress
            });
            var matchingPubUserId = _.findWhere(pubKeyParams.userIds, {
                emailAddress: self._account.emailAddress
            });

            if (!matchingPrivUserId || !matchingPubUserId || keypair.privateKey.userId !== self._account.emailAddress || keypair.publicKey.userId !== self._account.emailAddress) {
                throw new Error('User IDs dont match!');
            }

            resolve();

        }).then(function() {
            // import existing key pair into crypto module
            return self._pgp.importKeys({
                passphrase: options.passphrase,
                privateKeyArmored: keypair.privateKey.encryptedKey,
                publicKeyArmored: keypair.publicKey.publicKey
            }).then(function() {
                return keypair;
            });

        }).then(setPrivateKey);
    }

    function setPrivateKey(keypair) {
        // set decrypted privateKey to pgpMailer
        self._pgpbuilder._privateKey = self._pgp._privateKey;
        return keypair;
    }
};

Gmail.prototype._initFolders = function() {
    var self = this;

    self._account.folders.forEach(function(folder) {
        folder.modseq = folder.modseq || 0;
        folder.count = folder.count || 0;
        folder.uids = folder.uids || []; // attach an empty uids array to the folder
        folder.uids.sort(function(a, b) {
            return a - b;
        });
        folder.messages = folder.messages || folder.uids.map(function(uid) {
            // fill the messages array with dummy messages, messages will be fetched later
            return {
                uid: uid
            };
        });
    });

    var inbox = _.findWhere(self._account.folders, {
        type: FOLDER_TYPE_INBOX
    });
    if (inbox && inbox.messages.length) {
        return self.getBody({
            folder: inbox,
            messages: inbox.messages.slice(-30)
        }).catch(self._dialog.error);
    }
};

Gmail.prototype.busy = function() {
    this._account.busy++;
};

Gmail.prototype.done = function() {
    if (this._account.busy > 0) {
        this._account.busy--;
    }
};


//
//
// Event Handlers
//
//


/**
 * This handler should be invoked when navigator.onLine === true. It will try to connect to
 * the gmail api. If the connection attempt was successful, it will
 * update the locally available folders with the newly received folder listing.
 */
Gmail.prototype.onConnect = function() {
    var self = this;

    if (!self.isOnline()) {
        // don't try to connect when navigator is offline
        return new Promise(function(resolve) {
            resolve();
        });
    }

    self._account.loggingIn = true;

    // get auth.oauthToken and auth.emailAddress
    return self._auth.getOAuthToken().then(function() {

    });
};

/**
 * This handler should be invoked when navigator.onLine === false.
 * It will discard the imap client and pgp mailer
 */
Gmail.prototype.onDisconnect = function() {
    // logout of gmail api
    // ignore error, because it's not problem if logout fails

    // discard clients
    this._account.online = false;

    return new Promise(function(resolve) {
        resolve(); // ASYNC ALL THE THINGS!!!
    });
};

/**
 * Check if the client is online and throw an error if this is not the case.
 */
Gmail.prototype.checkOnline = function() {
    if (!this._account.online) {
        var err = new Error('Client is currently offline!');
        err.code = 42;
        throw err;
    }
};


//
//
// External Heler Methods
//
//


/**
 * Check if the user agent is online.
 */
Gmail.prototype.isOnline = function() {
    return navigator.onLine;
};