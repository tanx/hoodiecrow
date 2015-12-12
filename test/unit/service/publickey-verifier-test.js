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
});