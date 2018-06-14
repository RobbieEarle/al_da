
from flask import Flask, render_template, request, json, jsonify, make_response
from flask_cors import CORS
from flask_socketio import SocketIO, emit

from helper.views import create_menu
import eventlet

eventlet.monkey_patch()


# ============== Default Property Values ==============

my_thread = None
output = ''
last_output = ''
scroll = ''
scrape_refresh = False

new_socket_msg = False
socket_msg = {'device_conn': {'active': False, 'url': '/static/images/scrape_no_conn.svg'},
              'loading': {'active': False},
              'done_loading': {'active': False}}


# ============== Flask & Socketio Setup ==============

app = Flask(__name__)
app.config['SECRET_KEY'] = 'changeme123'
app.debug = True
socketio = SocketIO(app)
CORS(app)
app.config.from_pyfile('config.py')


if __name__ == '__main__':
    socketio.run(app, threaded=True)
    # app.run()


# ============== Page Rendering ==============

@app.route('/')
def index():
    return render("scan.html", request.path)


@app.route('/scan')
def scan():
    return render("scan.html", request.path)


# ============== Socketio Listeners ==============

# Called by angular_controller.js when application is first opened. Establishes connection between our webapp
# controller and this module
@socketio.on('start')
def start():
    global my_thread
    global output
    global last_output

    output = ''
    last_output = ''

    if my_thread is None:
        my_thread = socketio.start_background_task(target=background_thread)


# Called by scrape_drive.py whenever it wants to output information to the console
@socketio.on('to_kiosk')
def to_kiosk(args):
    global output
    output = args


# Called by scrape_drive.py when all files have been ingested. Argument will be list containing information on all
# files that passed the scan. List is JSONified and sent to angular_controller.js
@socketio.on('pass_files')
def to_kiosk(pass_files):
    print json.dumps(pass_files)
    pass_files_json = json.dumps(pass_files)
    socketio.emit('pass_files_json', pass_files_json)


# Called by scrape_drive.py when all files have been ingested. Argument will be list containing information on all
# files that did not pass the scan. List is JSONified and sent to angular_controller.js
@socketio.on('mal_files')
def to_kiosk(mal_files):
    # print json.dumps(mal_files)
    mal_files_json = json.dumps(mal_files)
    socketio.emit('mal_files_json', mal_files_json)


# Called by scrape_drive.py to activate an automatic scroll event. Argument contains location to scroll to
@socketio.on('scroll')
def to_kiosk(args):
    # socketio.emit('scroll', scroll)
    global scroll
    scroll = args


# Called by scrape_device.py when a device event occurs (connected, scanning, disconnected, etc). Argument specifies
# type of device event
@socketio.on('device_event')
def device_event(args):
    global socket_msg
    global new_socket_msg

    print args

    if args == 'connected':
        socket_msg['device_conn']['active'] = True
        socket_msg['device_conn']['url'] = '/static/images/scrape_conn.svg'
        new_socket_msg = True
    if args == 'disconnected':
        socket_msg['device_conn']['active'] = True
        socket_msg['device_conn']['url'] = '/static/images/scrape_no_conn.svg'
        new_socket_msg = True
    if args == 'loading':
        socket_msg['loading']['active'] = True
        new_socket_msg = True
    if args == 'done_loading':
        socket_msg['done_loading']['active'] = True
        new_socket_msg = True


# ============== Background Threads ==============

# Always running background thread that handles real time output to webapp from scrape_drive.py
def background_thread():

    global output
    global new_socket_msg
    global socket_msg
    global scroll
    global last_output

    while True:

        # Causes eventlet to momentarily pause on each iteration before handling more events
        eventlet.sleep(0.01)

        # Handles output to webapp text console
        with app.test_request_context():
            if output != last_output:
                socketio.emit('output', output)
                last_output = output

        # Handles changes to the webapp device connection icon (user_output_img)
        if new_socket_msg:
            for msg in socket_msg:
                if socket_msg[msg]['active'] is True:
                    if msg == 'device_conn':
                        socketio.emit(msg, socket_msg['device_conn']['url'])
                    if msg == 'loading':
                        socketio.emit(msg)
                    if msg == 'done_loading':
                        socketio.emit(msg, socket_msg['device_conn']['url'])
                    socket_msg[msg]['active'] = False
            new_socket_msg = False

        # Handles scroll events
        if scroll != '':
            socketio.emit('scroll', scroll)
            scroll = ''


# ============== Helper Functions ==============

# Renders a new page
def render(template, path):
    return render_template(template, app_name='AL Device Audit', menu=create_menu(path), user_js='admin',
                           user_output=output)
