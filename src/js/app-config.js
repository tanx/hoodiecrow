'use strict';

var appCfg = {};

var ngModule = angular.module('woAppConfig', []);
ngModule.factory('appConfig', function($timeout) {
    $timeout(function() {
        return window.fetch(appCfg.config.baseUrl + 'manifest.json');
    }).then(function(response) {
        return response.json();
    }).then(setConfigParams);

    return appCfg;
});
module.exports = appCfg;

/**
 * Global app configurations
 */
appCfg.config = {
    oauthClientId: '440907777130-bnk8b12nsqmpcf5cdbnhpskefhfhfgu1.apps.googleusercontent.com',
    oauthScopes: ['https://www.googleapis.com/auth/gmail.modify', 'email'],
    baseUrl: window.location.origin + window.location.pathname,
    pgpComment: 'Hoodiecrow - https://hoodiecrow.com',
    hkpUrl: 'https://keyserver.ubuntu.com',
    symKeySize: 256,
    symIvSize: 96,
    asymKeySize: 2048,
    workerPath: 'js',
    iconPath: '/img/icon-128-chrome.png',
    dbVersion: 7,
    appVersion: undefined,
    outboxMailboxPath: 'OUTBOX',
    outboxMailboxName: 'Outbox',
    outboxMailboxType: 'Outbox'
};

// parse manifest to get configurations for current runtime
if (typeof chrome !== 'undefined' && chrome.runtime && chrome.runtime.getManifest) {
    setConfigParams(chrome.runtime.getManifest());
}

function setConfigParams(manifest) {
    // set the app version
    appCfg.config.appVersion = manifest.version;
}

/**
 * Strings are maintained here
 */
appCfg.string = {
    fallbackSubject: '(no subject)',
    invitationSubject: 'Invitation to a private conversation',
    invitationMessage: 'Hi,\n\nI use Hoodiecrow to send and receive encrypted email. I would like to exchange encrypted messages with you as well.\n\nPlease install the Hoodiecrow application. This application makes it easy to read and write messages securely with PGP encryption applied.\n\nGo to the Whiteout Networks homepage to learn more and to download the application: https://hoodiecrow.com\n\n',
    signature: '\n\n\n--\nSent from Hoodiecrow - https://hoodiecrow.com\n\nMy PGP key: ',
    webSite: 'http://hoodiecrow.com',
    sendBtnClear: 'Send',
    sendBtnSecure: 'Send securely',
    updatePublicKeyTitle: 'Public Key Updated',
    updatePublicKeyMsgNewKey: '{0} updated his key and may not be able to read encrypted messages sent with his old key. Update the key?',
    updatePublicKeyMsgRemovedKey: '{0} revoked his key and may no longer be able to read encrypted messages. Remove the key?',
    updatePublicKeyPosBtn: 'Yes',
    updatePublicKeyNegBtn: 'No',
    bugReportTitle: 'Report a bug',
    bugReportSubject: '[Bug] I want to report a bug',
    bugReportBody: 'Steps to reproduce\n1. \n2. \n3. \n\nWhat happens?\n\n\nWhat do you expect to happen instead?\n\n\n\n== PLEASE DONT PUT ANY KEYS HERE! ==\n\n\n## Log\n\nBelow is the log. It includes your interactions with your email provider from the point where you started the app for the last time. Login data and email content has been stripped. Any information provided by you will be used for the purpose of locating and fixing the bug you reported. It will be deleted subsequently. However, you can edit this log and/or remove log data in the event that something would show up.\n\nUser-Agent: {0}\nVersion: {1}\n\n',
    supportAddress: 'mail.support@whiteout.io',
    logoutTitle: 'Logout',
    logoutMessage: 'Are you sure you want to log out? Please back up your encryption key before proceeding!',
    removePreAuthAccountTitle: 'Remove account',
    removePreAuthAccountMessage: 'Are you sure you want to remove your account from this device?'
};