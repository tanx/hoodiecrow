'use strict';

/**
 * Update handler for transition database version 3 -> 4
 *
 * In database version 4, we need to add a "provider" flag to the
 * indexeddb. only gmail was allowed as a mail service provider before,
 * so let's add this...
 */
function update(options) {
    const VERSION_DB_TYPE = 'dbVersion',
        EMAIL_ADDR_DB_KEY = 'emailaddress',
        USERNAME_DB_KEY = 'username',
        PROVIDER_DB_KEY = 'provider',
        IMAP_DB_KEY = 'imap',
        SMTP_DB_KEY = 'smtp',
        REALNAME_DB_KEY = 'realname',
        POST_UPDATE_DB_VERSION = 4;

    const imap = {
            host: 'imap.gmail.com',
            port: 993,
            secure: true
        },
        smtp = {
            host: 'smtp.gmail.com',
            port: 465,
            secure: true
        };

    // load the email address (if existing)
    let emailAddress;
    return loadFromDB(EMAIL_ADDR_DB_KEY).then(address => {
        emailAddress = address;
        // load the provider (if existing)
        return loadFromDB(PROVIDER_DB_KEY);

    }).then(provider => {
        // if there is an email address without a provider, we need to add the missing provider entry
        // for any other situation, we're good.
        if (!(emailAddress && !provider)) {
            // update the database version to POST_UPDATE_DB_VERSION
            return options.appConfigStorage.storeList([POST_UPDATE_DB_VERSION], VERSION_DB_TYPE);
        }

        // add the missing provider key
        const storeProvider = options.appConfigStorage.storeList(['gmail'], PROVIDER_DB_KEY);
        // add the missing user name key
        const storeAdress = options.appConfigStorage.storeList([emailAddress], USERNAME_DB_KEY);
        // add the missing imap host info key
        const storeImap = options.appConfigStorage.storeList([imap], IMAP_DB_KEY);
        // add the missing empty real name
        const storeEmptyName = options.appConfigStorage.storeList([''], REALNAME_DB_KEY);
        // add the missing smtp host info key
        const storeSmtp = options.appConfigStorage.storeList([smtp], SMTP_DB_KEY);

        return Promise.all([storeProvider, storeAdress, storeImap, storeEmptyName, storeSmtp]).then(() => {
            // reload the credentials
            options.auth.initialized = false;
            return options.auth._loadCredentials();

        }).then(() => options.appConfigStorage.storeList([POST_UPDATE_DB_VERSION], VERSION_DB_TYPE)); // update the db version
    });

    function loadFromDB(key) {
        return options.appConfigStorage.listItems(key).then(cachedItems => cachedItems && cachedItems[0]);
    }
}

module.exports = update;