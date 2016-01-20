'use strict';

import PgpBuilder from 'pgpbuilder';

const ngModule = angular.module('woEmail');
ngModule.factory('pgpbuilder', () => new PgpBuilder());