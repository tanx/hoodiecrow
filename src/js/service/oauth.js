'use strict';

var ngModule = angular.module('woServices');
ngModule.service('oauth', OAuth);
module.exports = OAuth;

function OAuth(appConfig) {
    this._clientId = appConfig.config.oauthClientId;
    this._scope = appConfig.config.oauthScopes.join(' ');
    this._redirectUri = appConfig.config.oauthRedirectUrl;
}

/**
 * Start an OAuth2 web authentication flow including redirects from and to the current page.
 */
OAuth.prototype.webAuthenticate = function() {
    var uri = 'https://accounts.google.com/o/oauth2/v2/auth?response_type=token';
    uri += '&client_id=' + encodeURIComponent(this._clientId);
    uri += '&redirect_uri=' + encodeURIComponent(this._redirectUri);
    uri += '&scope=' + encodeURIComponent(this._scope);
    if (this._loginHint) {
        uri += '&login_hint=' + encodeURIComponent(this._loginHint);
    }

    // go to google account login
    window.location.href = uri;
};

/**
 * Catch the OAuth2 token and other parameters.
 */
OAuth.prototype.oauthCallback = function() {
    function getHashParams() {
        var hashParams = {};
        var e,
            a = /\+/g, // Regex for replacing addition symbol with a space
            r = /([^&;=]+)=?([^&;]*)/g,
            d = function(s) {
                return decodeURIComponent(s.replace(a, " "));
            },
            q = window.location.hash.substring(1);

        e = r.exec(q);
        while (e) {
            hashParams[d(e[1])] = d(e[2]);
            e = r.exec(q);
        }

        return hashParams;
    }

    var params = getHashParams();
    this.accessToken = params.access_token;
    this.tokenType = params.token_type;
    this.expiresIn = params.expires_in;
};

/**
 * Request an OAuth token from chrome for gmail users
 * @param  {String}   emailAddress  The user's email address (optional)
 */
OAuth.prototype.getOAuthToken = function(emailAddress) {
    var self = this;
    return new Promise(function(resolve, reject) {

        //
        // Web oauth flow
        //

        // check for cached access token (from webmail redirect)
        if (self.accessToken) {
            resolve(self.accessToken);
            return;
        }
        // redirect to Google login page
        if (!(window.chrome && chrome.identity)) {
            self.webAuthenticate();
            return;
        }

        //
        // Chrome App Oauth flow
        //

        var idOptions = {
            interactive: true
        };

        // check which runtime the app is running under
        chrome.runtime.getPlatformInfo(function(platformInfo) {
            if (chrome.runtime.lastError || !platformInfo) {
                reject(new Error('Error getting chrome platform info!'));
                return;
            }

            if (emailAddress && platformInfo.os.indexOf('android') !== -1) {
                // set accountHint so that native Android account picker does not show up each time
                idOptions.accountHint = emailAddress;
            }

            // get OAuth Token from chrome
            chrome.identity.getAuthToken(idOptions, function(token) {
                if (chrome.runtime.lastError || !token) {
                    reject(new Error('Error fetching an OAuth token for the user!'));
                    return;
                }

                resolve(token);
            });
        });
    });
};

/**
 * Remove an old OAuth token and get a new one.
 * @param  {String}   options.oldToken      The old token to be removed
 * @param  {String}   options.emailAddress  The user's email address (optional)
 */
OAuth.prototype.refreshToken = function(options) {
    var self = this;
    return new Promise(function(resolve) {
        if (!options.oldToken) {
            throw new Error('oldToken option not set!');
        }

        // remove cached token
        chrome.identity.removeCachedAuthToken({
            token: options.oldToken
        }, function() {
            // get a new token
            self.getOAuthToken(options.emailAddress).then(resolve);
        });
    });
};

/**
 * Get email address from google api
 * @param  {String}   token    The oauth token
 */
OAuth.prototype.queryEmailAddress = function(token) {
    return new Promise(function(resolve) {
        if (!token) {
            throw new Error('Invalid OAuth token!');
        }

        resolve();

    }).then(function() {
        // fetch gmail user's email address from the Google Authorization Server
        var uri = 'https://www.googleapis.com/oauth2/v3/userinfo?access_token=' + token;
        return window.fetch(uri);

    }).then(function(response) {
        return response.json();
    }).then(function(info) {
        if (!info || !info.email) {
            throw new Error('Error looking up email address on google api!');
        }

        return info.email;
    });
};