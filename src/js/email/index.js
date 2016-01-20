'use strict';

angular.module('woEmail', ['woAppConfig', 'woUtil', 'woServices', 'woCrypto']);

import './mailreader';
import './pgpbuilder';
import './mailbuild';
import './gmail-client';
import './gmail';
import './outbox';
import './account';
import './search';