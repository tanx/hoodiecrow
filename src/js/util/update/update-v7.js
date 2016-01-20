'use strict';

const EMAIL_DB_TYPE = 'email_';
const FOLDER_DB_TYPE = 'folders';
const VERSION_DB_TYPE = 'dbVersion';
const POST_UPDATE_DB_VERSION = 7;

/**
 * Update handler for transition database version 6 -> 7
 */
export default function(options) {
    // clear the emails
    return options.userStorage.removeList(EMAIL_DB_TYPE)
        .then(() => options.userStorage.removeList(FOLDER_DB_TYPE)) // clear the folders
        .then(() => options.appConfigStorage.clear()) // clear the app config store and cached auth credentials
        .then(() => options.appConfigStorage.storeList([POST_UPDATE_DB_VERSION], VERSION_DB_TYPE)); // update the db version
}