'use strict';

import mailreader from 'mailreader';

const ngModule = angular.module('woEmail');
ngModule.factory('mailreader', appConfig => {
    mailreader.startWorker(appConfig.config.workerPath + '/mailreader-parser-worker.min.js');
    return mailreader;
});