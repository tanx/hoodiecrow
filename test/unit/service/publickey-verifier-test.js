'use strict';

var KeychainDAO = require('../../../src/js/service/keychain'),
    PublickeyVerifier = require('../../../src/js/service/publickey-verifier');

describe('Public-Key Verifier', function() {
    var verifier;
    var keychainStub, credentials;

    beforeEach(function() {
        //
        // Stubs
        //

        keychainStub = sinon.createStubInstance(KeychainDAO);

        //
        // Fixture
        //
        credentials = {
            imap: {
                host: 'asd',
                port: 1234,
                secure: true,
                auth: {
                    user: 'user',
                    pass: 'pass'
                }
            }
        };

        //
        // Setup SUT
        //
        verifier = new PublickeyVerifier(keychainStub);
    });

    afterEach(function() {});

    describe('#uploadPublicKey', function() {
        it('should work', function(done) {
            keychainStub.uploadPublicKey.returns(resolves());

            verifier.keypair = {
                publicKey: 'PGP PUBLIC KEY BLOCK'
            };
            verifier.hkpUpload = true;

            verifier.uploadPublicKey().then(function() {
                expect(keychainStub.uploadPublicKey.called).to.be.true;
                done();
            });
        });

        it('should not upload for missing key', function(done) {
            verifier.keypair = undefined;
            verifier.hkpUpload = true;

            verifier.uploadPublicKey().then(function() {
                expect(keychainStub.uploadPublicKey.called).to.be.false;
                done();
            });
        });

        it('should not upload when disabled', function(done) {
            verifier.keypair = {
                publicKey: 'PGP PUBLIC KEY BLOCK'
            };
            verifier.hkpUpload = false;

            verifier.uploadPublicKey().then(function() {
                expect(keychainStub.uploadPublicKey.called).to.be.false;
                done();
            });
        });
    });

    describe('#persistKeypair', function() {
        it('should work', function(done) {
            keychainStub.putUserKeyPair.returns(resolves());

            verifier.keypair = {
                publicKey: 'PGP PUBLIC KEY BLOCK'
            };

            verifier.persistKeypair().then(function() {
                expect(keychainStub.putUserKeyPair.called).to.be.true;
                done();
            });
        });

        it('should not work for missing key', function(done) {
            verifier.keypair = undefined;

            verifier.persistKeypair().then(function() {
                expect(keychainStub.putUserKeyPair.called).to.be.false;
                done();
            });
        });
    });
});