'use strict';

import cryptoLib from 'crypto-lib';
const util = cryptoLib.util;

const ngModule = angular.module('woServices');
ngModule.service('privateKey', PrivateKey);
export default PrivateKey;

const IMAP_KEYS_FOLDER = 'openpgp_keys';
const MIME_TYPE = 'application/x.encrypted-pgp-key';
const MSG_PART_TYPE_ATTACHMENT = 'attachment';

function PrivateKey(auth, mailbuild, mailreader, appConfig, pgp, crypto, axe, gmailClient) {
    this._auth = auth;
    this._Mailbuild = mailbuild;
    this._mailreader = mailreader;
    this._appConfig = appConfig;
    this._pgp = pgp;
    this._crypto = crypto;
    this._axe = axe;
    this._gmailClient = gmailClient;
}

/**
 * Configure the local imap client used for key-sync with credentials from the auth module.
 */
PrivateKey.prototype.init = function() {
    // make sure we have a valid oauth token
    return this._gmailClient.login();
};

/**
 * Cleanup by logging out of the imap client.
 */
PrivateKey.prototype.destroy = function() {
    // logout not required for oauth session
    return new Promise(function(resolve) {
        resolve();
    });
};

/**
 * Encrypt and upload the private PGP key to the server.
 * @param  {String}   code     The randomly generated or self selected code used to derive the key for the encryption of the private PGP key
 */
PrivateKey.prototype.encrypt = function(code) {
    var self = this,
        config = self._appConfig.config,
        keySize = config.symKeySize,
        encryptionKey, salt, iv, privkeyId;

    if (!code) {
        return new Promise(function() {
            throw new Error('Incomplete arguments!');
        });
    }

    // generate random salt and iv
    salt = util.random(keySize);
    iv = util.random(config.symIvSize);

    // derive key from the code using PBKDF2
    return self._crypto.deriveKey(code, salt, keySize).then(function(key) {
        encryptionKey = key;

        // get private key from local storage
        return self._pgp.exportKeys();
    }).then(function(keypair) {
        privkeyId = keypair.keyId;

        // encrypt the private key with the derived key
        return self._crypto.encrypt(keypair.privateKeyArmored, encryptionKey, iv);

    }).then(function(ct) {
        return {
            _id: privkeyId,
            encryptedPrivateKey: ct,
            salt: salt,
            iv: iv
        };
    });
};

/**
 * Upload the encrypted private PGP key.
 * @param  {String}   options._id                   The hex encoded capital 16 char key id
 * @param  {String}   options.userId                The user's email address
 * @param  {String}   options.encryptedPrivateKey   The base64 encoded encrypted private PGP key
 */
PrivateKey.prototype.upload = function(options) {
    var self = this,
        path;

    return new Promise(function(resolve) {
        if (!options._id || !options.userId || !options.encryptedPrivateKey || !options.salt || !options.iv) {
            throw new Error('Incomplete arguments for key upload!');
        }
        resolve();

    }).then(function() {

        // Some servers (Exchange, Cyrus) error when creating an existing IMAP mailbox instead of
        // responding with ALREADYEXISTS. Hence we search for the folder before uploading.

        self._axe.debug('Searching imap folder for key upload...');

        return self._getFolder().then(function(fullPath) {
            path = fullPath;
        }).catch(function() {

            // create imap folder
            self._axe.debug('Folder not found, creating imap folder.');
            return self._gmailClient.createFolder({
                name: IMAP_KEYS_FOLDER,
                hidden: true
            }).then(function(folder) {
                path = folder.path;
                self._axe.debug('Successfully created imap folder ' + path);
            }).catch(function(err) {
                var prettyErr = new Error('Creating imap folder ' + IMAP_KEYS_FOLDER + ' failed: ' + err.message);
                self._axe.error(prettyErr);
                throw prettyErr;
            });
        });

    }).then(createMessage).then(function(rawMessage) {
        // upload the to the folder
        self._axe.debug('Uploading key...');
        return self._gmailClient.insertMessage({
            path: path,
            raw: rawMessage
        });
    });

    function createMessage() {
        var encryptedKeyBuf = util.binStr2Uint8Arr(util.base642Str(options.encryptedPrivateKey));
        var saltBuf = util.binStr2Uint8Arr(util.base642Str(options.salt));
        var ivBuf = util.binStr2Uint8Arr(util.base642Str(options.iv));

        // allocate payload buffer for sync
        var payloadBuf = new Uint8Array(1 + saltBuf.length + ivBuf.length + encryptedKeyBuf.length);
        var offset = 0;
        // set version byte
        payloadBuf[offset] = 0x01; // version 1 of the key-sync protocol
        offset++;
        // copy salt bytes
        payloadBuf.set(saltBuf, offset);
        offset += saltBuf.length;
        // copy iv bytes
        payloadBuf.set(ivBuf, offset);
        offset += ivBuf.length;
        // copy encrypted key bytes
        payloadBuf.set(encryptedKeyBuf, offset);

        // create MIME tree
        var rootNode = options.rootNode || new self._Mailbuild();
        rootNode.setHeader({
            subject: options._id,
            from: options.userId,
            to: options.userId,
            'content-type': MIME_TYPE + '; charset=us-ascii',
            'content-transfer-encoding': 'base64'
        });
        rootNode.setContent(payloadBuf);

        return rootNode.build();
    }
};

/**
 * Check if any private key is stored in IMAP.
 */
