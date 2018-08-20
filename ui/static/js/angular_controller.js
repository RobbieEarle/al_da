// Module Initialization
let app = angular.module('al_da', ['ngAnimate', 'ui.bootstrap', 'ui.toggle']);

// Socket Initialization
let socket = io.connect('http://' + document.domain + ':' + location.port);


/* ============== Controllers ==============*/

/* === Scan Page == */

app.controller('MainController', ['$scope', '$rootScope', function MainController($scope, $rootScope) {

    $scope.lock_scan = false;

    // ----------------------- Root Scope Event Handlers

    $rootScope.$on("lock_scan", function (self, result_type) {
        $scope.lock_scan = true;
    });

    $rootScope.$on("unlock_scan", function (self, result_type) {
        $scope.lock_scan = false;
    });

}]);


app.controller('ScanController', ['$scope', '$rootScope', function ScanController($scope, $rootScope) {
    /*
    Controls main kiosk output console and output icon
     */

    // ----------------------- Default Values

    // Holds custom text values
    $scope.text_boxes = {};

    // Large image prompt that shows before device is connected
    $scope.kiosk_img = '/static/images/scrape_no_conn.svg';

    // Text that accompanies kiosk_img
    $scope.kiosk_img_sub = 'Please attach storage device';

    // When a device is added / removed, this string records the type of event that occurred. Is used by our
    // animOutputHeader animation directive; when any device event occurs, the current kiosk_img fades, and this
    // variable tells it which image to change it to before reappearing
    $scope.device_event = '';

    // Used to control what UI elements are shown in the output section of our scan container.
    // Screen 0: No device attached; kiosk_img prompts user to plug in device
    // Screen 1: Device detected and Assemblyline server connection successful; prompts user to enter credentials
    // Screen 2: Credentials have been entered; scanning
    $scope.curr_screen = 0;

    // Controls the text output that appears in our large textbox while scanning (screen 2)
    $scope.kiosk_output = '';

    // Controls whether or not the output part of our scanning container is shown. What this section displays
    // depends on which screen is currently active
    $scope.hide_output = true;

    // Total number of files that have been submitted to the AL server
    $scope.files_submitted = 0;

    // Total number of files that have been received by the AL server and have sent back a confirmation message
    $scope.files_received = 0;

    // Total number of files waiting to be submitted to the AL server
    $scope.files_waiting = 0;

    // Percentage of files that have been received by the AL server from the total number of submitted files
    $scope.percentage_received = 0;

    // Percentage of files that have not been received by the AL service from the total number of submitted files
    $scope.percentage_sent = 0;

    // Controls the text that appears over the 'received' portion of the progress bar while scanning. Is variable
    // because this value can be set to "Searching for more files" if all submitted files have been received but
    // there are still files yet to be submitted
    $scope.received_outout = '';

    // Handles the 'type' parameter of the received bar. Depending on what's happening in our scan, can either be
    // set to received, scanning, or done
    $scope.received_type = 'received';


    // Dict that is populated by our Flask back end based on the credentials chosen by the user in the admin page
    $scope.credentials = {};

    // Controls whether or not 'Connected' / 'Disconnected' mini display shows that the top of our output container.
    // This appears whenever our kiosk_img prompt is minimized (ie. on all screens except for 0)
    $scope.mini_kiosk = false;

    // Text output that shows in our mini kiosk
    $scope.mini_kiosk_sub = 'No device connected';

    // Simply reflects whether or not a device is currently connected - is used to control the background color of
    // our mini kiosk (turns green / red if a devices is connected / disconnected)
    $scope.device_connected = false;

    // Holds whether or not our VM is currently refreshing in the back end
    $scope.vm_refreshing = false;


    // ----------------------- Socket Event Handlers

    socket.on('connect', function() {
        /*
        Listens for initial connect message from the socketio server
        */

        socket.emit('fe_get_text_boxes',
            function (text_boxes) {

                _.defer(function () {
                    $scope.$apply(function () {
                        $scope.text_boxes = text_boxes;
                    });
                });

            });

        socket.emit('fe_scan_start');

    });


    socket.on('dev_event', function(event){
        /*
        Handles device events outputted by our back end script
        */

        console.log('Device Event Received: ' + event);

        if (!$scope.vm_refreshing) {

            // Called when a device is first connected (any device; this event simply changes the device connected
            // picture from red to green to let the user know that their device has been plugged in. Once the device
            // has been loaded and correctly identified as a block device the connected event will be called, but this
            // can take a few moments. This event just shows the user that the device has been detected so they don't
            // remove it prematurely
            if (event === 'new_detected') {
                $scope.device_connected = true;
            }

            // Called when a device is removed
            else if (event === 'remove_detected') {

                $scope.device_connected = false;

                _.defer(function () {
                    $scope.$apply(function () {
                        $scope.mini_kiosk_sub = 'No device connected';
                    });
                });

                // If our scan was finished (ie. results were shown), shows a button to start a new session without
                // removing the results from the previous session (this way the user can unplug their device and they
                // can still read through the results)
                if ($scope.received_type === 'done' || $scope.received_type === 'timeout') {
                    $rootScope.$emit("device_removed", {});
                }
            }

            // Called when a block device is loaded. Resets all variables related to our scan progress bar screen
            // (these variables will have have been reset previously when the device was removed, but this occurs
            // again just in case in the interim a straggling file was sent through by the back end app)
            else if (event === 'connected') {

                _.defer(function () {
                    $scope.$apply(function () {
                        $scope.files_submitted = 0;
                    });
                });
                _.defer(function () {
                    $scope.$apply(function () {
                        $scope.files_received = 0;
                    });
                });
                _.defer(function () {
                    $scope.$apply(function () {
                        $scope.files_waiting = 0;
                    });
                });
                _.defer(function () {
                    $scope.$apply(function () {
                        $scope.percentage_received = 0;
                    });
                });
                _.defer(function () {
                    $scope.$apply(function () {
                        $scope.percentage_sent = 0;
                    });
                });
                _.defer(function () {
                    $scope.$apply(function () {
                        $scope.received_outout = '';
                    });
                });
                _.defer(function () {
                    $scope.$apply(function () {
                        $scope.received_type = 'received';
                    });
                });
                _.defer(function () {
                    $scope.$apply(function () {
                        $scope.kiosk_output = '';
                    });
                });

            }

            // Called when all our files have been successfully scanned
            else if (event === 'done_loading' && $scope.device_connected) {

                setTimeout(function () {
                    if ($scope.device_connected) {
                        _.defer(function () {
                            $scope.$apply(function () {
                                $scope.received_type = 'done';
                            });
                        });
                        _.defer(function () {
                            $scope.$apply(function () {
                                $scope.received_output = "All files successfully scanned";
                            });
                        });
                    }
                }, 500);

                // Hides our scan screen and makes the results page visible
                setTimeout(function () {
                    if ($scope.device_connected) {
                        _.defer(function () {
                            $scope.$apply(function () {

                                $scope.hide_output = true;

                                setTimeout(function () {
                                    if ($scope.device_connected) {
                                        _.defer(function () {
                                            $scope.$apply(function () {
                                                $rootScope.$emit("results_init", 'done', {});
                                            })
                                        });
                                    }
                                }, 1000);

                            })
                        });
                    }
                }, 1500);

            }

            // Called when a timeout occurs while waiting to receive files
            else if (event === 'timeout' && $scope.device_connected) {

                setTimeout(function () {
                    if ($scope.device_connected) {
                        _.defer(function () {
                            $scope.$apply(function () {
                                $scope.received_type = 'timeout';
                            });
                        });
                        _.defer(function () {
                            $scope.$apply(function () {
                                $scope.received_output = "Timeout";
                            });
                        });
                    }
                }, 500);

                // Hides our scan screen and makes the results page visible
                setTimeout(function () {
                    if ($scope.device_connected) {
                        _.defer(function () {
                            $scope.$apply(function () {

                                $scope.hide_output = true;

                                setTimeout(function () {
                                    if ($scope.device_connected) {
                                        _.defer(function () {
                                            $scope.$apply(function () {
                                                $rootScope.$emit("results_init", 'timeout', {});
                                            })
                                        });
                                    }
                                }, 1000);

                            })
                        });
                    }
                }, 1500);

            }

            // Called when a device is disconnected
            else if (event === 'disconnected') {

                console.log('received_type = ' + $scope.received_type);
                console.log('curr_screen = ' + $scope.curr_screen);

                // Handles premature device removal
                if ($scope.received_type !== 'done' && $scope.received_type !== 'timeout'){

                    if ($scope.curr_screen === 2) {

                        setTimeout(function () {
                            _.defer(function () {
                                $scope.$apply(function () {
                                    $scope.received_type = 'early';
                                });
                            });
                            _.defer(function () {
                                $scope.$apply(function () {
                                    $scope.percentage_received = 100;
                                    $scope.percentage_sent = 0;
                                });
                            });
                            _.defer(function () {
                                $scope.$apply(function () {
                                    $scope.received_output = "Device removed before scan could be completed";
                                });
                            });
                        }, 500);

                        // Hides our scan screen and makes the results page visible
                        setTimeout(function () {
                            _.defer(function () {
                                $scope.$apply(function () {

                                    $scope.hide_output = true;

                                    setTimeout(function () {
                                        _.defer(function () {
                                            $scope.$apply(function () {
                                                $rootScope.$emit("results_init", 'premature', {});
                                            })
                                        });
                                    }, 1000);
                                    setTimeout(function () {
                                        _.defer(function () {
                                            $scope.$apply(function () {
                                                $rootScope.$emit("device_removed", {});
                                            })
                                        });
                                    }, 1500);

                                })
                            })
                        }, 1500);

                    }

                    else {

                        // Resets all session variables
                        setTimeout(function () {
                            _.defer(function () {
                                $scope.$apply(function () {
                                    console.log("New Session!");
                                    $scope.new_session();
                                });
                            });
                        }, 100);

                    }

                }

            }

            else if (event === 'loading_results') {

                _.defer(function () {
                    $scope.$apply(function () {
                        $scope.received_type = 'loading';
                    });
                });
                _.defer(function () {
                    $scope.$apply(function () {
                        $scope.percentage_received = 100;
                        $scope.percentage_sent = 0;
                    });
                });
                _.defer(function () {
                    $scope.$apply(function () {
                        $scope.received_output = "Retrieving detailed results from server";
                    });
                });

            }

            // If we are still in screen 0 (ie. our large kiosk_img is still visible), then we alter our device_event
            // variable which is being watched by our animation directive. Will change the image being displayed
            // depending on the device event
            if ($scope.curr_screen === 0 && ($scope.device_connected || event === 'remove_detected'))
                _.defer(function () {
                    $scope.$apply(function () {
                        $scope.device_event = event;
                    });
                });

        }

    });


    socket.on('clear', function(){
        /*
        Called by our back end script when it wants to clear the text output box
         */

        _.defer(function() {
            $scope.$apply(function () {
                $scope.kiosk_output = '';
            });
        });

    });


    socket.on('update_ingest', function(args){
        /*
        Called by back end script whenever a file is submitted or received. This function controls the status of
        the scan progress bar.
         */
        if ($scope.device_connected) {

            let update_type = args["update_type"];
            let filename = args["filename"];

            // Handles when files are received back from server
            if (update_type === 'receive_file')
                $scope.files_received++;

            // Handles when files are submitted to server for analysis
            else if (update_type === 'submit_file')
                $scope.files_submitted++;

            // Determines number of files waiting
            $scope.files_waiting = $scope.files_submitted - $scope.files_received;
            // If there are still files left to submit or receive, formats progress bar to show how many
            if ($scope.files_waiting !== 0) {
                _.defer(function () {
                    $scope.$apply(function () {
                        $scope.received_type = 'received';
                    });
                });
                _.defer(function () {
                    $scope.$apply(function () {
                        $scope.received_output = "Scanned: " + $scope.files_received;
                    });
                });
                _.defer(function () {
                    $scope.$apply(function () {
                        $scope.submit_output = "Queue: " + $scope.files_waiting;
                    });
                });
            }

            // If there are no files left to receive but the scan has not finished (ie. has not been told by
            // by the back end that all partitions are done loading and scanning) then the progress bar
            // indicates that it is waiting for more files
            else if ($scope.received_type !== 'done') {
                setTimeout(function () {
                    if ($scope.files_waiting === 0 && $scope.received_type !== 'done') {
                        _.defer(function () {
                            $scope.$apply(function () {
                                $scope.received_type = 'scanning';
                            });
                        });
                        _.defer(function () {
                            $scope.$apply(function () {
                                $scope.received_output = "Searching for more files";
                            });
                        });
                    }
                }, 1000);
            }

            // Updates our progress bars
            _.defer(function () {
                $scope.$apply(function () {
                    $scope.percentage_received = 100 * ($scope.files_received / $scope.files_submitted);
                    $scope.percentage_sent = 100 - $scope.percentage_received;
                });
            });

            // Outputs text to console
            let output = '';
            if (update_type === 'submit_file')
                output = 'File submitted: ' + filename;
            else if (update_type === 'receive_file')
                output = '  File received: ' + filename;
            _.defer(function () {
                $scope.$apply(function () {
                    $scope.kiosk_output = $scope.kiosk_output + '\r\n' + output;
                });
            });
            // Makes sure UI console keeps scrolling down automatically when UI console overflows
            _.defer(function () {
                $scope.$apply(function () {
                    let textarea = document.getElementById('kiosk_output_txt');
                    textarea.scrollTop = textarea.scrollHeight;
                });
            });

        }

    });


    socket.on('vm_refreshing', function(status){
        /*
        Called by back end when our VM is refreshing / not accepting new devices, or when it has finished refreshing
         */

        $scope.vm_refreshing = status;
        _.defer(function () {
            $scope.$apply(function () {
                $scope.vm_refreshing = status;
            });
        });

    });


    // ----------------------- Root Scope Event Handlers

    $rootScope.$on("new_session", function () {
        /*
        Called by the results controller when the user clicks the 'Begin new session' button
         */

        $scope.new_session();

    });


    // ----------------------- Animation Event Handlers

    $scope.after_show_img = function() {
        /*
        Called after show animation has completed on user_output_img
         */

        $scope.device_event = '';

    };


    $scope.after_hide_img = function(device_event) {
        /*
        Called after the kiosk_img and kiosk_img_sub have finished hiding (fading to opacity 0). Then changes
        values depending on the device event that triggered the hide animation and changes the device event to
        'show' (unless the device event was simply to 'hide'), which will cause the images to reappear. If the
        device event was 'al_server_success', then we know that we have successfully connected to our Assemblyline
        server, and thus we show our enter credentials page
         */

        setTimeout(function(){

            if (device_event === 'new_detected'){
                _.defer(function () {
                    $scope.$apply(function () {
                        $scope.kiosk_img = '/static/images/scrape_conn.svg';
                    });
                });
                _.defer(function () {
                    $scope.$apply(function () {
                        $scope.kiosk_img_sub = 'Device detected';
                    });
                });
            }
            else if (device_event === 'remove_detected') {
                _.defer(function () {
                    $scope.$apply(function () {
                        $scope.kiosk_img = '/static/images/scrape_no_conn.svg';
                    });
                });
                _.defer(function () {
                    $scope.$apply(function () {
                        $scope.kiosk_img_sub = 'Please attach storage device';
                    });
                });
            }
            else if (device_event === 'connected') {

                _.defer(function () {
                    $scope.$apply(function () {
                        $scope.kiosk_img = '/static/images/loading.svg';
                    });
                });
                _.defer(function () {
                    $scope.$apply(function () {
                        $scope.kiosk_img_sub = 'Connecting to Assemblyline server';
                    });
                });

            }
            else if (device_event === 'al_server_success') {

                _.defer(function () {
                    $scope.$apply(function () {
                        $scope.kiosk_img = '/static/images/scrape_conn.svg';
                    });
                });
                _.defer(function () {
                    $scope.$apply(function () {
                        $scope.kiosk_img_sub = 'Connection successful';
                    });
                });
                _.defer(function () {
                    $scope.$apply(function () {
                        $scope.mini_kiosk_sub = 'Device Connected';
                    });
                });

            }
            else if (device_event === 'disconnected') {

                _.defer(function () {
                    $scope.$apply(function () {
                        $scope.kiosk_img = '/static/images/scrape_no_conn.svg';
                    });
                });
                _.defer(function () {
                    $scope.$apply(function () {
                        $scope.kiosk_img_sub = 'Please attach storage device';
                    });
                });

            }
            else if (device_event === 'al_server_failure') {

                _.defer(function () {
                    $scope.$apply(function () {
                        $scope.kiosk_img = '/static/images/fail.svg';
                    });
                });
                _.defer(function () {
                    $scope.$apply(function () {
                        $scope.kiosk_img_sub = 'Error connecting to Assemblyline Server';
                    });
                });

            }

            if (device_event !== 'hide')
                _.defer(function () {
                    $scope.$apply(function () {
                        $scope.device_event = 'show';
                    });
                });

            if (device_event === 'al_server_success') {
                $scope.enter_credentials();
            }

        }, 200);

    };


    // ----------------------- Button Event Handlers

    $scope.btn_start_scan = function() {
        /*
        Called by the "Start scan" button in our credentials screen
         */

        // Changes the current screen from 1 (credentials) to 2 (scanning)
        _.defer(function() {
            $scope.$apply(function () {
                $scope.hide_output = true;
            });
        });
        setTimeout(function () {
            _.defer(function () {
                $scope.$apply(function () {
                    $scope.curr_screen = 2;
                });
            });
        }, 1000);
        setTimeout(function () {
            _.defer(function () {
                $scope.$apply(function () {
                    $scope.hide_output = false;
                });
            });
        }, 1200);

        // Sends the given user credentials to the back end (if an alert is generated, these results will be sent
        // in an email alert)
        setTimeout(function () {

            let credentials = [];

            for (let i = 0; i < $scope.credentials.length; i++) {
                if ($scope.credentials[i].active && $scope.credentials[i].session_val !== '') {
                    credentials.push({
                        'name': $scope.credentials[i].name,
                        'value': $scope.credentials[i].session_val
                    })
                }
            }
            socket.emit('fe_set_session_credentials', credentials);

        }, 2000);

    };


    // ----------------------- Helper Functions

    $scope.enter_credentials = function() {
        /*
        Called by our after_hide_img function once our Assembyline server has been connected
         */

        if ($scope.device_connected) {

            let empty = true;

            // Checks whether admin has requested any credentials
            socket.emit('fe_get_credentials',
                function (credentials) {

                    for (let i = 0; i < credentials.length; i++) {
                        if (credentials[i].active)
                            empty = false;
                    }

                    _.defer(function () {
                        $scope.$apply(function () {
                            $scope.credentials = credentials;
                        });
                    });

                });

            // Hides our main kiosk_img and kiosk_img_sub images
            setTimeout(function () {
                _.defer(function () {
                    $scope.$apply(function () {
                        if ($scope.device_connected)
                            $scope.device_event = 'hide';
                    });
                });
            }, 1000);

            // Changes the current screen to 1 (credentials) or 2 (scan), depending if admin has activated credentials
            setTimeout(function () {

                if (!empty)
                    _.defer(function () {
                        $scope.$apply(function () {
                            if ($scope.device_connected)
                                $scope.curr_screen = 1;
                        });
                    });
                else
                    _.defer(function () {
                        $scope.$apply(function () {
                            if ($scope.device_connected)
                                $scope.curr_screen = 2;
                        });
                    });

            }, 1200);

            // Causes our thin green bar along the top to show, indicating our device is connected
            setTimeout(function () {
                _.defer(function () {
                    $scope.$apply(function () {
                        if ($scope.device_connected)
                            $scope.mini_kiosk = true;
                    });
                });
            }, 1800);

            // Reveals our output screen
            setTimeout(function () {
                _.defer(function () {
                    $scope.$apply(function () {
                        if ($scope.device_connected)
                            $scope.hide_output = false;
                    });
                });
            }, 2400);

            setTimeout(function () {

                if (empty) {
                    let credentials = [];
                    socket.emit('fe_set_session_credentials', credentials);
                }

            }, 3200);

        }

    };


    $scope.credential_check = function() {
        /*
        Called when our main nav button is clicked in the credentials screen - returns whether or not all mandatory
        fields have been filled out
         */

        let form_incomplete = false;

        for (let i=0; i<$scope.credentials.length; i++){
            if ($scope.credentials[i].active && $scope.credentials[i].mandatory &&
                $scope.credentials[i].session_val === '')
                form_incomplete = true;
        }

        return form_incomplete;

    };


    $scope.new_session = function() {
        /*
        Called when a session is completed, either by completing a scan and clicking the main nav button, or by
        unplugging the device before the scan has finished. Resets all variables used by this controller to their
        default values
         */

        // Emits message to the results controller telling it to clear all results
        $rootScope.$emit("clear_results", {});

        setTimeout(function(){
            _.defer(function() {
                $scope.$apply(function () {
                    $scope.hide_output = true;
                })
            });
        }, 1000);

        setTimeout(function () {
            _.defer(function () {
                $scope.$apply(function () {
                    $scope.mini_kiosk = false;
                })
            });
        }, 1100);

        setTimeout(function(){
            _.defer(function() {
                $scope.$apply(function () {
                    $scope.curr_screen = 0;
                })
            });
        }, 2200);

        setTimeout(function(){

            if (!$scope.device_connected) {
                _.defer(function () {
                    $scope.$apply(function () {
                        $scope.kiosk_img = '/static/images/scrape_no_conn.svg';
                    });
                });
                _.defer(function () {
                    $scope.$apply(function () {
                        $scope.kiosk_img_sub = 'Please attach storage device';
                    });
                });
            }

            _.defer(function() {
                $scope.$apply(function () {
                    $scope.kiosk_output = '';
                });
            });
            _.defer(function() {
                $scope.$apply(function () {
                    $scope.credentials_given = false;
                });
            });
            _.defer(function() {
                $scope.$apply(function () {
                    $scope.files_submitted = 0;
                });
            });
            _.defer(function() {
                $scope.$apply(function () {
                    $scope.files_waiting = 0;
                });
            });
            _.defer(function() {
                $scope.$apply(function () {
                    $scope.percentage_received = 0;
                });
            });
            _.defer(function() {
                $scope.$apply(function () {
                    $scope.percentage_sent = 0;
                });
            });
            _.defer(function() {
                $scope.$apply(function () {
                    $scope.received_outout = '';
                });
            });
            _.defer(function() {
                $scope.$apply(function () {
                    $scope.received_type = 'received';
                });
            });
            _.defer(function() {
                $scope.$apply(function () {
                    $scope.credentials = {};
                });
            });
            _.defer(function() {
                $scope.$apply(function () {
                    $scope.mini_kiosk_sub = 'No device connected';
                });
            });
            _.defer(function () {
                $scope.$apply(function () {
                    $rootScope.$emit("unlock_scan", {});
                });
            });

        }, 2500);

        setTimeout(function(){
            _.defer(function() {
                $scope.$apply(function () {
                    $scope.device_event = "show";
                })
            });
            _.defer(function () {
                $scope.$apply(function () {
                    socket.emit('fe_session_complete');
                })
            });
        }, 2800);

    };

}]);


