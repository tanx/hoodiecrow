'use strict';

var ngModule = angular.module('woServices');
ngModule.service('invitation', Invitation);
module.exports = Invitation;

/**
 * The Invitation is a high level Data Access Object that access the invitation service REST endpoint.
 * @param {Object} restDao The REST Data Access Object abstraction
 */
function Invitation(appConfig) {
    this._appConfig = appConfig;
}

/**
 * Create the invitation mail object
 * @param  {String} options.sender      The sender's email address
 * @param  {String} options.recipient   The recipient's email address
 * @return {Object}                     The mail object
 */
Invitation.prototype.createMail = function(options) {
    var str = this._appConfig.string;

    return {
        from: [{
            address: options.sender
        }],
        to: [{
            address: options.recipient
        }],
        cc: [],
        bcc: [],
        subject: str.invitationSubject,
        body: str.invitationMessage
    };
};