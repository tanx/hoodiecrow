'use strict';

import Crypto from '../../../src/js/crypto/crypto';
import appConfig from '../../../src/js/app-config';
const config = appConfig.config;
import cryptoLib from 'crypto-lib';
const util = cryptoLib.util;

describe('Crypto unit tests', function() {
    this.timeout(20000);

    var crypto,
        password = 'password',
        keySize = config.symKeySize,
        ivSize = config.symIvSize;

    beforeEach(function() {
        crypto = new Crypto();
    });

    afterEach(function() {});

    describe('AES encrypt/decrypt', function() {
        it('should work', function(done) {
            var plaintext = 'Hello, World!';
            var key = util.random(keySize);
            var iv = util.random(ivSize);

            crypto.encrypt(plaintext, key, iv).then(function(ciphertext) {
                expect(ciphertext).to.exist;

                return crypto.decrypt(ciphertext, key, iv);
            }).then(function(decrypted) {
                expect(decrypted).to.equal(plaintext);

                done();
            });
        });
    });

    describe("PBKDF2 (Async/Worker)", function() {
        it('should work', function(done) {
            var salt = util.random(keySize);

            crypto.deriveKey(password, salt, keySize).then(function(key) {
                expect(util.base642Str(key).length * 8).to.equal(keySize);
                done();
            });
        });
    });

});