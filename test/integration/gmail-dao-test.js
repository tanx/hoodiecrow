'use strict';

var LawnchairDAO = require('../../src/js/service/lawnchair'),
    DeviceStorageDAO = require('../../src/js/service/devicestorage'),
    mailreader = require('mailreader');

describe.skip('Gmail DAO integration tests', function() {
    this.timeout(100000);

    var accountService, gmail, auth, oauth, userStorage,
        oauthRedirectQuery = '?grep=Gmail';

    var testAccount = {
        user: 'safewithme.testuser@gmail.com',
        pass: 'passphrase',
        xoauth2: 'testtoken'
    };

    var inboxFolder = {
        name: 'Inbox',
        type: 'Inbox',
        path: 'INBOX',
        messages: []
    };

    var mockKeyPair = {
        privateKey: {
            _id: '514BEE3B15C7F569',
            userId: testAccount.user,
            userIds: [{
                name: 'Test User',
                emailAddress: testAccount.user
            }],
            encryptedKey: '-----BEGIN PGP PRIVATE KEY BLOCK-----\r\nVersion: OpenPGP.js v1.4.0\r\nComment: Whiteout Mail - https://whiteout.io\r\n\r\n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\r\nNI3KHEXiKMx7Wua+tg==\r\n=1j7z\r\n-----END PGP PRIVATE KEY BLOCK-----'
        },
        publicKey: {
            _id: '514BEE3B15C7F569',
            userId: testAccount.user,
            userIds: [{
                name: 'Test User',
                emailAddress: testAccount.user
            }],
            publicKey: '-----BEGIN PGP PUBLIC KEY BLOCK-----\r\nVersion: OpenPGP.js v1.4.0\r\nComment: Whiteout Mail - https://whiteout.io\r\n\r\nxsBNBFZySAABCADq1lWFckbHf4Rm2tSi6Tf5jGbKhu1aTENB0/C7Hgh5QTWi\r\nV1L8OQnqHvAj8bOJWuetxjPRUVBTain7VbBpOJT6v7AoxBaJAp/VDm/AMn6L\r\no46rO+aTO+2M4leAvp/hMKE4xrxOU5LJ5AkZEsjjWK0kunJRdsCLOONq7xrp\r\n41QkbObU06Q/CH0hi6WoXroui16ngnOypTNicpvIKqsXyNeHxy8dr05vKVA9\r\nrRuBSfKpGg0vQmf+qNsg30boR1zdyg1heN2QOYXIEuHSuB2fWOko3z5o9dAJ\r\n1x2ltVHCSbn3pGyFgE63gqt2cgk+bONWyLWBpzIBVp1vCvTEHrjuT5LFABEB\r\nAAHNKVRlc3QgVXNlciA8c2FmZXdpdGhtZS50ZXN0dXNlckBnbWFpbC5jb20+\r\nwsByBBABCAAmBQJWckgABgsJCAcDAgkQUUvuOxXH9WkEFQgCCgMWAgECGwMC\r\nHgEAACqDB/4tm1zBsHOO0i2arHfF+kZiNKEAIYUO+LxRD9LMr1GpgRVd8faE\r\nk4QESKPUgrtbEwYCZlv1rYUJrSmNpYPPlZi+JS4NnnC9paUYua9b2a7vkHUg\r\nuALTJlLkvKPezL75/0KNWMYHiA/qYL3sK6lbAZNofmlnyBHNY4e1rodBIJu4\r\n8FzPXdHIpiFTTACnlGzW4mzzb70EBlvbc7xzt/kTVJPXHVq6SSQLkdVySOpp\r\nqh2lz3ZU9fxsgXgm6mtk0tb3OMWpcZcVELcsT1dYOUMmyKET6KtHuu1t4mH8\r\nuUK3TvUSbqqjsM2V9W0MBA4E2ak/zv/08z5Y7VrsluBXDsg74TOizsBNBFZy\r\nSAABCAC27kLWUA7p1NWvuxPJdNv3BRxzijQLHK1IVhu9Ub7c96JuVJu5+UBv\r\nVY4WbQB3hJlVx7XDvxyR15cCR+29G0WptVyJKi1d2FRlO2Lm51aBNLPJSSJ2\r\n86RU2Cw2fJVH5bhhN5/UD9Sq0G5+bTbTIQioJLqcI+jI+J0F4F8PFH57FEV+\r\n0s/zYoMOZfPYB2iS1/LBlSgvMHYuZ44yG0xOBTN4mwkPhJfl5EGunRl5yUqY\r\nLH0S41agwCzdvu5WdwuoSf7pKMf6IBAYtlvqsUiT/PI0TFzW5Yk25sAFPfuq\r\nGYMo1OxZwQRW/71TzJWyY5r/xklgZ6SViWLDhOl++Ic801ITABEBAAHCwF8E\r\nGAEIABMFAlZySAEJEFFL7jsVx/VpAhsMAAAduggA333DJ1cjEkiPR6X4qOrX\r\nbLppLI0azkoxpPtAWUd6xxsnAPoJILaoQkr2s5qmXMNVCUUTDf8UlfVzGWct\r\n/5YZ4lufUb3Z7sPy6zAKfRFh2OukL8bwAUEHV659lbiIFwwgqZdqItMHdRH8\r\nPj/gb/kPqFHe66HX6Kg6W/WnGg9b1yibjT0pKCIqD0//1xWhUP71n/ly5Obw\r\n+uk5fPWZ+FkQlPDbbLBZcTgxGGfRElXKw/OJz693ob7hkUbvOkh/mR5jeUS5\r\npSCw3jmFaCOyn8ra6DE5/8we//eU6FiDmG5cDYUbUWpmFdO1xIuRNWTlvi3/\r\nbI/fNI3KHEXiKMx7Wua+tg==\r\n=npPn\r\n-----END PGP PUBLIC KEY BLOCK-----'
        }
    };

    beforeEach(function(done) {

        //
        // Test client setup
        //

        // don't multithread, Function.prototype.bind() is broken in phantomjs in web workers
        window.Worker = undefined;
        navigator.online = true;

        sinon.stub(mailreader, 'startWorker', function() {});
        sinon.stub(openpgp, 'initWorker', function() {});

        // build and inject angular services
        angular.module('gmail-integration-test', ['woEmail']);
        angular.mock.module('gmail-integration-test');
        angular.mock.inject(function($injector) {
            accountService = $injector.get('account');
            cleanState();
        });

        function cleanState() {
            // clear the local database before each test
            var cleanup = new DeviceStorageDAO(new LawnchairDAO());
            cleanup.init(testAccount.user).then(function() {
                cleanup.clear().then(initServices);
            });
        }

        function initServices() {
            userStorage = accountService._accountStore;
            auth = accountService._auth;
            oauth = auth._oauth;
            oauth._redirectUri += oauthRedirectQuery;
            gmail = accountService._emailDao;

            // try to catch oauth token
            oauth.oauthCallback();

            // stub rest request to key server
            sinon.stub(gmail._keychain._publicKeyDao, 'get').returns(resolves(mockKeyPair.publicKey));
            sinon.stub(gmail._keychain._publicKeyDao, 'getByUserId').returns(resolves(mockKeyPair.publicKey));

            auth.init().then(function() {
                return accountService.init({
                    emailAddress: testAccount.user
                });

            }).then(function() {
                return gmail.unlock({
                    passphrase: testAccount.pass,
                    keypair: mockKeyPair
                });

            }).then(function() {
                sinon.stub(gmail, 'isOnline').returns(true);
                return gmail.onConnect();

            }).then(function() {
                done();
            });
        }
    });

    afterEach(function() {
        openpgp.initWorker.restore();
        mailreader.startWorker.restore();
        gmail._keychain._publicKeyDao.get.restore();
        gmail._keychain._publicKeyDao.getByUserId.restore();
        gmail.isOnline.restore();
    });

    describe('create folder', function() {
        it('should work', function(done) {
            gmail._gmailClient.createFolder({
                name: 'NEW TEST FOLDER'
            }).then(function(folder) {
                expect(folder.path).to.exist;
                done();
            }).catch(done);
        });
    });

    describe('insert Message', function() {
        it('should work', function(done) {
            var raw = "Subject: D64A7BD57F2D6EDF\r\nFrom: safewithme.testuser@gmail.com\r\nTo: safewithme.testuser@gmail.com\r\nContent-Type: application/x.encrypted-pgp-key; charset=us-ascii\r\nContent-Transfer-Encoding: base64\r\nDate: Fri, 25 Dec 2015 08:24:08 +0000\r\nMessage-Id: <1451031848162-47983a88-9976a4bf-4866235b@gmail.com>\r\nMIME-Version: 1.0\r\n\r\n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";

            gmail._gmailClient.listFolders().then(function(folders) {
                var testFolder = _.findWhere(folders, {
                    name: 'NEW TEST FOLDER'
                });

                return gmail._gmailClient.insertMessage({
                    path: testFolder.path,
                    raw: raw
                }).then(function(res) {
                    expect(res).to.exist;
                    done();
                });
            });
        });
    });

    describe.skip('sendEncrypted', function() {
        var email = {
            from: [testAccount.user],
            to: [testAccount.user],
            subject: 'PGP/MIME send test',
            body: 'hello world!',
            publicKeysArmored: [mockKeyPair.publicKey.publicKey]
        };

        it('should work', function(done) {
            gmail.sendEncrypted({
                email: email
            }).then(function(response) {
                expect(response).to.exist;
                done();
            });
        });
    });

    describe('_updateFolders', function() {
        it('should work', function(done) {
            gmail._updateFolders().then(function() {
                expect(gmail._account.folders.length).to.be.above(0);
                done();
            });
        });
    });

    describe('getBody and decrypt', function() {
        it('should work', function(done) {
            var msg;

            gmail._fetchMessages({
                folder: inboxFolder
            }).then(function(messages) {
                expect(messages && messages.length).to.exist;

                msg = messages[0];

                // get first message body
                return gmail.getBody({
                    messages: [msg]
                });

            }).then(function() {

                // decrypt email dto
                return gmail.decryptBody({
                    message: msg
                });

            }).then(function() {
                expect(msg.body).to.exist;
                expect(msg.encrypted).to.be.true;
                expect(msg.decrypted).to.be.true;
                done();
            });

        });
    });

    describe('getRawMessage', function() {
        it('should work', function(done) {
            var msg;

            gmail._gmailClient.listFolders().then(function(folders) {
                var keysFolder = _.findWhere(folders, {
                    name: 'openpgp_keys'
                });
                return gmail._gmailClient.listMessageIds(keysFolder);

            }).then(function(messages) {
                expect(messages && messages.length).to.exist;

                msg = messages[0];

                // get first message body
                return gmail._gmailClient.getRawMessage(msg);

            }).then(function() {
                expect(msg.bodyParts[0].raw).to.exist;
                done();
            });

        });
    });

});