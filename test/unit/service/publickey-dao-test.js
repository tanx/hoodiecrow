'use strict';

var PGP = require('../../../src/js/crypto/pgp'),
    PublicKeyDAO = require('../../../src/js/service/publickey');

describe('Public Key DAO unit tests', function() {

    var pubkeyDao, pgpStub, hkpStub;

    beforeEach(function() {
        pgpStub = sinon.createStubInstance(PGP);
        hkpStub = sinon.createStubInstance(openpgp.HKP);
        pubkeyDao = new PublicKeyDAO(pgpStub);
        pubkeyDao._hkp = hkpStub;
    });

    afterEach(function() {});

    describe('get', function() {
        it('should fail', function(done) {
            hkpStub.lookup.returns(rejects(42));

            pubkeyDao.get('id').catch(function(err) {
                expect(err).to.exist;
                expect(hkpStub.lookup.calledOnce).to.be.true;
                done();
            });
        });

        it('should work', function(done) {
            var keyId = 'id';
            hkpStub.lookup.returns(resolves('asdf'));
            pgpStub.getKeyParams.returns({
                _id: keyId
            });

            pubkeyDao.get(keyId).then(function(key) {
                expect(key._id).to.equal('id');
                expect(key.publicKey).to.equal('asdf');
                expect(hkpStub.lookup.calledOnce).to.be.true;
                done();
            });
        });
    });

    describe('get by userId', function() {
        it('should fail', function(done) {
            hkpStub.lookup.returns(rejects(42));

            pubkeyDao.getByUserId('userId').catch(function(err) {
                expect(err).to.exist;
                expect(hkpStub.lookup.calledOnce).to.be.true;
                done();
            });
        });

        it('should react to 404', function(done) {
            hkpStub.lookup.returns(resolves());

            pubkeyDao.getByUserId('userId').then(function(key) {
                expect(key).to.not.exist;
                expect(hkpStub.lookup.calledOnce).to.be.true;
                done();
            });
        });

        it('should work', function(done) {
            hkpStub.lookup.returns(resolves('asdf'));
            pgpStub.getKeyParams.returns({
                _id: 'id'
            });

            pubkeyDao.getByUserId('userId').then(function(key) {
                expect(key._id).to.exist;
                expect(key.publicKey).to.exist;
                expect(hkpStub.lookup.calledOnce).to.be.true;
                done();
            });
        });
    });

    describe('put', function() {
        it('should fail', function(done) {
            hkpStub.upload.returns(resolves());

            pubkeyDao.put({
                _id: '12345',
                publicKey: 'asdf'
            }).then(function() {
                expect(hkpStub.upload.calledOnce).to.be.true;
                done();
            });
        });
    });

});