from flask import Flask, render_template, request
from flask_cors import CORS
from flask_socketio import SocketIO, emit

from helper.views import create_menu
import eventlet

i = 1
my_thread = None
output = 'Please plug in a device to get started'

app = Flask(__name__)
app.config['SECRET_KEY'] = 'changeme123'
app.debug = True
socketio = SocketIO(app)
CORS(app)

app.config.from_pyfile('config.py')


if __name__ == '__main__':
    socketio.run(app, threaded=True)
    # app.run()


@app.route('/')
def index():
    return render("scan.html", request.path)


@app.route('/scan')
def submit():
    return render("scan.html", request.path)


@socketio.on('aaa')
def test_connect():
    print("Welcome, aaa received")
    emit('aaa_response', 'Hello!')


@socketio.on('start', namespace='/output')
def handle_message():
    global my_thread
    emit('output', 'Connected', namespace='/output')
    # if my_thread is None:
    #     my_thread = socketio.start_background_task(target=background_thread)


def background_thread():
    while True:
        global i
        eventlet.sleep(1)
        i = i+1
        print i
        with app.test_request_context():
            socketio.emit('output', i, namespace='/output')


def render(template, path):
    return render_template(template, app_name='AL Device Audit', menu=create_menu(path), user_js='admin',
                           user_output=output)
