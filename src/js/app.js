'use strict';

// init offline cache
import './offline-cache';

// import angular modules
import './app-config';
import './directive';
import './util';
import './crypto';
import './service';
import './email';

// import angular controllers for login views
import LoginCtrl from './controller/login/login';
import AddAccountCtrl from './controller/login/add-account';
import LoginPrivatekeyUploadCtrl from './controller/login/login-privatekey-upload';
import LoginVerifyPublickeyCtrl from './controller/login/login-verify-public-key';
import LoginExistingCtrl from './controller/login/login-existing';
import LoginInitialCtrl from './controller/login/login-initial';
import LoginNewDeviceCtrl from './controller/login/login-new-device';
import LoginPrivatekeyDownloadCtrl from './controller/login/login-privatekey-download';
import NavigationCtrl from './controller/app/navigation';

// import angular controllers for app views
import ReadCtrl from './controller/app/read';
import WriteCtrl from './controller/app/write';
import MailListCtrl from './controller/app/mail-list';
import AccountCtrl from './controller/app/account';
import SetPassphraseCtrl from './controller/app/set-passphrase';
import PublicKeyImportCtrl from './controller/app/publickey-import';
import ContactsCtrl from './controller/app/contacts';
import AboutCtrl from './controller/app/about';
import DialogCtrl from './controller/app/dialog';
import ActionBarCtrl from './controller/app/action-bar';
import StatusDisplayCtrl from './controller/app/status-display';


//
// Angular app config
//


// init main angular module including dependencies
const app = angular.module('mail', [
    'ngRoute',
    'ngAnimate',
    'ngTagsInput',
    'woAppConfig',
    'woDirectives',
    'woUtil',
    'woCrypto',
    'woServices',
    'woEmail',
    'infinite-scroll'
]);

// set router paths
app.config(($routeProvider, $animateProvider) => {
    $routeProvider.when('/login', {
        templateUrl: 'tpl/login.html',
        controller: LoginCtrl
    });
    $routeProvider.when('/add-account', {
        templateUrl: 'tpl/add-account.html',
        controller: AddAccountCtrl
    });
    $routeProvider.when('/login-privatekey-upload', {
        templateUrl: 'tpl/login-privatekey-upload.html',
        controller: LoginPrivatekeyUploadCtrl
    });
    $routeProvider.when('/login-verify-public-key', {
        templateUrl: 'tpl/login-verify-public-key.html',
        controller: LoginVerifyPublickeyCtrl
    });
    $routeProvider.when('/login-existing', {
        templateUrl: 'tpl/login-existing.html',
        controller: LoginExistingCtrl
    });
    $routeProvider.when('/login-initial', {
        templateUrl: 'tpl/login-initial.html',
        controller: LoginInitialCtrl
    });
    $routeProvider.when('/login-new-device', {
        templateUrl: 'tpl/login-new-device.html',
        controller: LoginNewDeviceCtrl
    });
    $routeProvider.when('/login-privatekey-download', {
        templateUrl: 'tpl/login-privatekey-download.html',
        controller: LoginPrivatekeyDownloadCtrl
    });
    $routeProvider.when('/account', {
        templateUrl: 'tpl/desktop.html',
        controller: NavigationCtrl,
        reloadOnSearch: false // don't reload controllers in main app when query params change
    });
    $routeProvider.otherwise({
        redirectTo: '/login'
    });

    // activate ngAnimate for whitelisted classes only
    $animateProvider.classNameFilter(/lightbox/);
});

app.run(($rootScope, oauth) => {
    // global state... inherited to all child scopes
    $rootScope.state = {};
    // attach fastclick
    FastClick.attach(document.body);
    // try to catch oauth token
    oauth.oauthCallback();
});

// inject controllers from ng-included view templates
app.controller('ReadCtrl', ReadCtrl);
app.controller('WriteCtrl', WriteCtrl);
app.controller('MailListCtrl', MailListCtrl);
app.controller('AccountCtrl', AccountCtrl);
app.controller('SetPassphraseCtrl', SetPassphraseCtrl);
app.controller('PublicKeyImportCtrl', PublicKeyImportCtrl);
app.controller('ContactsCtrl', ContactsCtrl);
app.controller('AboutCtrl', AboutCtrl);
app.controller('DialogCtrl', DialogCtrl);
app.controller('ActionBarCtrl', ActionBarCtrl);
app.controller('StatusDisplayCtrl', StatusDisplayCtrl);


//
// Manual angular bootstraping
//


// are we running in a cordova app or in a browser environment?
if (window.cordova) {
    // wait for 'deviceready' event to make sure plugins are loaded
    console.log('Assuming Cordova environment...');
    document.addEventListener('deviceready', bootstrap, false);
} else {
    // No need to wait on events... just start the app
    console.log('Assuming Browser environment...');
    bootstrap();
}

function bootstrap() {
    angular.element(document).ready(() => {
        angular.bootstrap(document, ['mail']);
    });
}