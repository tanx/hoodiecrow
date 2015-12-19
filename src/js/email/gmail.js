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
        // set status to online
        self._account.loggingIn = false;
        self._account.online = true;
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


//
//
// Internal API
//
//



//
//
// Gmail Api
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

    // fetch list from the server
    return self._apiRequest({
        resource: 'labels'
    }).then(function(response) {
        var gmailLabels = response.labels;

        // initialize the folders to something meaningful if that hasn't already happened
        self._account.folders = self._account.folders || [];

        // map gmail labels to local folder model
        gmailLabels.forEach(function(label) {
            self._account.folders.push({
                name: label.name,
                path: label.id,
                messages: []
            });
        });

        // update unread count
        self._account.folders.forEach(updateUnreadCount);
    });
};

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

        return self._apiRequest({
            resource: 'messages',
            params: {
                labelIds: folder.path
            }
        });

    });
};

/**
 * Make an HTTP request to the Gmail REST api via the window.fetch function.
 * @param  {String} options.resource    The api resource e.g. 'messages'
 * @param  {String} options.method      (optional) The HTTP method to be used depending on the CRUD
 *                                      operation e.g. 'get' or 'post'. If not specified it defaults to 'get'.
 * @param  {Array} options.params       A list of query parameters e.g. [{name: 'value'}]
 * @param  {Object} options.payload     (optional) The request's payload for create/update operations
 * @return {Promise<Object>}            A promise containing the response's parsed JSON object
 */
Gmail.prototype._apiRequest = function(options) {
    var uri = 'https://www.googleapis.com/gmail/v1/users/';
    uri += encodeURIComponent(this._auth.emailAddress) + '/';
    uri += encodeURIComponent(options.resource);

    // append query parameters
    if (options.params) {
        var query = '?';
        for (var name in options.params) {
            query += encodeURIComponent(name) + '=' + encodeURIComponent(options.params[name]) + '&';
        }
        uri += query.slice(0, -1); // remove trailing &
    }

    return window.fetch(uri, {
        method: options.method ? options.method : 'get',
        headers: {
            'Accept': 'application/json',
            'Content-Type': 'application/json',
            'Authorization': 'Bearer ' + this._auth.oauthToken
        },
        body: options.payload ? JSON.stringify(options.payload) : undefined
    }).then(function(response) {
        if (response.status !== 200 && response.status !== 201) {
            throw response.json();
        }
        return response.json();
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
            modseq: folder.modseq,
            wellknown: !!folder.wellknown,
            uids: folder.uids
        };
    });

    return this._devicestorage.storeList([folders], FOLDER_DB_TYPE);
};

/**
 * List the locally available items form the indexed db stored under "email_[FOLDER PATH]_[MESSAGE UID]" (if a message was provided),
 * or "email_[FOLDER PATH]", respectively
 *
 * @param {Object} options.folder The folder for which to list the content
 * @param {Object} options.uid A specific uid to look up locally in the folder
 */
Gmail.prototype._localListMessages = function(options) {
    var query;

    var needsExactMatch = typeof options.exactmatch === 'undefined' ? true : options.exactmatch;

    if (Array.isArray(options.uid)) {
        // batch list
        query = options.uid.map(function(uid) {
            return 'email_' + options.folder.path + (uid ? '_' + uid : '');
        });
    } else {
        // single list
        query = 'email_' + options.folder.path + (options.uid ? '_' + options.uid : '');
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
        uid = options.uid,
        id = options.id;

    if (!path || !(uid || id)) {
        return new Promise(function() {
            throw new Error('Invalid options!');
        });
    }

    var dbType = 'email_' + path + '_' + (uid || id);
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
 * Updates a folder's unread count:
 * - For the outbox, that's the total number of messages (countAllMessages === true),
 * - For every other folder, it's the number of unread messages (countAllMessages === falsy)
 */
function updateUnreadCount(folder, countAllMessages) {
    folder.count = countAllMessages ? folder.messages.length : _.filter(folder.messages, function(msg) {
        return msg.unread;
    }).length;
}

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