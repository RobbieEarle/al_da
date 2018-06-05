var socket = io.connect('http://' + document.domain + ':' + location.port + '/output');
    socket.on('connect', function() {
        socket.emit('start');
    });

    socket.on('output', function(output_txt){
        document.getElementById("user_output_text").innerHTML = output_txt;
    });