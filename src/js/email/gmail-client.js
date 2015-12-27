'use strict';

var ngModule = angular.module('woEmail');
ngModule.service('gmailClient', GmailClient);
module.exports = GmailClient;

/**
 * This module wraps the REST based Google Mail api and provides a similar high-level
 * api as the Imap Client module
 */
function GmailClient(auth, base64url) {
    this._auth = auth;
    this._base64url = base64url;
    this._addressparser = require('wo-addressparser');
}

/**
 * This will login to Google Mail using an OAuth 2.0 authentication flow.
 * After successful login the OAuth token will be cached in local storage.
 */
GmailClient.prototype.login = function(options) {
    var self = this;
    // get auth.oauthToken and auth.emailAddress
    return self._auth.getOAuthCredentials(options).catch(function(err) {
        if (err.code === 401) {
            // oauth token probably expired ... fetch new token and retry
            return self._auth.getOAuthCredentials(options);
        }
        throw err;
    }).then(function() {
        // cache the oauth credentials in local DB
        return self._auth.storeCredentials();
    });
};

/**
 * This handler should be invoked when navigator.onLine === false.
 * It will discard the imap client and pgp mailer
 */
GmailClient.prototype.logout = function() {
    // delete locally cached oauth token
    return this._auth.flushOAuthToken();
};


//
//
// Send/Upload Message
//
//


/**
 * Sends an email message.
 * @param {String} options.raw  The raw RFC822 message payload to be sent.
 */
GmailClient.prototype.send = function(options) {
    return this._apiRequest({
        baseUri: 'https://www.googleapis.com/upload/gmail/v1/users/',
        resource: 'messages/send',
        method: 'post',
        type: 'message/rfc822',
        params: {
            uploadType: 'media'
        },
        payload: options.raw
    });
};

/**
 * Directly inserts a message into the user's mailbox similar to IMAP APPEND,
 *   bypassing most scanning and classification.
 * @param {String} options.raw      The raw RFC822 message payload to be sent
 * @param {String} options.path     The folder path to be uploaded to
 */
GmailClient.prototype.insertMessage = function(options) {
    var metadata = JSON.stringify({
        labelIds: [options.path]
    });

    var payload = '--foo_bar_baz\r\n' +
        'Content-Type: application/json; charset=UTF-8\r\n' +
        '\r\n' +
        metadata + '\r\n' +
        '\r\n' +
        '--foo_bar_baz\r\n' +
        'Content-Type: message/rfc822\r\n' +
        '\r\n' +
        options.raw + '\r\n' +
        '\r\n' +
        '--foo_bar_baz--';

    return this._apiRequest({
        baseUri: 'https://www.googleapis.com/upload/gmail/v1/users/',
        resource: 'messages',
        method: 'post',
        type: 'multipart/related; boundary="foo_bar_baz"',
        params: {
            uploadType: 'multipart'
        },
        payload: payload
    });
};


//
//
// List/Read Messages
//
//


/**
 * Get a list of message ids for a given folder (gmail label)
 * @param  {String} folder.path     The folder path
 * @return {Array}                  A list of message ids like so [{id}]
 */
GmailClient.prototype.listMessageIds = function(folder) {
    return this._apiRequest({
        resource: 'messages',
        params: {
            labelIds: folder.path,
            maxResults: 100
        }
    }).then(function(response) {
        return response.messages;
    });
};

/**
 * Get a message's headers and body structure. In case of a text/plain mimeType the
 *   message's body is fetched in the same http roundtrip.
 * @param  {Object} message     The message object to be enriched with headers and body structure
 */
GmailClient.prototype.getMessage = function(message) {
    var self = this;

    return self._apiRequest({
        resource: 'messages/' + message.id,
        params: {
            format: 'full'
        }
    }).then(function(gMsg) {
        // set message attributes
        message.uid = parseInt(gMsg.internalDate, 10);
        message.subject = getHeader(gMsg.payload, 'Subject') || '(no subject)';
        message.from = self._addressparser.parse(getHeader(gMsg.payload, 'From'));
        message.to = self._addressparser.parse(getHeader(gMsg.payload, 'To'));
        message.cc = self._addressparser.parse(getHeader(gMsg.payload, 'Cc'));
        message.bcc = self._addressparser.parse(getHeader(gMsg.payload, 'Bcc'));
        message.sentDate = getHeader(gMsg.payload, 'Date') ? new Date(getHeader(gMsg.payload, 'Date')) : new Date();
        message.body = gMsg.payload.body.data ? self._base64url.decode(gMsg.payload.body.data) : undefined;
        message.bodyParts = [];

        // TODO: add the rest of the attributes

        // replyTo: message.envelope['reply-to'] || [],
        // inReplyTo: (message.envelope['in-reply-to'] || '').replace(/[<>]/g, ''),
        // references: references ? references.split(/\s+/).map(function(reference) {
        //     return reference.replace(/[<>]/g, '');
        // }) : [],
        message.unread = false;
        message.flagged = false;
        message.answered = false;

        // walk the mime tree to get the message mime type and body structure
        walkMimeTree((gMsg.payload || {}), message);
        message.encrypted = message.bodyParts.filter(function(bodyPart) {
            return bodyPart.type === 'encrypted';
        }).length > 0;
        message.signed = message.bodyParts.filter(function(bodyPart) {
            return bodyPart.type === 'signed';
        }).length > 0;
    });
};

