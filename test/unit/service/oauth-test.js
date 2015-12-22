'use strict';

var OAuth = require('../../../src/js/service/oauth'),
    appConfig = require('../../../src/js/app-config');

describe('OAuth unit tests', function() {
    var oauth, identityStub, getPlatformInfoStub, removeCachedStub,
        testEmail = 'safewithme.testuser@gmail.com',
        redirectUri = window.location.origin + '/test/unit/?grep=oauthCallback&oauth=true';

    beforeEach(function() {
        oauth = new OAuth(appConfig);
        oauth._redirectUri = redirectUri;
        oauth._loginHint = testEmail;

        window.chrome = window.chrome || {};

        window.chrome.identity = window.chrome.identity || {};
        if (typeof window.chrome.identity.getAuthToken !== 'function') {
            window.chrome.identity.getAuthToken = function() {};
        }
        identityStub = sinon.stub(window.chrome.identity, 'getAuthToken');

        if (typeof window.chrome.identity.removeCachedAuthToken !== 'function') {
            window.chrome.identity.removeCachedAuthToken = function() {};
        }
        removeCachedStub = sinon.stub(window.chrome.identity, 'removeCachedAuthToken');

        window.chrome.runtime = window.chrome.runtime || {};
        if (typeof window.chrome.runtime.getPlatformInfo !== 'function') {
            window.chrome.runtime.getPlatformInfo = function() {};
        }
        getPlatformInfoStub = sinon.stub(window.chrome.runtime, 'getPlatformInfo');
    });

    afterEach(function() {
        identityStub.restore();
        getPlatformInfoStub.restore();
        removeCachedStub.restore();
    });

    describe('webAuthenticate', function() {
        it('should work', function() {
            if (window.location.search.indexOf('oauth=true') < 0) {
                return;
            }

            oauth.webAuthenticate();
        });
    });

    describe('oauthCallback', function() {
        it('should work', function(done) {
            if (window.location.search.indexOf('oauth=true') < 0) {
                done();
                return;
            }

            oauth.oauthCallback();
            expect(oauth.accessToken).to.exist;
            expect(oauth.tokenType).to.exist;
            expect(oauth.expiresIn).to.exist;

            oauth.queryEmailAddress(oauth.accessToken).then(function(emailAddress) {
                expect(emailAddress).to.exist;
                console.log(emailAddress);
                done();
            });
        });
    });

    describe('getOAuthToken', function() {
        it('should return cached oauth token', function(done) {
            oauth.accessToken = 'token';

            oauth.getOAuthToken(testEmail).then(function(token) {
                expect(token).to.equal('token');
                done();
            });
        });

        it('should work for chrome browser (not chrome app)', function() {
            oauth.accessToken = undefined;
            window.chrome.identity = undefined;
            sinon.stub(oauth, 'webAuthenticate');

            oauth.getOAuthToken(testEmail);
            expect(oauth.webAuthenticate.calledOnce).to.be.true;
        });

        it('should work for non-chrome browsers', function() {
            oauth.accessToken = undefined;
            window.chrome = undefined;
            sinon.stub(oauth, 'webAuthenticate');

            oauth.getOAuthToken(testEmail);
            expect(oauth.webAuthenticate.calledOnce).to.be.true;
        });

        it('should work for empty emailAddress', function(done) {
            getPlatformInfoStub.yields({
                os: 'android'
            });
            identityStub.withArgs({
                interactive: true
            }).yields('token');

            oauth.getOAuthToken(undefined).then(function(token) {
                expect(token).to.equal('token');
                done();
            });
        });

        it('should work on android app', function(done) {
            getPlatformInfoStub.yields({
                os: 'android'
            });
            identityStub.withArgs({
                interactive: true,
                accountHint: testEmail
            }).yields('token');

            oauth.getOAuthToken(testEmail).then(function(token) {
                expect(token).to.equal('token');
                done();
            });
        });

        it('should work on desktop chrome', function(done) {
            getPlatformInfoStub.yields({
                os: 'mac'
            });
            identityStub.withArgs({
                interactive: true
            }).yields('token');

            oauth.getOAuthToken(testEmail).then(function(token) {
                expect(token).to.equal('token');
                done();
            });
        });

        it('should fail', function(done) {
            getPlatformInfoStub.yields({
                os: 'android'
            });
            identityStub.yields();

            oauth.getOAuthToken(testEmail).catch(function(err) {
                expect(err).to.exist;
                done();
            });
        });
    });

    describe('queryEmailAddress', function() {
        beforeEach(function() {
            sinon.stub(window, 'fetch');
        });

        afterEach(function() {
            window.fetch.restore();
        });

        it('should work', function(done) {
            window.fetch.returns(fetchOk({
                email: testEmail
            }));

            oauth.queryEmailAddress('token').then(function(emailAddress) {
                expect(emailAddress).to.equal(testEmail);
                done();
            });
        });

        it('should fail due to invalid token', function(done) {
            oauth.queryEmailAddress('').catch(function(err) {
                expect(err).to.exist;
                done();
            });
        });

        it('should fail due to expired token', function(done) {
            window.fetch.returns(fetchError(401, {
                error_description: 'Invalid credentials!'
            }));
            oauth.accessToken = 'cachedToken';

            oauth.queryEmailAddress('token').catch(function(err) {
                expect(err.code).to.equal(401);
                expect(oauth.accessToken).to.be.undefined;
                done();
            });
        });

        it('should fail due to expired token', function(done) {
            window.fetch.returns(fetchError(400, {
                error_description: 'Invalid credentials!'
            }));
            oauth.accessToken = 'cachedToken';

            oauth.queryEmailAddress('token').catch(function(err) {
                expect(err.code).to.equal(400);
                expect(oauth.accessToken).to.equal('cachedToken');
                done();
            });
        });
    });

});