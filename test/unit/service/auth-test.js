'use strict';

import Auth from '../../../src/js/service/auth';
import OAuth from '../../../src/js/service/oauth';

var DeviceStorageDAO = require('../../../src/js/service/devicestorage');

describe('Auth unit tests', function() {
    // Constants
    const APP_CONFIG_DB_NAME = 'app-config';
    const EMAIL_ADDR_DB_KEY = 'emailaddress';
    const REALNAME_DB_KEY = 'realname';
    const OAUTH_TOKEN_DB_KEY = 'oauthtoken';

    // SUT
    var auth;

    // Dependencies
    var storageStub, oauthStub;

    // test data
    var emailAddress = 'bla@blubb.com';
    var oauthToken = 'tokentokentokentoken';
    var realname = 'Bla Blubb';

    beforeEach(function() {
        storageStub = sinon.createStubInstance(DeviceStorageDAO);
        oauthStub = sinon.createStubInstance(OAuth);
        auth = new Auth(storageStub, oauthStub);
    });

    describe('#init', function() {
        it('should not initialize if already initialized', function(done) {
            auth._initialized = true;
            auth.init().then(function() {
                expect(auth._initialized).to.be.true;
                done();
            });
        });
        it('should initialize a user db', function(done) {
            storageStub.init.withArgs(APP_CONFIG_DB_NAME).returns(resolves());
            sinon.stub(auth, '_loadCredentials').returns(resolves());

            auth.init().then(function() {
                expect(auth._initialized).to.be.true;
                done();
            });
        });
        it('should fail on initialize a user db', function(done) {
            storageStub.init.withArgs(APP_CONFIG_DB_NAME).returns(rejects(new Error()));
            auth.init().catch(function(err) {
                expect(err).to.exist;
                expect(auth._initialized).to.be.false;
                done();
            });
        });
    });

    describe('#storeCredentials', function() {
        it('should persist ALL the things!', function(done) {
            auth._credentialsDirty = true;
            auth.emailAddress = emailAddress;
            auth.realname = realname;
            auth.oauthToken = oauthToken;

            storageStub.storeList.withArgs([emailAddress], EMAIL_ADDR_DB_KEY).returns(resolves());
            storageStub.storeList.withArgs([realname], REALNAME_DB_KEY).returns(resolves());
            storageStub.storeList.withArgs([oauthToken], OAUTH_TOKEN_DB_KEY).returns(resolves());

            auth.storeCredentials().then(function() {
                expect(storageStub.storeList.callCount).to.equal(3);

                done();
            });
        });
    });

    describe('#flushOAuthToken', function() {
        it('should work', function() {
            auth.oauthToken = 'cachedToken';
            storageStub.removeList.returns(resolves());

            auth.flushOAuthToken().then(function() {
                expect(auth.oauthToken).to.be.undefined;
                expect(oauthStub.flushToken.called).to.be.true;
                expect(storageStub.removeList.called).to.be.true;
            });
        });
    });

    describe('#getOAuthCredentials', function() {
        beforeEach(function() {
            sinon.stub(auth, '_loadCredentials').returns(resolves());
        });

        it('should check cached token', function(done) {
            auth.oauthToken = oauthToken;
            auth.emailAddress = emailAddress;
            sinon.stub(auth, '_queryEmailAddress').returns(resolves());

            auth.getOAuthCredentials().then(function() {
                expect(auth.emailAddress).to.equal(emailAddress);
                expect(auth.oauthToken).to.equal(oauthToken);
                expect(auth._queryEmailAddress.calledOnce).to.be.true;

                done();
            });
        });

        it('should fetch token with known email address', function(done) {
            auth.emailAddress = emailAddress;
            oauthStub.getOAuthToken.withArgs({
                loginHint: emailAddress
            }).returns(resolves(oauthToken));

            auth.getOAuthCredentials().then(function() {
                expect(auth.emailAddress).to.equal(emailAddress);
                expect(auth.oauthToken).to.equal(oauthToken);
                expect(oauthStub.getOAuthToken.calledOnce).to.be.true;

                done();
            });
        });

        it('should fetch token with unknown email address', function(done) {
            oauthStub.getOAuthToken.withArgs({
                loginHint: undefined
            }).returns(resolves(oauthToken));
            sinon.stub(auth, '_queryEmailAddress', function() {
                auth.emailAddress = emailAddress;
                return resolves();
            });

            auth.getOAuthCredentials().then(function() {
                expect(auth.emailAddress).to.equal(emailAddress);
                expect(auth.oauthToken).to.equal(oauthToken);
                expect(oauthStub.getOAuthToken.calledOnce).to.be.true;
                expect(auth._queryEmailAddress.calledOnce).to.be.true;

                done();
            });
        });
    });

    describe('#_queryEmailAddress', function() {
        it('should fetch token with unknown email address', function(done) {
            auth.oauthToken = oauthToken;

            oauthStub.queryEmailAddress.withArgs(oauthToken).returns(resolves({
                emailAddress: emailAddress,
                realname: realname
            }));

            auth._queryEmailAddress().then(function() {
                expect(auth.emailAddress).to.equal(emailAddress);
                expect(auth.realname).to.equal(realname);
                expect(oauthStub.queryEmailAddress.calledOnce).to.be.true;

                done();
            });
        });

        it('should fail when email address fetch fails', function(done) {
            oauthStub.queryEmailAddress.returns(rejects(new Error()));

            auth._queryEmailAddress().catch(function(err) {
                expect(err).to.exist;
                expect(auth.emailAddress).to.not.exist;
                expect(auth.realname).to.not.exist;
                expect(oauthStub.queryEmailAddress.calledOnce).to.be.true;

                done();
            });
        });

        it('should fail when oauth token expires', function(done) {
            oauthStub.queryEmailAddress.returns(rejects({
                code: 401
            }));
            sinon.stub(auth, 'flushOAuthToken').returns(resolves());

            auth._queryEmailAddress().catch(function(err) {
                expect(err.code).to.equal(401);
                expect(auth.emailAddress).to.not.exist;
                expect(auth.realname).to.not.exist;
                expect(auth.flushOAuthToken.calledOnce).to.be.true;
                expect(oauthStub.queryEmailAddress.calledOnce).to.be.true;

                done();
            });
        });
    });

    describe('#_loadCredentials', function() {
        it('should not load twice', function(done) {
            auth._loaded = true;

            auth._loadCredentials().then(function() {
                expect(storageStub.listItems.callCount).to.equal(0);

                done();
            });
        });

        it('should work', function(done) {
            storageStub.listItems.withArgs(EMAIL_ADDR_DB_KEY).returns(resolves([emailAddress]));
            storageStub.listItems.withArgs(REALNAME_DB_KEY).returns(resolves([realname]));
            storageStub.listItems.withArgs(OAUTH_TOKEN_DB_KEY).returns(resolves([oauthToken]));

            auth._loadCredentials().then(function() {
                expect(auth.emailAddress).to.equal(emailAddress);
                expect(auth.realname).to.equal(realname);
                expect(auth.oauthToken).to.equal(oauthToken);

                expect(storageStub.listItems.callCount).to.equal(3);

                done();
            });
        });

        it('should fail', function(done) {
            storageStub.listItems.returns(rejects(new Error()));

            auth._loadCredentials().catch(function(err) {
                expect(err).to.exist;
                expect(auth.emailAddress).to.not.exist;
                expect(auth.realname).to.not.exist;
                expect(auth.oauthToken).to.not.exist;
                expect(storageStub.listItems.calledOnce).to.be.true;

                done();
            });
        });
    });

    describe('#logout', function() {
        it('should fail to to error in calling db clear', function(done) {
            storageStub.clear.returns(rejects(new Error()));

            auth.logout().catch(function(err) {
                expect(err).to.exist;
                done();
            });
        });

        it('should work', function(done) {
            auth.emailAddress = emailAddress;
            auth.realname = realname;
            auth.oauthToken = oauthToken;
            auth._initialized = true;
            auth._loaded = true;
            auth._credentialsDirty = true;

            storageStub.clear.returns(resolves());

            auth.logout().then(function() {
                expect(auth.emailAddress).to.be.undefined;
                expect(auth.realname).to.be.undefined;
                expect(auth.oauthToken).to.be.undefined;
                expect(oauthStub.flushToken.calledOnce).to.be.true;
                expect(auth._initialized).to.be.undefined;
                expect(auth._loaded).to.be.undefined;
                expect(auth._credentialsDirty).to.be.undefined;
                done();
            });
        });
    });
});