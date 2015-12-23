'use strict';

var AddAccountCtrl = require('../../../../src/js/controller/login/add-account'),
    OAuth = require('../../../../src/js/service/oauth'),
    Dialog = require('../../../../src/js/util/dialog'),
    GmailClient = require('../../../../src/js/email/gmail-client');

describe('Add Account Controller unit test', function() {
    var scope, location, ctrl, oauthStub, dialogStub, gmailClientStub;

    beforeEach(function() {
        // remember original module to restore later, then replace it
        oauthStub = sinon.createStubInstance(OAuth);
        dialogStub = sinon.createStubInstance(Dialog);
        gmailClientStub = sinon.createStubInstance(GmailClient);

        angular.module('addaccounttest', ['woServices']);
        angular.mock.module('addaccounttest');
        angular.mock.inject(function($controller, $rootScope, $location) {
            location = $location;
            scope = $rootScope.$new();
            scope.state = {};
            scope.form = {};

            sinon.stub(location, 'path').returns(location);
            sinon.stub(location, 'search').returns(location);
            sinon.stub(scope, '$apply', function() {});

            ctrl = $controller(AddAccountCtrl, {
                $location: location,
                $scope: scope,
                $routeParams: {},
                $q: window.qMock,
                oauth: oauthStub,
                gmailClient: gmailClientStub,
                dialog: dialogStub
            });
        });
    });

    afterEach(function() {
        location.path.restore();
        location.search.restore();
        if (scope.$apply.restore) {
            scope.$apply.restore();
        }
    });

    describe('signInWithGoogle', function() {
        it('should work', function(done) {
            gmailClientStub.login.returns(resolves());

            scope.signInWithGoogle().then(function() {
                expect(scope.busy).to.be.true;
                expect(gmailClientStub.login.calledOnce).to.be.true;
                done();
            });
        });
    });

});