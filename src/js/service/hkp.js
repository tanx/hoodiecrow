'use strict';

const ngModule = angular.module('woServices');
ngModule.service('hkp', HKP);
export default HKP;

/**
 * A HKP client for fetching public PGP keys from standard key servers
 */
function HKP(appConfig) {
    this._appConfig = appConfig;
}

/**
 * Return a url of the link to be opened in a new window
 * @param  {String} query   Either the email address or name
 * @return {String}         The url of the hkp query
 */
HKP.prototype.getIndexUrl = function(query) {
    let baseUrl = this._appConfig.config.hkpUrl + '/pks/lookup?op=index&search=';
    return baseUrl + encodeURIComponent(query);
};