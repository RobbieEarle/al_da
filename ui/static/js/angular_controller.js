// Module Initialization
var app = angular.module('al_da', ['ngAnimate', 'ui.bootstrap']);

// Socket Initialization
var socket = io.connect('http://' + document.domain + ':' + location.port);


/* ============== Controllers ==============*/

// MAIN: Controls main kiosk output console and output icon
app.controller('MainController', ['$scope',

    function MainController($scope) {


        // ----------------------- Default Property Values

        $scope.kiosk_img_new = '/static/images/scrape_no_conn.svg';
        $scope.kiosk_header = 'To submit files for analysis simply plug a ' +
            'block device (ie. USB device or external hard drive) into the terminal and wait for all files to be ' +
            'transferred to the Assemblyline server. Any files submitted in this manner may be subject to review / ' +
            'inspection by security personnel as necessary. Any and all information obtained in this way will be ' +
            'for internal use only and under no circumstances be released or shared without the explicit consent of ' +
            'the device owner.';
        $scope.kiosk_img = $scope.kiosk_img_new;
        $scope.kiosk_status = 'Please plug in a device to begin';
        $scope.show_main = true;
        $scope.kiosk_output = '';

        // ----------


        // ----------------------- Socket Event Listeners

        // Listens for initial connect message from the socketio server. Starts background thread to process input from
        // al_scrape
        socket.on('connect', function() {
            socket.emit('start');
        });

        // Listens for console output messages from al_scrape
        socket.on('output', function(output_txt){
            _.defer(function() {
                $scope.$apply(function () {

                    // If the console text is 'clear', clears the UI console
                    if (output_txt === 'clear') {
                        $scope.kiosk_output = '';
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
                    $scope.show_main = false;
                });
            });
        });

        // Listens for when files are being sent to server
        socket.on('loading', function(){
            _.defer(function() {
                $scope.kiosk_img_new = '/static/images/ripple2.svg';
                $scope.$apply(function () {
                    $scope.show_main = false;
                });
            });
        });

        // Listens for when all files have been sent to server
        socket.on('done_loading', function(img_url){
            _.defer(function() {
                $scope.kiosk_img_new = img_url;
                $scope.$apply(function () {
                    $scope.show_main = false;
                });
            });
        });

        // ----------


        // ----------------------- Animation Event Handlers

        // Called after show animation has completed on user_output_img
        $scope.afterMainShow = function() {
        }

        // Called after hide animation has completed on user_output_img. Switches the image src being shown and then
        // makes it automatically reappear
        $scope.afterMainHide = function() {
            _.defer(function(){
                $scope.$apply(function(){ $scope.kiosk_img = $scope.kiosk_img_new});
            });
            $scope.show_main = true;
        }

        // ----------

        $scope.action = function() {
            document.getElementById('results_scroll_to').scrollIntoView({behavior: 'smooth', block: 'start'});
        }

    }
]);

// RESULTS: Controls the results page that is brought up by main kiosk console
app.controller('ResultsController', ['$scope',

    function ResultsController($scope) {


        // ----------------------- Default Property Values

        // By default the results panel is not shown
        $scope.show_results = true;

        $scope.tbl_all_files = [{"alert": {"sid": "21aaa2dc-0c07-4892-aad7-1aaf85c681e6"},
            "entropy": 3.188721875540867, "md5": "a1ceb4b583d7a7a7f5a17d4cb48bb1b3",
            "metadata": {"al_score": 0, "filename": "WPSettings.dat",
                "path": "/home/user/al_ui/imported_files/dev/sdb1/temp_device/System Volume Information/WPSettings.dat",
                "ts": "2018-06-13T15:52:36.531014Z", "type": "TERMINAL"}, "overrides": {"classification": "U",
                "deep_scan": false, "description": "[TERMINAL] Inspection of file: WPSettings.dat",
                "generate_alert": false, "groups": ["ADMIN", "INTERNAL", "USERS"],
                "ignore_cache": false, "ignore_filtering": false, "max_extracted": 100, "max_supplementary": 100,
                "notification_queue": "nq-ingest_queue", "notification_threshold": null, "params": {}, "priority": 150,
                "profile": true, "resubmit_to": [], "scan_key": "67796ccbc4082aca0d2853d30bfb0bcav0",
                "selected": ["Extraction", "Static Analysis"], "submitter": "admin", "ttl": 1}, "priority": 150,
            "sha1": "bc6f55eceec05885d317848d6aa83546a4d20ccd",
            "sha256": "132eba38061e6afab4b530304b2c4ac79821df924c1adeb04b743b0f93741654", "size": 12,
            "type": "TERMINAL"}];

        // ----------


        // ----------------------- Socket Event Listeners

        // Listens for scroll events from al_scrape
        socket.on('scroll', function(scroll_location){
            // If the console text is 'scroll_results', scrolls down to results
            if (scroll_location === 'results'){
                _.defer(function() {

                    // Creates a new intersection observer which is used to detect when the results section
                    // comes on screen. When it does, we scroll to it
                    const intersectionObserver = new IntersectionObserver((entries) => {
                      let [entry] = entries;
                      if (entry.isIntersecting) {
                        setTimeout(() => document.getElementById('results_scroll_to').scrollIntoView({
                            behavior: 'smooth',
                            block: 'start'
                        }))
                      }
                    });
                    intersectionObserver.observe(results);

                    $scope.$apply(function () {
                        $scope.show_results = true;
                    });

                });
            }

            // If the console text is 'scroll_main', scrolls up to results
            else if (scroll_location === 'main'){
                _.defer(function() {
                    $scope.$apply(function () {
                        document.getElementById('main').scrollIntoView({
                            behavior: 'smooth',
                            block: 'start'
                        });
                    });

                });
            }
        });

        // Listens for output from al_scrape. If the command is clear, then the results page is made invisible
        socket.on('output', function(output_txt){
            if(output_txt === 'clear') {
                _.defer(function() {
                    $scope.$apply(function () {
                        $scope.show_results = false;
                    });
                });
            }
        });

        socket.on('all_files', function(all_files){
            _.defer(function() {
                $scope.$apply(function () {
                    console.log("Received files")
                    $scope.tbl_all_files = JSON.parse(all_files);
                });
            });
        });

        // ----------

    }
]);


/* ============== Directives ==============*/

// Handles show / hide events being applied to user_output_img. The myShow variable is linked to the show variable of
// the conroller; when its value is changed, an event is called accordingly to animate it fading in / out. Once the
// animation is complete, calls afterShow() or afterHide() as necessary
app.directive('mainShow', function($animate) {
    return {
        link: function (scope, elem, attr) {
            scope.$watch(attr.mainShow, function () {
                if (scope.show_main) {
                    $animate.removeClass(elem, 'hidden');
                    $animate.removeClass(elem, 'img-hide').then(scope.afterMainShow);
                }
                if (!scope.show_main) {
                    $animate.addClass(elem, 'hidden');
                    $animate.addClass(elem, 'img-hide').then(scope.afterMainHide);
                }
            });
        }
    }
});