/**
 * Fetch a single attachment for a message
 * @param  {Obect}  options.message         The message object who's attachment is to be downloaded
 * @param  {String} options.attachmentId    The attachment's unique id provided by the gmail api
 * @return {Object}                         The message object enriched with the attachment body part
 */
GmailClient.prototype.getAttachment = function(options) {
    var self = this;
    return self._apiRequest({
        resource: 'messages/' + options.message.id + '/attachments/' + options.attachmentId
    }).then(function(attachment) {
        // add body part content to the message
        var bodyPart = _.findWhere(options.message.bodyParts, {
            attachmentId: options.attachmentId
        });
        // decode base64url encoded body part data
        bodyPart.content = self._base64url.decode(attachment.data);
        delete bodyPart.partNumber;
        delete bodyPart.attachmentId;
    });
};

/**
 * Get the entire RFC 2822 message.
 * @param  {Object} message     The message object to be enriched a raw bodypart
 */
GmailClient.prototype.getRawMessage = function(message) {
    var self = this;
    return self._apiRequest({
        resource: 'messages/' + message.id,
        params: {
            format: 'raw'
        }
    }).then(function(response) {
        message.bodyParts = [{
            raw: self._base64url.decode(response.raw)
        }];
    });
};


//
//
// Folders
//
//


/**
 * Fetch a list of the user's Gmail labels. The labels will be converted to the local
 *   folder model.
 * @return {Array<Object>}  A list of the user's folders
 */
GmailClient.prototype.listFolders = function() {
    return this._apiRequest({
        resource: 'labels'
    }).then(function(response) {
        // map gmail labels to local folder model
        return response.labels.map(function(label) {
            return {
                name: label.name,
                path: label.id,
                messages: []
            };
        });
    });
};

/**
 * Create a label/folder for the user.
 * @param  {String} options.name        The folder's display name
 * @param  {Boolean} options.hidden     If the folder should be hidden or display in the user's folder list
 */
GmailClient.prototype.createFolder = function(options) {
    return this._apiRequest({
        resource: 'labels',
        method: 'post',
        payload: {
            name: options.name,
            labelListVisibility: options.hidden ? 'labelHide' : 'labelShow',
            messageListVisibility: options.hidden ? 'hide' : 'show'
        }
    }).then(function(label) {
        return {
            name: label.name,
            path: label.id
        };
    });
};


//
//
// Internal Api
//
//


/**
 * Make an HTTP request to the Gmail REST api via the window.fetch function.
 * @param  {String} options.resource    The api resource e.g. 'messages'
 * @param  {String} options.baseUri     (optional) The base uri of the rest endpoint
 * @param  {String} options.method      (optional) The HTTP method to be used depending on the CRUD
 *                                      operation e.g. 'get' or 'post'. If not specified it defaults to 'get'.
 * @param  {String} options.type        (optional) The mime type of the payload. If not set defaults to
 *                                      'application/json'.
 * @param  {Array} options.params       A list of query parameters e.g. [{name: 'value'}]
 * @param  {Object} options.payload     (optional) The request's payload for create/update operations
 * @return {Promise<Object>}            A promise containing the response's parsed JSON object
 */
GmailClient.prototype._apiRequest = function(options) {
    var self = this;
    var uri = options.baseUri || 'https://www.googleapis.com/gmail/v1/users/';
    uri += encodeURIComponent(self._auth.emailAddress) + '/';
    uri += options.resource;

    // append query parameters
    if (options.params) {
        var query = '?';
        for (var name in options.params) {
            query += name + '=' + encodeURIComponent(options.params[name]) + '&';
        }
        uri += query.slice(0, -1); // remove trailing &
    }

    return window.fetch(uri, {
        method: options.method || 'get',
        headers: {
            'Accept': 'application/json',
            'Content-Type': options.type || 'application/json',
            'Authorization': 'Bearer ' + self._auth.oauthToken
        },
        body: (options.payload && !options.type) ? JSON.stringify(options.payload) : options.payload
    }).then(function(response) {
        if (response.status >= 200 && response.status <= 299) {
            // success ... parse response
            return response.json();

        } else if (response.status === 401) {
            // error ... the oauth token has probably expired
            return self._auth.flushOAuthToken().then(handleError);
        }

        return handleError();

        function handleError() {
            // error ... parse response and throw
            return response.json().then(function(res) {
                var err = new Error(res.error.message);
                err.code = response.status;
                err.errors = res.error.errors;
                throw err;
            });
        }
    });
};


