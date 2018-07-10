from flask import Flask, render_template, request, json, jsonify, make_response
from flask_cors import CORS
from flask_socketio import SocketIO, emit
import subprocess
import smtplib
from email.MIMEMultipart import MIMEMultipart
from email.MIMEText import MIMEText
import sqlite3

from helper.views import create_menu
import eventlet
import arrow
import re

import sqlite3

eventlet.monkey_patch()


# ============== Default Property Values ==============

my_thread = None
output = ''
last_output = ''
client_f_name = ''
client_l_name = ''
vm_connected = False

# Database placeholders
default_settings = {}


# ============== Flask & Socketio Setup ==============

app = Flask(__name__)
app.config['SECRET_KEY'] = 'changeme123'
app.debug = True
socketio = SocketIO(app)
CORS(app)


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


@app.route('/admin')
def admin():
    return render("admin.html", request.path)


# ============== Socketio Listeners ==============

# Called by angular_controller.js when application is first opened. Establishes connection between our webapp
# controller and this module
@socketio.on('scan_start')
def scan_start():
    global my_thread
    global output
    global last_output

    output = ''
    last_output = ''

    # vm_control('restart')

    if my_thread is None:
        my_thread = socketio.start_background_task(target=background_thread)


# Called by web app when the settings page is opened. Returns default values from database
@socketio.on('settings_start')
def settings_start():
    global default_settings

    db = sqlite3.connect('settings_db')
    cursor = db.cursor()

    cursor.execute("""SELECT * from setting""")
    data_settings = cursor.fetchall()

    cursor.execute("""SELECT * from recipient""")
    data_recipients = cursor.fetchall()

    cursor.execute("""SELECT * from credential""")
    data_credentials = cursor.fetchall()

    cursor.execute("""SELECT * from result""")
    data_results = cursor.fetchall()

    # saved = len(data_settings)-1
    saved = 0

    default_settings["user_id"] = data_settings[saved][2]
    default_settings["terminal"] = data_settings[saved][3]
    default_settings["al_address"] = data_settings[saved][4]
    default_settings["al_username"] = data_settings[saved][5]
    default_settings["al_api_key"] = data_settings[saved][6]
    default_settings["smtp_server"] = data_settings[saved][7]
    default_settings["smtp_port"] = data_settings[saved][8]
    default_settings["smtp_username"] = data_settings[saved][9]
    default_settings["smtp_password"] = data_settings[saved][10]

    recipients = []
    for recipient in data_recipients:

        recip_address = recipient[1]
        recip_setting_id = recipient[2]

        if recip_setting_id == saved+1:
            recipients.append(recip_address)

    default_settings["recipients"] = recipients

    credentials = {}
    for credential in data_credentials:

        cred_type = credential[1]
        cred_active = bool(credential[2])
        cred_mandatory = bool(credential[3])
        cred_setting_id = credential[4]

        if cred_setting_id == saved+1:
            credentials[cred_type] = {'active': cred_active, 'mandatory': cred_mandatory}

    default_settings["credential_settings"] = credentials

    results = {}
    for result in data_results:

        result_type = result[1]
        result_active = bool(result[2])
        result_setting_id = result[3]

        if result_setting_id == saved+1:
            results[result_type] = result_active

    default_settings["results_settings"] = results

    db.close()

    settings_json = json.dumps(default_settings)
    socketio.emit('populate_settings', settings_json)


# Called by the sandbox VM perpetually until client credentials have been entered. Once valid credentials have been
# entered, the sandbox begins looking for files to scrape
@socketio.on('connect_request')
def connect_request():
    global client_f_name, client_l_name, vm_connected

    if not vm_connected:
        vm_connected = True
        socketio.emit('vm_on')

    return client_f_name, client_l_name


# Receives and records user credentials that are entered by user for the current session
@socketio.on('session_credentials')
def session_credentials(f_name, l_name):
    global client_f_name, client_l_name
    client_f_name = f_name
    client_l_name = l_name


# Called by scrape_drive.py whenever it wants to output information to the console
@socketio.on('to_kiosk')
def to_kiosk(args):
    global output
    output = args


