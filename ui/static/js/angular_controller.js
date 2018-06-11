var app = angular.module('al_da', ['ngAnimate']);

app.controller('MainController', ['$scope',

    function MainController($scope) {

        // ----------------------- Default Element Values
        $scope.kiosk_img_new = '/static/images/scrape_no_conn.svg';
        $scope.kiosk_header = 'To submit files for analysis simply plug a ' +
            'block device (ie. USB device or external hard drive) into the terminal and wait for all files to be ' +
            'transferred to the Assemblyline server. Any files submitted in this manner may be subject to review / ' +
            'inspection by security personnel as necessary. Any and all information obtained in this way will be ' +
            'for internal use only and under no circumstances be released or shared without the explicit consent of ' +
            'the submitter.'
        $scope.kiosk_img = $scope.kiosk_img_new;
        $scope.kiosk_status = 'Please plug in a device to begin'
        $scope.show = true;
        $scope.kiosk_output = '';

        // ----------------------- Socket Initialization
        var socket = io.connect('http://' + document.domain + ':' + location.port);
        socket.on('connect', function() {
            socket.emit('start');
        });

        // -------- Socket Event Listeners

        // Listens for Pyhton loogger output to be shown in UI console
        socket.on('output', function(output_txt){
            _.defer(function() {
                $scope.$apply(function () {

                    // If the console text is 'clear', clears the UI console
                    if (output_txt === 'clear') {
                        $scope.kiosk_output = '';
                    }
                    // If the console text is 'scan_complete', scrolls down to results
                    else if (output_txt === 'scroll_results'){
                        _.defer(function() {
                            $scope.$apply(function () {
                                document.getElementById('results_scroll_to').scrollIntoView({
                                    behavior: 'smooth',
                                    block: 'start'
                                });
                            });
                        });
                    }
                    else if (output_txt === 'scroll_main'){
                        _.defer(function() {
                            $scope.$apply(function () {
                                document.getElementById('main').scrollIntoView({
                                    behavior: 'smooth',
                                    block: 'start'
                                });
                            });
                        });
                    }
                    // Otherwise, outputs to the UI console
                    else
                        $scope.kiosk_output = $scope.kiosk_output + '\r\n' + output_txt;

                    // Makes sure UI console keeps scrolling down automatically when UI console overflows
                    var textarea = document.getElementById('kiosk_output_txt');
                    textarea.scrollTop = textarea.scrollHeight;

                });
            });
        });

        // Listens for when a device is connected
        socket.on('device_conn', function(img_url){
            _.defer(function() {
                $scope.kiosk_img_new = img_url;
                $scope.$apply(function () {
                    $scope.show = false;
                });
            });
        });

        // Listens for when files are being sent to server
        socket.on('loading', function(){
            _.defer(function() {
                $scope.kiosk_img_new = '/static/images/ripple2.svg';
                $scope.$apply(function () {
                    $scope.show = false;
                });
            });
        });

        // Listens for when all files have been sent to server
        socket.on('done_loading', function(img_url){
            _.defer(function() {
                $scope.kiosk_img_new = img_url;
                $scope.$apply(function () {
                    $scope.show = false;
                });
            });
        });


        // ----------------------- Animation Event Handlers

        // Called after show animation has completed on user_output_img
        $scope.afterShow = function() {
        }

        // Called after hide animation has completed on user_output_img. Switches the image src being shown and then
        // makes it automatically reappear
        $scope.afterHide = function() {
            _.defer(function(){
                $scope.$apply(function(){ $scope.kiosk_img = $scope.kiosk_img_new});
            });
            $scope.show = true;
        }

        // $scope.play = function() {
        //     document.getElementById('results_scroll_to').scrollIntoView({behavior: 'smooth', block: 'start'});
        //     // $location.hash('results_scroll_to');
        //     // $anchorScroll();
        // }

    }

]);


// ----------------------- Animation Listeners

// Handles show / hide events being applied to user_output_img. The myShow variable is linked to the show variable of
// the conroller; when its value is changed, an event is called accordingly to animate it fading in / out. Once the
// animation is complete, calls afterShow() or afterHide() as necessary.
app.directive('myShow', function($animate) {
return {
    scope: {
        'myShow': '=',
        'afterShow': '&',
        'afterHide': '&'
    },
    link: function(scope, element) {
        scope.$watch('myShow', function(show) {
            if (show) {
                $animate.removeClass(element, 'hidden');
                $animate.removeClass(element, 'my-hide').then(scope.afterShow);
            }
            if (!show) {
                $animate.addClass(element, 'hidden');
                $animate.addClass(element, 'my-hide').then(scope.afterHide);
            }
        });
    }
};
});
