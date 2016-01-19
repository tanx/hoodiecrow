'use strict';

/**
 * Update handler for transition database version 0 -> 1
 *
 * In database version 1, the stored email objects have to be purged, otherwise
 * every non-prefixed mail in the IMAP folders would be nuked due to the implementation
 * of the delta sync.
 */
function updateV1(options) {
    const emailDbType = 'email_',
        versionDbType = 'dbVersion',
        postUpdateDbVersion = 1;

    // remove the emails
    return options.userStorage.removeList(emailDbType)
        .then(() => options.appConfigStorage.storeList([postUpdateDbVersion], versionDbType)); // update the database version to postUpdateDbVersion
}

module.exports = updateV1;