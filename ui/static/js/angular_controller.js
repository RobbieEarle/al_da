// Module Initialization
var app = angular.module('al_da', ['ngAnimate', 'ui.bootstrap']);

// Socket Initialization
var socket = io.connect('http://' + document.domain + ':' + location.port);


/* ============== Controllers ==============*/

// MAIN: Controls main kiosk output console and output icon
app.controller('MainController', ['$scope', '$rootScope',

    function MainController($scope, $rootScope) {


        // ----------------------- Default Property Values
        $scope.kiosk_header = '*To submit files for analysis please enter valid credentials, plug a ' +
            'block device (ie. USB device or external hard drive) into the terminal, and wait for all files to be ' +
            'transferred to the Assemblyline server. Any files submitted in this manner may be subject to review / ' +
            'inspection by security personnel as necessary. Any and all information obtained in this way will be ' +
            'for internal use only and under no circumstances be released or shared without the explicit consent of ' +
            'the device owner.';
        $scope.kiosk_img = '/static/images/scrape_no_conn.svg';
        $scope.kiosk_img_sub = 'Please attach device';
        $scope.deviceEvent = '';
        $scope.deviceConnected = false;
        $scope.kiosk_output = '';
        $scope.hide_output = false;
        $scope.fName = '';
        $scope.lName = '';
        $scope.credentialsGiven = false;
        $scope.scan_finished = false;
        $scope.currScreen = 0;
        $scope.btnText = "Start new session";
        $scope.vmRestart = true;
        $scope.show_refresh = true;

        $scope.files_submitted = 0;
        $scope.files_received = 0;
        $scope.files_waiting = 0;
        $scope.percentageReceived = 0;
        $scope.percentageSent = 0;
        $scope.received_outout = '';
        $scope.submit_outout = '';
        $scope.receivedType = 'received';
        $scope.sentType = 'sent';


        // ----------


        // ----------------------- Socket Event Listeners

        // Listens for initial connect message from the socketio server. Starts background thread to process input from
        // al_scrape
        socket.on('connect', function() {
            socket.emit('start');
        });

        // Listens for output from al_scrape. If the command is clear, then the output console is cleared
        socket.on('clear', function(){
            _.defer(function() {
                $scope.$apply(function () {
                    $scope.kiosk_output = '';
                });
            });
        });

        // Listens for console output messages from al_scrape
        socket.on('output', function(output_txt){
            _.defer(function() {
                $scope.$apply(function () {

                    // Outputs text to console
                    $scope.kiosk_output = $scope.kiosk_output + '\r\n' + output_txt;

                    // Makes sure UI console keeps scrolling down automatically when UI console overflows
                    var textarea = document.getElementById('kiosk_output_txt');
                    textarea.scrollTop = textarea.scrollHeight;

                });
            });
        });

        socket.on('update_ingest', function(args){
            _.defer(function() {
                $scope.$apply(function () {

                    if (args === 'submit_file') {
                        $scope.files_submitted++;
                    }
                    else if (args === 'receive_file') {
                        $scope.files_received++;
                        $scope.percentageReceived = 100 * ($scope.files_received / $scope.files_submitted);
                    }

                    $scope.percentageSent = 100 - $scope.percentageReceived;
                    $scope.files_waiting = $scope.files_submitted - $scope.files_received;

                    if ($scope.files_waiting !== 0) {
                        $scope.receivedType = 'received';
                        $scope.sentType = 'sent';
                        $scope.received_output = "Scanned: " + $scope.files_received;
                        $scope.submit_output = "Queue: " + $scope.files_waiting;
                    }
                    else if (!$scope.scan_finished){
                        setTimeout(function(){
                            if ($scope.files_waiting === 0 && !$scope.scan_finished) {
                                _.defer(function() {
                                    $scope.$apply(function () {
                                        $scope.receivedType = 'scanning';
                                        $scope.received_output = "Searching for more files";
                                    });
                                });
                            }
                        }, 1000);
                    }

                });
            });
        });

        // Listens for when a device is connected
        socket.on('dev_event', function(event){

            if (event === 'done_loading')
                _.defer(function() {
                    $scope.$apply(function () {$scope.scan_finished = true;});
                    $scope.receivedType = 'done';
                    $scope.received_output = "All files successfully scanned";
                    $scope.kiosk_img = '/static/images/scrape_pass.svg';
                    $scope.kiosk_img_sub = "Session complete";

                    setTimeout(function(){
                        _.defer(function() {
                            $scope.$apply(function () {
                                $scope.hide_output = true;
                            })
                        })
                    }, 1000);

                    setTimeout(function(){
                        _.defer(function() {
                            $scope.$apply(function () {
                                $rootScope.$emit("ScrollResults", {});
                            })
                        })
                    }, 1000);

                });

            else if (event === 'connected') {
                _.defer(function () {
                    $scope.$apply(function () {
                        $scope.files_submitted = 0;
                        $scope.files_received = 0;
                        $scope.files_waiting = 0;
                        $scope.percentageReceived = 0;
                        $scope.percentageSent = 0;
                        $scope.received_outout = '';
                        $scope.submit_outout = '';
                        $scope.receivedType = 'received';
                        $scope.sentType = 'sent';
                        $scope.kiosk_output = '';
                        $scope.hide_output = false;
                    });
                });
            }

            else if (event === 'disconnected') {

                if ($scope.scan_finished) {

                    socket.emit('vm_control', 'restart');
                    $scope.vmRestart = true;

                    _.defer(function () {
                        $scope.$apply(function () {

                            const intersectionObserver = new IntersectionObserver((entries) => {
                                let [entry] = entries;
                                if (entry.isIntersecting) {
                                    setTimeout(() => document.getElementById('main').scrollIntoView({
                                        behavior: 'smooth',
                                        block: 'start'
                                    }))
                                }
                            });
                            intersectionObserver.observe(results);

                        });

                    });

                    setTimeout(function(){
                        _.defer(function() {
                            $scope.$apply(function () {
                                if ($scope.vmRestart)
                                    $scope.show_refresh = true;
                            });
                        });
                    }, 2000);

                }

                else {

                    $scope.files_submitted = 0;
                    $scope.files_received = 0;
                    $scope.files_waiting = 0;
                    $scope.percentageReceived = 0;
                    $scope.percentageSent = 0;
                    $scope.received_outout = '';
                    $scope.submit_outout = '';
                    $scope.receivedType = 'received';
                    $scope.sentType = 'sent';

                    setTimeout(function(){
                        _.defer(function() {
                            $scope.$apply(function () {
                                $scope.hide_output = true;
                            })
                        })
                    }, 1000);

                }

            }

            _.defer(function() {
                $scope.$apply(function () {
                    $scope.deviceEvent = event;
                });
            });

        });

        socket.on('vmOn', function(){
            _.defer(function(){
                $scope.$apply(function(){
                    $scope.vmRestart = false;
                    $scope.show_refresh = false;
                });
            });
        });

        // ----------


        // ----------------------- Animation Event Handlers

        // Called after show animation has completed on user_output_img
        $scope.outputHeaderAfterShow = function() {
            $scope.deviceEvent = '';
        };

        // Called after hide animation has completed on user_output_img. Switches the image src being shown and then
        // makes it automatically reappear
        $scope.outputHeaderAfterHide = function() {
            _.defer(function(){
                $scope.$apply(function(){

                    $scope.deviceConnected = !$scope.deviceConnected;
                    if ($scope.deviceConnected){
                        $scope.kiosk_img = '/static/images/scrape_conn.svg';
                        $scope.kiosk_img_sub = 'Device connected';
                    }
                    else if (!$scope.deviceConnected && !$scope.scan_finished){
                        $scope.kiosk_img = '/static/images/scrape_no_conn.svg';
                        $scope.kiosk_img_sub = 'Please attach device';
                    }

                    $scope.deviceEvent = 'done';

                });
            });
        };

        // ----------


        // ----------------------- Button Event Handlers

        $scope.btnHandleNav = function() {
            if ($scope.currScreen === 0)
                _.defer(function() {
                    $scope.$apply(function () {
                        $scope.btnText = "Confirm credentials"
                        $scope.currScreen++;
                    });
                });
            if ($scope.currScreen === 1)
                _.defer(function() {
                    $scope.$apply(function () {
                        $scope.btnText = "End session"
                        $scope.currScreen++;
                        socket.emit('session_credentials', $scope.fName, $scope.lName);
                    });
                });
            if ($scope.currScreen === 2) {

                if (!$scope.scan_finished){
                    socket.emit('vm_control', 'restart');
                    $scope.vmRestart = true;
                    setTimeout(function(){
                        _.defer(function() {
                            $scope.$apply(function () {
                                if ($scope.vmRestart)
                                    $scope.show_refresh = true;
                            });
                        });
                    }, 3000);
                }

                $scope.newSession();

            }
        };

        // ----------


        // ----------------------- Helper Functions

        $scope.newSession = function() {

            $rootScope.$emit("ClearResults", {});

            setTimeout(function(){
                _.defer(function() {
                    $scope.$apply(function () {
                        $scope.currScreen = 0;
                        $scope.btnText = "Start new session";
                        // socket.emit('vm_control', 'off');
                    })
                })
            }, 500);

            setTimeout(function(){
                _.defer(function() {
                    $scope.$apply(function () {

                        $scope.kiosk_img = '/static/images/scrape_no_conn.svg';
                        $scope.kiosk_img_sub = 'Please attach device';
                        $scope.deviceEvent = '';
                        $scope.deviceConnected = false;
                        $scope.kiosk_output = '';
                        $scope.hide_output = false;
                        $scope.fName = '';
                        $scope.lName = '';
                        $scope.credentialsGiven = false;
                        $scope.scan_finished = false;

                        $scope.files_submitted = 0;
                        $scope.files_received = 0;
                        $scope.files_waiting = 0;
                        $scope.percentageReceived = 0;
                        $scope.percentageSent = 0;
                        $scope.received_outout = '';
                        $scope.submit_outout = '';
                        $scope.receivedType = 'received';
                        $scope.sentType = 'sent';

                    });
                });
            }, 1500);

        };

    }
]);

