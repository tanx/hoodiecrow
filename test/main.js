'use strict';

import './bind-polyfill';
import appConfig from '../src/js/app-config';
import axe from 'axe-logger';

// import angular modules
import '../src/js/app-config';
import '../src/js/util';
import '../src/js/crypto';
import '../src/js/service';
import '../src/js/email';

//
// Test setup
//

chai.config.includeStack = true;

// set worker path for tests
appConfig.config.workerPath = '../lib';

axe.removeAppender(axe.defaultAppender);

//
// Global mocks
//

window.qMock = (res, rej) => new Promise(res, rej);

window.resolves = val => new Promise(res => res(val));

window.rejects = val => new Promise((res, rej) => rej(val));

window.fetchOk = body => {
    const mockResponse = new window.Response(JSON.stringify(body), {
        status: 200,
        headers: {
            'Content-type': 'application/json'
        }
    });
    return resolves(mockResponse);
};

window.fetchError = (status, body) => {
    const mockResponse = new window.Response(JSON.stringify(body), {
        status: status,
        headers: {
            'Content-type': 'application/json'
        }
    });
    return resolves(mockResponse);
};