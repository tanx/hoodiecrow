'use strict';

import Mailbuild from 'mailbuild';

const ngModule = angular.module('woEmail');
ngModule.factory('mailbuild', () => Mailbuild);