'use strict';

angular.module('woEmail', ['woAppConfig', 'woUtil', 'woServices', 'woCrypto']);

require('./mailreader');
require('./pgpbuilder');
require('./mailbuild');
require('./gmail-client');
require('./gmail');
require('./outbox');
require('./account');
require('./search');