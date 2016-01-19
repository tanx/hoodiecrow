export default class OAuth {

    constructor(appConfig) {
        this._clientId = appConfig.config.oauthClientId;
        this._scope = appConfig.config.oauthScopes.join(' ');
        this._redirectUri = appConfig.config.baseUrl;
    }

    /**
     * Delete the locally cached oauth token.
     */
    flushToken() {
        this.accessToken = undefined;
        this.tokenType = undefined;
        this.expiresIn = undefined;
    }

    /**
     * Start an OAuth2 web authentication flow including redirects from and to the current page.
     * @param  {String}   options.loginHint     (optional) The user's email address
     * @param  {String}   options.prompt        (optional) The type of prompt to show e.g. 'select_account'
     */
    webAuthenticate(options = {}) {
        let uri = 'https://accounts.google.com/o/oauth2/v2/auth';
        uri += '?response_type=token';
        uri += '&client_id=' + encodeURIComponent(this._clientId);
        uri += '&redirect_uri=' + encodeURIComponent(this._redirectUri);
        uri += '&scope=' + encodeURIComponent(this._scope);
        if (options.loginHint) {
            uri += '&login_hint=' + encodeURIComponent(options.loginHint);
        }
        if (options.prompt) {
            uri += '&prompt=' + options.prompt;
        }

        // go to google account login
        window.location.href = uri;
    }

    /**
     * Catch the OAuth2 token and other parameters.
     */
    oauthCallback() {
        const params = () => {
            const hashParams = {};
            let e,
                a = /\+/g, // Regex for replacing addition symbol with a space
                r = /([^&;=]+)=?([^&;]*)/g,
                d = s => decodeURIComponent(s.replace(a, " ")),
                q = window.location.hash.substring(1);

            e = r.exec(q);
            while (e) {
                hashParams[d(e[1])] = d(e[2]);
                e = r.exec(q);
            }

            return hashParams;
        };

        this.accessToken = params.access_token;
        this.tokenType = params.token_type;
        this.expiresIn = params.expires_in;
    }

    /**
     * Request an OAuth token from chrome for gmail users
     * @param  {String}   options.loginHint     (optional) The user's email address
     */
    getOAuthToken(options) {
        return new Promise((resolve, reject) => {

            //
            // Web oauth flow
            //

            // check for cached access token (from webmail redirect)
            if (this.accessToken) {
                resolve(this.accessToken);
                return;
            }
            // redirect to Google login page
            if (!(window.chrome && chrome.identity)) {
                this.webAuthenticate(options);
                return;
            }

            //
            // Chrome App Oauth flow
            //

            const idOptions = {
                interactive: true
            };

            // check which runtime the app is running under
            chrome.runtime.getPlatformInfo(platformInfo => {
                if (chrome.runtime.lastError || !platformInfo) {
                    reject(new Error('Error getting chrome platform info!'));
                    return;
                }

                if (options && options.loginHint && platformInfo.os.indexOf('android') !== -1) {
                    // set accountHint so that native Android account picker does not show up each time
                    idOptions.accountHint = options.loginHint;
                }

                // get OAuth Token from chrome
                chrome.identity.getAuthToken(idOptions, token => {
                    if (chrome.runtime.lastError || !token) {
                        reject(new Error('Error fetching an OAuth token for the user!'));
                        return;
                    }

                    resolve(token);
                });
            });
        });
    }

    /**
     * Get email address from google api
     * @param  {String}   token    The oauth token
     */
    queryEmailAddress(token) {
        return new Promise(resolve => {
            if (!token) {
                throw new Error('Invalid OAuth token!');
            }
            resolve();

        }).then(() => {
            // fetch gmail user's email address from the Google Authorization Server
            const uri = 'https://www.googleapis.com/oauth2/v3/userinfo?access_token=' + token;
            return window.fetch(uri);

        }).catch(err => {
            err.code = 42; // error code for offline
            throw err;

        }).then(response => {
            if (response.status === 200) {
                // success ... parse response
                return response.json();
            }

            if (response.status === 401) {
                // the oauth token has probably expired
                this.flushToken();
            }

            return response.json().then(res => {
                const error = new Error('Error looking up email address on Google api: ' + res.error_description);
                error.code = response.status;
                throw error;
            });

        }).then(info => ({
            emailAddress: info.email,
            realname: info.name
        }));
    }

}

const ngModule = angular.module('woServices');
ngModule.service('oauth', OAuth);