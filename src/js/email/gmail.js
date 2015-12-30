'use strict';

var ngModule = angular.module('woEmail');
ngModule.service('email', Gmail);
module.exports = Gmail;

var config = require('../app-config').config;

//
//
// Constants
//
//

var FOLDER_DB_TYPE = 'folders';

// well known folders
var FOLDER_TYPE_INBOX = 'Inbox';
var FOLDER_TYPE_SENT = 'Sent';
var FOLDER_TYPE_DRAFTS = 'Drafts';
var FOLDER_TYPE_TRASH = 'Trash';
var FOLDER_TYPE_FLAGGED = 'Flagged';

var MSG_PART_ATTR_CONTENT = 'content';
var MSG_PART_TYPE_ATTACHMENT = 'attachment';
var MSG_PART_TYPE_ENCRYPTED = 'encrypted';
var MSG_PART_TYPE_SIGNED = 'signed';
var MSG_PART_TYPE_TEXT = 'text';
var MSG_PART_TYPE_HTML = 'html';

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
function Gmail(gmailClient, keychain, pgp, accountStore, pgpbuilder, mailreader, dialog, appConfig, auth) {
    this._gmailClient = gmailClient;
    this._keychain = keychain;
    this._pgp = pgp;
    this._devicestorage = accountStore;
    this._pgpbuilder = pgpbuilder;
    this._mailreader = mailreader;
    this._dialog = dialog;
    this._appConfig = appConfig;
    this._auth = auth;
}


//
//
// Public API
//
//


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

/**
 * Opens a folder in the GmailClient and list messages the containing messages.
 * Please note that this is a no-op if you try to open the outbox, since it is not an Gmail folder
 * but a virtual folder that only exists on disk.
 *
 * @param {Object} options.folder The folder to be opened
 */
Gmail.prototype.openFolder = function(options) {
    var self = this,
        folder = options.folder;

    return new Promise(function(resolve) {
        self.checkOnline();
        resolve();

    }).then(function() {
        if (folder.path === config.outboxMailboxPath) {
            return;
        }

        return self._fetchMessages({
            folder: folder
        }).then(function(messages) {
            folder.messages = messages;
        });
    });
};

Gmail.prototype.deleteMessage = function( /*options*/ ) {};

Gmail.prototype.setFlags = function( /*options*/ ) {};

Gmail.prototype.moveMessage = function( /*options*/ ) {};

/**
 * Get a message's headers, body and body structure. In case of a text/plain body only
 *   one http roundtrip is required. In case of a PGP/MIME message, the content body part
 *   will be fetched automatically in a second http roundtrip, but no other attachments
 *   for example for cleartext messages. Those must be fetched using the getAttachment api.
 * @param  {Object} options.message     The message object
 */
Gmail.prototype.getBody = function(options) {
    var self = this,
        messages = options.messages;

    messages = messages.filter(function(message) {
        // the message either already has a body or is fetching it right now, so no need to become active here
        return !(message.loadingBody || typeof message.body !== 'undefined');
    });

    if (!messages.length) {
        return new Promise(function(resolve) {
            resolve();
        });
    }

    messages.forEach(function(message) {
        message.loadingBody = true;
    });

    self.busy();

    return new Promise(function(resolve) {
        resolve();

    }).then(function() {
        // fetch each message body
        var jobs = [];

        messages.forEach(function(message) {
            var job = fetchSingleBody(message);
            jobs.push(job);
        });

        return Promise.all(jobs);

    }).then(function() {
        done();

        if (options.notifyNew && messages.length) {
            // notify for incoming mail
            self.onIncomingMessage(messages);
        }

        return messages;
    }).catch(function(err) {
        done();
        throw err;
    });

    function fetchSingleBody(message) {
        return self._gmailClient.getMessage(message).then(function() {
            // automatically fetch the message content body part for PGP/MIME
            var encryptedBodyPart = _.findWhere(message.bodyParts, {
                type: 'encrypted'
            });
            var signedBodyPart = _.findWhere(message.bodyParts, {
                type: 'signed'
            });

            var pgpContentBodyPart = encryptedBodyPart || signedBodyPart;
            if (!pgpContentBodyPart || !pgpContentBodyPart.attachmentId) {
                // no body part to be fetched
                return;
            }

            return self._gmailClient.getAttachment({
                message: message,
                attachmentId: pgpContentBodyPart.attachmentId
            }).then(function() {
                // extract body
                return self._extractBody(message);
            });
        });
    }

    function done() {
        messages.forEach(function(message) {
            message.loadingBody = false;
        });
        self.done();
    }
};

