'use strict';

var Auth = require('../../../../src/js/service/auth'),
    PublicKeyVerifier = require('../../../../src/js/service/publickey-verifier'),
    PublicKeyVerifierCtrl = require('../../../../src/js/controller/login/login-verify-public-key');

describe('Public Key Verification Controller unit test', function() {
    // Angular parameters
    var scope, location;

    // Stubs & Fixture
    var auth, verifier;
    var emailAddress = 'foo@foo.com';

    // SUT
    var verificationCtrl;

    beforeEach(function() {
        // remeber pre-test state to restore later
        auth = sinon.createStubInstance(Auth);
        verifier = sinon.createStubInstance(PublicKeyVerifier);
        verifier.uploadPublicKey.returns(resolves());
        auth.emailAddress = emailAddress;

        // setup the controller
        angular.module('publickeyverificationtest', []);
        angular.mock.module('publickeyverificationtest');
        angular.mock.inject(function($rootScope, $controller, $location) {
            scope = $rootScope.$new();
            location = $location;

            verificationCtrl = $controller(PublicKeyVerifierCtrl, {
                $scope: scope,
                $location: location,
                $q: window.qMock,
                auth: auth,
                publickeyVerifier: verifier
            });
        });
    });

    afterEach(function() {});

    describe('#persistKeypair', function() {
        it('should work', function(done) {
            verifier.persistKeypair.returns(resolves());
            auth.storeCredentials.returns(resolves());

            scope.persistKeypair().then(function() {
                expect(verifier.persistKeypair.calledTwice).to.be.true;
                expect(auth.storeCredentials.calledTwice).to.be.true;
                expect(location.$$path).to.equal('/account');

                done();
            });
        });
    });
});