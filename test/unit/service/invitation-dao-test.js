'use strict';

import InvitationDAO from '../../../src/js/service/invitation';
import appConfig from '../../../src/js/app-config';

describe('Invitation DAO unit tests', function() {
    var invitationDao,
        alice = 'zuhause@aol.com',
        bob = 'manfred.mustermann@musterdomain.com';

    beforeEach(function() {
        invitationDao = new InvitationDAO(appConfig);
    });

    describe('createMail', function() {
        it('should work', function() {
            var mail = invitationDao.createMail({
                recipient: alice,
                sender: bob
            });

            expect(mail).to.exist;
        });
    });
});