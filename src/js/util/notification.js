'use strict';

const ngModule = angular.module('woUtil');
ngModule.service('notification', Notif);
export default Notif;

function Notif(appConfig, axe) {
    this._appConfig = appConfig;
    this._axe = axe;

    if (window.Notification) {
        this.hasPermission = Notification.permission === "granted";
    }
}

/**
 * Creates a notification. Requests permission if not already granted
 *
 * @param {String} options.title The notification title
 * @param {String} options.message The notification message
 * @param {Number} options.timeout (optional) Timeout when the notification is closed in milliseconds
 * @param {Function} options.onClick (optional) callback when the notification is clicked
 * @returns {Notification} A notification instance
 */
Notif.prototype.create = function(options) {
    options.onClick = options.onClick || function() {};

    if (!window.Notification) {
        return;
    }

    if (!this.hasPermission) {
        // don't wait until callback returns
        Notification.requestPermission(permission => {
            if (permission === "granted") {
                this.hasPermission = true;
            }
        });
    }

    let notification;
    try {
        notification = new Notification(options.title, {
            body: options.message,
            icon: this._appConfig.config.iconPath
        });
    } catch (err) {
        this._axe.error('Displaying notification failed: ' + err.message);
        return;
    }

    notification.onclick = () => {
        window.focus();
        options.onClick();
    };

    if (options.timeout > 0) {
        setTimeout(() => {
            notification.close();
        }, options.timeout);
    }

    return notification;
};

Notif.prototype.close = function(notification) {
    if (notification) {
        notification.close();
    }
};