//
//
// Helper functions
//
//


function getHeader(node, name) {
    var header = _.findWhere(node.headers, {
        name: name
    });
    return header ? header.value : undefined;
}

/*
 * Mime Tree Handling
 * ==================
 *
 * matchEncrypted, matchSigned, ... are matchers that are called on each node of the mimde tree
 * when it is being traversed in a DFS. if one of the matchers returns true, it indicates that it
 * matched respective mime node, hence there is no need to look any further down in the tree.
 *
 */

var mimeTreeMatchers = [matchEncrypted, matchSigned, matchAttachment, matchText, matchHtml];

/**
 * Helper function that walks the MIME tree in a dfs and calls the handlers
 * @param {Object} mimeNode The initial MIME node whose subtree should be traversed
 * @param {Object} message The initial root MIME node whose subtree should be traversed
 */
function walkMimeTree(mimeNode, message) {
    var i = mimeTreeMatchers.length;
    while (i--) {
        if (mimeTreeMatchers[i](mimeNode, message)) {
            return;
        }
    }

    if (mimeNode.parts) {
        mimeNode.parts.forEach(function(childNode) {
            walkMimeTree(childNode, message);
        });
    }
}

/**
 * Matches encrypted PGP/MIME nodes
 *
 * multipart/encrypted
 * |
 * |-- application/pgp-encrypted
 * |-- application/octet-stream <-- ciphertext
 */
function matchEncrypted(node, message) {
    var isEncrypted = /^multipart\/encrypted/i.test(node.mimeType) && node.parts && node.parts[1];
    if (!isEncrypted) {
        return false;
    }

    message.bodyParts.push({
        type: 'encrypted',
        partNumber: node.partId || '',
        attachmentId: isEncrypted.body.attachmentId // the gmail api attachment id
    });
    return true;
}

/**
 * Matches signed PGP/MIME nodes
 *
 * multipart/signed
 * |
 * |-- *** (signed mime sub-tree)
 * |-- application/pgp-signature
 */
function matchSigned(node, message) {
    var c = node.parts;

    var isSigned = /^multipart\/signed/i.test(node.mimeType) && c && c[0] && c[1] && /^application\/pgp-signature/i.test(c[1].mimeType);
    if (!isSigned) {
        return false;
    }

    message.bodyParts.push({
        type: 'signed',
        partNumber: node.partId || '',
    });
    return true;
}

/**
 * Matches non-attachment text/plain nodes
 */
function matchText(node, message) {
    var isText = (/^text\/plain/i.test(node.mimeType) && node.disposition !== 'attachment');
    if (!isText) {
        return false;
    }

    message.bodyParts.push({
        type: 'text',
        partNumber: node.partId || ''
    });
    return true;
}

/**
 * Matches non-attachment text/html nodes
 */
function matchHtml(node, message) {
    var isHtml = (/^text\/html/i.test(node.mimeType) && node.disposition !== 'attachment');
    if (!isHtml) {
        return false;
    }

    message.bodyParts.push({
        type: 'html',
        partNumber: node.partId || ''
    });
    return true;
}

/**
 * Matches non-attachment text/html nodes
 */
function matchAttachment(node, message) {
    var isAttachment = (/^text\//i.test(node.mimeType) && node.disposition) || (!/^text\//i.test(node.mimeType) && !/^multipart\//i.test(node.mimeType));
    if (!isAttachment) {
        return false;
    }

    var bodyPart = {
        type: 'attachment',
        partNumber: node.partId || '',
        mimeType: node.mimeType || 'application/octet-stream',
        id: node.id ? node.id.replace(/[<>]/g, '') : undefined
    };

    if (node.dispositionParameters && node.dispositionParameters.filename) {
        bodyPart.filename = node.dispositionParameters.filename;
    } else if (node.parameters && node.parameters.name) {
        bodyPart.filename = node.parameters.name;
    } else {
        bodyPart.filename = 'attachment';
    }

    message.bodyParts.push(bodyPart);
    return true;
}