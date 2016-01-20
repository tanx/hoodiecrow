'use strict';

import updateV1 from './update-v1';
import updateV2 from './update-v2';
import updateV3 from './update-v3';
import updateV4 from './update-v4';
import updateV5 from './update-v5';
import updateV6 from './update-v6';
import updateV7 from './update-v7';
let axe, cfg;

const ngModule = angular.module('woUtil');
ngModule.service('updateHandler', UpdateHandler);
export default UpdateHandler;

/**
 * Handles database migration
 */
function UpdateHandler(appConfigStore, accountStore, auth, dialog, appConfig, axe) {
    this._appConfigStorage = appConfigStore;
    this._userStorage = accountStore;
    this._updateScripts = [updateV1, updateV2, updateV3, updateV4, updateV5, updateV6, updateV7];
    this._auth = auth;
    this._dialog = dialog;
    cfg = appConfig.config;
    axe = axe;
}

/**
 * Executes all the necessary updates
 */
UpdateHandler.prototype.update = function() {
    let currentVersion = 0,
        targetVersion = cfg.dbVersion,
        versionDbType = 'dbVersion';

    return this._appConfigStorage.listItems(versionDbType).then(items => {
        // parse the database version number
        if (items && items.length > 0) {
            currentVersion = parseInt(items[0], 10);
        }

        return this._applyUpdate({
            currentVersion: currentVersion,
            targetVersion: targetVersion
        });
    });
};

/**
 * Schedules necessary updates and executes thom in order
 */
UpdateHandler.prototype._applyUpdate = function(options) {
    return new Promise((resolve, reject) => {
        let scriptOptions,
            queue = [];

        if (options.currentVersion >= options.targetVersion) {
            // the current database version is up to date
            resolve();
            return;
        }

        scriptOptions = {
            appConfigStorage: this._appConfigStorage,
            userStorage: this._userStorage,
            auth: this._auth
        };

        // add all the necessary database updates to the queue
        for (let i = options.currentVersion; i < options.targetVersion; i++) {
            queue.push(this._updateScripts[i]);
        }

        // takes the next update from the queue and executes it
        function executeNextUpdate() {
            if (queue.length < 1) {
                // we're done
                resolve();
                return;
            }

            // process next update
            const script = queue.shift();
            script(scriptOptions).then(executeNextUpdate).catch(reject);
        }

        executeNextUpdate();
    });
};

/**
 * Check application version and update correspondingly
 */
UpdateHandler.prototype.checkForUpdate = function() {
    // Chrome Packaged App
    if (typeof window.chrome !== 'undefined' && chrome.runtime && chrome.runtime.onUpdateAvailable) {
        // check for Chrome app update and restart
        chrome.runtime.onUpdateAvailable.addListener(details => {
            axe.debug('New Chrome App update... requesting reload.');
            // Chrome downloaded a new app version
            this._dialog.confirm({
                title: 'Update available',
                message: 'A new version ' + details.version + ' of the app is available. Restart the app to update?',
                positiveBtnStr: 'Restart',
                negativeBtnStr: 'Not now',
                showNegativeBtn: true,
                callback: agree => agree && chrome.runtime.reload()
            });
        });
        chrome.runtime.requestUpdateCheck(status => {
            if (status === "update_found") {
                axe.debug("Update pending...");
            } else if (status === "no_update") {
                axe.debug("No update found.");
            } else if (status === "throttled") {
                axe.debug("Checking updates too frequently.");
            }
        });
    }
};