Gmail.prototype._checkSignatures = function(message) {
    var self = this;
    return self._keychain.getReceiverPublicKey(message.from[0].address).then(function(senderPublicKey) {
        // get the receiver's public key to check the message signature
        var senderKey = senderPublicKey ? senderPublicKey.publicKey : undefined;
        if (message.clearSignedMessage) {
            return self._pgp.verifyClearSignedMessage(message.clearSignedMessage, senderKey);
        } else if (message.signedMessage && message.signature) {
            return self._pgp.verifySignedMessage(message.signedMessage, message.signature, senderKey);
        }
    });
};

Gmail.prototype.getAttachment = function( /*options*/ ) {};

/**
 * Decrypts a message and replaces sets the decrypted plaintext as the message's body, html, or attachment, respectively.
 * The first encrypted body part's ciphertext (in the content property) will be decrypted.
 *
 * @param {Object} options.message The message
 * @return {Promise}
 * @resolve {Object} message    The decrypted message object
 */
Gmail.prototype.decryptBody = function(options) {
    var self = this,
        message = options.message,
        encryptedNode;

    // the message is decrypting has no body, is not encrypted or has already been decrypted
    if (!message.bodyParts || message.decryptingBody || !message.body || !message.encrypted || message.decrypted) {
        return new Promise(function(resolve) {
            resolve(message);
        });
    }

    message.decryptingBody = true;
    self.busy();

    // get the sender's public key for signature checking
    return self._keychain.getReceiverPublicKey(message.from[0].address).then(function(senderPublicKey) {
        // get the receiver's public key to check the message signature
        encryptedNode = filterBodyParts(message.bodyParts, MSG_PART_TYPE_ENCRYPTED)[0];
        var senderKey = senderPublicKey ? senderPublicKey.publicKey : undefined;
        return self._pgp.decrypt(encryptedNode.content, senderKey);

    }).then(function(pt) {
        if (!pt.decrypted) {
            throw new Error('Error decrypting message.');
        }

        // if the decryption worked and signatures are present, everything's fine.
        // no error is thrown if signatures are not present
        message.signed = typeof pt.signaturesValid !== 'undefined';
        message.signaturesValid = pt.signaturesValid;

        // if the encrypted node contains pgp/inline, we must not parse it
        // with the mailreader as it is not well-formed MIME
        if (encryptedNode._isPgpInline) {
            message.body = pt.decrypted;
            message.decrypted = true;
            return;
        }

        // the mailparser works on the .raw property
        encryptedNode.raw = pt.decrypted;
        // parse the decrypted raw content in the mailparser
        return self._parse({
            bodyParts: [encryptedNode]
        }).then(handleRaw);

    }).then(function() {
        self.done(); // stop the spinner
        message.decryptingBody = false;
        return message;

    }).catch(function(err) {
        self.done(); // stop the spinner
        message.decryptingBody = false;
        message.body = err.message; // display error msg in body
        message.decrypted = true;
        return message;
    });

    function handleRaw(root) {
        if (message.signed) {
            // message had a signature in the ciphertext, so we're done here
            return setBody(root);
        }

        // message had no signature in the ciphertext, so there's a little extra effort to be done here
        // is there a signed MIME node?
        var signedRoot = filterBodyParts(root, MSG_PART_TYPE_SIGNED)[0];
        if (!signedRoot) {
            // no signed MIME node, obviously an unsigned PGP/MIME message
            return setBody(root);
        }

        // if there is something signed in here, we're only interested in the signed content
        message.signedMessage = signedRoot.signedMessage;
        message.signature = signedRoot.signature;
        root = signedRoot.content;

        // check the signatures for encrypted messages
        return self._checkSignatures(message).then(function(signaturesValid) {
            message.signed = typeof signaturesValid !== 'undefined';
            message.signaturesValid = signaturesValid;
            return setBody(root);
        });
    }

    function setBody(root) {
        // we have successfully interpreted the descrypted message,
        // so let's update the views on the message parts
        message.body = _.pluck(filterBodyParts(root, MSG_PART_TYPE_TEXT), MSG_PART_ATTR_CONTENT).join('\n');
        message.html = _.pluck(filterBodyParts(root, MSG_PART_TYPE_HTML), MSG_PART_ATTR_CONTENT).join('\n');
        message.attachments = _.reject(filterBodyParts(root, MSG_PART_TYPE_ATTACHMENT), function(attmt) {
            // remove the pgp-signature from the attachments
            return attmt.mimeType === "application/pgp-signature";
        });
        inlineExternalImages(message);
        message.decrypted = true;
        return message;
    }
};

