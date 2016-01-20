'use strict';

import cryptoLib from 'crypto-lib';
const util = cryptoLib.util;

const ngModule = angular.module('woEmail');
ngModule.service('account', Account);
export default Account;

function Account(appConfig, auth, accountStore, email, outbox, keychain, updateHandler, dialog) {
    this._appConfig = appConfig;
    this._auth = auth;
    this._accountStore = accountStore;
    this._emailDao = email;
    this._outbox = outbox;
    this._keychain = keychain;
    this._updateHandler = updateHandler;
    this._dialog = dialog;
    this._accounts = []; // init accounts list
}

/**
 * Check if the account is already logged in.
 * @return {Boolean} if the account is logged in
 */
Account.prototype.isLoggedIn = function() {
    return (this._accounts.length > 0);
};

/**
 * Lists all of the current accounts connected to the app
 * @return {Array<Object>} The account objects containing folder and message objects
 */
Account.prototype.list = function() {
    return this._accounts;
};

/**
 * Fire up the database, retrieve the available keys for the user and initialize the email data access object
 */
Account.prototype.init = function(options) {
    // account information for the email dao
    const account = {
        realname: options.realname,
        emailAddress: options.emailAddress,
        asymKeySize: this._appConfig.config.asymKeySize
    };

    // Pre-Flight check: don't even start to initialize stuff if the email address is not valid
    if (!util.validateEmailAddress(options.emailAddress)) {
        return new Promise(() => {
            throw new Error('The user email address is invalid!');
        });
    }

    // Pre-Flight check: initialize and prepare user's local database
    return this._accountStore.init(options.emailAddress).then(() => {
        // Migrate the databases if necessary
        return this._updateHandler.update().catch(err => {
            throw new Error('Updating the internal database failed. Please reinstall the app! Reason: ' + err.message);
        });

        // retrieve keypair fom devicestorage/cloud, refresh public key if signup was incomplete before
    }).then(() => this._keychain.getUserKeyPair(options.emailAddress)).then(keys => {
        // this is either a first start on a new device, OR a subsequent start without completing the signup,
        // since we can't differenciate those cases here, do a public key refresh because it might be outdated
        if (keys && keys.publicKey && !keys.privateKey) {
            return this._keychain.refreshKeyForUserId({
                userId: options.emailAddress,
                overridePermission: true
            }).then(publicKey => ({
                publicKey: publicKey
            }));
        }
        // either signup was complete or no pubkey is available, so we're good here.
        return keys;

    }).then(keys => {
        // init the email data access object
        return this._emailDao.init({
            account: account
        }).then(() => {
            // Handle offline and online gracefully ... arm dom event
            window.addEventListener('online', this.onConnect.bind(this));
            window.addEventListener('offline', this.onDisconnect.bind(this));

            // add account object to the accounts array for the ng controllers
            this._accounts.push(account);

            return keys;
        });
    });
};

/**
 * Event that is called when the user agent goes online. This create new instances of the imap-client and pgp-mailer and connects to the mail server.
 */
Account.prototype.onConnect = function(callback) {
    if (!this._emailDao || !this._emailDao._account) {
        // prevent connection infinite loop
        return;
    }

    this._emailDao.onConnect().then(callback).catch(callback);
};

/**
 * Event handler that is called when the user agent goes offline.
 */
Account.prototype.onDisconnect = function() {
    return this._emailDao.onDisconnect();
};

/**
 * Logout of an email account. Log the current user out by clear the app config store and deleting instances of imap-client and pgp-mailer.
 */
Account.prototype.logout = function() {
    // clear app config store
    return this._auth.logout().then(() => this._accountStore.clear()) // clear the account DB, including keys and messages
        .then(() => this._emailDao.onDisconnect()) // disconnect the gmail-client
        .then(() => {
            if (typeof window.chrome !== 'undefined' && chrome.runtime && chrome.runtime.reload) {
                // reload chrome app
                chrome.runtime.reload();
            } else {
                // navigate to login
                window.location.href = this._appConfig.config.baseUrl;
            }
        });
};