'use strict';

import axe from 'axe-logger';

const ngModule = angular.module('woUtil');
ngModule.factory('axe', () => axe);