/**
 * Encrypted (if necessary) and sends a message with a predefined clear text greeting.
 *
 * @param {Object} options.email The message to be sent
 */
Gmail.prototype.sendEncrypted = function(options) {
    // mime encode, sign, encrypt and send email via smtp
    return this._sendGeneric({
        encrypt: true,
        mail: options.email,
        publicKeysArmored: options.email.publicKeysArmored
    });
};

/**
 * Sends a signed message in the plain
 *
 * @param {Object} options.email The message to be sent
 */
Gmail.prototype.sendPlaintext = function(options) {
    // mime encode, sign and send email via smtp
    return this._sendGeneric({
        mail: options.email
    });
};

/**
 * This funtion wraps error handling for sending via pgpMailer and uploading to imap.
 * @param {Object} options.email The message to be sent
 */
Gmail.prototype._sendGeneric = function(options) {
    var self = this;
    self.busy();
    return new Promise(function(resolve) {
        self.checkOnline();
        resolve();

    }).then(function() {
        // decide wether to encrypt+sign or just sign the message
        if (options.encrypt) {
            if (!options.mail.encrypted) {
                return self._pgpbuilder.encrypt(options).then(function() {
                    return self._pgpbuilder.buildEncrypted(options);
                });
            }
            return self._pgpbuilder.buildEncrypted(options);
        }
        return self._pgpbuilder.buildSigned(options);

    }).then(function(msg) {
        // send raw rfc822 message via gmail api
        return self._gmailClient.send({
            raw: msg.rfcMessage
        });

    }).then(function(response) {
        self.done(); // stop the spinner
        return response;
    }).catch(function(err) {
        self.done(); // stop the spinner
        throw err;
    });
};

/**
 * Signs and encrypts a message
 *
 * @param {Object} options.email The message to be encrypted
 * @param {Function} callback(message) Invoked when the message was encrypted, or an error occurred
 */
Gmail.prototype.encrypt = function(options) {
    var self = this;
    self.busy();
    return self._pgpbuilder.encrypt(options).then(function(message) {
        self.done();
        return message;
    });
};

Gmail.prototype.refreshOutbox = function() {};


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
    return self._gmailClient.login().then(function() {
        // client is logged in
        self._account.loggingIn = false;
        // init folders
        return self._updateFolders();

    }).then(function() {
        // set client to online after updating folders
        self._account.online = true;

    }).then(function() {
        // by default, select the inbox (if there is one) after connecting.
        var inbox = _.findWhere(self._account.folders, {
            type: FOLDER_TYPE_INBOX
        });

        if (!inbox) {
            // if there is no inbox, that's ok, too
            return;
        }

        return self.openFolder({
            folder: inbox
        });
    });
};

/**
 * This handler should be invoked when navigator.onLine === false.
 * It will discard the imap client and pgp mailer
 */
Gmail.prototype.onDisconnect = function() {
    // logout of gmail-client
    // ignore error, because it's not problem if logout fails
    this._account.online = false;
    return this._gmailClient.logout();
};

Gmail.prototype._onSyncUpdate = function( /*options*/ ) {};


//
//
// Internal API
//
//


/**
 * Updates the folder information from Gmail (if we're online). Adds/removes folders in account.folders,
 * if we added/removed folder in Gmail. If we have an uninitialized folder that lacks folder.messages,
 * all the locally available messages are loaded from memory.
 */
