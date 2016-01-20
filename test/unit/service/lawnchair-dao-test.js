'use strict';

import LawnchairDAO from '../../../src/js/service/lawnchair';

var dbName = 'lawnchair@test.com';

var key = 'type_1';
var data = {
    name: 'testName1',
    type: 'testType1'
};

var key2 = 'type_2';
var data2 = {
    name: 'testName2',
    type: 'testType2'
};

describe('Lawnchair DAO unit tests', function() {
    var lawnchairDao;

    beforeEach(function(done) {
        lawnchairDao = new LawnchairDAO();
        lawnchairDao.init(dbName).then(function() {
            expect(lawnchairDao._db).to.exist;
            done();
        });
    });

    afterEach(function(done) {
        lawnchairDao.clear().then(done);
    });

    describe('init', function() {
        it('should fail', function(done) {
            lawnchairDao.init(undefined).catch(function(err) {
                expect(err).to.exist;
                done();
            });
        });
    });

    describe('list', function() {
        it('should fail', function(done) {
            lawnchairDao.list(undefined).catch(function(err) {
                expect(err).to.exist;
                done();
            });
        });
    });

    describe('remove list', function() {
        it('should fail', function(done) {
            lawnchairDao.removeList(undefined).catch(function(err) {
                expect(err).to.exist;
                done();
            });
        });
    });

    describe('persist/read/remove', function() {
        it('should fail when reading with no key', function(done) {
            lawnchairDao.read(undefined).catch(function(err) {
                expect(err).to.exist;
                done();
            });
        });

        it('should fail when persisting with no key', function(done) {
            lawnchairDao.persist(undefined, data).catch(function(err) {
                expect(err).to.exist;
                done();
            });
        });

        it('should fail when persisting with no key', function(done) {
            lawnchairDao.persist(key, undefined).catch(function(err) {
                expect(err).to.exist;
                done();
            });
        });

        it('should fail when persisting with no input', function(done) {
            lawnchairDao.persist(undefined, undefined).catch(function(err) {
                expect(err).to.exist;
                done();
            });
        });

        it('should work', function(done) {
            lawnchairDao.persist(key, data).then(function() {
                return lawnchairDao.read(key);
            }).then(function(fetched) {
                expect(fetched).to.deep.equal(data);
                return lawnchairDao.remove(key);
            }).then(function() {
                return lawnchairDao.read(key);
            }).then(function(fetched) {
                expect(fetched).to.not.exist;
                done();
            });
        });
    });

    describe('batch/list/removeList', function() {
        it('should fail', function(done) {
            lawnchairDao.batch({}).catch(function(err) {
                expect(err).to.exist;
                done();
            });
        });

        it('should filter only first type', function(done) {
            var list = [{
                key: key,
                object: data
            }, {
                key: key2,
                object: data2
            }];

            lawnchairDao.batch(list).then(function() {
                return lawnchairDao.list(key);
            }).then(function(fetched) {
                expect(fetched.length).to.equal(1);
                expect(fetched[0]).to.deep.equal(list[0].object);
                return lawnchairDao.removeList(key);
            }).then(function() {
                return lawnchairDao.list('type');
            }).then(function(fetched) {
                expect(fetched.length).to.equal(1);
                expect(fetched[0]).to.deep.equal(list[1].object);
                done();
            });
        });

        it('should filter only second type', function(done) {
            var list = [{
                key: key,
                object: data
            }, {
                key: key2,
                object: data2
            }];

            lawnchairDao.batch(list).then(function() {
                return lawnchairDao.list(key2);
            }).then(function(fetched) {
                expect(fetched.length).to.equal(1);
                expect(fetched[0]).to.deep.equal(list[1].object);
                return lawnchairDao.removeList(key2);
            }).then(function() {
                return lawnchairDao.list('type');
            }).then(function(fetched) {
                expect(fetched.length).to.equal(1);
                expect(fetched[0]).to.deep.equal(list[0].object);
                done();
            });
        });

        it('should filter all', function(done) {
            var list = [{
                key: key,
                object: data
            }, {
                key: key2,
                object: data2
            }];

            lawnchairDao.batch(list).then(function() {
                return lawnchairDao.list('type');
            }).then(function(fetched) {
                expect(fetched.length).to.equal(2);
                expect(fetched[0]).to.deep.equal(list[0].object);
                expect(fetched[1]).to.deep.equal(list[1].object);
                return lawnchairDao.removeList('type');
            }).then(function() {
                return lawnchairDao.list('type');
            }).then(function(fetched) {
                expect(fetched).to.exist;
                expect(fetched.length).to.equal(0);
                done();
            });
        });

        it('should filter none', function(done) {
            var list = [{
                key: key,
                object: data
            }, {
                key: key2,
                object: data2
            }];

            lawnchairDao.batch(list).then(function() {
                return lawnchairDao.list('type_3');
            }).then(function(fetched) {
                expect(fetched.length).to.equal(0);
                return lawnchairDao.removeList('type_3');
            }).then(function() {
                return lawnchairDao.list('type');
            }).then(function(fetched) {
                expect(fetched.length).to.equal(2);
                expect(fetched[0]).to.deep.equal(list[0].object);
                expect(fetched[1]).to.deep.equal(list[1].object);
                done();
            });
        });
    });

});