// RESULTS: Controls the results page that is brought up by main kiosk console
app.controller('ResultsController', ['$scope', '$rootScope',

    function ResultsController($scope, $rootScope) {


        // ----------------------- Default Property Values

        // By default the results panel is not shown
        $scope.show_results = false;
        $scope.show_pass_header = true;
        $scope.scan_success = false;
        $scope.no_files = false;
        $scope.file_tree = [];
        $scope.clear_results = false;
        $scope.tbl_pass_files = [];
        $scope.tbl_mal_files = [];
        $scope.pass_message = "Use of this device on-site is permitted."
        $scope.failure_message = "Use of this device on-site is strictly prohibited without exception. " +
            "An alert for this session has been generated - for more information on why this device was flagged " +
            "and for repair advice, please contact network administration.";

        // $scope.tbl_pass_files = [{"alert": {"sid": "ae638cb2-473b-42f7-9fdb-a6b343b0dff2"},
        //     "entropy": 7.998910633683879, "md5": "9b7e276dbf10e878bbb1da3a3527298b", "metadata": {"al_score": 10,
        //         "filename": "00013a259cca6af04a2f1e9b164f8764.cart", "path": "/00013a259cca6af04a2f1e9b164f8764.cart",
        //         "ts": "2018-06-14T18:13:36.129035Z", "type": "TERMINAL"}, "overrides": {"classification": "U",
        //         "deep_scan": false,
        //         "description": "[TERMINAL] Inspection of file: 00013a259cca6af04a2f1e9b164f8764.cart",
        //         "generate_alert": false, "groups": ["ADMIN", "INTERNAL", "USERS"], "ignore_cache": false,
        //         "ignore_filtering": false, "max_extracted": 100, "max_supplementary": 100,
        //         "notification_queue": "nq-ingest_queue", "notification_threshold": null, "params": {},
        //         "priority": 150, "profile": true, "resubmit_to": [], "scan_key": "826e494f4f03a2647e46eca68581b7f8v0",
        //         "selected": ["Extraction", "Static Analysis"], "submitter": "admin", "ttl": 1}, "priority": 150,
        //     "sha1": "7906bf28db8b6fedf5118148e0f6215fb75a3301",
        //     "sha256": "2b78499bccc9242a520fb829a75ad94631aa87fd1af7caa55f4f0f0e66623c75",
        //     "size": 151955, "type": "TERMINAL"}];
        //
        // $scope.tbl_mal_files = [{"__access_grp1__": [], "__access_grp2__": [], "__access_lvl__": 100,
        //     "__access_req__": [], "__expiry_ts__": "2018-06-15T12:34:47.216939Z", "classification": "U",
        //     "error_count": 0, "errors": {}, "file_count": 1,
        //     "file_infos": {"da33e6f66b2b55b8b94fbf7e7c3ef56fcabb22fd14cb870efe84b86ef0c01405": {"__access_grp1__": [],
        //             "__access_grp2__": [], "__access_lvl__": 100, "__access_req__": [],
        //             "__expiry_ts__": "2018-06-15T12:34:47.216939Z",
        //             "ascii": "MZ......................@.......................................", "classification": "U",
        //             "entropy": 6.421611311772033,
        //             "hex": "4d5a90000300000004000000ffff0000b800000000000000400000000000000000000000000000000000000000" +
        //             "00000000000000000000000000000000010000",
        //             "magic": "PE32 executable (GUI) Intel 80386, for MS Windows",
        //             "md5": "928496e69c5d866be4fb0b1772c189be", "mime": "application/x-dosexec",
        //             "path": "/opt/al/var/storage/d/a/3/3/da33e6f66b2b55b8b94fbf7e7c3ef56fcabb22fd14cb870efe84b86ef0c01405",
        //             "seen_count": 5, "seen_first": "2018-06-11T11:56:30.093602Z",
        //             "seen_last": "2018-06-14T12:34:47.270150Z", "sha1": "0745fbe9efe30a198b6dbd77a9609675beac215d",
        //             "sha256": "da33e6f66b2b55b8b94fbf7e7c3ef56fcabb22fd14cb870efe84b86ef0c01405", "size": 206055,
        //             "ssdeep": "6144:OnqKQ2Oq3ScuA05A+O4PlDfZIkbaRF30zt:Uqhq3M5A+XfhaD3K",
        //             "tag": "executable/windows/pe32"}},
        //     "file_tree": {"da33e6f66b2b55b8b94fbf7e7c3ef56fcabb22fd14cb870efe84b86ef0c01405": {"children": {},
        //             "name": ["encr_zipped.exe"], "score": 500, "truncated": false}}, "files": [["encr_zipped.exe",
        //         "da33e6f66b2b55b8b94fbf7e7c3ef56fcabb22fd14cb870efe84b86ef0c01405"]], "missing_error_keys": [],
        //     "missing_result_keys": [], "original_classification": "U",
        //     "results": {"da33e6f66b2b55b8b94fbf7e7c3ef56fcabb22fd14cb870efe84b86ef0c01405.Characterize.v3_2_1_15b2546.c9af8dc23868c7a0b77ac7fa5462169d1": {"__access_grp1__": [],
        //             "__access_grp2__": [], "__access_lvl__": 100, "__access_req__": [],
        //             "__expiry_ts__": "2018-06-15T12:34:47.216939Z", "classification": "U",
        //             "created": "2018-06-11T11:57:25.715424Z", "response": {"extracted": [], "message": "",
        //                 "milestones": {"service_completed": 1528718245.714886, "service_started": 1528718244.266917},
        //                 "service_debug_info": "serviced_on:134.190.171.253", "service_name": "Characterize",
        //                 "service_version": "3.2.1.15b2546", "supplementary": []}, "result": {"classification": "U",
        //                 "context": null, "default_usage": null, "score": 0,
        //                 "sections": [{"body": "{\"data\": {\"domain\": [0, 8], \"values\": [5.748253187785483, 6.542889298247493," +
        //                     " 6.470144396531276, 6.430949722923447, 6.502342075108687, 6.436025915585477, 6.370626176565232," +
        //                     " 6.2846292824920695, 6.451053061066855, 6.355398768716942, 6.3134009352519564, 6.304354851724692," +
        //                     " 6.447798857740375, 6.330096324973816, 6.261475865415476, 6.292573596408905, 6.32795907470598," +
        //                     " 6.262659900675129, 6.2553297835516135, 6.3458495993569635, 6.3097957118014305, 6.308424533870195," +
        //                     " 6.423614390278547, 6.258038747413568, 6.477375835451488, 6.450139145389074, 6.374711116063272," +
        //                     " 5.9614303142057326, 6.243520036118723, 6.360822161727341, 6.540045889325098, 6.319309800112523, " +
        //                     "6.328305067779992, 6.309816990858867, 6.258406006115053, 6.423860750466091, 6.635611348674039, " +
        //                     "6.029003709462403, 6.540626109569218, 5.642985643703778, 5.611032551953858, 5.196045251945204, " +
        //                     "5.556476400790668, 2.854735759495643, 2.9292875784729477, 3.0322410642164295, 3.6348811293619185, " +
        //                     "4.1105297730915975, 3.193565398237177, 3.3925105370569284]}, \"type\": \"colormap\"}",
        //                     "body_format": "GRAPH_DATA", "classification": "U", "depth": 0,
        //                     "finalized": true, "links": [], "score": 0, "subsections": [],
        //                     "title_text": "Entropy.\tEntire File: 6.422", "truncated": false}], "tags": [],
        //                 "tags_score": 0, "truncated": false},
        //             "srl": "da33e6f66b2b55b8b94fbf7e7c3ef56fcabb22fd14cb870efe84b86ef0c01405"},
        //         "da33e6f66b2b55b8b94fbf7e7c3ef56fcabb22fd14cb870efe84b86ef0c01405.Cleaver.v3_2_1_cb1c6fc.c9af8dc23868c7a0b77ac7fa5462169d1.e": {"__access_grp1__": [],
        //             "__access_grp2__": [], "__access_lvl__": 100, "__access_req__": [], "__expiry_ts__": "2018-06-15T12:34:47.216939Z",
        //             "classification": "U", "created": "2018-06-14T12:34:47.270150Z", "response": {"extracted": [], "message": "",
        //                 "milestones": {"service_completed": 0.0, "service_started": 0.0}, "service_name": "Cleaver",
        //                 "service_version": "3.2.1.cb1c6fc", "supplementary": []}, "result": {"classification": "U",
        //                 "context": null, "default_usage": null, "score": 0, "sections": [], "tags": [], "tags_score": 0,
        //                 "truncated": false}, "srl": "da33e6f66b2b55b8b94fbf7e7c3ef56fcabb22fd14cb870efe84b86ef0c01405"},
        //         "da33e6f66b2b55b8b94fbf7e7c3ef56fcabb22fd14cb870efe84b86ef0c01405.ConfigDecoder.v3_2_1_8555995.ce0272a2a4ccfd099cb4c1cf1e90660a5.e": {"__access_grp1__": [],
        //             "__access_grp2__": [], "__access_lvl__": 100, "__access_req__": [],
        //             "__expiry_ts__": "2018-06-15T12:34:47.216939Z", "classification": "U",
        //             "created": "2018-06-14T12:34:47.270150Z", "response": {"extracted": [], "message": "",
        //                 "milestones": {"service_completed": 0.0, "service_started": 0.0},
        //                 "service_name": "ConfigDecoder", "service_version": "3.2.1.8555995", "supplementary": []},
        //             "result": {"classification": "U", "context": null, "default_usage": null, "score": 0,
        //                 "sections": [], "tags": [], "tags_score": 0, "truncated": false},
        //             "srl": "da33e6f66b2b55b8b94fbf7e7c3ef56fcabb22fd14cb870efe84b86ef0c01405"},
        //         "da33e6f66b2b55b8b94fbf7e7c3ef56fcabb22fd14cb870efe84b86ef0c01405.Extract.v3_2_1_046cb99.c5a81b9e89b2ace98914a5fa949af9c38": {"__access_grp1__": [],
        //             "__access_grp2__": [], "__access_lvl__": 100, "__access_req__": [],
        //             "__expiry_ts__": "2018-06-15T12:34:47.216939Z", "classification": "U",
        //             "created": "2018-06-11T11:56:38.340956Z", "response": {"extracted": [], "message": "",
        //                 "milestones": {"service_completed": 1528718198.339562, "service_started": 1528718191.739171},
        //                 "service_debug_info": "serviced_on:134.190.171.253", "service_name": "Extract",
        //                 "service_version": "3.2.1.046cb99", "supplementary": []}, "result": {"classification": "U",
        //                 "context": null, "default_usage": null, "score": 500, "sections": [{"body": "",
        //                     "body_format": null, "classification": "U", "depth": 0, "finalized": true, "links": [],
        //                     "score": 500, "subsections": [], "title_text": "Failed to extract password protected file.",
        //                     "truncated": false}], "tags": [{"classification": "U", "context": null,
        //                     "type": "FILE_SUMMARY", "usage": null, "value": "Archive Unknown Password",
        //                     "weight": 10}], "tags_score": 10, "truncated": false},
        //             "srl": "da33e6f66b2b55b8b94fbf7e7c3ef56fcabb22fd14cb870efe84b86ef0c01405"},
        //         "da33e6f66b2b55b8b94fbf7e7c3ef56fcabb22fd14cb870efe84b86ef0c01405.FrankenStrings.v3_2_1_1b0e1a4.c9af8dc23868c7a0b77ac7fa5462169d1.e": {"__access_grp1__": [],
        //             "__access_grp2__": [], "__access_lvl__": 100, "__access_req__": [],
        //             "__expiry_ts__": "2018-06-15T12:34:47.216939Z", "classification": "U",
        //             "created": "2018-06-14T12:34:47.270150Z", "response": {"extracted": [], "message": "",
        //                 "milestones": {"service_completed": 0.0, "service_started": 0.0},
        //                 "service_name": "FrankenStrings", "service_version": "3.2.1.1b0e1a4", "supplementary": []},
        //             "result": {"classification": "U", "context": null, "default_usage": null, "score": 0,
        //                 "sections": [], "tags": [], "tags_score": 0, "truncated": false},
        //             "srl": "da33e6f66b2b55b8b94fbf7e7c3ef56fcabb22fd14cb870efe84b86ef0c01405"},
        //         "da33e6f66b2b55b8b94fbf7e7c3ef56fcabb22fd14cb870efe84b86ef0c01405.MetaPeek.v3_2_1_61e0638.c9af8dc23868c7a0b77ac7fa5462169d1.e": {"__access_grp1__": [],
        //             "__access_grp2__": [], "__access_lvl__": 100, "__access_req__": [],
        //             "__expiry_ts__": "2018-06-15T12:34:47.216939Z", "classification": "U",
        //             "created": "2018-06-14T12:34:47.270150Z", "response": {"extracted": [], "message": "",
        //                 "milestones": {"service_completed": 0.0, "service_started": 0.0}, "service_name": "MetaPeek",
        //                 "service_version": "3.2.1.61e0638", "supplementary": []}, "result": {"classification": "U",
        //                 "context": null, "default_usage": null, "score": 0, "sections": [], "tags": [], "tags_score": 0,
        //                 "truncated": false}, "srl": "da33e6f66b2b55b8b94fbf7e7c3ef56fcabb22fd14cb870efe84b86ef0c01405"},
        //         "da33e6f66b2b55b8b94fbf7e7c3ef56fcabb22fd14cb870efe84b86ef0c01405.PEFile.v3_2_1_fe93950.c9af8dc23868c7a0b77ac7fa5462169d1": {"__access_grp1__": [],
        //             "__access_grp2__": [], "__access_lvl__": 100, "__access_req__": [],
        //             "__expiry_ts__": "2018-06-15T12:34:47.216939Z", "classification": "U",
        //             "created": "2018-06-11T11:56:44.039390Z", "response": {"extracted": [], "message": "",
        //                 "milestones": {"service_completed": 1528718204.01487, "service_started": 1528718199.698322},
        //                 "service_debug_info": "serviced_on:134.190.171.253", "service_name": "PEFile",
        //                 "service_version": "3.2.1.fe93950", "supplementary": []}, "result": {"classification": "U",
        //                 "context": null, "default_usage": null, "score": 0, "sections": [{"body": "",
        //                     "body_format": null, "classification": "U", "depth": 0, "finalized": true, "links": [],
        //                     "score": 0, "subsections": [{"body": "Entry point address: 0x0002769C\nLinker Version: " +
        //                         "06.00\nOS Version: 04.00\nTime Date Stamp: Mon Apr 30 09:00:00 2018 (1525089600)\nMachine" +
        //                         " Type: 0x14c (IMAGE_FILE_MACHINE_I386)", "body_format": null, "classification": "U",
        //                         "depth": 1, "finalized": true, "links": [], "score": 0, "subsections": [],
        //                         "title_text": "[HEADER INFO]", "truncated": false},
        //                         {"body": "VC++ tools used:\nTool Id:  11 Version:   8047 Times used:   3\nTool Id:" +
        //                             "  14 Version:   7299 Times used:   8\nTool Id:  10 Version:   8047 Times used:" +
        //                             "  11\nTool Id:   4 Version:   8047 Times used:   2\nTool Id:  95 Version:" +
        //                             "   2190 Times used:   2\nTool Id:   1 Version:      0 Times used: 160\nTool Id:" +
        //                             "  93 Version:   2179 Times used:  13\nTool Id:  11 Version:   9782 Times used:" +
        //                             "  88\nTool Id:  10 Version:   9782 Times used:   3\nTool Id: 170 Version:" +
        //                             "  40219 Times used:  15\nTool Id: 158 Version:  40219 Times used:   2\nTool Id:" +
        //                             "   6 Version:   1735 Times used:   1", "body_format": null, "classification": "U",
        //                             "depth": 1, "finalized": true, "links": [], "score": 0, "subsections": [],
        //                             "title_text": "[RICH HEADER INFO]", "truncated": false}, {"body": "IMPORT - va:" +
        //                             " 0x00030924 - size: 0x0000008C\nRESOURCE - va: 0x00038000 - size: 0x00002090\nIAT" +
        //                             " - va: 0x0002B000 - size: 0x00000234", "body_format": null, "classification": "U",
        //                             "depth": 1, "finalized": true, "links": [], "score": 0, "subsections": [],
        //                             "title_text": "[DATA DIRECTORY]", "truncated": false}, {"body": ".text - Virtual: " +
        //                             "0x00001000 (0x000292C5 bytes) - Physical: 0x00000400 (0x00029400 bytes) - " +
        //                             "hash:36d2237fabbf741c1f79c3aaaa296f9f - entropy:6.670633 (min:0.0," +
        //                             " Max=8.0)\n.rdata - Virtual: 0x0002B000 (0x000064B0 bytes) - Physical: 0x00029800" +
        //                             " (0x00006600 bytes) - hash:d9f1b3704890e0acf8a1cec6d0199d44 - entropy:4.413999" +
        //                             " (min:0.0, Max=8.0)\n.data - Virtual: 0x00032000 (0x0000453C bytes) - Physical:" +
        //                             " 0x0002FE00 (0x00000200 bytes) - hash:39c61b5f714a00c2675e278516c908aa -" +
        //                             " entropy:3.384035 (min:0.0, Max=8.0)\n.sxdata - Virtual: 0x00037000 " +
        //                             "(0x00000004 bytes) - Physical: 0x00030000 (0x00000200 bytes) - " +
        //                             "hash:35925cfdc1176bd9ffc634a58b40ec17 - entropy:0.020393 (min:0.0, Max=8.0)\n.rsrc" +
        //                             " - Virtual: 0x00038000 (0x00002090 bytes) - Physical: 0x00030200 (0x00002200 bytes)" +
        //                             " - hash:fb925c412418e5e2a37568c9db0d7171 - entropy:3.163801 (min:0.0, Max=8.0)",
        //                             "body_format": null, "classification": "U", "depth": 1, "finalized": true,
        //                             "links": [], "score": 0, "subsections": [], "title_text": "[SECTIONS]",
        //                             "truncated": false}], "title_text": "PE: HEADER", "truncated": false}, {"body": "",
        //                     "body_format": null, "classification": "U", "depth": 0, "finalized": true, "links": [],
        //                     "score": 0, "subsections": [{"body": "SysFreeString, SysAllocStringLen, SysAllocString, " +
        //                         "VariantClear, SysStringLen", "body_format": null, "classification": "U", "depth": 1,
        //                         "finalized": true, "links": [], "score": 0, "subsections": [],
        //                         "title_text": "[OLEAUT32.dll]", "truncated": false}, {"body": "CoCreateInstance, " +
        //                         "CoInitialize, CoUninitialize, OleInitialize", "body_format": null, "classification":
        //                             "U", "depth": 1, "finalized": true, "links": [], "score": 0, "subsections": [],
        //                         "title_text": "[ole32.dll]", "truncated": false}, {"body": "CheckDlgButton, " +
        //                         "IsDlgButtonChecked, EndDialog, SetDlgItemTextW, GetFocus, SetFocus, GetKeyState, " +
        //                         "InvalidateRect, SetWindowTextW, EnableWindow, PostMessageW, MessageBoxW, SetTimer, " +
        //                         "DialogBoxParamW, SetWindowLongW, GetWindowLongW, ShowWindow, MoveWindow, " +
        //                         "ScreenToClient, GetDlgItem, GetWindowRect, MapDialogRect, SystemParametersInfoW, " +
        //                         "GetWindowTextLengthW, GetWindowTextW, SendMessageW, LoadStringW, CharUpperW, " +
        //                         "LoadIconW, GetParent, SetCursor, LoadCursorW, KillTimer", "body_format": null,
        //                         "classification": "U", "depth": 1, "finalized": true, "links": [], "score": 0,
        //                         "subsections": [], "title_text": "[USER32.dll]", "truncated": false},
        //                         {"body": "SHGetPathFromIDListW, SHBrowseForFolderW, SHGetFileInfoW, SHGetMalloc",
        //                             "body_format": null, "classification": "U", "depth": 1, "finalized": true,
        //                             "links": [], "score": 0, "subsections": [], "title_text": "[SHELL32.dll]",
        //                             "truncated": false}, {"body": "wcsstr, wcscmp, _beginthreadex, _except_handler3, " +
        //                             "??1type_info@@UAE@XZ, ?terminate@@YAXXZ, __dllonexit, _onexit, _exit, _" +
        //                             "XcptFilter, exit, _acmdln, __getmainargs, _initterm, __setusermatherr, " +
        //                             "_adjust_fdiv, __p__commode, __p__fmode, __set_app_type, _controlfp, " +
        //                             "_CxxThrowException, malloc, memcpy, memmove, memset, _purecall, memcmp, " +
        //                             "__CxxFrameHandler, free", "body_format": null, "classification": "U",
        //                             "depth": 1, "finalized": true, "links": [], "score": 0, "subsections": [],
        //                             "title_text": "[MSVCRT.dll]", "truncated": false}, {"body": "GetStartupInfoA, " +
        //                             "InitializeCriticalSection, ResetEvent, SetEvent, CreateEventW, " +
        //                             "WaitForSingleObject, lstrlenW, lstrcatW, VirtualFree, VirtualAlloc, " +
        //                             "SetPriorityClass, DeleteCriticalSection, Sleep, EnterCriticalSection, " +
        //                             "LeaveCriticalSection, WaitForMultipleObjects, GetFileInformationByHandle, " +
        //                             "GetStdHandle, GlobalMemoryStatus, GetSystemInfo, GetCurrentProcess, " +
        //                             "GetProcessAffinityMask, FileTimeToLocalFileTime, FileTimeToSystemTime, " +
        //                             "CompareFileTime, SetEndOfFile, WriteFile, ReadFile, SetFilePointer, " +
        //                             "GetFileSize, GetLogicalDriveStringsW, GetFileAttributesW, GetModuleHandleA, " +
        //                             "FindNextFileW, FindFirstFileW, FindClose, GetTickCount, GetCurrentDirectoryW, " +
        //                             "SetLastError, DeleteFileW, CreateDirectoryW, GetModuleHandleW, MoveFileW, " +
        //                             "RemoveDirectoryW, SetFileAttributesW, CreateFileW, SetFileTime, CloseHandle, " +
        //                             "GetSystemDirectoryW, FormatMessageW, LocalFree, GetModuleFileNameW, " +
        //                             "MultiByteToWideChar, GetLastError, GetVersionExW, LoadLibraryW, GetProcAddress, " +
        //                             "FreeLibrary, GetCommandLineW, LoadLibraryExW", "body_format": null,
        //                             "classification": "U", "depth": 1, "finalized": true, "links": [],
        //                             "score": 0, "subsections": [], "title_text": "[KERNEL32.dll]",
        //                             "truncated": false}], "title_text": "PE: IMPORTS", "truncated": false},
        //                     {"body": "RT_ICON 0x1 0x0409 (English-United States) Size: 0x2e8\nRT_ICON 0x2 0x0409 " +
        //                         "(English-United States) Size: 0x128\nRT_DIALOG 0x61 0x0409 (English-United States) " +
        //                         "Size: 0x440\nRT_DIALOG 0xd48 0x0409 (English-United States) Size: " +
        //                         "0x12e\nRT_DIALOG 0xdac 0x0409 (English-United States) Size: 0x2f4\nRT_DIALOG " +
        //                         "0xed8 0x0409 (English-United States) Size: 0x126\nRT_STRING 0x1a 0x0409 " +
        //                         "(English-United States) Size: 0x3e\nRT_STRING 0x1c 0x0409 (English-United States) " +
        //                         "Size: 0x42\nRT_STRING 0x1d 0x0409 (English-United States) Size: 0x60\nRT_STRING " +
        //                         "0x40 0x0409 (English-United States) Size: 0x30\nRT_STRING 0xbc 0x0409 (" +
        //                         "English-United States) Size: 0x20c\nRT_STRING 0xbd 0x0409 (English-United States) " +
        //                         "Size: 0xe4\nRT_STRING 0xcf 0x0409 (English-United States) Size: 0x34\nRT_STRING " +
        //                         "0xd0 0x0409 (English-United States) Size: 0x30\nRT_STRING 0xd5 0x0409 " +
        //                         "(English-United States) Size: 0x6e\nRT_STRING 0xd6 0x0409 (English-United States) " +
        //                         "Size: 0x11a\nRT_STRING 0xd7 0x0409 (English-United States) Size: 0x6a\nRT_STRING " +
        //                         "0xdc 0x0409 (English-United States) Size: 0x32\nRT_STRING 0xe8 0x0409 " +
        //                         "(English-United States) Size: 0x1ea\nRT_STRING 0xe9 0x0409 (English-United States) " +
        //                         "Size: 0x156\nRT_STRING 0xea 0x0409 (English-United States) Size: 0x56\nRT_STRING " +
        //                         "0xec 0x0409 (English-United States) Size: 0xb6\nRT_GROUP_ICON 0x1 0x0409 " +
        //                         "(English-United States) Size: 0x22\nRT_VERSION 0x1 0x0409 (English-United States) " +
        //                         "Size: 0x2b0", "body_format": null, "classification": "U", "depth": 0,
        //                         "finalized": true, "links": [], "score": 0, "subsections": [], "title_text":
        //                             "PE: RESOURCES", "truncated": false}, {"body": "LangId: 040904b0 (" +
        //                         "English-United States)\nLegalCopyright: Copyright (c) 1999-2018 Igor " +
        //                         "Pavlov\nInternalName: 7z.sfx\nFileVersion: 18.05\nCompanyName: Igor " +
        //                         "Pavlov\nProductName: 7-Zip\nProductVersion: 18.05\nFileDescription: " +
        //                         "7z SFX\nOriginalFilename: 7z.sfx.exe", "body_format": null, "classification": "U",
        //                         "depth": 0, "finalized": true, "links": [], "score": 0, "subsections": [],
        //                         "title_text": "PE: RESOURCES-VersionInfo", "truncated": false},
        //                     {"body": "DIALOG_TITLE: Progress\nBUTTON: &Background\nBUTTON: &Pause\nBUTTON:" +
        //                         " Cancel\nSTATIC: Elapsed time:\nSTATIC: Remaining time:\nSTATIC: Files:\nSTATIC:" +
        //                         " Compression ratio:\nSTATIC: Errors:\nSTATIC: Total size:\nSTATIC: Speed:\nSTATIC:" +
        //                         " Processed:\nSTATIC: Compressed size:\nmsctls_progress32: Progress1\nSysListView32:" +
        //                         " List1", "body_format": null, "classification": "U", "depth": 0, "finalized": true,
        //                         "links": [], "score": 0, "subsections": [], "title_text": "PE: STRINGS - RT_DIALOG" +
        //                         " (id:0x61 - lang_id:0x0409 [English-United States])", "truncated": false},
        //                     {"body": "DIALOG_TITLE: 7-Zip self-extracting archive\nSTATIC: E&xtract to:\nBUTTON:" +
        //                         " ...\nBUTTON: Extract\nBUTTON: Cancel", "body_format": null, "classification": "U",
        //                         "depth": 0, "finalized": true, "links": [], "score": 0, "subsections": [],
        //                         "title_text": "PE: STRINGS - RT_DIALOG (id:0xd48 - lang_id:0x0409 " +
        //                         "[English-United States])", "truncated": false}, {"body": "DIALOG_TITLE:" +
        //                         " Confirm File Replace\nSTATIC: Destination folder already contains processed" +
        //                         " file.\nSTATIC: Would you like to replace the existing file\nSTATIC: with" +
        //                         " this one?\nBUTTON: &Yes\nBUTTON: Yes to &All\nBUTTON: A&uto Rename\nBUTTON:" +
        //                         " &No\nBUTTON: No to A&ll\nBUTTON: &Cancel", "body_format": null, "classification":
        //                             "U", "depth": 0, "finalized": true, "links": [], "score": 0, "subsections": [],
        //                         "title_text": "PE: STRINGS - RT_DIALOG (id:0xdac - lang_id:0x0409" +
        //                         " [English-United States])", "truncated": false}, {"body": "DIALOG_TITLE: Enter" +
        //                         " password\nSTATIC: &Enter password:\nBUTTON: &Show password\nBUTTON: OK\nBUTTON:" +
        //                         " Cancel", "body_format": null, "classification": "U", "depth": 0, "finalized": true,
        //                         "links": [], "score": 0, "subsections": [], "title_text": "PE: STRINGS" +
        //                         " - RT_DIALOG (id:0xed8 - lang_id:0x0409 [English-United States])",
        //                         "truncated": false}, {"body": "&Close\n&Continue", "body_format": null,
        //                         "classification": "U", "depth": 0, "finalized": true, "links": [], "score": 0,
        //                         "subsections": [], "title_text": "PE: STRINGS - RT_STRING (id:0x1a - lang_id:0x0409" +
        //                         " [English-United States])", "truncated": false}, {"body": "&Foreground\nPaused",
        //                         "body_format": null, "classification": "U", "depth": 0, "finalized": true, "links": [],
        //                         "score": 0, "subsections": [], "title_text": "PE: STRINGS - RT_STRING (id:0x1c" +
        //                         " - lang_id:0x0409 [English-United States])", "truncated": false},
        //                     {"body": "Are you sure you want to cancel?", "body_format": null, "classification": "U",
        //                         "depth": 0, "finalized": true, "links": [], "score": 0, "subsections": [],
        //                         "title_text": "PE: STRINGS - RT_STRING (id:0x1d - lang_id:0x0409 " +
        //                         "[English-United States])", "truncated": false}, {"body": "Modified",
        //                         "body_format": null, "classification": "U", "depth": 0, "finalized": true,
        //                         "links": [], "score": 0, "subsections": [], "title_text": "PE: STRINGS - RT_STRING" +
        //                         " (id:0x40 - lang_id:0x0409 [English-United States])", "truncated": false},
        //                     {"body": "The system cannot allocate the required amount of memory\nCannot create folder " +
        //                         "'{0}'\nUpdate operations are not supported for this archive.\nCan not open file '{0}'" +
        //                         " as archive\nCan not open encrypted archive '{0}'. Wrong password?\nUnsupported" +
        //                         " archive type", "body_format": null, "classification": "U", "depth": 0,
        //                         "finalized": true, "links": [], "score": 0, "subsections": [], "title_text":
        //                             "PE: STRINGS - RT_STRING (id:0xbc - lang_id:0x0409 [English-United States])",
        //                         "truncated": false}, {"body": "Can not open the file as {0} archive\nThe file is " +
        //                         "open as {0} archive\nThe archive is open with offset", "body_format": null,
        //                         "classification": "U", "depth": 0, "finalized": true, "links": [], "score": 0,
        //                         "subsections": [], "title_text": "PE: STRINGS - RT_STRING (id:0xbd - lang_id:0x0409" +
        //                         " [English-United States])", "truncated": false}, {"body": "Extracting",
        //                         "body_format": null, "classification": "U", "depth": 0, "finalized": true,
        //                         "links": [], "score": 0, "subsections": [], "title_text": "PE: STRINGS - " +
        //                         "RT_STRING (id:0xcf - lang_id:0x0409 [English-United States])", "truncated": false},
        //                     {"body": "Skipping", "body_format": null, "classification": "U", "depth": 0,
        //                         "finalized": true, "links": [], "score": 0, "subsections": [], "title_text":
        //                             "PE: STRINGS - RT_STRING (id:0xd0 - lang_id:0x0409 [English-United States])",
        //                         "truncated": false}, {"body": "Specify a location for extracted files.",
        //                         "body_format": null, "classification": "U", "depth": 0, "finalized": true,
        //                         "links": [], "score": 0, "subsections": [], "title_text": "PE: STRINGS - RT_STRING (" +
        //                         "id:0xd5 - lang_id:0x0409 [English-United States])", "truncated": false},
        //                     {"body": "Full pathnames\nNo pathnames\nAbsolute pathnames\nRelative pathnames\nAsk " +
        //                         "before overwrite\nOverwrite without prompt\nSkip existing files", "body_format": null,
        //                         "classification": "U", "depth": 0, "finalized": true, "links": [], "score": 0,
        //                         "subsections": [], "title_text": "PE: STRINGS - RT_STRING (id:0xd6 - lang_id:0x0409" +
        //                         " [English-United States])", "truncated": false}, {"body": "Auto rename\nAuto rename" +
        //                         " existing files", "body_format": null, "classification": "U", "depth": 0,
        //                         "finalized": true, "links": [], "score": 0, "subsections": [], "title_text":
        //                             "PE: STRINGS - RT_STRING (id:0xd7 - lang_id:0x0409 [English-United States])",
        //                         "truncated": false}, {"body": "{0} bytes", "body_format": null, "classification":
        //                             "U", "depth": 0, "finalized": true, "links": [], "score": 0, "subsections": [],
        //                         "title_text": "PE: STRINGS - RT_STRING (id:0xdc - lang_id:0x0409 [English-United " +
        //                         "States])", "truncated": false}, {"body": "Unsupported compression method for " +
        //                         "'{0}'.\nData error in '{0}'. File is broken\nCRC failed in '{0}'. File is " +
        //                         "broken.\nData error in encrypted file '{0}'. Wrong password?\nCRC failed in e" +
        //                         "ncrypted file '{0}'. Wrong password?\nWrong password?", "body_format": null,
        //                         "classification": "U", "depth": 0, "finalized": true, "links": [], "score": 0,
        //                         "subsections": [], "title_text": "PE: STRINGS - RT_STRING (id:0xe8 - lang_id:0x0409" +
        //                         " [English-United States])", "truncated": false}, {"body": "Unsupported compression" +
        //                         " method\nData error\nCRC failed\nUnavailable data\nUnexpected end of data\nThere " +
        //                         "are some data after the end of the payload data\nIs not archive", "body_format": null,
        //                         "classification": "U", "depth": 0, "finalized": true, "links": [], "score": 0,
        //                         "subsections": [], "title_text": "PE: STRINGS - RT_STRING (id:0xe9 - lang_id:0x0409" +
        //                         " [English-United States])", "truncated": false}, {"body": "Headers " +
        //                         "Error\nWrong password", "body_format": null, "classification": "U", "depth": 0,
        //                         "finalized": true, "links": [], "score": 0, "subsections": [], "title_text":
        //                             "PE: STRINGS - RT_STRING (id:0xea - lang_id:0x0409 [English-United States])",
        //                         "truncated": false}, {"body": "Unavailable start of archive\nUnconfirmed start of " +
        //                         "archive\nUnsupported feature", "body_format": null, "classification": "U", "depth": 0,
        //                         "finalized": true, "links": [], "score": 0, "subsections": [], "title_text": "PE: " +
        //                         "STRINGS - RT_STRING (id:0xec - lang_id:0x0409 [English-United States])",
        //                         "truncated": false}], "tags": [{"classification": "U", "context": null,
        //                     "type": "PE_LINK_TIME_STAMP", "usage": "CORRELATION", "value": "1525089600", "weight": 25},
        //                     {"classification": "U", "context": null, "type": "PE_IMPORT_SORTED_SHA1",
        //                         "usage": "CORRELATION", "value": "0b05ea58e42bb151223dfe3bcacb266c2ac31ded",
        //                         "weight": 25}, {"classification": "U", "context": null, "type": "PE_IMPORT_MD5",
        //                         "usage": "CORRELATION", "value": "da401ef5e9d5c4599673c26d95fa6029", "weight": 25},
        //                     {"classification": "U", "context": null, "type": "PE_SECTION_HASH",
        //                         "usage": "CORRELATION", "value": "36d2237fabbf741c1f79c3aaaa296f9f",
        //                         "weight": 25}, {"classification": "U", "context": null, "type": "PE_SECTION_HASH",
        //                         "usage": "CORRELATION", "value": "d9f1b3704890e0acf8a1cec6d0199d44", "weight": 25},
        //                     {"classification": "U", "context": null, "type": "PE_SECTION_HASH", "usage": "CORRELATION",
        //                         "value": "39c61b5f714a00c2675e278516c908aa", "weight": 25}, {"classification": "U",
        //                         "context": null, "type": "PE_SECTION_HASH", "usage": "CORRELATION",
        //                         "value": "35925cfdc1176bd9ffc634a58b40ec17", "weight": 25}, {"classification": "U",
        //                         "context": null, "type": "PE_SECTION_HASH", "usage": "CORRELATION",
        //                         "value": "fb925c412418e5e2a37568c9db0d7171", "weight": 25}, {"classification": "U",
        //                         "context": null, "type": "PE_RESOURCE_LANGUAGE", "usage": "IDENTIFICATION",
        //                         "value": "1033", "weight": 1}, {"classification": "U", "context": null,
        //                         "type": "FILE_STRING", "usage": "IDENTIFICATION", "value": "Progress", "weight": 0},
        //                     {"classification": "U", "context": null, "type": "FILE_STRING", "usage": "IDENTIFICATION",
        //                         "value": "&Background", "weight": 0}, {"classification": "U", "context": null,
        //                         "type": "FILE_STRING", "usage": "IDENTIFICATION", "value": "&Pause", "weight": 0},
        //                     {"classification": "U", "context": null, "type": "FILE_STRING", "usage": "IDENTIFICATION",
        //                         "value": "Cancel", "weight": 0}, {"classification": "U", "context": null,
        //                         "type": "FILE_STRING", "usage": "IDENTIFICATION", "value": "Elapsed time:",
        //                         "weight": 0}, {"classification": "U", "context": null, "type": "FILE_STRING",
        //                         "usage": "IDENTIFICATION", "value": "Remaining time:", "weight": 0},
        //                     {"classification": "U", "context": null, "type": "FILE_STRING", "usage": "IDENTIFICATION",
        //                         "value": "Files:", "weight": 0}, {"classification": "U", "context": null,
        //                         "type": "FILE_STRING", "usage": "IDENTIFICATION", "value": "Compression ratio:",
        //                         "weight": 0}, {"classification": "U", "context": null, "type": "FILE_STRING",
        //                         "usage": "IDENTIFICATION", "value": "Errors:", "weight": 0}, {"classification": "U",
        //                         "context": null, "type": "FILE_STRING", "usage": "IDENTIFICATION",
        //                         "value": "Total size:", "weight": 0}, {"classification": "U", "context": null,
        //                         "type": "FILE_STRING", "usage": "IDENTIFICATION", "value": "Speed:", "weight": 0},
        //                     {"classification": "U", "context": null, "type": "FILE_STRING", "usage": "IDENTIFICATION",
        //                         "value": "Processed:", "weight": 0}, {"classification": "U", "context": null,
        //                         "type": "FILE_STRING", "usage": "IDENTIFICATION", "value": "Compressed size:",
        //                         "weight": 0}, {"classification": "U", "context": null, "type": "FILE_STRING",
        //                         "usage": "IDENTIFICATION", "value": "Progress1", "weight": 0}, {"classification": "U",
        //                         "context": null, "type": "FILE_STRING", "usage": "IDENTIFICATION", "value": "List1",
        //                         "weight": 0}, {"classification": "U", "context": null, "type": "FILE_STRING",
        //                         "usage": "IDENTIFICATION", "value": "7-Zip self-extracting archive", "weight": 0},
        //                     {"classification": "U", "context": null, "type": "FILE_STRING", "usage": "IDENTIFICATION",
        //                         "value": "E&xtract to:", "weight": 0}, {"classification": "U", "context": null,
        //                         "type": "FILE_STRING", "usage": "IDENTIFICATION", "value": "...", "weight": 0},
        //                     {"classification": "U", "context": null, "type": "FILE_STRING", "usage": "IDENTIFICATION",
        //                         "value": "Extract", "weight": 0}, {"classification": "U", "context": null,
        //                         "type": "FILE_STRING", "usage": "IDENTIFICATION", "value": "Confirm File Replace",
        //                         "weight": 0}, {"classification": "U", "context": null, "type": "FILE_STRING",
        //                         "usage": "IDENTIFICATION", "value": "Destination folder already contains processed" +
        //                         " file.", "weight": 0}, {"classification": "U", "context": null, "type": "FILE_STRING",
        //                         "usage": "IDENTIFICATION", "value": "Would you like to replace the existing file",
        //                         "weight": 0}, {"classification": "U", "context": null, "type": "FILE_STRING",
        //                         "usage": "IDENTIFICATION", "value": "with this one?", "weight": 0},
        //                     {"classification": "U", "context": null, "type": "FILE_STRING", "usage": "IDENTIFICATION",
        //                         "value": "&Yes", "weight": 0}, {"classification": "U", "context": null,
        //                         "type": "FILE_STRING", "usage": "IDENTIFICATION", "value": "Yes to &All", "weight": 0},
        //                     {"classification": "U", "context": null, "type": "FILE_STRING", "usage": "IDENTIFICATION",
        //                         "value": "A&uto Rename", "weight": 0}, {"classification": "U", "context": null,
        //                         "type": "FILE_STRING", "usage": "IDENTIFICATION", "value": "&No", "weight": 0},
        //                     {"classification": "U", "context": null, "type": "FILE_STRING", "usage": "IDENTIFICATION",
        //                         "value": "No to A&ll", "weight": 0}, {"classification": "U", "context": null,
        //                         "type": "FILE_STRING", "usage": "IDENTIFICATION", "value": "&Cancel", "weight": 0},
        //                     {"classification": "U", "context": null, "type": "FILE_STRING", "usage": "IDENTIFICATION",
        //                         "value": "Enter password", "weight": 0}, {"classification": "U", "context": null,
        //                         "type": "FILE_STRING", "usage": "IDENTIFICATION", "value": "&Enter password:",
        //                         "weight": 0}, {"classification": "U", "context": null, "type": "FILE_STRING",
        //                         "usage": "IDENTIFICATION", "value": "&Show password", "weight": 0}, {"classification": "U",
        //                         "context": null, "type": "FILE_STRING", "usage": "IDENTIFICATION", "value": "OK",
        //                         "weight": 0}, {"classification": "U", "context": null, "type": "FILE_STRING",
        //                         "usage": "IDENTIFICATION", "value": "&Close", "weight": 0}, {"classification": "U",
        //                         "context": null, "type": "FILE_STRING", "usage": "IDENTIFICATION", "value": "&Continue",
        //                         "weight": 0}, {"classification": "U", "context": null, "type": "FILE_STRING",
        //                         "usage": "IDENTIFICATION", "value": "&Foreground", "weight": 0}, {"classification": "U",
        //                         "context": null, "type": "FILE_STRING", "usage": "IDENTIFICATION", "value": "Paused",
        //                         "weight": 0}, {"classification": "U", "context": null, "type": "FILE_STRING",
        //                         "usage": "IDENTIFICATION", "value": "Are you sure you want to cancel?", "weight": 0},
        //                     {"classification": "U", "context": null, "type": "FILE_STRING", "usage": "IDENTIFICATION",
        //                         "value": "Modified", "weight": 0}, {"classification": "U", "context": null,
        //                         "type": "FILE_STRING", "usage": "IDENTIFICATION", "value": "The system cannot " +
        //                         "allocate the required amount of memory", "weight": 0}, {"classification": "U",
        //                         "context": null, "type": "FILE_STRING", "usage": "IDENTIFICATION",
        //                         "value": "Cannot create folder '{0}'", "weight": 0}, {"classification": "U",
        //                         "context": null, "type": "FILE_STRING", "usage": "IDENTIFICATION",
        //                         "value": "Update operations are not supported for this archive.", "weight": 0},
        //                     {"classification": "U", "context": null, "type": "FILE_STRING", "usage": "IDENTIFICATION",
        //                         "value": "Can not open file '{0}' as archive", "weight": 0}, {"classification": "U",
        //                         "context": null, "type": "FILE_STRING", "usage": "IDENTIFICATION",
        //                         "value": "Can not open encrypted archive '{0}'. Wrong password?", "weight": 0},
        //                     {"classification": "U", "context": null, "type": "FILE_STRING", "usage": "IDENTIFICATION",
        //                         "value": "Unsupported archive type", "weight": 0}, {"classification": "U",
        //                         "context": null, "type": "FILE_STRING", "usage": "IDENTIFICATION",
        //                         "value": "Can not open the file as {0} archive", "weight": 0}, {"classification": "U",
        //                         "context": null, "type": "FILE_STRING", "usage": "IDENTIFICATION",
        //                         "value": "The file is open as {0} archive", "weight": 0}, {"classification": "U",
        //                         "context": null, "type": "FILE_STRING", "usage": "IDENTIFICATION",
        //                         "value": "The archive is open with offset", "weight": 0}, {"classification": "U",
        //                         "context": null, "type": "FILE_STRING", "usage": "IDENTIFICATION",
        //                         "value": "Extracting", "weight": 0}, {"classification": "U", "context": null,
        //                         "type": "FILE_STRING", "usage": "IDENTIFICATION", "value": "Skipping", "weight": 0},
        //                     {"classification": "U", "context": null, "type": "FILE_STRING",
        //                         "usage": "IDENTIFICATION", "value": "Specify a location for extracted files.",
        //                         "weight": 0}, {"classification": "U", "context": null, "type": "FILE_STRING",
        //                         "usage": "IDENTIFICATION", "value": "Full pathnames", "weight": 0},
        //                     {"classification": "U", "context": null, "type": "FILE_STRING", "usage": "IDENTIFICATION",
        //                         "value": "No pathnames", "weight": 0}, {"classification": "U", "context": null,
        //                         "type": "FILE_STRING", "usage": "IDENTIFICATION", "value": "Absolute pathnames",
        //                         "weight": 0}, {"classification": "U", "context": null, "type": "FILE_STRING",
        //                         "usage": "IDENTIFICATION", "value": "Relative pathnames", "weight": 0},
        //                     {"classification": "U", "context": null, "type": "FILE_STRING", "usage": "IDENTIFICATION",
        //                         "value": "Ask before overwrite", "weight": 0}, {"classification": "U", "context": null,
        //                         "type": "FILE_STRING", "usage": "IDENTIFICATION", "value": "Overwrite without prompt",
        //                         "weight": 0}, {"classification": "U", "context": null, "type": "FILE_STRING",
        //                         "usage": "IDENTIFICATION", "value": "Skip existing files", "weight": 0},
        //                     {"classification": "U", "context": null, "type": "FILE_STRING", "usage": "IDENTIFICATION",
        //                         "value": "Auto rename", "weight": 0}, {"classification": "U", "context": null,
        //                         "type": "FILE_STRING", "usage": "IDENTIFICATION", "value": "Auto rename existing files",
        //                         "weight": 0}, {"classification": "U", "context": null, "type": "FILE_STRING",
        //                         "usage": "IDENTIFICATION", "value": "{0} bytes", "weight": 0}, {"classification": "U",
        //                         "context": null, "type": "FILE_STRING", "usage": "IDENTIFICATION",
        //                         "value": "Unsupported compression method for '{0}'.", "weight": 0},
        //                     {"classification": "U", "context": null, "type": "FILE_STRING",
        //                         "usage": "IDENTIFICATION", "value": "Data error in '{0}'. File is broken",
        //                         "weight": 0}, {"classification": "U", "context": null, "type": "FILE_STRING",
        //                         "usage": "IDENTIFICATION", "value": "CRC failed in '{0}'. File is broken.",
        //                         "weight": 0}, {"classification": "U", "context": null, "type": "FILE_STRING",
        //                         "usage": "IDENTIFICATION",
        //                         "value": "Data error in encrypted file '{0}'. Wrong password?", "weight": 0},
        //                     {"classification": "U", "context": null, "type": "FILE_STRING", "usage": "IDENTIFICATION",
        //                         "value": "CRC failed in encrypted file '{0}'. Wrong password?", "weight": 0},
        //                     {"classification": "U", "context": null, "type": "FILE_STRING", "usage": "IDENTIFICATION",
        //                         "value": "Wrong password?", "weight": 0}, {"classification": "U", "context": null,
        //                         "type": "FILE_STRING", "usage": "IDENTIFICATION",
        //                         "value": "Unsupported compression method", "weight": 0}, {"classification": "U",
        //                         "context": null, "type": "FILE_STRING", "usage": "IDENTIFICATION",
        //                         "value": "Data error", "weight": 0}, {"classification": "U", "context": null,
        //                         "type": "FILE_STRING", "usage": "IDENTIFICATION", "value": "CRC failed",
        //                         "weight": 0}, {"classification": "U", "context": null, "type": "FILE_STRING",
        //                         "usage": "IDENTIFICATION", "value": "Unavailable data", "weight": 0},
        //                     {"classification": "U", "context": null, "type": "FILE_STRING", "usage": "IDENTIFICATION",
        //                         "value": "Unexpected end of data", "weight": 0}, {"classification": "U",
        //                         "context": null, "type": "FILE_STRING", "usage": "IDENTIFICATION",
        //                         "value": "There are some data after the end of the payload data", "weight": 0},
        //                     {"classification": "U", "context": null, "type": "FILE_STRING", "usage": "IDENTIFICATION",
        //                         "value": "Is not archive", "weight": 0}, {"classification": "U", "context": null,
        //                         "type": "FILE_STRING", "usage": "IDENTIFICATION", "value": "Headers Error",
        //                         "weight": 0}, {"classification": "U", "context": null, "type": "FILE_STRING",
        //                         "usage": "IDENTIFICATION", "value": "Wrong password", "weight": 0},
        //                     {"classification": "U", "context": null, "type": "FILE_STRING", "usage": "IDENTIFICATION",
        //                         "value": "Unavailable start of archive", "weight": 0}, {"classification": "U",
        //                         "context": null, "type": "FILE_STRING", "usage": "IDENTIFICATION",
        //                         "value": "Unconfirmed start of archive", "weight": 0}, {"classification": "U",
        //                         "context": null, "type": "FILE_STRING", "usage": "IDENTIFICATION",
        //                         "value": "Unsupported feature", "weight": 0}], "tags_score": 201, "truncated": false},
        //             "srl": "da33e6f66b2b55b8b94fbf7e7c3ef56fcabb22fd14cb870efe84b86ef0c01405"},
        //         "da33e6f66b2b55b8b94fbf7e7c3ef56fcabb22fd14cb870efe84b86ef0c01405.TagCheck.v3_2_1_00e8e0e.c03247148011d541cabbdb3bdcbefdcc1.e": {"__access_grp1__": [],
        //             "__access_grp2__": [], "__access_lvl__": 100, "__access_req__": [], "__expiry_ts__": "2018-06-15T12:34:47.216939Z",
        //             "classification": "U", "created": "2018-06-14T12:34:47.270150Z", "response": {"extracted": [],
        //                 "message": "", "milestones": {"service_completed": 0.0, "service_started": 0.0}, "service_name": "TagCheck",
        //                 "service_version": "3.2.1.00e8e0e", "supplementary": []}, "result": {"classification": "U",
        //                 "context": null, "default_usage": null, "score": 0, "sections": [], "tags": [], "tags_score": 0,
        //                 "truncated": false}, "srl": "da33e6f66b2b55b8b94fbf7e7c3ef56fcabb22fd14cb870efe84b86ef0c01405"},
        //         "da33e6f66b2b55b8b94fbf7e7c3ef56fcabb22fd14cb870efe84b86ef0c01405.Unpacker.v3_2_1_0820c62.c2155fe237e124db9961572041fd00e3f.e": {"__access_grp1__": [],
        //             "__access_grp2__": [], "__access_lvl__": 100, "__access_req__": [], "__expiry_ts__": "2018-06-15T12:34:47.216939Z",
        //             "classification": "U", "created": "2018-06-14T12:34:47.270150Z", "response": {"extracted": [], "message": "",
        //                 "milestones": {"service_completed": 0.0, "service_started": 0.0}, "service_name": "Unpacker",
        //                 "service_version": "3.2.1.0820c62", "supplementary": []}, "result": {"classification": "U",
        //                 "context": null, "default_usage": null, "score": 0, "sections": [], "tags": [], "tags_score": 0,
        //                 "truncated": false}, "srl": "da33e6f66b2b55b8b94fbf7e7c3ef56fcabb22fd14cb870efe84b86ef0c01405"},
        //         "da33e6f66b2b55b8b94fbf7e7c3ef56fcabb22fd14cb870efe84b86ef0c01405.Yara.v3_2_1_00f140f_rac3806400c5964ff2a45c4b9799311eb.cd915213770742cf88eab23ed6a342c96.e": {"__access_grp1__": [],
        //             "__access_grp2__": [], "__access_lvl__": 100, "__access_req__": [], "__expiry_ts__": "2018-06-15T12:34:47.216939Z",
        //             "classification": "U", "created": "2018-06-14T12:34:47.270150Z", "response": {"extracted": [], "message": "",
        //                 "milestones": {"service_completed": 0.0, "service_started": 0.0}, "service_name": "Yara",
        //                 "service_version": "3.2.1.00f140f.rac3806400c5964ff2a45c4b9799311eb", "supplementary": []},
        //             "result": {"classification": "U", "context": null, "default_usage": null, "score": 0, "sections": [],
        //                 "tags": [], "tags_score": 0, "truncated": false},
        //             "srl": "da33e6f66b2b55b8b94fbf7e7c3ef56fcabb22fd14cb870efe84b86ef0c01405"}},
        //     "services": {"excluded": [], "selected": ["Extraction", "Static Analysis"]}, "state": "completed",
        //     "submission": {"deep_scan": false, "description": "[TERMINAL] Inspection of file: encr_zipped.exe",
        //         "groups": ["ADMIN", "INTERNAL", "USERS"], "ignore_cache": false, "ignore_filtering": false,
        //         "max_score": 500, "metadata": {"filename": "encr_zipped.exe", "path": "/encr_zipped.exe",
        //             "ts": "2018-06-14T12:34:46.159050Z", "type": "TERMINAL"}, "original_selected": ["Extraction",
        //             "Static Analysis"], "params": {}, "priority": 150, "resubmit_to": [],
        //         "scan_key": "d0c2df728586b5eee385ecb7f8afcdfcv0", "sid": "31e5fa07-fc81-4da7-9f63-6c716ee826d4",
        //         "submitter": "admin", "ttl": 1}, "times": {"completed": "2018-06-14T12:34:51.716648Z",
        //         "submitted": "2018-06-14T12:34:47.327619Z"}}];

        // ----------


        // ----------------------- Socket Event Listeners

        // Listens for the transmission of our mal_files JSON object, containing all information on potentially
        // malicious files from our scan
        socket.on('mal_files_json', function(mal_files){
            if (!_.isEmpty(mal_files)) {
                _.defer(function () {
                    $scope.$apply(function () {
                        $scope.scan_success = false;
                        // console.log(JSON.parse(mal_files));
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

        // Listens for the transmission of our pass_files JSON object, containing basic information about files that
        // were determined not to be malicious
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


        // ----------------------- Helper Functions

        // Clears and resets the results section
        $rootScope.$on("ClearResults", function() {
           $scope.clearResults();
        });
        $scope.clearResults = function() {

            $scope.clear_results = true;

            setTimeout(function(){
                _.defer(function() {
                    $scope.$apply(function () {
                        $scope.show_results = false;
                    })
                })
            }, 200);

            setTimeout(function(){
                _.defer(function() {
                    $scope.$apply(function () {
                        $scope.clear_results = false;
                        $scope.show_pass_header = false;
                        $scope.scan_success = false;
                        $scope.no_files = false;
                        $scope.file_tree = [];
                        $scope.clear_results = false;
                        $scope.tbl_pass_files = [];
                        $scope.tbl_mal_files = [];
                    })
                })
            }, 1000);

        };


        $rootScope.$on("ScrollResults", function() {
           $scope.scrollResults();
        });
        $scope.scrollResults = function() {
            _.defer(function() {

                $scope.$apply(function () {
                    $scope.show_results = true;
                });

                setTimeout(function() {
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
                }, 500);

            });
        };

        // Returns just the string representation of a JSON value (ie. removes brackets and quotation marks)
        $scope.nameStrip = function(name) {
            return name.toString();
        }

        // ----------

    }

]);

// SERVICE: Controls when a service is clicked on; brings up popup window
app.controller('serviceController', ['$scope', '$uibModal',

    function ServiceController($scope, $uibModal) {

        $scope.serviceInfo = function(service_name) {
            $scope.service_name = service_name;

            // Gives a brief description of whichever service has been clicked on
            switch(service_name) {
                case 'APKaye':
                    $scope.service_descript = "APKaye is a service that focuses on detecting potentially malicious " +
                        "content within android applications (APK's)." +
                        "\r\n\r\n" +
                        "Files are first run through Apktool, which decompiles / pulls them apart, checks for " +
                        "suspicious network indicators, analyzes the script's native libraries and binaries, and " +
                        "validates the signing certificate that links the app to its original author." +
                        "\r\n\r\n" +
                        "The decompiled files are then run through dex2jar, which will revert any .dex files back " +
                        "into .jar format. The .jar files will then be passed to the Espresso service for further " +
                        "analysis." +
                        "\r\n\r\n" +
                        "Finally, the metadata from the APK is analyzed using the Android Asset Packaging Tool " +
                        "(aapt). Aapt is used to examine the APK's manifest for suspicious settings, and to analyze " +
                        "Strings that occur within the APK.";
                    break;

                case 'Avg':
                    $scope.service_descript = "Avg is a wrapper for AVG Antivirus' Linux command line " +
                        "scanner 'avgscan'. This service simply submits files of any type to their scanning " +
                        "service and assigns an Assemblyline score based on the output.";
                    break;

                case 'Beaver':
                    $scope.service_descript = "BeAVER is a service which takes the hash of a submitted file and " +
                        "passes it to the CCIRC Malware Database API to determine whether or not the file has been " +
                        "seen before by the CCIRC Malware Analysis team.";
                    break;

                case 'Binja':
                    $scope.service_descript = "Binja uses the BinaryNinja to examine Windows executable files. " +
                        "BinaryNinja disassembles the machine code being run by the executable, and then scans for " +
                        "any API calls that are made by the executable to sources flagged by the user." ;
                    break;

                case 'BitDefender':
                    $scope.service_descript = "BitDefender is a wrapper for Bitdefender's Linux command line " +
                        "scanner 'bdscan'. If the user has purchased a license for Bitdefender, this service simply " +
                        "submits files of any type to their scanning service and assigns an Assemblyline score " +
                        "based on the output.";
                    break;

                case 'CFMD':
                    $scope.service_descript = "CFMD is a service which takes the hash of a submitted file and " +
                        "passes it to Microsoft's Clean File Metadata database API to determine whether or not the " +
                        "file has been seen before by the Microsoft Security Response Center team.";
                    break;

                case 'Characterize':
                    $scope.service_descript = "Characterize partitions our file (breaks it up into parts), and " +
                        "determines the visual entropy for each partition. Entropy (randomness) in a file is " +
                        "a measure of the predictability of any specific character based on the preceding " +
                        "characters. Files with high entropy values are likely to be encrypted or compressed, as " +
                        "truly random data is not common in typical user data." +
                        "\r\n\r\n" +
                        "A high entropy value on its own is not indicative of a malicious file (indeed, compression " +
                        "is used frequently today by all kinds of complex files), but if the file's source is " +
                        "unknown we can use its entropy value to determine whether or not it has something to hide.";
                    break;

                case 'Cleaver':
                    $scope.service_descript = "Cleaver is used to extract metadata from files. It is specifically " +
                        "geared towards parsing files in OLE2 format - a file type created by Microsoft for Office " +
                        "products which houses embedded objects and links to other documents. These files are " +
                        "easily exploited, and if one is detected Cleaver will dig down into its components to " +
                        "detect potentially malicious anomalies.";
                    break;

                case 'ConfigDecoder':
                    $scope.service_descript = "Works in conjunction with the Yara service. When Yara identifies a " +
                        "potentially malicious file, it is then sent to ConfigDecoder to extract more information, " +
                        "such as: domains, IPs, mutex names, crypto keys and other configuration block information.";
                    break;

                case 'CrowBar':
                    $scope.service_descript = "Script obfuscation refers to the purposeful addition of superfluous " +
                        "/ unnecessary code to a script by a malicious actor, typically with the goal of hiding the " +
                        "programs true purpose and circumventing detection. Crowbar is a de-obfuscator which runs " +
                        "files through a series of modules in an attempt to extract useful identifiers that a " +
                        "script has been purposefully obfuscated.";
                    break;

                case 'Cuckoo':
                    $scope.service_descript = "Cuckoo submits files to Cuckoo Sandbox, a standalone malware " +
                        "analysis system. Cuckoo opens files and monitors execution, filesystem, and network " +
                        "activity that occurs as a result, outputting this information to Assemblyline.";
                    break;

                case 'Espresso':
                    $scope.service_descript = "Espresso is used by Assemblyline to analyze JAR files. All files are " +
                        "extracted, and .java files found inside are decompiled back into readable code using the " +
                        "CFR Decompiler tool. Once decompiled all files are analyzed for malicious behaviour.";
                    break;

                case 'Extract':
                    $scope.service_descript = "The extract service is used simply to extract files out of " +
                        "containers and resubmit them for analysis. If extract is unable to extract a file's " +
                        "contents, it is automatically flagged.";
                    break;

                case 'FSecure':
                    $scope.service_descript = "FSecure is used to submit files to F-Secure's Internet Gatekeeper " +
                        "ICAP proxy server. Files are sent to the proxy server for analysis using F-Secure's " +
                        "antivirus software, and the results are sent back to Assemblyline.";
                    break;

                case 'FrankenStrings':
                    $scope.service_descript = "The FrankenStrings service offers two main functions: to extract and " +
                        "identify potentially harmful strings within a file, and to further break files down into " +
                        "their component parts (if necessary) so that the strings in those components can be " +
                        "analyzed as well. FrankenStrings uses three primary tools in its analysis - FireEye Flare " +
                        "FLOSS, Balbuzard, and base64dump." +
                        "\r\n\r\n" +
                        "FLOSS is a standalone obfuscated String Solver that is used to extract static strings " +
                        "(from ASCII or Unicode files), stacked strings, and encoded / obfuscated strings. It is " +
                        "the primary tool used by FrankenStrings in string extraction for executable files, and its " +
                        "static string modules are used in the examination of all other submitted files as well." +
                        "\r\n\r\n" +
                        "Balbuzard refers to a package of Python modules used to identify patterns of interest in " +
                        "suspicious files (IP addresses, domain names, known file headers, interesting strings, " +
                        "etc). Within the FrankenStrings service it is used mainly to decode and analyze strings " +
                        "from files with XOR encoding." +
                        "\r\n\r\n" +
                        "Base64dump is a utility used to decode and analyze base64 encoded files." +
                        "\r\n\r\n" +
                        "Used in conjunction, these tools offer a robust service which can be used to decode and " +
                        "identify potentially malicious strings from files encoded in a variety of ways. If a " +
                        "string of interest is found within a file by any of the above utilities it is " +
                        "assigned a score based on the likelihood of that string occurring in a non-malicious file.";
                    break;

                case 'KasperskyIcap':
                    $scope.service_descript = "KesperskyIcap is used to submit files to Kaspersky Antivirus's " +
                        "ICAP proxy server. Files are sent to the proxy server for analysis using Kaspersky's " +
                        "antivirus software, and the results are sent back to Assemblyline.";
                    break;

                case 'McAfee':
                    $scope.service_descript = "McAfee is a wrapper for McAfee Antivirus' Linux command line " +
                        "scanner 'uvscan'. This service simply submits files of any type to their scanning " +
                        "service and assigns an Assemblyline score based on the output.";
                    break;

                case 'MetaDefender':
                    $scope.service_descript = "MetaDefender is used to submit files to the API of MetaDefender " +
                        "Core's cyber security server. Files are sent to the server for analysis using " +
                        "MetaDefender's threat prevention platform, and the results are sent back to Assemblyline.";
                    break;

                case 'MetaPeek':
                    $scope.service_descript = "MetaPeek is used to analyze the metadata of a submitted file. It " +
                        "looks for anomalies that are typically employed by spam writers to trick people into " +
                        "clicking on embedded files, such as: double file extension, empty file names, excessive " +
                        "use of whitespace, or bi-directional unicode control characters.";
                    break;

                case 'NSRL':
                    $scope.service_descript = "NSRL is a service which takes a file's hash and looks it up against " +
                        "the National Software Reference Library's database of known malicious files. If the hash " +
                        "is recognized the file is automatically flagged in Assemblyline";
                    break;

                case 'Oletools':
                    $scope.service_descript = "Oletools is a service aimed specifically at analyzing and detecting " +
                        "threats in Microsoft OLE files and in XML documents. Specifically Oletools reviews macros " +
                        "for SHA256 encoded content, suspicious strings, and malicious network indicators. " +
                        "Additionally Oletools will identify potentially harmfull document streams, and suspicious " +
                        "XML content as determined by the FrankenStrings module.";
                    break;

                case 'PDFId':
                    $scope.service_descript = "PDFId is a tool for examining the metadata of, and objects contained " +
                        "within, PDF files. PDFId runs two default services: PDFId by Didier Stevens, and " +
                        "PDFParser." +
                        "\r\n\r\n" +
                        "These tools work to differentiate ordinary PDFs from potentially malicious ones by " +
                        "analyzing things like header strings, streams, embedded files, full objects, javascript " +
                        "scripts, entropy, and more. Once information on a PDF has been extracted by PDFId, it is " +
                        "submitted to a series of Python PDFId plugins which assign an Assembyline score to the " +
                        "file.";
                    break;

                case 'PEFile':
                    $scope.service_descript = "PEFile is a service that targets windows executable files. It " +
                        "attempts to extract the PE header to obtain information such as: entry point address, " +
                        "linker version, OS version, time date stamp, machine type, rich header info, data " +
                        "directory info, sections info, debug info, import / export info, and resources info. " +
                        "Any anomalies or indicators of compromise will be flagged.";
                    break;

                case 'PeePDF':
                    $scope.service_descript = "PeePDF uses the Python PeePDF library to break down and analyze PDF " +
                        "files. Collects information on the pdf (MD5 and SHA256 hashes, size, version, streams, " +
                        "etc), and applies a variety of heuristic techniques to detect anomalies (embedded PDF in " +
                        "XDP, potentially malicious javascript, CVE identifiers, suspicious URL detection).";
                    break;

                case 'Suricata':
                    $scope.service_descript = "The Suricata service opens a file and submits a tcpdump of the " +
                        "resulting network activity to the open source Suricata intrusion detection system. " +
                        "Suricata inspects network traffic and will return a warning if any suspicious behaviour " +
                        "is detected when the file is opened; an Assemblyline score is generated accordingly.";
                    break;

                case 'Swiffer':
                    $scope.service_descript = "Swiffer is a service aimed at detecting malicious SWF files " +
                        "generated by Adobe Flash. It examines file metadata and applies a variety of heuristic " +
                        "functions to determine if the file is suspicious, for example: checks for large printable " +
                        "character buffers, checks if SWF was compiled within last 24 hours, looks for embedded " +
                        "binary data, and attempts to identify intentional obfuscation.";
                    break;

                case 'Symantec':
                    $scope.service_descript = "Symantec is a service that interfaces with the ICAP proxy of " +
                        "Symantec's Protection Engine for Cloud Services. Files are sent to the server and " +
                        "analyzed, and results are passed back to Assemblyline which assigns a score based on the " +
                        "results.";
                    break;

                case 'Sync':
                    $scope.service_descript = "Ensures that when a file is submitted to Assemblyline, it is " +
                        "successfully copied to all file transport layers within the system. This service runs as a " +
                        "system service and cannot be turned off. If this service is returning an error, please " +
                        "contact a network administrator.";
                    break;

                case 'TagCheck':
                    $scope.service_descript = "TagCheck is a post-scan service that is run once the initial scan of " +
                        "a file is complete. It is designed to examine all tags generated by other services and " +
                        "compare them to an internal database of known malicious signatures. In the event of a " +
                        "signature match, the corresponding file can have its score elevated, more tags generated, " +
                        "or further analysis performed on it, depending on the signature.";
                    break;

                case 'TorrentSlicer':
                    $scope.service_descript = "Torrent slicer is a service aimed at extracting information from " +
                        "torrent files, with the help of the Bencode Python module. It collects torrent metadata, " +
                        "file information, and URL lists (if found), and also works to calculate relevant " +
                        "information such as the type of torrent, number of pieces, last piece size, and the size " +
                        "of the torrent. The file is automatically flagged if any return information is deemed " +
                        "suspicious.";
                    break;

                case 'Unpacker':
                    $scope.service_descript = "The unpacker service is used simply to unpack files from UPX packed " +
                        "executable files and resubmit them for analysis. If unpacker is unable to unpack a " +
                        "file's contents, it is automatically flagged.";
                    break;

                case 'VirusTotalDynamic':
                    $scope.service_descript = "VirusTotalDynamic simply submits a file to VirusTotal for analysis " +
                        "and assigns an Assemblyline score based on the results.";
                    break;

                case 'VirusTotalStatic':
                    $scope.service_descript = "VirusTotalStatic checks the hash of a given file against the " +
                        "VirusTotal API and returns the results.";
                    break;

                case 'Yara':
                    $scope.service_descript = "This service runs all files through the Yara application. Yara is a " +
                        "malware pattern matching system that houses a long list of code snippets that are known to " +
                        "be present in various types of malware (these snippets are called 'rules'), and returns a " +
                        "warning for any file whose content or binary data matches a rule. In addition to Yara's " +
                        "pattern matching utility, this service also supports the following external modules: " +
                        "Dotnet, ELF, Hash, Magic, Math, and PE.";
                    break;

                default:
                    $scope.service_descript = "No quick description available for this service. Please contact a " +
                        "network administrator for more information. ";
                    break;

            }

            var uibModalInstance = $uibModal.open({
                templateUrl: '/static/ng-template/popup.html',
                controller: 'popupController',
                size: 'lg',
                resolve: {
                    popup_scope: function(){
                        return $scope;
                    }
                }
            });

        };

    }

]);


// POPUP: Controls new popup window
app.controller('popupController',

    function PopupController($scope, $uibModalInstance, popup_scope) {
        $scope.pop_header = 'Service: ' + popup_scope.service_name;
        $scope.pop_body = popup_scope.service_descript;
        $scope.close = function () {
            $uibModalInstance.dismiss('close');
        };

    }

);


/* ============== Directives ==============*/

// Handles show / hide events being applied to user_output_img. The myShow variable is linked to the show variable of
// the controller; when its value is changed, an event is called accordingly to animate it fading in / out. Once the
// animation is complete, calls afterShow() or afterHide() as necessary
app.directive('animOutputHeader', function($animate) {
    return {
        link: function (scope, elem, attr) {
            scope.$watch(attr.animOutputHeader, function () {
                if (scope.deviceEvent === 'done') {
                    $animate.removeClass(elem, 'hidden');
                    $animate.removeClass(elem, 'img-hide').then(scope.outputHeaderAfterShow);
                }
                if (scope.deviceEvent === 'connected' && scope.deviceConnected === false ||
                scope.deviceEvent === 'disconnected' && scope.deviceConnected === true) {
                    $animate.addClass(elem, 'hidden');
                    $animate.addClass(elem, 'img-hide').then(scope.outputHeaderAfterHide);
                }
            });
        }
    }
});