app.controller('ResultsController', ['$scope', '$rootScope', function ResultsController($scope, $rootScope) {
    /*
    Controls the results page that is brought up by main kiosk console
     */

    // ----------------------- Default Values

    // Holds custom text values
    $scope.text_boxes = {};

    // Controls whether or not the results container is visible
    $scope.show_results = false;

    // Set to true when no malicious files are sent from the back end. This is used by the front end to determine
    // whether or not to show the malicious files section of the results
    $scope.hide_pass_files = false;

    // Set to true when no safe files are sent from the back end. Used by front end to determine whether or not to
    // show the safe files section of the results
    $scope.hide_mal_files = false;

    // Array that holds a reference to all files that were not flagged by Assemblylline
    $scope.tbl_pass_files = [];

    // Array that holds a reference to all files that were flagged by Assemblyline
    $scope.tbl_mal_files = [];

    // Controls whether or not the container that houses a scan's list of malicious / safe files is show. When the
    // the user chooses their settings such that neither malicious nor safe files are to be shown, setting this
    // variable to false prevents an empty white box from remaining beneath the general green / red light results
    $scope.display_results = true;

    // Dict object that identifies the resuts from a scan that the admin would like to be available to the user
    $scope.result_settings = {};

    // Controls whether our "Start new session" button is visible or not. Remains false until our scan is complete
    // and device removed
    $scope.hide_btn = true;

    // Controls whether or not an error alert comes up telling the user the results are based on incomplete scan
    $scope.scan_complete = true;

    // Holds the text output to user for when a timeout or early removal error occurs
    $scope.error_output = '';


    // ----------------------- Socket Event Handlers

    socket.on('mal_files_json', function(mal_files){
        /*
        Listens for the transmission of our mal_files JSON object, containing all information on potentially
        malicious files from our scan
         */

        // Checks if any malicious files were flagged; if so, indicates that the scan resulted in alert, and
        // stores the array of malicious files to be used by results.html to populate our malicious files table
        let parse_mal_files = JSON.parse(mal_files);
        if (parse_mal_files.length !== 0) {

            _.defer(function () {
                $scope.$apply(function () {
                    $scope.hide_mal_files = false;
                });
            });
            _.defer(function () {
                $scope.$apply(function () {
                    $scope.tbl_mal_files = parse_mal_files;
                });
            });

        }

        // If no malicious files were flagged, our scan was a success!
        else
            _.defer(function() {
                $scope.$apply(function () {
                    $scope.hide_mal_files = true;
                });
            });

    });


    socket.on('pass_files_json', function(pass_files){
        /*
        Listens for the transmission of our pass_files JSON object, containing basic information about files that
        were determined not to be malicious
         */

        // Checks if any safe files were sent; if so, populates our tbl_pass_files array with their details
        let parse_pass_files = JSON.parse(pass_files);
        if (parse_pass_files.length !== 0) {

            _.defer(function () {
                $scope.$apply(function () {
                    $scope.hide_pass_files = false;
                });
            });
            _.defer(function () {
                $scope.$apply(function () {
                    $scope.tbl_pass_files = parse_pass_files;
                });
            });

        }

        // If not, indicates that the pass files section of the results page can remain hidden
        else
            _.defer(function () {
                $scope.$apply(function () {
                    $scope.hide_pass_files = true;
                });
            });

    });


    // ----------------------- Root Scope Event Handlers

    $rootScope.$on("results_init", function(self, result_type) {
        /*
        Called by our ScanController after our back end script has indicated that all files have been scanned
         */

        socket.emit('fe_get_text_boxes',
            function (text_boxes) {

                _.defer(function () {
                    $scope.$apply(function () {
                        $scope.text_boxes = text_boxes;
                    });
                });

            });

        $rootScope.$emit("lock_scan", {});

        setTimeout(function () {

            // If result_type is done then we know our scan successfully completed (ie. not by premature device removal or
            // timeout)
            if (result_type === 'done') {
                _.defer(function () {
                    $scope.$apply(function () {
                        $scope.scan_complete = true;
                    });
                });
            }

            // Otherwise we know we are showing the results for an incomplete scan
            else {
                _.defer(function () {
                    $scope.$apply(function () {
                        $scope.scan_complete = false;
                    });
                });
                if (result_type === 'premature')
                    _.defer(function () {
                        $scope.$apply(function () {
                            $scope.error_output = $scope.text_boxes['error_removal'];
                        });
                    });
                else if (result_type === 'timeout')
                    _.defer(function () {
                        $scope.$apply(function () {
                            $scope.error_output = $scope.text_boxes['error_timeout'];
                        });
                    });
            }

            // Retrieves the admin's result settings from our DB
            socket.emit('fe_get_results_settings',
                function (result_settings) {
                    _.defer(function () {
                        $scope.$apply(function () {
                            $scope.result_settings = result_settings;
                        });
                    });
                });

            // Shows results page
            $scope.results_init();

        }, 1500);

    });


    $rootScope.$on("device_removed", function () {
        /*
        Called by ScanController to indicate that a device has been removed, thus signalling the results page to
        show the "Start new session" button
         */

        setTimeout(() => document.getElementById('results_scroll_to').scrollIntoView({
            behavior: 'smooth',
            block: 'start'
        }));

        setTimeout(function () {

            _.defer(function () {
                $scope.$apply(function () {
                    $scope.hide_btn = false;
                });
            });

        }, 1000);

    });


    $rootScope.$on("clear_results", function() {
       /*
       Called by ScanController when a new session has been initiated and the results page is to be cleared
        */

       $scope.clear_results();

    });


    // ----------------------- Helper Functions

    socket.emit('fe_get_results_settings', function (results_settings) {
        /*
        Retrieves the settings chosen by the admin for how detailed the results of the scan should be; assigns the
        settings to the $scope.results_settings variable, and if both mal_files and safe_files were set to off it
        doesn't display any results at all besides the general red / green light
         */

            _.defer(function () {
                $scope.$apply(function () {
                    $scope.results_settings = results_settings;
                });
            });
            _.defer(function () {
                $scope.$apply(function () {
                    $scope.display_results = (results_settings['mal_files'] || results_settings['safe_files']);
                });
            });

        });


    $scope.clear_results = function() {
        /*
        Causes the results page to become invisible and resets all variables to their default values
         */

        setTimeout(function(){

            _.defer(function() {
                $scope.$apply(function () {
                    $scope.hide_btn = true;
                })
            });
            _.defer(function () {
                $scope.$apply(function () {
                    $scope.show_results = false;
                })
            });

        }, 200);

        setTimeout(function(){

            _.defer(function() {
                $scope.$apply(function () {
                    $scope.hide_pass_files = true;
                })
            });
            _.defer(function () {
                $scope.$apply(function () {
                    $scope.hide_mal_files = false;
                })
            });
            _.defer(function () {
                $scope.$apply(function () {
                    $scope.tbl_pass_files = [];
                })
            });
            _.defer(function () {
                $scope.$apply(function () {
                    $scope.tbl_mal_files = [];
                })
            });
            _.defer(function () {
                $scope.$apply(function () {
                    $scope.display_results = true;
                })
            });
            _.defer(function () {
                $scope.$apply(function () {
                    $scope.result_settings = {};
                })
            });

        }, 1000);

    };


    $scope.results_init = function() {
        /*
        Causes the results page to become visible
         */

        _.defer(function() {
            $scope.$apply(function () {
                $scope.show_results = true;
            });
        });

    };


    $scope.btn_new_session = function () {
        /*
        Called by the "Start new session" button; indicates to the ScanController that we are to begin a new
        session (ie. the new_session() function is to be called)
         */

        $rootScope.$emit("new_session", {});

    };


    $scope.name_strip = function(name) {
        /*
        Returns just the string representation of a JSON value (ie. removes brackets and quotation marks)
         */

        return name.toString();

    };

    // ----------

}]);