Gmail.prototype._updateFolders = function() {
    var self = this;

    self.busy(); // start the spinner

    return self._gmailClient.listFolders().then(function(gFolders) {
        var foldersChanged = false; // indicates if we need to persist anything to disk

        // initialize the folders to something meaningful if that hasn't already happened
        self._account.folders = self._account.folders || [];

        // set folder types
        setFolderType('INBOX', FOLDER_TYPE_INBOX);
        setFolderType('SENT', FOLDER_TYPE_SENT);
        setFolderType('DRAFT', FOLDER_TYPE_DRAFTS);
        setFolderType('STARRED', FOLDER_TYPE_FLAGGED);
        setFolderType('TRASH', FOLDER_TYPE_TRASH);

        function setFolderType(path, type) {
            var folder = _.findWhere(gFolders, {
                path: path
            });
            if (folder) {
                folder.type = type;
            }
        }

        // smuggle the outbox into the well known folders, which is obv not present on gmail
        gFolders.push({
            name: config.outboxMailboxName,
            type: config.outboxMailboxType,
            path: config.outboxMailboxPath
        });

        // find out all the gmail paths that are new/removed
        var gmailFolderPaths = _.pluck(gFolders, 'path'),
            localFolderPaths = _.pluck(self._account.folders, 'path'),
            newFolderPaths = _.difference(gmailFolderPaths, localFolderPaths),
            removedFolderPaths = _.difference(localFolderPaths, gmailFolderPaths);

        // folders need updating if there are new/removed folders
        foldersChanged = !!newFolderPaths.length || !!removedFolderPaths.length;

        // remove all the remotely deleted folders
        removedFolderPaths.forEach(function(removedPath) {
            self._account.folders.splice(self._account.folders.indexOf(_.findWhere(self._account.folders, {
                path: removedPath
            })), 1);
        });

        // add all the new gmail folders
        newFolderPaths.forEach(function(newPath) {
            self._account.folders.push(_.findWhere(gFolders, {
                path: newPath
            }));
        });

        //
        // by now, all the folders are up to date. now we need to find all the well known folders
        //

        // check for the well known folders to be displayed in the uppermost ui part
        // in that order
        var wellknownTypes = [
            FOLDER_TYPE_INBOX,
            FOLDER_TYPE_SENT,
            config.outboxMailboxType,
            FOLDER_TYPE_DRAFTS,
            FOLDER_TYPE_TRASH,
            FOLDER_TYPE_FLAGGED
        ];

        // make sure the well known folders are detected
        wellknownTypes.forEach(function(mbxType) {
            // check if there is a well known folder of this type
            var wellknownFolder = _.findWhere(self._account.folders, {
                type: mbxType,
                wellknown: true
            });

            if (wellknownFolder) {
                // well known folder found, no need to find a replacement
                return;
            }

            // we have no folder of the respective type marked as wellknown, so find the
            // next best folder of the respective type and flag it as wellknown so that
            // we can display it properly
            wellknownFolder = _.findWhere(self._account.folders, {
                type: mbxType
            });

            if (!wellknownFolder) {
                // no folder of that type, to mark as well known, nothing to do here
                return;
            }

            wellknownFolder.wellknown = true;
            foldersChanged = true;
        });

        // order folders
        self._account.folders.sort(function(a, b) {
            if (a.wellknown && b.wellknown) {
                // well known folders should be ordered like the types in the wellknownTypes array
                return wellknownTypes.indexOf(a.type) - wellknownTypes.indexOf(b.type);
            } else if (a.wellknown && !b.wellknown) {
                // wellknown folders should always appear BEFORE the other folders
                return -1;
            } else if (!a.wellknown && b.wellknown) {
                // non-wellknown folders should always appear AFTER wellknown folders
                return 1;
            } else {
                // non-wellknown folders should be sorted case-insensitive
                return a.path.toLowerCase().localeCompare(b.path.toLowerCase());
            }
        });

        // if folders have not changed, can fill them with messages directly
        if (foldersChanged) {
            return self._localStoreFolders();
        }

    }).then(function() {
        return self._initFolders();

    }).then(function() {
        self.done(); // stop the spinner

    }).catch(function(err) {
        self.done(); // stop the spinner
        throw err;
    });
};

