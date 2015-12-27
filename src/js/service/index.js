'use strict';

angular.module('woServices', ['woAppConfig', 'woUtil', 'woCrypto']);

require('./invitation');
require('./oauth');
require('./privatekey');
require('./publickey');
require('./hkp');
require('./lawnchair');
require('./devicestorage');
require('./auth');
require('./keychain');
require('./publickey-verifier');