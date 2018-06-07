var app = angular.module('al_da', ['ngAnimate']);

app.controller('MainController', ['$scope',

    function MainController($scope) {

        // ----------------------- Default Element Values
        $scope.kiosk_img_new = '/static/images/scrape_no_conn.svg';
        $scope.kiosk_img = $scope.kiosk_img_new;
        $scope.show = true;

        // ----------------------- Socket Stuff
        var socket = io.connect('http://' + document.domain + ':' + location.port);
        socket.on('connect', function() {
            socket.emit('start');
        });

        // -------- Socket Listeners
        socket.on('output', function(output_txt){
            _.defer(function() {
                $scope.$apply(function () {
                    $scope.kiosk_output = output_txt;
                });
            });
        });

        socket.on('device_conn', function(img_url){
            _.defer(function() {
                $scope.kiosk_img_new = img_url;
                $scope.$apply(function () {
                    $scope.show = false;
                });
            });
        });

        socket.on('loading', function(){
            _.defer(function() {
                $scope.kiosk_img_new = '/static/images/ripple2.svg';
                $scope.$apply(function () {
                    $scope.show = false;
                });
            });
        });

        socket.on('done_loading', function(img_url){
            _.defer(function() {
                $scope.kiosk_img_new = img_url;
                $scope.$apply(function () {
                    $scope.show = false;
                });
            });
        });


        // ----------------------- Animation Event Handlers
        $scope.afterShow = function() {
        }

        $scope.afterHide = function() {
            _.defer(function(){
                $scope.$apply(function(){ $scope.kiosk_img = $scope.kiosk_img_new});
            });
            $scope.show = true;
        }

    }

]);

// ----------------------- Animation Listeners
app.directive('myShow', function($animate) {
return {
    scope: {
        'myShow': '=',
        'afterShow': '&',
        'afterHide': '&'
    },
    link: function(scope, element) {
        scope.$watch('myShow', function(show) {
            console.log('Function Call');
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
}
})
