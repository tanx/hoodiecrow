'use strict';

var EMAIL_DB_TYPE = 'email_';
var FOLDER_DB_TYPE = 'folders';
var VERSION_DB_TYPE = 'dbVersion';
var POST_UPDATE_DB_VERSION = 7;

/**
 * Update handler for transition database version 6 -> 7
 */
function update(options) {

    // clear the emails
    return options.userStorage.removeList(EMAIL_DB_TYPE).then(function() {
        // clear the folders
        return options.userStorage.removeList(FOLDER_DB_TYPE);
    }).then(function() {
        // clear the app config store and cached auth credentials
        return options.appConfigStorage.clear();
    }).then(function() {
        // update the database version to postUpdateDbVersion
        return options.appConfigStorage.storeList([POST_UPDATE_DB_VERSION], VERSION_DB_TYPE);
    });
}

module.exports = update;