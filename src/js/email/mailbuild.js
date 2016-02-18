'use strict';

import Mailbuild from 'emailjs-mime-builder';

const ngModule = angular.module('woEmail');
ngModule.factory('mailbuild', () => Mailbuild);