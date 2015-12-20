'use strict';

var LawnchairDAO = require('../../src/js/service/lawnchair'),
    DeviceStorageDAO = require('../../src/js/service/devicestorage'),
    mailreader = require('mailreader');

describe.skip('Gmail DAO integration tests', function() {
    this.timeout(100000);

    var accountService, gmail, auth, oauth, userStorage,
        redirectUri = window.location.origin + '/test/integration/?grep=Gmail';

    var testAccount = {
        user: 'safewithme.testuser@gmail.com',
        pass: 'passphrase',
        xoauth2: 'testtoken'
    };

    var mockKeyPair = {
        privateKey: {
            _id: '514BEE3B15C7F569',
            userId: testAccount.user,
            userIds: [{
                name: 'Test User',
                emailAddress: testAccount.user
            }],
            encryptedKey: '-----BEGIN PGP PRIVATE KEY BLOCK-----\r\nVersion: OpenPGP.js v1.4.0\r\nComment: Whiteout Mail - https://whiteout.io\r\n\r\nxcLYBFZySAABCADq1lWFckbHf4Rm2tSi6Tf5jGbKhu1aTENB0/C7Hgh5QTWi\r\nV1L8OQnqHvAj8bOJWuetxjPRUVBTain7VbBpOJT6v7AoxBaJAp/VDm/AMn6L\r\no46rO+aTO+2M4leAvp/hMKE4xrxOU5LJ5AkZEsjjWK0kunJRdsCLOONq7xrp\r\n41QkbObU06Q/CH0hi6WoXroui16ngnOypTNicpvIKqsXyNeHxy8dr05vKVA9\r\nrRuBSfKpGg0vQmf+qNsg30boR1zdyg1heN2QOYXIEuHSuB2fWOko3z5o9dAJ\r\n1x2ltVHCSbn3pGyFgE63gqt2cgk+bONWyLWBpzIBVp1vCvTEHrjuT5LFABEB\r\nAAEAB/49lCBu0q1uqKhuVBmH8oHEBSX7G3BnyjGktE+esVxld0z6Gc3f55EK\r\n/DvaIQoEDXtM3Pk/fQQEK4WAq1KL9NNUASnPNsP1/2Mr+hIhotv9/9BsZFOs\r\n7fz3gW6SiunfoeHUwoAkRdPq7snX8k4NF3and+B8LhiFKVCw/KvhAsRQnGE0\r\nBB4q3OKTQGnnZT4K3vtv+hWCpJbqorQBZeleNak5n9HNiIV3gK+K3VLkji5Q\r\nkn6wscawHflIWTWDFtMerTqT1kgAvkON6PtbRcjUc2dAc2PMLQN0IMfcBR6+\r\nNAp5x+ZEkWWKITPiheYBBViIumLUYT13njfYJCvcGlcGPBCtBAD7/qIzT3xF\r\n3ozyHxtAnL+Rmxb/RPK4GW8p53l9sa91TIshBvNqT666Ksd+QB2MPt0s7CpV\r\nvBOGjrT9jWEAgnKTNpSsHuut2Cai7UZahmoh8IfnX0x75waeQKJX4VOGJu+h\r\n0nmqCe9L5eTO2fQ29yKoLpoQSnS/7PgHyC+8EVgHlwQA7pHjDUq6zmbWKkA8\r\n2q3zVQ5dCtwM8OQyu3sZBpshimdQNDRIwSFWsworYRLbxB52B+Jv7Ss69gB3\r\nz6T9tzgitZMcYsuHjIcG78aqaas+qKd52hsBB/eNB9Y3B5gECAWGPSTP4aCm\r\nMAiIdAs/8DogAMy90umzHMyDN5UwHUFD5AMEAKG+c52p8Bb95igKlu9prmjw\r\nVSCByw15WtUYigYUFpdOK1pDt92hBkVjD99BXiyfTRDX2LaeUasu8r5BNwci\r\nLCCSdS8irIy3KXUV6649Mu3/L+gcATLwru6dUt+8oCuwrYl4779RGYFnELMs\r\nZnByApvTlDVs43TwoNoPI6egKHHdOM/NKVRlc3QgVXNlciA8c2FmZXdpdGht\r\nZS50ZXN0dXNlckBnbWFpbC5jb20+wsByBBABCAAmBQJWckgABgsJCAcDAgkQ\r\nUUvuOxXH9WkEFQgCCgMWAgECGwMCHgEAACqDB/4tm1zBsHOO0i2arHfF+kZi\r\nNKEAIYUO+LxRD9LMr1GpgRVd8faEk4QESKPUgrtbEwYCZlv1rYUJrSmNpYPP\r\nlZi+JS4NnnC9paUYua9b2a7vkHUguALTJlLkvKPezL75/0KNWMYHiA/qYL3s\r\nK6lbAZNofmlnyBHNY4e1rodBIJu48FzPXdHIpiFTTACnlGzW4mzzb70EBlvb\r\nc7xzt/kTVJPXHVq6SSQLkdVySOppqh2lz3ZU9fxsgXgm6mtk0tb3OMWpcZcV\r\nELcsT1dYOUMmyKET6KtHuu1t4mH8uUK3TvUSbqqjsM2V9W0MBA4E2ak/zv/0\r\n8z5Y7VrsluBXDsg74TOix8LYBFZySAABCAC27kLWUA7p1NWvuxPJdNv3BRxz\r\nijQLHK1IVhu9Ub7c96JuVJu5+UBvVY4WbQB3hJlVx7XDvxyR15cCR+29G0Wp\r\ntVyJKi1d2FRlO2Lm51aBNLPJSSJ286RU2Cw2fJVH5bhhN5/UD9Sq0G5+bTbT\r\nIQioJLqcI+jI+J0F4F8PFH57FEV+0s/zYoMOZfPYB2iS1/LBlSgvMHYuZ44y\r\nG0xOBTN4mwkPhJfl5EGunRl5yUqYLH0S41agwCzdvu5WdwuoSf7pKMf6IBAY\r\ntlvqsUiT/PI0TFzW5Yk25sAFPfuqGYMo1OxZwQRW/71TzJWyY5r/xklgZ6SV\r\niWLDhOl++Ic801ITABEBAAEAB/9ujPMLfXplyeARwWcl2l+MmyQklyL4jC4U\r\nhyVgdmR4OZeKQcuSypUsM3IZD2q20AWyl2y7jWWApd92221LWY3yD86KfljI\r\nXBI003zjum7GysjUHkSbyoZHWBTwIL4+ow+YgPswNxj42dnMwcfeNBp9MyUr\r\nc3Ac9FJA2OXZwTLmwcU+mk40Vrc0Ra7apvBs6zI4tJyNzi/OQ7uExV1qPgVR\r\n0rHUWJf5XxstoHycEfv64HVUXTHzJ5N8Ta2NK8YNKhjECeC8ofxrMlHoG/mf\r\ngMxK+zY+gwHOzxqZMiY38Q4ns0tTD5kMVurU/tmkWj3+dejdDbYHTMsR3pz9\r\nSsFXhjZxBADoQraGEdDAR8UX2XjLrybRrd2GHBP0NqYfntWnSL6fJDq73Cw4\r\n12KSfjGK7pcUTnCVgrrudXFtxqRItbdtuG//uRF2t8MM6Ed3dIZ+7EMS61Vi\r\nVaUqIGD9vY+8wc2mo44TmdbPcXdzVcY0Z5ldVxxVE64u2veF4HnaU3+QYRsh\r\nbQQAyaDKnxS+JLGuKs9mRck0zLbAYHPrXEgdaUw0bJhnxEcwsUOrcLcziPig\r\nwFLDtXl4yNRb65lfveOHiOx7L0XbLHVgn5HZTU6P4Df5eL8R8oxVEZT7wEbg\r\ntN9W3FlMgdSaOKsOn0n6XXy9nvKgV1P28OFzINDGDFAgR8d7MlXLkX8EAJ+d\r\nMEl/hulVS32UK1tntegdntbo7kRcaTb6Sz4Js27qh8rYVklZRbw0RbqggUbj\r\nS6yZTKyQaMWkDTWmLmtbi/My/Ya9uJae1Ebv+NdNVBMq1de2CXYgbT7axxDj\r\nULFnZ2+Or2EZEGn1qDP44X9nTa8uCrqhRR127RcAtwF3yrfsSCzCwF8EGAEI\r\nABMFAlZySAEJEFFL7jsVx/VpAhsMAAAduggA333DJ1cjEkiPR6X4qOrXbLpp\r\nLI0azkoxpPtAWUd6xxsnAPoJILaoQkr2s5qmXMNVCUUTDf8UlfVzGWct/5YZ\r\n4lufUb3Z7sPy6zAKfRFh2OukL8bwAUEHV659lbiIFwwgqZdqItMHdRH8Pj/g\r\nb/kPqFHe66HX6Kg6W/WnGg9b1yibjT0pKCIqD0//1xWhUP71n/ly5Obw+uk5\r\nfPWZ+FkQlPDbbLBZcTgxGGfRElXKw/OJz693ob7hkUbvOkh/mR5jeUS5pSCw\r\n3jmFaCOyn8ra6DE5/8we//eU6FiDmG5cDYUbUWpmFdO1xIuRNWTlvi3/bI/f\r\nNI3KHEXiKMx7Wua+tg==\r\n=1j7z\r\n-----END PGP PRIVATE KEY BLOCK-----'
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
            oauth._redirectUri = redirectUri;
            oauth._loginHint = testAccount.user;
            gmail = accountService._emailDao;

            // try to catch oauth token
            oauth.oauthCallback();

            // set email address in auth module to prevent google api roundtrip for userinfo
            auth.setCredentials({
                emailAddress: testAccount.user,
            });

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

    describe('_updateFolders', function() {
        it('should work', function(done) {
            gmail._updateFolders().then(function() {
                expect(gmail._account.folders.length).to.be.above(0);
                done();
            });
        });
    });

    describe('_fetchMessages', function() {
        var inboxFolder = {
            name: 'Inbox',
            type: 'Inbox',
            path: 'INBOX',
            messages: []
        };

        it('should work', function(done) {
            gmail._fetchMessages({
                folder: inboxFolder
            }).then(function(messages) {
                expect(messages).to.exist;
                done();
            });
        });
    });

});