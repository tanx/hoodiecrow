'use strict';

var LawnchairDAO = require('../../src/js/service/lawnchair'),
    DeviceStorageDAO = require('../../src/js/service/devicestorage');

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
            _id: 'D7FB93FCDFBFC23C',
            userId: testAccount.user,
            userIds: [{
                name: 'John Doe',
                emailAddress: testAccount.user
            }],
            encryptedKey: '-----BEGIN PGP PRIVATE KEY BLOCK-----\r\nVersion: OpenPGP.js v.1.20131116\r\nComment: Whiteout Mail - http://whiteout.io\r\n\r\nxcL+BFKODs4BB/9iOF4THsjQMY+WEpT7ShgKxj4bHzRRaQkqczS4nZvP0U3g\r\nqeqCnbpagyeKXA+bhWFQW4GmXtgAoeD5PXs6AZYrw3tWNxLKu2Oe6Tp9K/XI\r\nxTMQ2wl4qZKDXHvuPsJ7cmgaWqpPyXtxA4zHHS3WrkI/6VzHAcI/y6x4szSB\r\nKgSuhI3hjh3s7TybUC1U6AfoQGx/S7e3WwlCOrK8GTClirN/2mCPRC5wuIft\r\nnkoMfA6jK8d2OPrJ63shy5cgwHOjQg/xuk46dNS7tkvGmbaa+X0PgqSKB+Hf\r\nYPPNS/ylg911DH9qa8BqYU2QpNh9jUKXSF+HbaOM+plWkCSAL7czV+R3ABEB\r\nAAH+AwMI8l5bp5J/xgpguvHaT2pX/6D8eU4dvODsvYE9Y4Clj0Nvm2nu4VML\r\nniNb8qpzCXXfFqi1FWGrZ2msClxA1eiXfk2IEe5iAiY3a+FplTevBn6rkAMw\r\nly8wGyiNdE3TVWgCEN5YRaTLpfV02c4ECyKk713EXRAtQCmdty0yxv5ak9ey\r\nXDUVd4a8T3QMgHcAOTXWMFJNUjeeiIdiThDbURJEv+9F+DW+4w5py2iw0PYJ\r\nNm6iAHCjoPQTbGLxstl2BYSocZWxG1usoPKhbugGZK0Vr8rdpsfakjJ9cJUg\r\nYHIH3VT+y+u5mhY681NrB5koRUxDT6ridbytMcoK8xpqYG3FhC8CiVnzpDQ3\r\no1KRkWuxUq66oJhu0wungXcqaDzDUEfeUjMuKVI/d9/ViXy8IH/XdlOy0lLY\r\nOac0ovRjb7zgeVOp2e7N4eTu0dts3SE+Do1gyqZo2rf1dwsJQI9YUtpjYAtr\r\nNBkKyRvBAhg9KPh1y2Y1u3ra5OS0yGuNDD8pXdiN3kxMt5OBlnWeFjL6ll7+\r\nvgiKZooPUZPbFIWi4XBXTv7D5T9THDYmuJpcOffn1AA7j2FM8fkFvtiFyw9J\r\n2S14penv2R7TeybxR6ktD7HtZd34gmGvmOxhWRNU/vfp4SisUcu9jzQq+cJt\r\njoWuJiZ8xvWEC2DD32n9bWyIlGhS4hATqz/gEdSha8hxzT+GJi29jYjp8Hnc\r\n9HwxOArz6Q5h/nDN2Xt5PuCM65J0dathzAm0A7BLRQI+4OjTW575sRKvarzH\r\n8JZ+UYK2BgP4Kbh9JqhnD/2NKD/csuL6No5guyOH8+zekdBtFE394SV8e9N+\r\nzYgzVex4SDG8y/YO7W7Tp6afNb+sqyzEw5Bknypn0Hc3cr9wy1P8jLMM2woL\r\nGRDZ5IutCAV/D/h881dHJs0tV2hpdGVvdXQgVXNlciA8c2FmZXdpdGhtZS50\r\nZXN0dXNlckBnbWFpbC5jb20+wsBcBBABCAAQBQJSjg7aCRDX+5P837/CPAAA\r\n3ZwH/2AVGYB+8RDarP5a5uZPYSxJKeM8zHMbi7LKQWhr5NpkJajZdra1CCGZ\r\nTXTeQSRBvU4SNGOmDAlhf0qCGeXwMHIzrzovkBedHIc/vypEkItdJeXQAaJx\r\nuhQOnmyi9priuzBBx4e9x1aBn+aAdNGiJB4l13L2T4fow8WLIVpVwXB6BWya\r\nlz50JwLzJP6qHxkhvIZElTrQ+Yoo3stS6w/7wNtK/f3MIYkIGVVUrIDgzN0X\r\nm4z6ypN1dsrM6tPkMZ0JlqjHiz7DXpKrWsfNkoVZ9A98osMH2nIDS58JVEDc\r\nAXoFSLsbdmqFmIc2Ew828TjlX+FLU9tlx89WhSMTapzUjHU=\r\n=wxuK\r\n-----END PGP PRIVATE KEY BLOCK-----'
        },
        publicKey: {
            _id: 'D7FB93FCDFBFC23C',
            userId: testAccount.user,
            userIds: [{
                name: 'John Doe',
                emailAddress: testAccount.user
            }],
            publicKey: '-----BEGIN PGP PUBLIC KEY BLOCK-----\r\nVersion: OpenPGP.js v.1.20131116\r\nComment: Whiteout Mail - http://whiteout.io\r\n\r\nxsBNBFKODs4BB/9iOF4THsjQMY+WEpT7ShgKxj4bHzRRaQkqczS4nZvP0U3g\r\nqeqCnbpagyeKXA+bhWFQW4GmXtgAoeD5PXs6AZYrw3tWNxLKu2Oe6Tp9K/XI\r\nxTMQ2wl4qZKDXHvuPsJ7cmgaWqpPyXtxA4zHHS3WrkI/6VzHAcI/y6x4szSB\r\nKgSuhI3hjh3s7TybUC1U6AfoQGx/S7e3WwlCOrK8GTClirN/2mCPRC5wuIft\r\nnkoMfA6jK8d2OPrJ63shy5cgwHOjQg/xuk46dNS7tkvGmbaa+X0PgqSKB+Hf\r\nYPPNS/ylg911DH9qa8BqYU2QpNh9jUKXSF+HbaOM+plWkCSAL7czV+R3ABEB\r\nAAHNLVdoaXRlb3V0IFVzZXIgPHNhZmV3aXRobWUudGVzdHVzZXJAZ21haWwu\r\nY29tPsLAXAQQAQgAEAUCUo4O2gkQ1/uT/N+/wjwAAN2cB/9gFRmAfvEQ2qz+\r\nWubmT2EsSSnjPMxzG4uyykFoa+TaZCWo2Xa2tQghmU103kEkQb1OEjRjpgwJ\r\nYX9Kghnl8DByM686L5AXnRyHP78qRJCLXSXl0AGicboUDp5sovaa4rswQceH\r\nvcdWgZ/mgHTRoiQeJddy9k+H6MPFiyFaVcFwegVsmpc+dCcC8yT+qh8ZIbyG\r\nRJU60PmKKN7LUusP+8DbSv39zCGJCBlVVKyA4MzdF5uM+sqTdXbKzOrT5DGd\r\nCZaox4s+w16Sq1rHzZKFWfQPfKLDB9pyA0ufCVRA3AF6BUi7G3ZqhZiHNhMP\r\nNvE45V/hS1PbZcfPVoUjE2qc1Ix1\r\n=7Wpe\r\n-----END PGP PUBLIC KEY BLOCK-----'
        }
    };

    beforeEach(function(done) {
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
                folder: inboxFolder,
            }).then(function(messages) {
                expect(messages).to.exist;
                done();
            });
        });
    });

});