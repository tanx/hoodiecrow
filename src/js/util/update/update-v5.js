'use strict';

const FOLDER_TYPE_INBOX = 'Inbox';
const FOLDER_TYPE_SENT = 'Sent';
const FOLDER_TYPE_DRAFTS = 'Drafts';
const FOLDER_TYPE_TRASH = 'Trash';

const FOLDER_DB_TYPE = 'folders';
const VERSION_DB_TYPE = 'dbVersion';

const POST_UPDATE_DB_VERSION = 5;

/**
 * Update handler for transition database version 4 -> 5
 *
 * Due to an overlooked issue, there may be multiple folders, e.g. for sent mails.
 * This removes the "duplicate" folders.
 */
export default function(options) {
    // remove the emails
    return options.userStorage.listItems(FOLDER_DB_TYPE).then(stored => {
        const folders = stored[0] || [];
        [FOLDER_TYPE_INBOX, FOLDER_TYPE_SENT, FOLDER_TYPE_DRAFTS, FOLDER_TYPE_TRASH].forEach(mbxType => {
            const foldersForType = folders.filter(mbx => mbx.type === mbxType);

            if (foldersForType.length <= 1) {
                return; // nothing to do here
            }

            // remove duplicate folders
            for (let i = 1; i < foldersForType.length; i++) {
                folders.splice(folders.indexOf(foldersForType[i]), 1);
            }
        });
        return options.userStorage.storeList([folders], FOLDER_DB_TYPE);

    }).then(() => options.appConfigStorage.storeList([POST_UPDATE_DB_VERSION], VERSION_DB_TYPE)); // update the db version
}