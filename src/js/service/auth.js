'use strict';

const ngModule = angular.module('woServices');
ngModule.service('auth', Auth);
export default Auth;

const APP_CONFIG_DB_NAME = 'app-config';
const EMAIL_ADDR_DB_KEY = 'emailaddress';
const REALNAME_DB_KEY = 'realname';
const OAUTH_TOKEN_DB_KEY = 'oauthtoken';

/**
 * The Auth BO handles the rough edges and gaps between authentication
 * and credentials storage
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
    if (this._initialized) {
        return new Promise(resolve => resolve());
    }

    // init app config database and load credentials from disk
    return this._appConfigStore.init(APP_CONFIG_DB_NAME).then(() => this._loadCredentials()).then(() => {
        this._initialized = true;
    });
};

/**
 * Check if the service has been initialized.
 */
Auth.prototype.isInitialized = function() {
    return this._initialized;
};

Auth.prototype.storeCredentials = function() {
    if (!this._credentialsDirty) {
        // nothing to store if credentials not dirty
        return new Promise(resolve => resolve());
    }

    // persist the config
    const storeEmailAddress = this._appConfigStore.storeList([this.emailAddress], EMAIL_ADDR_DB_KEY);
    const storeRealname = this._appConfigStore.storeList([this.realname], REALNAME_DB_KEY);
    const storeOAuthToken = this._appConfigStore.storeList([this.oauthToken], OAUTH_TOKEN_DB_KEY);

    return Promise.all([
        storeEmailAddress,
        storeRealname,
        storeOAuthToken
    ]).then(() => {
        this._credentialsDirty = false;
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
Auth.prototype.getOAuthCredentials = function(options = {}) {
    // make sure we've loaded cached credentials from disk
    return this._loadCredentials().then(() => {
        // if a stored token exists, check if it's still valid
        if (this.oauthToken) {
            return this._queryEmailAddress();
        }

        // set login hint if email address is known
        options.loginHint = this.emailAddress;
        // if no oauth token exists fetch a fresh one
        return this._oauth.getOAuthToken(options).then(oauthToken => {
            this.oauthToken = oauthToken;
        });

    }).then(() => {
        // at this point we can be fairly certain that we have a valid oauth token

        // shortcut if the email address is already known
        if (this.emailAddress) {
            return;
        }

        // query the email address
        return this._queryEmailAddress();

    }).then(() => {
        this._credentialsDirty = true;

        return {
            emailAddress: this.emailAddress,
            realname: this.realname,
            oauthToken: this.oauthToken
        };
    });
};

/**
 * Logout of the app by clearing the app config store and in memory credentials
 */
Auth.prototype.logout = function() {
    // clear app config db
    return this._appConfigStore.clear().then(() => {
        // clear in memory cache
        this.emailAddress = undefined;
        this.realname = undefined;
        this.oauthToken = undefined;
        this._oauth.flushToken();
        this._loaded = undefined;
        this._initialized = undefined;
        this._credentialsDirty = undefined;
    });
};


//
//
// Internal helper functions
//
//


/**
 * Queries for an email address and flushes the oauth
 * token in case of failure
 */
Auth.prototype._queryEmailAddress = function() {
    return this._oauth.queryEmailAddress(this.oauthToken).then(info => {
        this.emailAddress = info.emailAddress;
        this.realname = info.realname;

    }).catch(err => {
        if (err.code === 401) {
            // oauth token has probably expired
            return this.flushOAuthToken().then(() => {
                throw err;
            });
        }
        throw err;
    });
};

/**
 * Loads email address, password, ... from disk and sets them on `this`
 */
Auth.prototype._loadCredentials = function() {
    if (this._loaded) {
        return new Promise(resolve => resolve());
    }

    const loadFromDB = key => this._appConfigStore.listItems(key).then(cachedItems => cachedItems && cachedItems[0]);

    return loadFromDB(REALNAME_DB_KEY).then(realname => {
        this.realname = realname;
        return loadFromDB(EMAIL_ADDR_DB_KEY);

    }).then(emailAddress => {
        this.emailAddress = emailAddress;
        return loadFromDB(OAUTH_TOKEN_DB_KEY);

    }).then(oauthToken => {
        this.oauthToken = oauthToken;
        this._loaded = true;
    });
};