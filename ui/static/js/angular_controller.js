var app = angular.module('al_da', ['ngAnimate']);

app.controller('MainController', ['$scope',

    function MainController($scope) {

        $scope.kiosk_output = 'Default';
        $scope.kiosk_img = '/static/images/scrape_no_conn.svg';

        $scope.animate = true;
        $scope.play = function() {
            $scope.animate = !$scope.animate;
        }

        var socket = io.connect('http://' + document.domain + ':' + location.port);
        socket.on('connect', function() {
            socket.emit('start');
        });

        socket.on('output', function(output_txt){
            $scope.$apply(function(){ $scope.kiosk_output = output_txt});
        });

        socket.on('device_conn', function(img_url){
            $scope.$apply(function(){ $scope.kiosk_img = img_url});
        });

        socket.on('loading', function(){
            $scope.animate = !$scope.animate;
            $scope.$apply(function(){ $scope.kiosk_img = '/static/images/ripple2.svg'});
        });

        socket.on('done_loading', function(){

        });

    }

]);