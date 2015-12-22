'use strict';

var GmailClient = require('../../../src/js/email/gmail-client'),
    Auth = require('../../../src/js/service/auth'),
    Base64Url = require('../../../src/js/util/base64url');

describe('Gmail Client unit test', function() {
    var gmailClient, authStub, base64urlStub;

    beforeEach(function() {
        authStub = sinon.createStubInstance(Auth);
        base64urlStub = sinon.createStubInstance(Base64Url);
        gmailClient = new GmailClient(authStub, base64urlStub);
    });

    afterEach(function() {});

    describe('login', function() {
        it('should work', function(done) {
            authStub.getOAuthToken.returns(resolves());

            gmailClient.login().then(function() {
                expect(authStub.getOAuthToken.callCount).to.equal(1);
                done();
            });
        });

        it('should retry for expired oauth token', function(done) {
            authStub.getOAuthToken.returns(rejects({
                code: 401
            }));

            gmailClient.login().catch(function(err) {
                expect(err.code).to.equal(401);
                expect(authStub.getOAuthToken.callCount).to.equal(2);
                done();
            });
        });

        it('should retry ', function(done) {
            authStub.getOAuthToken.returns(rejects({
                code: 400
            }));

            gmailClient.login().catch(function(err) {
                expect(err.code).to.equal(400);
                expect(authStub.getOAuthToken.callCount).to.equal(1);
                done();
            });
        });
    });

});