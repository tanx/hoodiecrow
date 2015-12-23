'use strict';

var GmailClient = require('../../../src/js/email/gmail-client'),
    Auth = require('../../../src/js/service/auth'),
    Base64Url = require('../../../src/js/util/base64url');

describe('Gmail Client unit test', function() {
    var client, authStub, base64url;

    beforeEach(function() {
        authStub = sinon.createStubInstance(Auth);
        base64url = new Base64Url();
        client = new GmailClient(authStub, base64url);
    });

    afterEach(function() {});

    describe('login', function() {
        it('should work', function(done) {
            authStub.getOAuthToken.returns(resolves());

            client.login().then(function() {
                expect(authStub.getOAuthToken.callCount).to.equal(1);
                done();
            });
        });

        it('should retry for expired oauth token', function(done) {
            authStub.getOAuthToken.returns(rejects({
                code: 401
            }));

            client.login().catch(function(err) {
                expect(err.code).to.equal(401);
                expect(authStub.getOAuthToken.callCount).to.equal(2);
                done();
            });
        });

        it('should retry ', function(done) {
            authStub.getOAuthToken.returns(rejects({
                code: 400
            }));

            client.login().catch(function(err) {
                expect(err.code).to.equal(400);
                expect(authStub.getOAuthToken.callCount).to.equal(1);
                done();
            });
        });
    });

    describe('logout', function() {
        it('should work', function(done) {
            authStub.flushOAuthToken.returns(resolves());

            client.logout().then(function() {
                expect(authStub.flushOAuthToken.callCount).to.equal(1);
                done();
            });
        });
    });

    describe('Api Requests', function() {
        beforeEach(function() {
            sinon.stub(client, '_apiRequest');
        });

        afterEach(function() {
            client._apiRequest.restore();
        });

        describe('send', function() {
            it('should work', function(done) {
                client._apiRequest.returns(resolves());

                client.send({
                    raw: 'rfcMessage'
                }).then(function() {
                    expect(client._apiRequest.callCount).to.equal(1);
                    done();
                });
            });
        });

        describe('listMessageIds', function() {
            it('should work', function(done) {
                client._apiRequest.returns(resolves({
                    messages: [{}]
                }));

                client.listMessageIds({
                    raw: 'rfcMessage'
                }).then(function(messages) {
                    expect(client._apiRequest.callCount).to.equal(1);
                    expect(messages.length).to.equal(1);
                    done();
                });
            });
        });

        describe('getMessage', function() {
            it('should work for encrypted PGP/MIME message', function(done) {
                var gMsg = {
                    historyId: "797943",
                    id: "151cce38cb790ee1",
                    internalDate: "1450841443000",
                    labelIds: [],
                    payload: {
                        headers: [{
                            name: "Subject",
                            value: "PGP/MIME send test"
                        }, {
                            name: "From",
                            value: "safewithme.testuser@gmail.com"
                        }],
                        body: {},
                        filename: "",
                        mimeType: "multipart/encrypted",
                        parts: [{
                            body: {
                                attachmentId: "1",
                                size: 10
                            },
                            filename: "",
                            headers: [],
                            mimeType: "application/pgp-encrypted",
                            partId: "0"
                        }, {
                            body: {
                                attachmentId: "2",
                                size: 2595
                            },
                            filename: "encrypted.asc",
                            headers: [],
                            mimeType: "application/octet-stream",
                            partId: "1"
                        }]
                    },
                    sizeEstimate: 3765,
                    threadId: "151cce38cb790ee1"
                };
                var message = {};

                client._apiRequest.returns(resolves(gMsg));

                client.getMessage(message).then(function() {
                    expect(client._apiRequest.callCount).to.equal(1);
                    expect(message.subject).to.exist;
                    expect(message.bodyParts[0].type).to.equal('encrypted');
                    expect(message.bodyParts[0].attachmentId).to.equal('2');
                    done();
                });
            });
        });

        describe('getAttachment', function() {
            var gAttachment = '{"size":2599,"data":"LS0tLS1CRUdJTiBQR1AgTUVTU0FHRS0tLS0tDQpWZXJzaW9uOiBPcGVuUEdQLmpzIHYxLjQuMQ0KQ29tbWVudDogV2hpdGVvdXQgTWFpbCAtIGh0dHBzOi8vd2hpdGVvdXQuaW8NCg0Kd2NCTUExWCtSUnZPSFliK0FRZ0Foek54NThCR01jRWVoc2tUM0FZUitlSTBtY0VHcktwNUlSRWxWTFphDQpsQ2tFazdtWUNici9ib284V1F1QTh1K1FRME5RNDBzS3JTeUhVVzFsVWt3UmJtZWVzQnVjRmsyakxPSzYNCk1uU0RZd08xdUdNOWtBWkd1cVNQTW5oSWlqYWkrbERnSGF2UkNLSjFnODJCRTBxUzZIR0NuRUs5b1p1dg0KWHlwTGtLYWRNM2lLQktmQ2hVOW1MTjJyaWpGdDEyUEdxR01hZkhXWXJNRUpQcUx1ZXpKN1BuanFUVzhxDQo5c3pmbU5kNFZwdjQ2WTNPRTRlMVdoN0VFWHZQVE1xK1g3Yzg3UE5CbVBxSEQ1UWtYcXFUaC96bjBTR2UNCnVOUjJqSEdOSWJPSUZqOFN1QWJFT0dZQUM1YnhDTVhGUUpBWEtxaFFSelVHVktCY3JyMi9QNVphK1BCbA0KNnRMRkp3RTM0RnhZS1o0QS9EZ2szOWREWDRWTTduZEVGSDNMSUR4VmRrL3lONnY2Qy8rdjZpUEk4Rk9YDQpHMnFyQ0ZHNUozSElaWEp0akpaUHpZMWxWb25nVUdjL0s4TWNXMC9jOWtWcGlTL1lEbGNCbmVaWUN1ZTgNClhSTXg4b2hJNEtRaCtyUFM4dXFueWc4NjI3UWFPNGdmVHNMeU5NV0JXVnFsSGVEK0lPZEQwcmtmbTBQUg0KN1hOMmpJaUhCcFlhNThENjNMTUVTVXQyZjNiNU1BTmlraWc3cXhDc2lqbnBLdzRmWHcrQVhTSXZuNzl0DQpRbit3TFJEWm1ZRk53eC9yRkpKY0dvdE1rZkpJU0ZTSUFPOTB1K1h2KzFxS2pvdEhHNjBjNEs1YnQ2RVENClFNZDV6SEsyM2tja2l0WjV0d1dNOTZ3clI3aU01UVpmRU45T3VnemllOWR0cmI1WFVUV1NNZ0c5RE9Jbw0KTTJtM1JPNGljQTU2Ykh2bi9kb2h5VEg2ODRNeDRhNE40Y1ptbHlvVk5ld0t3UlI0RVl0MHVlZWhvSk5MDQpOWEs4ZmVzZWFlbkg5cEpDNE0xYnNqOGgzQy9nYzYzMzQ5Q3ZsUi9iZnVOVGJkdjBZeXJ3bUJvK2QvcHcNCkphVndJcEx4ODFodEJrRVZwOUw0Ky9LYndYMFkzNHo1NWNQZTJRRE5abW54ZlJTT3N6dm9nN3cvTS9LUg0KdnpiSkFBOW1wQXV3ZUs4U2ZrKy9vRjg1Y2JmMS9FUE9LK3pjS2RTc1NzNWhuQmVTOERjbXFDUUxPaUltDQpXU1JZSXJaS1k0eDVkbS9aOXNncG9XZzluZkJaRG03Ti9BbTJWSlpyZ1puQkFzcUhHSGF1SllwZlJIYTMNCmx4UUtIRms0OFZLUDhzcUVIOGtla0hlWE1HMG1CVXF1NGZ0QTlPcXQ3ZnB5N0JmVm90dlNDMUFEenhVbQ0KVkVFdVNxaW5iUFJ6bG5JS1hJdzRhMGd6dWVJdHk4S3RTWW9GaUNVT2lkSUtmMThadzZVd3UxblQ1L29tDQpvK2o3cTlYVk1qN0NYamo3bVFWaCtCUldmMGdBSDNiNm5FSWVlcGhjOXFBWHdra0FEaVMyTFVmUmJiQlQNCng5NUpoYWNyZmZITW1EQURCWktjaEJUZHFFZjFwVHdiUjJTWStmYStDbFE0L3Y1d28vSXBXU1lUMFRsZg0KSnk5dWJ4R3Rvdk1uQnRJTGNFQ01rZ2hPRExKMFNRd3Rzd01RNDBJWmdMYncwYnd1bU9YbTZzWlE2eTJTDQprTEJPYzZod2NocGdMMjN4Z3lQNjhvSk1oNFhQaWFQMkgzWC9WN3BuaWdkVVJxcW11WjBxc1FHK2loMTUNCkhwN3hDdS85YSt2VGE4MTNDU2NmbGpqY29LYWdNaU1JM0hPQ2MwWTlpeUdrNXMxQkdvUG5pa01XSnE3Nw0KYVhkbHpqR3JNZTV1a3YwOWpzRktxaVlRUWhwUmYyWTBjOWx5azlrQkVIeC9xQkk3MC9hTkZNSlplQW0rDQo4ZGRkaHJQWFVTZDNsaUs1QVRtek42cEVMQzNZWXR2UXV3MFZDYnE0b016N3BzNkxSdEtKWWJBQWhON2gNCnlRTGpTSmVITHMzbklXQUplemhpa0ZSUGgrTVNtM3FiYUFNT3FqNSthKy9EZjFiVjZuamltelNBQVM0NA0KTGp4OFJMaU40U1pwYzNMdFdPVGhYS0dTV2ZuK2Y1bFVFYWdUeDRsWFh4THFLbnJSczhxTnhXSDRRL3pYDQo0ZXNROENWaEU2ZlNpYnd4TURKd0RSSG9ROWlNckJuUkVCTHRlSStDTjJFVldLMGo4SWFndWJvNkw5TGENCnBUeDd6VFc4aHBOTDNXOTIyVXJOcVM5cUhxTXh2VVBwd3NsSDVFQUhlMTUrNVpMdk1KWnAxZmlBZTRtbA0KL3lGbGFlY2w1MEdqVGU2LzYxeEdSL1FzS0cvSU9sUGhTSDNWUnMzQ0NVZmUvWkkyT3lxZ2ZHbWZkQmhkDQpFZDY2NHNoRDFZVWFmaWZaNitNL3Z3Q3JDMGovd1dZU0JKemxPbHFaWlRKN3dOUlhSUG02ajFGR2pVTVQNClNUQlV5QnhYODdkdUk2ZGVGUnEzYWZucFVqbHM2eTlTam5hK1FqVVdWQ2N4cEFJeE9qWDI2b21ZdlFuYw0Ka3AzN0QwZFR5dUZ5MUdvZlI5ZVd3c2E5SHNnRHZlZENRaVBZNlBVMVQzN0xobkQ4d2hWVVFFSC9Fa212DQo5TjlEVDRhL0JJNFRObUlJWVJGOHM0K3NwdXNveWcwcXYvUzFrbFBTQmRoOTd5dXIyK0pvZnVzcWxwMngNCndSSEdZS0RtNVJMWlE2c2Q2Z0FYdHN4aGlYSENsNXhUcGFUOTlxeUNFSE54azUwcUp3U2Z3NEcrSmVFOA0KUWx1RkNqZkNCNzFnOEhrblI2UUVwdnZsOUpuaG5pQnFINEZXdlZCbUZaaEx2cHF4MHhLMjhRbGpyYThPDQoxL3RyOXRTcUlyeTlNSDAvT0RtUjFUSE5UM3ZtODhOckhKNkpMbnhsdU5hOXprZk5TazNDVXJ1aVkvc2QNClZsK0FidDh2Nmt6M0tHZmdCc3ovTjRiNGJUbUlsV2xEZHNIRVlNUXpmb0ZMbVlmckwrWlhBN1dtNTRyMg0KWXJMTFdZSXpoTjRhdXc0SnE1VFU1WldpV1czekpEbzk5VkdraHdCYg0KPXA4cCsNCi0tLS0tRU5EIFBHUCBNRVNTQUdFLS0tLS0NCg=="}';
            var opt = {
                message: {
                    id: '151cce38cb790ee1',
                    bodyParts: [{
                        attachmentId: '2'
                    }]
                },
                attachmentId: '2'
            };

            it('should work', function(done) {
                client._apiRequest.returns(resolves(JSON.parse(gAttachment)));

                client.getAttachment(opt).then(function() {
                    expect(client._apiRequest.callCount).to.equal(1);
                    expect(opt.message.bodyParts[0].content).to.exist;
                    done();
                });
            });
        });

        describe('listFolders', function() {
            it('should work', function(done) {
                client._apiRequest.returns(resolves({
                    labels: [{
                        id: 'INBOX',
                        name: 'INBOX'
                    }, {
                        id: 'SENT',
                        name: 'SENT'
                    }]
                }));

                client.listFolders().then(function(folders) {
                    expect(client._apiRequest.callCount).to.equal(1);
                    expect(folders[0].name).to.exist;
                    expect(folders[0].path).to.exist;
                    expect(folders[0].messages).to.exist;
                    done();
                });
            });
        });
    });

    describe('_apiRequest', function() {
        beforeEach(function() {
            sinon.stub(window, 'fetch');
        });

        afterEach(function() {
            window.fetch.restore();
        });

        it('should work', function(done) {
            window.fetch.returns(fetchOk({
                id: '0'
            }));

            var opt = {
                resource: 'messages/0',
                params: {
                    format: 'full'
                }
            };

            client._apiRequest(opt).then(function(response) {
                expect(response.id).to.exist;
                done();
            });
        });

        it('should fail with 400', function(done) {
            window.fetch.returns(fetchError(400, {
                error: {
                    message: 'Invalid request!'
                }
            }));

            var opt = {
                resource: 'messages/0'
            };

            client._apiRequest(opt).catch(function(err) {
                expect(err.code).to.equal(400);
                expect(err.message).to.match(/request/);
                expect(authStub.flushOAuthToken.callCount).to.equal(0);
                done();
            });
        });

        it('should fail with 401 and flush oauth token', function(done) {
            window.fetch.returns(fetchError(401, {
                error: {
                    message: 'Invalid credentials!'
                }
            }));
            authStub.flushOAuthToken.returns(resolves());

            var opt = {
                resource: 'messages/0'
            };

            client._apiRequest(opt).catch(function(err) {
                expect(err.code).to.equal(401);
                expect(err.message).to.match(/credentials/);
                expect(authStub.flushOAuthToken.callCount).to.equal(1);
                done();
            });
        });
    });

});