'use strict';

var ngModule = angular.module('woServices');
ngModule.service('auth', Auth);
module.exports = Auth;

var APP_CONFIG_DB_NAME = 'app-config';
var EMAIL_ADDR_DB_KEY = 'emailaddress';
var REALNAME_DB_KEY = 'realname';
var OAUTH_TOKEN_DB_KEY = 'oauthtoken';

/**
 * The Auth BO handles the rough edges and gaps between user/password authentication
 * and OAuth via Chrome Identity API.
 * Typical usage:
 * var auth = new Auth(...);
 * auth.setCredentials(...); // during the account setup
 * auth.getCredentials(...); // called to gather all the information to connect to IMAP/SMTP,
 *                              username, password / oauth token, IMAP/SMTP server host names, ...
 */
function Auth(appConfigStore, oauth) {
    this._appConfigStore = appConfigStore;
    this._oauth = oauth;

    this._initialized = false;
}

/**
 * Initialize the service
 */
Auth.prototype.init = function() {
    var self = this;

    if (self._initialized) {
        return new Promise(function(resolve) {
            resolve();
        });
    }

    // init app config database
    return self._appConfigStore.init(APP_CONFIG_DB_NAME).then(function() {
        // load credentials from disk
        return self._loadCredentials();
    }).then(function() {
        self._initialized = true;
    });
};

/**
 * Check if the service has been initialized.
 */
Auth.prototype.isInitialized = function() {
    return this._initialized;
};

Auth.prototype.storeCredentials = function() {
    var self = this;

    if (!self.credentialsDirty) {
        // nothing to store if credentials not dirty
        return new Promise(function(resolve) {
            resolve();
        });
    }

    // persist the config
    var storeEmailAddress = self._appConfigStore.storeList([self.emailAddress], EMAIL_ADDR_DB_KEY);
    var storeRealname = self._appConfigStore.storeList([self.realname], REALNAME_DB_KEY);
    var storeOAuthToken = self._appConfigStore.storeList([self.oauthToken], OAUTH_TOKEN_DB_KEY);

    return Promise.all([
        storeEmailAddress,
        storeRealname,
        storeOAuthToken
    ]).then(function() {
        self.credentialsDirty = false;
    });
};

/**
 * Delete the locally cached oauth token.
 */
Auth.prototype.flushOAuthToken = function() {
    this.oauthToken = undefined;
    this._oauth.flushToken();

    // remove cached token from local storage
    return this._appConfigStore.removeList(OAUTH_TOKEN_DB_KEY);
};

/**
 * READ FIRST b/c usage of the oauth api is weird.
 * the chrome identity api will let you query an oauth token for an email account without knowing
 * the corresponding email address. also, android has multiple accounts whereas desktop chrome only
 * has one user logged in.
 * 1) try to read the email address from the configuration (see above)
 * 2) fetch the oauth token. if we already HAVE an email address at this point, we can spare
 *    popping up the account picker on android! if not, the account picker will pop up. this
 *    is android only, since the desktop chrome will query the user that is logged into chrome
 * 3) fetch the email address for the oauth token from the chrome identity api
 */
Auth.prototype.getOAuthCredentials = function(options) {
    var self = this;

    return new Promise(function(resolve) {
        resolve();
    }).then(function() {
        // make sure we've loaded cached credentials from disk
        return self._loadCredentials();

    }).then(function() {
        // if a stored token exists, check if it's still valid
        if (self.oauthToken) {
            return queryEmailAddress();
        }

        // set login hint if email address is known
        options = options || {};
        options.loginHint = self.emailAddress;
        // if no oauth token exists fetch a fresh one
        return self._oauth.getOAuthToken(options).then(function(oauthToken) {
            self.oauthToken = oauthToken;
        });

    }).then(function() {
        // at this point we can be fairly certain that we have a valid oauth token

        // shortcut if the email address is already known
        if (self.emailAddress) {
            return;
        }

        // query the email address
        return queryEmailAddress();

    }).then(function() {
        self.credentialsDirty = true;

        return {
            emailAddress: self.emailAddress,
            realname: self.realname,
            oauthToken: self.oauthToken
        };
    });

    function queryEmailAddress() {
        return self._oauth.queryEmailAddress(self.oauthToken).then(function(info) {
            self.emailAddress = info.emailAddress;
            self.realname = info.realname;

        }).catch(function(err) {
            if (err.code === 401) {
                // oauth token has probably expired
                return self.flushOAuthToken().then(function() {
                    throw err;
                });
            }
            throw err;
        });
    }
};

/**
 * Loads email address, password, ... from disk and sets them on `this`
 */
Auth.prototype._loadCredentials = function() {
    var self = this;

    if (self.loaded) {
        return new Promise(function(resolve) {
            resolve();
        });
    }

    return loadFromDB(REALNAME_DB_KEY).then(function(realname) {
        self.realname = realname;
        return loadFromDB(EMAIL_ADDR_DB_KEY);

    }).then(function(emailAddress) {
        self.emailAddress = emailAddress;
        return loadFromDB(OAUTH_TOKEN_DB_KEY);

    }).then(function(oauthToken) {
        self.oauthToken = oauthToken;
        self.loaded = true;
    });

    function loadFromDB(key) {
        return self._appConfigStore.listItems(key).then(function(cachedItems) {
            return cachedItems && cachedItems[0];
        });
    }
};

/**
 * Logout of the app by clearing the app config store and in memory credentials
 */
Auth.prototype.logout = function() {
    var self = this;

    // clear app config db
    return self._appConfigStore.clear().then(function() {
        // clear in memory cache
        self.emailAddress = undefined;
        self.realname = undefined;
        self.oauthToken = undefined;
        self._oauth.flushToken();
        self.loaded = undefined;
        self._initialized = undefined;
        self.credentialsDirty = undefined;
    });
};