# Outputs that current number of files ingested and files queued for ingestion, to be received by our webapp
@socketio.on('ingest_status')
def new_file(args):
    socketio.emit('update_ingest', args)


# Called by scrape_drive.py when all files have been ingested. Argument will be list containing information on all
# files that passed the scan. List is JSONified and sent to angular_controller.js
@socketio.on('pass_files')
def output_pass_files(pass_files):
    # print json.dumps(pass_files)
    pass_files_json = json.dumps(pass_files)
    socketio.emit('pass_files_json', pass_files_json)


# Called by scrape_drive.py when all files have been ingested. Argument will be list containing information on all
# files that did not pass the scan. List is JSONified and sent to angular_controller.js
@socketio.on('mal_files')
def output_mal_files(mal_files, terminal_id):
    # print json.dumps(mal_files)
    mal_files_json = json.dumps(mal_files)
    socketio.emit('mal_files_json', mal_files_json)
    email_alert(mal_files, terminal_id)


# Allows our web app to turn off or refresh our sandbox VM
@socketio.on('vm_control')
def vm_control(args):
    global client_f_name, client_l_name, vm_connected

    client_f_name = ''
    client_l_name = ''
    vm_connected = False

    print "VM Control: " + args

    if args == 'off' or 'restart':
        subprocess.call('"C:\Program Files\Oracle\VirtualBox\VBoxManage.exe" controlvm sandbox poweroff')
        subprocess.call('"C:\Program Files\Oracle\VirtualBox\VBoxManage.exe" snapshot sandbox restore Test')
    if args == 'restart' or 'on':
        subprocess.call('"C:\Program Files\Oracle\VirtualBox\VBoxManage.exe" startvm sandbox --type emergencystop '
                        '--type headless')


# Called by scrape_device.py when a device event occurs (connected, scanning, disconnected, etc). Argument specifies
# type of device event
@socketio.on('device_event')
def device_event(args):
    print args
    socketio.emit('dev_event', args)


@socketio.on('validate_email')
def validate_email(addr):

    if re.match('^[_a-z0-9-]+(\.[_a-z0-9-]+)*@[a-z0-9-]+(\.[a-z0-9-]+)*(\.[a-z]{2,4})$', addr) is not None:
        return True

    return False


# ============== Background Threads ==============

# Always running background thread that handles real time output to webapp from scrape_drive.py
def background_thread():
    global output
    global last_output

    while True:

        # Causes eventlet to momentarily pause on each iteration before handling more events
        eventlet.sleep(0.01)

        # Handles output to webapp text console
        with app.test_request_context():
            if output != last_output:
                socketio.emit('output', output)
                last_output = output


# ============== Helper Functions ==============

# Renders a new page
def render(template, path):
    return render_template(template, app_name='AL Device Audit', menu=create_menu(path), user_js='admin',
                           user_output=output)


def email_alert(mal_files, terminal_id):
    global from_addr, recipients, server_addr, server_pass

    msg = MIMEMultipart()
    msg['From'] = from_addr
    msg['To'] = ", ".join(recipients)
    msg['X-Priority'] = '2'
    msg['Subject'] = "Device Alert: Malicious files detected on device"

    body = 'An alert has been generated by terminal: ' + terminal_id + '\r\n'
    body = body + '\r\n------ Session Details: ' + '\r\n'
    body = body + 'First name: ' + client_f_name + '\r\n'
    body = body + 'Last name: ' + client_l_name + '\r\n'
    body = body + 'When: ' + arrow.now().format('YYYY-MM-DD HH:mm') + '\r\n'
    body = body + '\r\n------ Flagged Files: ' + '\r\n'

    for x in mal_files:
        body = body + 'Filename: ' + x['submission']['metadata']['filename'] + '\r\n'
        body = body + 'SSID: ' + str(x['submission']['sid']) + '\r\n'
        body = body + 'Score: ' + str(x['submission']['max_score']) + '\r\n'
        body = body + '\r\n'
    msg.attach(MIMEText(body, 'plain'))

    # server = smtplib.SMTP(server_addr, 587)
    # server.starttls()
    # server.login(from_addr, server_pass)
    # text = msg.as_string()
    # server.sendmail(from_addr, recipients, text)
    # server.quit()
