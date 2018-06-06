var socket = io.connect('http://' + document.domain + ':' + location.port);
    socket.on('connect', function() {
        socket.emit('start');
    });

    socket.on('output', function(output_txt){
        document.getElementById("user_output_text").innerHTML = output_txt;
    });

    socket.on('device_conn', function(img_url){
        document.getElementById("user_output_img").src = img_url;
    });

    socket.on('loading', function(){
        document.getElementById("user_output_img").src = '/static/images/ripple2.svg';
    });

    socket.on('done_loading', function(){

    });

    // socket.on('img_update', function(img_url, fade){
    //     if (fade) {
    //
    //         document.getElementById("user_output_img").src = img_url;
    //
    //         // jQuery(function(){
    //         //    // Fade Out
    //         //    $("#user_output_img").fadeOut();
    //         // });
    //     }
    //     else {
    //         document.getElementById("user_output_img").src = img_url;
    //     }
    // });
    //
    // socket.on('loading_img', function(){
    //     jQuery(function(){
    //
    //        // Fade Out
    //        $("#user_output_img").fadeOut();
    //
    //     });
    // });