PrivateKey.prototype.isSynced = function() {
    var self = this;

    return self._getFolder().then(function(path) {
        return self._fetchMessage({
            path: path
        });
    }).then(function(msg) {
        return !!msg;
    }).catch(function() {
        return false;
    });
};

/**
 * Verify the download request for the private PGP key.
 * @return {Object} {_id:[hex encoded capital 16 char key id], encryptedPrivateKey:[base64 encoded], encryptedUserId: [base64 encoded]}
 */
PrivateKey.prototype.download = function() {
    var self = this,
        path, message;

    return self._getFolder().then(function(fullPath) {
        path = fullPath;
        return self._fetchMessage({
            path: path
        }).then(function(msg) {
            if (!msg) {
                throw new Error('Private key not synced!');
            }

            message = msg;
        });
    }).then(function() {
        // get the body for the message
        return self._gmailClient.getRawMessage(message);

    }).then(function() {
        // parse the message
        return self._parse(message);

    }).then(function(root) {
        var payloadBuf = filterBodyParts(root, MSG_PART_TYPE_ATTACHMENT)[0].content;
        var offset = 0;
        var SALT_LEN = 32;
        var IV_LEN = 12;

        // check version
        var version = payloadBuf[offset];
        offset++;
        if (version !== 1) {
            throw new Error('Unsupported key sync protocol version!');
        }
        // salt
        var saltBuf = payloadBuf.subarray(offset, offset + SALT_LEN);
        offset += SALT_LEN;
        // iv
        var ivBuf = payloadBuf.subarray(offset, offset + IV_LEN);
        offset += IV_LEN;
        // encrypted private key
        var encryptedKeyBuf = payloadBuf.subarray(offset, payloadBuf.length);

        return {
            encryptedPrivateKey: util.str2Base64(util.uint8Arr2BinStr(encryptedKeyBuf)),
            salt: util.str2Base64(util.uint8Arr2BinStr(saltBuf)),
            iv: util.str2Base64(util.uint8Arr2BinStr(ivBuf))
        };
    });
};

/**
 * This is called after the encrypted private key has successfully been downloaded and it's ready to be decrypted and stored in localstorage.
 * @param  {String}   options.code The randomly generated or self selected code used to derive the key for the decryption of the private PGP key
 * @param  {String}   options.encryptedPrivateKey The encrypted private PGP key
 * @param  {String}   options.salt The salt required to derive the code derived key
 * @param  {String}   options.iv The iv used to encrypt the private PGP key
 * @return {Object}   The user's keypair to be stored in the local keychain.
 */
PrivateKey.prototype.decrypt = function(options) {
    var self = this,
        config = self._appConfig.config,
        keySize = config.symKeySize;

    if (!options.code || !options.salt || !options.encryptedPrivateKey || !options.iv) {
        return new Promise(function() {
            throw new Error('Incomplete arguments!');
        });
    }

    // derive key from the code and the salt using PBKDF2
    return self._crypto.deriveKey(options.code, options.salt, keySize).then(function(derivedKey) {
        // decrypt the private key with the derived key
        return self._crypto.decrypt(options.encryptedPrivateKey, derivedKey, options.iv).catch(function() {
            throw new Error('Invalid backup code!');
        });

    }).then(function(privateKeyArmored) {
        // validate pgp key
        var keyParams, publicKeyArmored;
        try {
            keyParams = self._pgp.getKeyParams(privateKeyArmored);
            publicKeyArmored = self._pgp.extractPublicKey(privateKeyArmored);
        } catch (e) {
            throw new Error('Error parsing PGP key!');
        }

        return {
            privateKey: {
                _id: keyParams._id,
                userId: keyParams.userId,
                userIds: keyParams.userIds,
                encryptedKey: privateKeyArmored
            },
            publicKey: {
                _id: keyParams._id,
                userId: keyParams.userId,
                userIds: keyParams.userIds,
                publicKey: publicKeyArmored
            }
        };
    });
};

PrivateKey.prototype._getFolder = function() {
    var self = this;

    return self._gmailClient.listFolders().then(function(folders) {
        var keysFolder = _.findWhere(folders, {
            name: IMAP_KEYS_FOLDER
        });

        if (!keysFolder) {
            throw new Error('Folder ' + IMAP_KEYS_FOLDER + ' does not exist for key sync!');
        }

        return keysFolder.path;
    });
};

PrivateKey.prototype._fetchMessage = function(options) {
    var self = this;

    if (!options.path) {
        return new Promise(function() {
            throw new Error('Incomplete arguments!');
        });
    }

    // get the metadata for the message
    return self._gmailClient.listMessageIds({
        path: options.path
    }).then(function(messages) {
        if (!messages.length) {
            // message has been deleted in the meantime
            return;
        }

        var jobs = [];
        messages.forEach(function(message) {
            var job = self._gmailClient.getMessage(message);
            jobs.push(job);
        });

        return Promise.all(jobs).then(function() {
            return messages;
        });

    }).then(function(messages) {
        // get matching private key if multiple keys uloaded
        if (options.keyId) {
            return _.findWhere(messages, {
                subject: options.keyId
            });
        }

        // if no key id was specified return the first synced key
        return messages[0];

    }).catch(function(e) {
        throw new Error('Failed to retrieve PGP key message from IMAP! Reason: ' + e.message);
    });
};

PrivateKey.prototype._parse = function(options) {
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