'use strict';

const AboutCtrl = function($scope, appConfig) {

    //
    // scope state
    //

    $scope.state.about = {
        toggle: function(to) {
            $scope.state.lightbox = (to) ? 'about' : undefined;
        }
    };

    //
    // scope variables
    //

    // reference the appConfig object since the version will be updated asynchronously after startup
    $scope.appConfig = appConfig;
    $scope.date = new Date();

};

export default AboutCtrl;