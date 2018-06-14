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
        $scope.show_pass_header = false;
        $scope.show_mal_header = true;
        $scope.scan_success = false;
        $scope.no_files = false;

        $scope.tbl_mal_files = [{"alert": {"sid": "4242602c-16b3-4ce7-8f07-e1a0acf5680d"}, "entropy": 7.99979132865562,
            "md5": "a98d13885e7788529aaaae9e3a7826b1", "metadata": {"al_score": 3010,
                "filename": "282f5511c4fd43fbea6964ac71dca495.cart",
                "path": "/home/user/al_ui/imported_files/dev/sdb2/temp_device/282f5511c4fd43fbea6964ac71dca495.cart",
                "ts": "2018-06-13T19:26:23.960380Z", "type": "TERMINAL"}, "overrides": {"classification": "U",
                "deep_scan": false, "description": "[TERMINAL] Inspection of file: 282f5511c4fd43fbea6964ac71dca495.cart",
                "generate_alert": false, "groups": ["ADMIN", "INTERNAL", "USERS"], "ignore_cache": false,
                "ignore_filtering": false, "max_extracted": 100, "max_supplementary": 100,
                "notification_queue": "nq-ingest_queue", "notification_threshold": null, "params": {}, "priority": 150,
                "profile": true, "resubmit_to": [], "scan_key": "3a5272f260593de5f790bba35bf6b355v0",
                "selected": ["Extraction", "Static Analysis"], "submitter": "admin", "ttl": 1}, "priority": 150,
            "sha1": "7d142a3c8bebdd40c06a0747c9973036994b8e74",
            "sha256": "9abfe28034469dc17803dd5565afb86a09851de2df2c8f753832f4f41b756ad6",
            "size": 902026, "type": "TERMINAL"}];

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

        socket.on('mal_files_json', function(mal_files){
            if (!_.isEmpty(mal_files)) {
                _.defer(function () {
                    $scope.$apply(function () {
                        $scope.scan_success = false;
                        console.log("Parsing mal_files");
                        console.log(mal_files);
                        $scope.tbl_mal_files = JSON.parse(mal_files);
                    });
                });
            }
            else {
                _.defer(function() {
                    $scope.$apply(function () {
                        $scope.scan_success = true;
                    });
                });
            }
        });

        socket.on('pass_files_json', function(pass_files){
            if (!_.isEmpty(pass_files))
                _.defer(function() {
                    $scope.$apply(function () {
                        $scope.no_files = false;
                        $scope.show_pass_header = true;
                        $scope.tbl_pass_files = JSON.parse(pass_files);
                    });
                });
            else {
                _.defer(function () {
                    $scope.$apply(function () {
                        $scope.show_pass_header = false;
                        if ($scope.scan_success)
                            $scope.no_files = true;
                    });
                });
            }

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
