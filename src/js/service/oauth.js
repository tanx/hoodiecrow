'use strict';

var ngModule = angular.module('woServices');
ngModule.service('oauth', OAuth);
module.exports = OAuth;

function OAuth(appConfig) {
    this._clientId = appConfig.config.oauthClientId;
    this._scope = appConfig.config.oauthScopes.join(' ');
    this._redirectUri = appConfig.config.baseUrl;
}

/**
 * Delete the locally cached oauth token.
 */
OAuth.prototype.flushToken = function() {
    this.accessToken = undefined;
    this.tokenType = undefined;
    this.expiresIn = undefined;
};

/**
 * Start an OAuth2 web authentication flow including redirects from and to the current page.
 * @param  {String}   options.loginHint     (optional) The user's email address
 * @param  {String}   options.prompt        (optional) The type of prompt to show e.g. 'select_account'
 */
OAuth.prototype.webAuthenticate = function(options) {
    var uri = 'https://accounts.google.com/o/oauth2/v2/auth';
    uri += '?response_type=token';
    uri += '&client_id=' + encodeURIComponent(this._clientId);
    uri += '&redirect_uri=' + encodeURIComponent(this._redirectUri);
    uri += '&scope=' + encodeURIComponent(this._scope);
    if (options && options.loginHint) {
        uri += '&login_hint=' + encodeURIComponent(options.loginHint);
    }
    if (options && options.prompt) {
        uri += '&prompt=' + options.prompt;
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
 * @param  {String}   options.loginHint     (optional) The user's email address
 */
OAuth.prototype.getOAuthToken = function(options) {
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
            self.webAuthenticate(options);
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

            if (options && options.loginHint && platformInfo.os.indexOf('android') !== -1) {
                // set accountHint so that native Android account picker does not show up each time
                idOptions.accountHint = options.loginHint;
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
 * Get email address from google api
 * @param  {String}   token    The oauth token
 */
OAuth.prototype.queryEmailAddress = function(token) {
    var self = this;
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
        if (response.status === 200) {
            // success ... parse response
            return response.json();
        }

        if (response.status === 401) {
            // the oauth token has probably expired
            self.flushToken();
        }

        return response.json().then(function(res) {
            var error = new Error('Error looking up email address on Google api: ' + res.error_description);
            error.code = response.status;
            throw error;
        });

    }).then(function(info) {
        return {
            emailAddress: info.email,
            realname: info.name
        };
    });
};