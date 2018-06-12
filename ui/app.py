from flask import Flask, render_template, request
from flask_cors import CORS
from flask_socketio import SocketIO, emit

from helper.views import create_menu
import eventlet

eventlet.monkey_patch()

my_thread = None
output = ''
last_output = ''
scroll = ''

new_socket_msg = False
socket_msg = {'device_conn': {'active': False, 'url': '/static/images/scrape_no_conn.svg'},
              'loading': {'active': False},
              'done_loading': {'active': False}}

app = Flask(__name__)
app.config['SECRET_KEY'] = 'changeme123'
app.debug = True
socketio = SocketIO(app)
CORS(app)
scrape_refresh = False

app.config.from_pyfile('config.py')


if __name__ == '__main__':
    socketio.run(app, threaded=True)
    # app.run()


@app.route('/')
def index():
    return render("scan.html", request.path)


@app.route('/scan')
def scan():
    return render("scan.html", request.path)


@socketio.on('start')
def start():
    global my_thread
    global output
    global last_output

    output = ''
    last_output = ''

    if my_thread is None:
        my_thread = socketio.start_background_task(target=background_thread)


@socketio.on('to_kiosk')
def to_kiosk(args):
    global output
    output = args


@socketio.on('scroll')
def to_kiosk(args):
    global scroll
    scroll = args


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


def background_thread():
    global output
    global new_socket_msg
    global socket_msg
    global scroll

    global last_output

    while True:
        eventlet.sleep(0.01)
        with app.test_request_context():
            if output != last_output:
                socketio.emit('output', output)
                last_output = output

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

        if scroll != '':
            socketio.emit('scroll', scroll)
            scroll = ''


def render(template, path):
    return render_template(template, app_name='AL Device Audit', menu=create_menu(path), user_js='admin',
                           user_output=output)