Gmail.prototype._initFolders = function() {
    var self = this;

    self._account.folders.forEach(function(folder) {
        folder.count = folder.count || 0;
    });
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
// Gmail Api
//
//


/**
 * Fetch messages from gmail api
 */
Gmail.prototype._fetchMessages = function(options) {
    var self = this,
        folder = options.folder;

    return new Promise(function(resolve) {
        self.checkOnline();
        resolve();

    }).then(function() {
        return self._gmailClient.listMessageIds(folder);
    });
};


//
//
// Local Storage API
//
//


/**
 * persist encrypted list in device storage
 * note: the folders in the ui also include the messages array, so let's create a clean array here
 */
Gmail.prototype._localStoreFolders = function() {
    var folders = this._account.folders.map(function(folder) {
        return {
            name: folder.name,
            path: folder.path,
            type: folder.type,
            wellknown: !!folder.wellknown
        };
    });

    return this._devicestorage.storeList([folders], FOLDER_DB_TYPE);
};

/**
 * List the locally available items form the indexed db stored under "email_[FOLDER PATH]_[MESSAGE UID]" (if a message was provided),
 * or "email_[FOLDER PATH]", respectively
 *
 * @param {Object} options.folder The folder for which to list the content
 * @param {Object} options.id A specific id to look up locally in the folder
 */
Gmail.prototype._localListMessages = function(options) {
    var query;

    var needsExactMatch = typeof options.exactmatch === 'undefined' ? true : options.exactmatch;

    if (Array.isArray(options.id)) {
        // batch list
        query = options.id.map(function(id) {
            return 'email_' + options.folder.path + (id ? '_' + id : '');
        });
    } else {
        // single list
        query = 'email_' + options.folder.path + (options.id ? '_' + options.id : '');
    }

    return this._devicestorage.listItems(query, needsExactMatch);
};

/**
 * Stores a bunch of messages to the indexed db. The messages are stored under "email_[FOLDER PATH]_[MESSAGE UID]"
 *
 * @param {Object} options.folder The folder for which to list the content
 * @param {Array} options.messages The messages to store
 */
Gmail.prototype._localStoreMessages = function(options) {
    var dbType = 'email_' + options.folder.path;
    return this._devicestorage.storeList(options.emails, dbType);
};

/**
 * Stores a bunch of messages to the indexed db. The messages are stored under "email_[FOLDER PATH]_[MESSAGE UID]"
 *
 * @param {Object} options.folder The folder for which to list the content
 * @param {Array} options.messages The messages to store
 */
Gmail.prototype._localDeleteMessage = function(options) {
    var path = options.folder.path,
        id = options.id;

    if (!path || !id) {
        return new Promise(function() {
            throw new Error('Invalid options!');
        });
    }

    var dbType = 'email_' + path + '_' + id;
    return this._devicestorage.removeList(dbType);
};


//
//
// Internal Helper Methods
//
//


/**
 * Helper method that extracts a message body from the body parts
 *
 * @param {Object} message DTO
 */
Gmail.prototype._extractBody = function(message) {
    var self = this;

    return new Promise(function(resolve) {
        resolve();

    }).then(function() {
        // extract the content
        if (message.encrypted) {
            // show the encrypted message
            message.body = filterBodyParts(message.bodyParts, MSG_PART_TYPE_ENCRYPTED)[0].content;
            return;
        }

        var root = message.bodyParts;

        if (message.signed) {
            // PGP/MIME signed
            var signedRoot = filterBodyParts(message.bodyParts, MSG_PART_TYPE_SIGNED)[0]; // in case of a signed message, you only want to show the signed content and ignore the rest
            message.signedMessage = signedRoot.signedMessage;
            message.signature = signedRoot.signature;
            root = signedRoot.content;
        }

        var body = _.pluck(filterBodyParts(root, MSG_PART_TYPE_TEXT), MSG_PART_ATTR_CONTENT).join('\n');

        // if the message is plain text and contains pgp/inline, we are only interested in the encrypted content, the rest (corporate mail footer, attachments, etc.) is discarded.
        var pgpInlineMatch = /^-{5}BEGIN PGP MESSAGE-{5}[\s\S]*-{5}END PGP MESSAGE-{5}$/im.exec(body);
        if (pgpInlineMatch) {
            message.body = pgpInlineMatch[0]; // show the plain text content
            message.encrypted = true; // signal the ui that we're handling encrypted content

            // replace the bodyParts info with an artificial bodyPart of type "encrypted"
            message.bodyParts = [{
                type: MSG_PART_TYPE_ENCRYPTED,
                content: pgpInlineMatch[0],
                _isPgpInline: true // used internally to avoid trying to parse non-MIME text with the mailreader
            }];
            return;
        }

        // any content before/after the PGP block will be discarded, untrusted attachments and html is ignored
        var clearSignedMatch = /^-{5}BEGIN PGP SIGNED MESSAGE-{5}\nHash:[ ][^\n]+\n(?:[A-Za-z]+:[ ][^\n]+\n)*\n([\s\S]*?)\n-{5}BEGIN PGP SIGNATURE-{5}[\S\s]*-{5}END PGP SIGNATURE-{5}$/im.exec(body);
        if (clearSignedMatch) {
            // PGP/INLINE signed
            message.signed = true;
            message.clearSignedMessage = clearSignedMatch[0];
            body = (clearSignedMatch[1] || '').replace(/^- /gm, ''); // remove dash escaping https://tools.ietf.org/html/rfc4880#section-7.1
        }

        if (!message.signed) {
            // message is not signed, so we're done here
            return setBody(body, root);
        }

        // check the signatures for signed messages
        return self._checkSignatures(message).then(function(signaturesValid) {
            message.signed = typeof signaturesValid !== 'undefined';
            message.signaturesValid = signaturesValid;
            setBody(body, root);
        });
    });

    function setBody(body, root) {
        message.body = body;
        if (!message.clearSignedMessage) {
            message.attachments = filterBodyParts(root, MSG_PART_TYPE_ATTACHMENT);
            message.html = _.pluck(filterBodyParts(root, MSG_PART_TYPE_HTML), MSG_PART_ATTR_CONTENT).join('\n');
            inlineExternalImages(message);
        }
    }
};

/**
 * Parse an email using the mail reader
 * @param  {Object} options The option to be passed to the mailreader
 * @return {Promise}
 */
Gmail.prototype._parse = function(options) {
    var self = this;
    return new Promise(function(resolve, reject) {
        self._mailreader.parse(options, function(err, root) {
            if (err) {
                reject(err);
            } else {
                resolve(root);
            }
        });
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


//
//
// Helper Functions
//
//


/**
 * Helper function that recursively traverses the body parts tree. Looks for bodyParts that match the provided type and aggregates them
 *
 * @param {Array} bodyParts The bodyParts array
 * @param {String} type The type to look up
 * @param {undefined} result Leave undefined, only used for recursion
 */
function filterBodyParts(bodyParts, type, result) {
    result = result || [];
    bodyParts.forEach(function(part) {
        if (part.type === type) {
            result.push(part);
        } else if (Array.isArray(part.content)) {
            filterBodyParts(part.content, type, result);
        }
    });
    return result;
}

/**
 * Helper function that looks through the HTML content for <img src="cid:..."> and
 * inlines the images linked internally. Manipulates message.html as a side-effect.
 * If no attachment matching the internal reference is found, or constructing a data
 * uri fails, just remove the source.
 *
 * @param {Object} message DTO
 */
function inlineExternalImages(message) {
    message.html = message.html.replace(/(<img[^>]+\bsrc=['"])cid:([^'">]+)(['"])/ig, function(match, prefix, src, suffix) {
        var localSource = '',
            payload = '';

        var internalReference = _.findWhere(message.attachments, {
            id: src
        });

        if (internalReference) {
            for (var i = 0; i < internalReference.content.byteLength; i++) {
                payload += String.fromCharCode(internalReference.content[i]);
            }

            try {
                localSource = 'data:application/octet-stream;base64,' + btoa(payload); // try to replace the source
            } catch (e) {}
        }

        return prefix + localSource + suffix;
    });
}