'use strict';

/**
 * Update handler for transition database version 5 -> 6
 */
function update(options) {
    const emailDbType = 'email_',
        versionDbType = 'dbVersion',
        postUpdateDbVersion = 6;

    // remove the emails
    return options.userStorage.removeList(emailDbType)
        .then(() => options.appConfigStorage.storeList([postUpdateDbVersion], versionDbType)); // update the db version
}

module.exports = update;