app.controller('ServicePopulateController', ['$scope', function ServicePopulateController($scope) {
    /*
    Controls the inline script that recursively populates the flagged services for each malicious file
     */

    // ----------------------- Button Event Handlers

    $scope.service_click = function (results_settings) {
        /*
        Called when the user attempts to click on a service that has been flagged by a malicious file; ensures the
        service only expands if it has been allowed to do so in the user settings
         */

        if (results_settings['file_services'])
            $scope.is_collapsed = !$scope.is_collapsed;

    };

}]);


app.controller('ServiceController', ['$scope', '$uibModal', function ServiceController($scope, $uibModal) {
    /*
    Controller for populating content within the popup window that appears when a flagged service is clicked on
     */

    $scope.service_info = function(results_settings, service_name) {

        $scope.service_name = service_name;

        if (results_settings['service_description']){

            // Gives a brief description of whichever service has been clicked on
            switch (service_name) {
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
                        "any API calls that are made by the executable to sources flagged by the user.";
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

            // Creates new modal popup window
            let uibModalInstance = $uibModal.open({
                templateUrl: '/static/ng-template/popup.html',
                controller: 'PopupController',
                size: 'lg',
                resolve: {
                    popup_scope: function () {
                        return $scope;
                    }
                }
            });

        }

    };

}]);


app.controller('PopupController', function PopupController($scope, $uibModalInstance, popup_scope) {
    /*
    Controller for popup window
     */

    $scope.pop_header = 'Service: ' + popup_scope.service_name;
    $scope.pop_body = popup_scope.service_descript;
    $scope.close = function () {
        $uibModalInstance.dismiss('close');
    };

});


/* == Settings Page == */

app.controller('SettingsController', ['$scope', function SettingsController($scope) {
    /*
    Controls our administrative settings page
     */

    // ----------------------- Default Values

    // Array to hold default settings once they are retrieved from DB
    $scope.default_settings = [];

    // Model for our "Add Recipient" input field; holds the email address for a potential new email alert recipient
    $scope.new_recipient = '';

    // Holds the current list of recipients that have already been added
    $scope.recipients_show = [];

    // Set to true if no recipients have been added; causes the remove recipients section to say "No recipients added"
    $scope.no_recipients = true;

    // Set to true when the user tries to add an email alert recipient who has already been added, or when an invalid
    // email address is entered. While true a small tool tip alert shows
    $scope.show_alert = false;

    // Controls what message the show_alert tooltip displays, depending on what error occurred
    $scope.alert_msg = '';

    // Dict to hold the credential settings received from the DB
    $scope.credential_settings = {};

    // Dict to hold the results settings retrieved from the DB
    $scope.results_settings = {};

    // Model for our "New Password" input field
    $scope.new_pw = '';

    // Model for our "Confirm Password" input field
    $scope.confirm_pw = '';

    // Array used to hold all alerts that are generated (if any) due to invalid input when the save admin settings
    // button is pressed
    $scope.alerts = [];

    // Set to true when we are currently testing a connection (either to our SMTP server or to our AL server). Doesn't
    // let the user save while one of these tests is occurring
    $scope.testing_connection = false;

    // Holds reference to recently uploaded file if one is present
    $scope.awaiting_upload = '';

    // Controls whether or not to show alert that file uploaded is too large
    $scope.show_upload_error = false;

    // Controls whether or not to show alert that wrong file type has been uploaded
    $scope.wrong_file_type = false;


    // ----------------------- Socket Event Handlers

    socket.on('connect', function() {
        /*
        Listens for initial connect message from the socketio server. When connection occurs, requests default settings
        from the DB
         */

        socket.emit('fe_get_settings');

    });


    socket.on('populate_settings', function(default_settings, show_upload_error){
        /*
        Listens for callback from back end once default settings have been retrieved from DB. Uses results to populate
        the settings page
         */

        console.log("Populate Settings")

        _.defer(function () {
            $scope.$apply(function () {
                $scope.default_settings = JSON.parse(default_settings);
            });
        });
        _.defer(function() {
            $scope.$apply(function () {
                $scope.smtp_pw_placeholder = $scope.default_settings.smtp_password;
            });
        });
        _.defer(function() {
            $scope.$apply(function () {
                $scope.recipients_show = $scope.default_settings.recipients;
            });
        });
        _.defer(function () {
            $scope.$apply(function () {
                $scope.credential_settings = $scope.default_settings.credential_settings;
            });
        });
        _.defer(function () {
            $scope.$apply(function () {
                $scope.results_settings = $scope.default_settings.results_settings;
            });
        });
        if ($scope.recipients_show.length > 0) {
            _.defer(function () {
                $scope.$apply(function () {
                    $scope.no_recipients = false;
                });
            });
        }
        _.defer(function () {
            $scope.$apply(function () {
                $scope.show_upload_error = $scope.default_settings.show_upload_error;
            });
        });

        _.defer(function () {
            $scope.$apply(function () {
                $scope.wrong_file_type = $scope.default_settings.wrong_file_type;
            });
        });

        _.defer(function () {
            $scope.$apply(function () {
                $scope.awaiting_upload = $scope.default_settings.company_logo;
            });
        });

        _.defer(function () {
            $scope.$apply(function () {
                if ($scope.awaiting_upload !== '' || $scope.show_upload_error || $scope.wrong_file_type) {
                    setTimeout(() => document.getElementById('user-settings').scrollIntoView({
                        block: 'start'
                    }));
                }
            });
        });

    });


    // ----------------------- Button Event Handlers

    $scope.btn_al_connect = function() {
        /*
        Called by the "Test Connection" button for the Assembyline server
         */

        // Causes loading sequence to display at front end
        _.defer(function() {
            $scope.$apply(function () {
                $scope.test_al_connect_success = false;
            });
        });
        _.defer(function () {
            $scope.$apply(function () {
                $scope.test_al_connect_fail = false;
            });
        });
        _.defer(function () {
            $scope.$apply(function () {
                $scope.show_al_waiting = true;
            });
        });
        _.defer(function () {
            $scope.$apply(function () {
                $scope.testing_connection = true;
            });
        });

        // Passes settings given by user to backend to run a connection test
        socket.emit('fe_test_connection_al',
            $scope.default_settings.al_address,
            $scope.default_settings.al_username,
            $scope.default_settings.al_api_key,
            function(al_test_output){

            _.defer(function () {
                $scope.$apply(function () {
                    $scope.show_al_waiting = false;
                });
            });

            if(al_test_output[0]) {

                _.defer(function () {
                    $scope.$apply(function () {
                        $scope.test_al_connect_success = true;
                    });
                });
                _.defer(function () {
                    $scope.$apply(function () {
                        $scope.al_test_txt = al_test_output[1];
                    });
                });

            }

            else {

                _.defer(function () {
                    $scope.$apply(function () {
                        $scope.test_al_connect_fail = true;
                    });
                });
                _.defer(function () {
                    $scope.$apply(function () {
                        $scope.al_test_txt = al_test_output[1];
                    });
                });

            }

            _.defer(function () {
                $scope.$apply(function () {
                    $scope.testing_connection = false;
                });
            });

        });

    };


    $scope.btn_email_connect = function() {
        /*
        Called by the "Test Connection" button for the SMTP server
         */

        // Causes loading sequence to display at front end
        _.defer(function() {
            $scope.$apply(function () {
                $scope.test_smtp_connect_success = false;
            });
        });
        _.defer(function () {
            $scope.$apply(function () {
                $scope.test_smtp_connect_fail = false;
            });
        });
        _.defer(function () {
            $scope.$apply(function () {
                $scope.show_smtp_waiting = true;
            });
        });
        _.defer(function () {
            $scope.$apply(function () {
                $scope.testing_connection = true;
            });
        });


        // Passes settings given by user to backend to run a connection test
        socket.emit('fe_test_connection_smtp',
            $scope.default_settings.smtp_server,
            $scope.default_settings.smtp_port,
            $scope.default_settings.smtp_username,
            $scope.default_settings.smtp_password,
            $scope.smtp_password_form.smtp_password_input.$pristine,
            function(smtp_test_output){

            _.defer(function () {
                $scope.$apply(function () {
                    $scope.show_smtp_waiting = false;
                });
            });

            if (smtp_test_output[0]) {

                _.defer(function () {
                    $scope.$apply(function () {
                        $scope.test_smtp_connect_success = true;
                    });
                });
                _.defer(function () {
                    $scope.$apply(function () {
                        $scope.smtp_test_txt = smtp_test_output[1];
                    });
                });

            }
            else {

                _.defer(function () {
                    $scope.$apply(function () {
                        $scope.test_smtp_connect_fail = true;
                    });
                });
                _.defer(function () {
                    $scope.$apply(function () {
                        $scope.smtp_test_txt = smtp_test_output[1];
                    });
                });

            }

            _.defer(function () {
                $scope.$apply(function () {
                    $scope.testing_connection = false;
                });
            });

        });

    };


    $scope.btn_save_settings = function() {
        /*
        Called by "Save admin settings" button. Checks input fields for valid input, if no alerts are generated saves
        settings to DB
         */

        // Clears all alerts that were previously shown (if necessary)
        $scope.clear_alerts();

        // Tests whether the "New Password" and "Confirm Password" fields match
        let match_pw = true;
        if ($scope.new_pw === $scope.confirm_pw )
            $scope.default_settings.user_pw = $scope.new_pw;
        else
            match_pw = false;

        // Passes new settings to the fe_validate_settings function in back end
        socket.emit('fe_validate_settings', $scope.default_settings, function(alerts){

            // If we determined earlier that the "New Password" and "Confirm Password" fields don't match, generates an
            // alert
            if (!match_pw)
                alerts.push('password_match');

            // Resets the "New Password" and "Confirm Password" fields
            $scope.new_pw = '';
            $scope.confirm_pw = '';

            // If no alerts have been generated, saves settings to DB
            if (alerts.length === 0) {

                // Outputs success message to front end
                _.defer(function() {
                    $scope.$apply(function () {
                        $scope.settings_saved_class = 'success';
                    });
                });
                _.defer(function () {
                    $scope.$apply(function () {
                        $scope.settings_saved_txt = 'Settings successfully saved';
                    });
                });
                _.defer(function () {
                    $scope.$apply(function () {
                        $scope.settings_saved = true;
                    });
                });

                // Tells back end to save the new settings. Also sends through a boolean value depending on whether or
                // not the SMTP password field has been changed. If it hasn't, records the same PW in the DB as before.
                // This is done because the actual SMTP password is never sent from the backend, it just sends a
                // placeholder of the same length (a bunch of dots). Thus the default settings that are passed back will
                // either include a new password if one was entered (in which case we will emit false for this value and
                // our back end will know to use the new password), or the same placeholder is returned (in which case
                // we reuse the existing password)
                socket.emit('fe_settings_save', $scope.default_settings,
                    $scope.smtp_password_form.smtp_password_input.$pristine);

                $scope.smtp_password_form.smtp_password_input.$setPristine();

            }

            // If one or more alerts have been generated, does not save to DB and outputs description of alerts to user
            else {

                // Outputs error message at top of page
                _.defer(function() {
                    $scope.$apply(function () {
                        $scope.settings_saved_class = 'danger';
                    });
                });
                _.defer(function () {
                    $scope.$apply(function () {
                        $scope.settings_saved_txt = 'Unable to save settings, please see below';
                    });
                });
                _.defer(function () {
                    $scope.$apply(function () {
                        $scope.settings_saved = true;
                    });
                });

                // For each alert that was generated, displays an error message at the appropriate place
                for (let i = 0; i<alerts.length; i++) {

                    switch (alerts[i]) {

                        case 'user_id':
                            _.defer(function () {
                                $scope.$apply(function () {
                                    $scope.user_id_alert = true;
                                });
                            });
                            break;

                        case 'password_match':
                            _.defer(function () {
                                $scope.$apply(function () {
                                    $scope.password_alert_txt = 'New Password and Confirm Password do not match';
                                });
                            });
                            _.defer(function () {
                                $scope.$apply(function () {
                                    $scope.password_alert = true;
                                });
                            });
                            break;

                        case 'repeat_pw':
                            _.defer(function () {
                                $scope.$apply(function () {
                                    $scope.password_alert_txt = 'New password given is the same as the old password';
                                });
                            });
                            _.defer(function () {
                                $scope.$apply(function () {
                                    $scope.password_alert = true;
                                });
                            });
                            break;

                        case 'terminal_blank':
                            _.defer(function () {
                                $scope.$apply(function () {
                                    $scope.terminal_blank_alert = true;
                                });
                            });
                            break;



                    }

                }

            }

            // Scrolls to top of page
            setTimeout(() => document.getElementById('main-admin').scrollIntoView({
                            behavior: 'smooth',
                            block: 'start'
                        }));

        });

    };


    $scope.btn_add_recipient = function(address) {
        /*
        Called when the user attempts to add a new email alert recipient. Tests for valid email address format and for
        whether or not that email address has already been added
         */

        // Sends the content of the input field to the back end fe_validate_email function
        socket.emit('fe_validate_email', address, function(result){

            // If the result returned by the back end function is true, then we know the entry is in valid email
            // address format
            if(result){

                // If our list of recipients does not already contain this address, adds it to the list of recipients
                if ($scope.recipients_show.indexOf(address) === -1) {

                    _.defer(function() {
                        $scope.$apply(function () {
                            $scope.recipients_show.push(address);
                        });
                    });
                    _.defer(function () {
                        $scope.$apply(function () {
                            $scope.no_recipients = false;
                        });
                    });
                    _.defer(function () {
                        $scope.$apply(function () {
                            $scope.new_recipient = '';
                        });
                    });

                }

                // If our list of recipients already contains this address, outputs an error message
                else {

                    _.defer(function () {
                        $scope.$apply(function () {
                            $scope.alert_msg = 'Recipient already added';
                        });
                    });

                    if (!$scope.show_alert) {

                        _.defer(function () {
                            $scope.$apply(function () {
                                $scope.show_alert = true;
                            });
                        });

                        setTimeout(function () {
                            _.defer(function () {
                                $scope.$apply(function () {
                                    if ($scope.show_alert)
                                        $scope.show_alert = false;
                                });
                            });
                        }, 3000);
                    }

                }
            }

            // If the result returned the back end function is false, we know the entry is not in valid email format.
            // Outputs an error
            else {

                _.defer(function () {
                    $scope.$apply(function () {
                        $scope.alert_msg = 'Invalid email address';
                    });
                });

                if (!$scope.show_alert) {

                    _.defer(function () {
                        $scope.$apply(function () {
                            $scope.show_alert = true;
                        });
                    });

                    setTimeout(function () {

                        _.defer(function () {
                            $scope.$apply(function () {
                                if ($scope.show_alert)
                                    $scope.show_alert = false;
                            });
                        });

                    }, 3000);
                }
            }

        });

    };


    $scope.btn_remove_recipient = function(address) {
        /*
        Called when the user clicks on an email recipient; removes them from the list
         */

        // Checks if all recipients have been removed; if so, outputs corresponding message to user
        _.defer(function() {
            $scope.$apply(function () {
                $scope.recipients_show.splice($scope.recipients_show.indexOf(address), 1);
            });
        });

        if ($scope.recipients_show.length === 0)
            _.defer(function () {
                $scope.$apply(function () {
                    $scope.no_recipients = true;
                });
            });

    };


    // ----------------------- Helper Functions

    $scope.close_alert = function(alert_name) {
        /*
        Handles the closing of error messages that pop up when "Save admin settings" is clicked
         */

        switch (alert_name) {

            case 'success':
                _.defer(function() {
                    $scope.$apply(function () {
                        $scope.settings_saved = false;
                    });
                });
                break;

            case 'user_id':
                _.defer(function() {
                    $scope.$apply(function () {
                        $scope.user_id_alert = false;
                    });
                });
                break;

            case 'password_match':
                _.defer(function() {
                    $scope.$apply(function () {
                        $scope.password_alert = false;
                    });
                });
                break;

            case 'terminal_blank':
                _.defer(function() {
                    $scope.$apply(function () {
                        $scope.terminal_blank_alert = false;
                    });
                });
                break;

         }

    };


    $scope.clear_alerts = function() {
        /*
        Resets the value of all alert variables to false
         */

         _.defer(function() {
            $scope.$apply(function () {
                $scope.test_smtp_connect_fail = false;
            });
        });
        _.defer(function () {
            $scope.$apply(function () {
                $scope.test_smtp_connect_success = false;
            });
        });
        _.defer(function () {
            $scope.$apply(function () {
                $scope.test_al_connect_success = false;
            });
        });
        _.defer(function () {
            $scope.$apply(function () {
                $scope.test_al_connect_fail = false;
            });
        });
        _.defer(function () {
            $scope.$apply(function () {
                $scope.test_al_connect_fail = false;
            });
        });
        _.defer(function () {
            $scope.$apply(function () {
                $scope.settings_saved = false;
            });
        });
        _.defer(function () {
            $scope.$apply(function () {
                $scope.user_id_alert = false;
            });
        });
        _.defer(function () {
            $scope.$apply(function () {
                $scope.password_alert = false;
            });
        });
        _.defer(function () {
            $scope.$apply(function () {
                $scope.terminal_blank_alert = false;
            });
        });

    };


    $scope.clear_pw = function() {
        /*
        Called when a user clicks on the password field of the SMTP server settings. Clears the field of the
        placeholder value and sets the state to dirty indicating that it has been altered
         */

         if ($scope.smtp_password_form.smtp_password_input.$pristine) {

             _.defer(function () {
                 $scope.$apply(function () {
                     $scope.default_settings.smtp_password = '';
                 });
             });
             _.defer(function () {
                 $scope.$apply(function () {
                     $scope.smtp_password_form.smtp_password_input.$setDirty();
                 });
             });

         }

    };

}]);


/* == Login Page == */

app.controller('LoginController', ['$scope', function LoginController($scope) {
    /*
    Controls our administrative settings page
     */

    // ----------------------- Default Values

    $scope.show_error = false;


    // ----------------------- Socket Event Handlers

    socket.on('connect', function () {
        /*
        Handles login failure event by showing error message
        */

        socket.emit('fe_login_status', function (failed) {

            _.defer(function () {
                $scope.$apply(function () {
                    $scope.show_error = failed;
                });
            });

        });

    });

}]);


/* ============== Animation Directives ==============*/

app.directive('animOutputHeader', function($animate) {
    /*
    Handles show / hide events being applied to user_output_img. The myShow variable is linked to the show variable of
    the controller; when its value is changed, an event is called accordingly to animate it fading in / out. Once the
    animation is complete, calls afterShow() or afterHide() as necessary
     */

    return {
        link: function (scope, elem, attr) {
            scope.$watch(attr.animOutputHeader, function () {
                if (scope.device_event === 'show') {
                    $animate.removeClass(elem, 'hidden');
                    $animate.removeClass(elem, 'img-hide').then(scope.after_show_img);
                }
                if (scope.device_event === 'connected'
                    || scope.device_event === 'new_detected'
                    || scope.device_event === 'remove_detected'
                    || scope.device_event === 'al_server_success'
                    || scope.device_event === 'al_server_failure'
                    || scope.device_event === 'hide') {
                    $animate.addClass(elem, 'hidden');
                    $animate.addClass(elem, 'img-hide').then(scope.after_hide_img(scope.device_event));
                }
            });
        }
    }

});
