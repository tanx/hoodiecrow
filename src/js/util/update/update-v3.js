'use strict';

/**
 * Update handler for transition database version 2 -> 3
 *
 * In database version 3, we introduced new flags to the messages, also
 * the outbox uses artificial uids
 */
function update(options) {
    const emailDbType = 'email_',
        versionDbType = 'dbVersion',
        postUpdateDbVersion = 3;

    // remove the emails
    return options.userStorage.removeList(emailDbType)
        .then(() => options.appConfigStorage.storeList([postUpdateDbVersion], versionDbType)); // update the db version
}

module.exports = update;