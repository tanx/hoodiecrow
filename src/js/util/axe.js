'use strict';

const axe = require('axe-logger');

const ngModule = angular.module('woUtil');
ngModule.factory('axe', () => axe);