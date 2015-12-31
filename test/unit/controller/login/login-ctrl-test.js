'use strict';

var LoginCtrl = require('../../../../src/js/controller/login/login'),
    Email = require('../../../../src/js/email/email'),
    Account = require('../../../../src/js/email/account'),
    Dialog = require('../../../../src/js/util/dialog'),
    UpdateHandler = require('../../../../src/js/util/update/update-handler'),
    Auth = require('../../../../src/js/service/auth'),
    PrivateKey = require('../../../../src/js/service/privatekey');

describe('Login Controller unit test', function() {
    var scope, location, ctrl,
        emailMock, privateKeyMock, authMock, accountMock, dialogMock, updateHandlerMock, goToStub,
        emailAddress = 'fred@foo.com';

    beforeEach(function() {
        emailMock = sinon.createStubInstance(Email);
        accountMock = sinon.createStubInstance(Account);
        authMock = sinon.createStubInstance(Auth);
        privateKeyMock = sinon.createStubInstance(PrivateKey);
        dialogMock = sinon.createStubInstance(Dialog);
        updateHandlerMock = sinon.createStubInstance(UpdateHandler);

        location = {
            path: function() {}
        };

        authMock.emailAddress = emailAddress;

        angular.module('login-test', ['woServices', 'woEmail', 'woUtil']);
        angular.mock.module('login-test');
        angular.mock.inject(function($rootScope, $controller) {
            scope = $rootScope.$new();
            scope.state = {};
            scope.form = {};

            ctrl = $controller(LoginCtrl, {
                $scope: scope,
                $location: location,
                updateHandler: updateHandlerMock,
                account: accountMock,
                auth: authMock,
                email: emailMock,
                privateKey: privateKeyMock,
                dialog: dialogMock,
                appConfig: {
                    preventAutoStart: true
                }
            });
        });

        scope.goTo = function() {};
        goToStub = sinon.stub(scope, 'goTo');
    });

    afterEach(function() {});

    it('should fail for auth.getEmailAddress', function(done) {
        authMock.init.returns(resolves());
        authMock.getEmailAddress.returns(rejects(new Error()));

        scope.init().then(function() {
            expect(updateHandlerMock.checkForUpdate.calledOnce).to.be.true;
            expect(authMock.init.calledOnce).to.be.true;
            expect(dialogMock.error.calledOnce).to.be.true;
            done();
        });
    });

    it('should fail for auth.init', function(done) {
        authMock.init.returns(rejects(new Error()));
        authMock.getEmailAddress.returns(resolves({
            emailAddress: emailAddress
        }));

        scope.init().then(function() {
            expect(authMock.init.calledOnce).to.be.true;
            expect(accountMock.init.called).to.be.false;
            expect(dialogMock.error.calledOnce).to.be.true;
            done();
        });
    });

    it('should redirect to /add-account', function(done) {
        authMock.init.returns(resolves());
        authMock.getEmailAddress.returns(resolves({}));

        scope.init().then(function() {
            expect(goToStub.withArgs('/add-account').called).to.be.true;
            expect(goToStub.calledOnce).to.be.true;
            done();
        });
    });

    it('should redirect to /login-existing', function(done) {
        authMock.init.returns(resolves());
        authMock.getEmailAddress.returns(resolves({
            emailAddress: emailAddress
        }));
        accountMock.init.returns(resolves({
            publicKey: 'publicKey',
            privateKey: 'privateKey'
        }));
        emailMock.unlock.returns(rejects(new Error()));

        scope.init().then(function() {
            expect(goToStub.withArgs('/login-existing').called).to.be.true;
            expect(goToStub.calledOnce).to.be.true;
            expect(authMock.storeCredentials.called).to.be.false;
            done();
        });
    });

    it('should fail for auth.storeCredentials', function(done) {
        authMock.init.returns(resolves());
        authMock.getEmailAddress.returns(resolves({
            emailAddress: emailAddress
        }));
        accountMock.init.returns(resolves({
            publicKey: 'publicKey',
            privateKey: 'privateKey'
        }));
        emailMock.unlock.returns(resolves());
        authMock.storeCredentials.returns(rejects(new Error()));

        scope.init().then(function() {
            expect(dialogMock.error.calledOnce).to.be.true;
            done();
        });
    });

    it('should redirect to /account', function(done) {
        authMock.init.returns(resolves());
        authMock.getEmailAddress.returns(resolves({
            emailAddress: emailAddress
        }));
        accountMock.init.returns(resolves({
            publicKey: 'publicKey',
            privateKey: 'privateKey'
        }));
        emailMock.unlock.returns(resolves());
        authMock.storeCredentials.returns(resolves());

        scope.init().then(function() {
            expect(goToStub.withArgs('/account').called).to.be.true;
            expect(goToStub.calledOnce).to.be.true;
            done();
        });
    });

    it('should redirect to /login-privatekey-download', function(done) {
        authMock.init.returns(resolves());
        authMock.getEmailAddress.returns(resolves({
            emailAddress: emailAddress
        }));
        accountMock.init.returns(resolves());
        privateKeyMock.init.returns(resolves());
        privateKeyMock.isSynced.returns(resolves(true));
        privateKeyMock.destroy.returns(resolves());

        scope.init().then(function() {
            expect(goToStub.withArgs('/login-privatekey-download').called).to.be.true;
            expect(privateKeyMock.isSynced.calledOnce).to.be.true;
            expect(goToStub.calledOnce).to.be.true;
            done();
        });
    });

    it('should redirect to /login-initial', function(done) {
        authMock.init.returns(resolves());
        authMock.getEmailAddress.returns(resolves({
            emailAddress: emailAddress
        }));
        accountMock.init.returns(resolves());
        privateKeyMock.init.returns(resolves());
        privateKeyMock.isSynced.returns(resolves(false));
        privateKeyMock.destroy.returns(resolves());

        scope.init().then(function() {
            expect(goToStub.withArgs('/login-initial').called).to.be.true;
            expect(privateKeyMock.isSynced.calledOnce).to.be.true;
            expect(goToStub.calledOnce).to.be.true;
            done();
        });
    });

});