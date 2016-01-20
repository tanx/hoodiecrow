'use strict';

/**
 * Update handler for transition database version 1 -> 2
 *
 * In database version 2, the stored email objects have to be purged, because the
 * new data model stores information about the email structure in the property 'bodyParts'.
 */
export default function(options) {
    const emailDbType = 'email_',
        versionDbType = 'dbVersion',
        postUpdateDbVersion = 2;

    // remove the emails
    return options.userStorage.removeList(emailDbType)
        .then(() => options.appConfigStorage.storeList([postUpdateDbVersion], versionDbType)); // update the db version
}