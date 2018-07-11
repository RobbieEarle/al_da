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


# Called by web app when the settings page is opened. Returns default values from database
@socketio.on('settings_start')
def settings_start():
    global default_settings

    default_settings = db_get_saved()
    default_settings_output = default_settings.copy()
    default_settings_output["user_pw"] = ''
    default_settings_output["smtp_password"] = convert_dots(default_settings["smtp_password"])

    print "\nDefault settings received by backend"
    for i in default_settings:
        print i, default_settings[i]
    print

    print "\nDefault settings sent to front end"
    for i in default_settings_output:
        print i, default_settings_output[i]
    print

    settings_json = json.dumps(default_settings_output)
    socketio.emit('populate_settings', settings_json)


@socketio.on('validate_settings')
def validate_settings(settings):

    alerts = []

    if settings["user_id"] == '':
        alerts.append('user_id')

    if settings["user_pw"] == default_settings["user_pw"]:
        alerts.append('repeat_pw')

    if settings["terminal"] == '':
        alerts.append('terminal_blank')

    return alerts


@socketio.on('settings_save')
def settings_save(new_settings, default_smtp_pw_reuse):
    db_clear_saved()
    db_save(new_settings, default_smtp_pw_reuse)


@socketio.on('test_connection_smtp')
def test_connection_smtp(smtp_server, smtp_port, smtp_username, smtp_password, reuse_pw):
    global default_settings

    if reuse_pw:
        smtp_password = default_settings["smtp_password"]

    print smtp_server, smtp_port, smtp_username, smtp_password

    try:
        server = smtplib.SMTP(smtp_server, smtp_port)
        server.starttls()
        server.login(smtp_username, smtp_password)
        server.quit()
    except smtplib.SMTPException as e:
        print type(e)
        return False

    return True


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


def convert_dots(arg):
    return_str = ''
    for i in arg:
        return_str = return_str + '.'
    return return_str


def email_alert(mal_files, terminal_id):
    global default_settings

    if len(default_settings["recipients"]) > 0:
        msg = MIMEMultipart()
        msg['From'] = default_settings["smtp_username"]
        msg['To'] = ", ".join(default_settings["recipients"])
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

        # server = smtplib.SMTP(default_settings["smtp_server"], 587)
        # server.starttls()
        # server.login(default_settings["smtp_username"], default_settings["smtp_password"])
        # text = msg.as_string()
        # server.sendmail(default_settings["smtp_username"], default_settings["recipients"], text)
        # server.quit()


def db_get_saved():
    settings_dict = {}

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

    saved = len(data_settings) - 1

    settings_dict["user_id"] = data_settings[saved][2]
    settings_dict["user_pw"] = data_settings[saved][3]
    settings_dict["terminal"] = data_settings[saved][4]
    settings_dict["al_address"] = data_settings[saved][5]
    settings_dict["al_username"] = data_settings[saved][6]
    settings_dict["al_api_key"] = data_settings[saved][7]
    settings_dict["email_alerts"] = bool(data_settings[saved][8])
    settings_dict["smtp_server"] = data_settings[saved][9]
    settings_dict["smtp_port"] = data_settings[saved][10]
    settings_dict["smtp_username"] = data_settings[saved][11]
    settings_dict["smtp_password"] = data_settings[saved][12]

    recipients = []
    for recipient in data_recipients:

        recip_address = recipient[1]
        recip_setting_id = recipient[2]

        if recip_setting_id == saved + 1:
            recipients.append(recip_address)

    settings_dict["recipients"] = recipients

    credentials = {}
    for credential in data_credentials:

        cred_type = credential[1]
        cred_active = bool(credential[2])
        cred_mandatory = bool(credential[3])
        cred_setting_id = credential[4]

        if cred_setting_id == saved + 1:
            credentials[cred_type] = {'active': cred_active, 'mandatory': cred_mandatory}

    settings_dict["credential_settings"] = credentials

    results = {}
    for result in data_results:

        result_type = result[1]
        result_active = bool(result[2])
        result_setting_id = result[3]

        if result_setting_id == saved + 1:
            results[result_type] = result_active

    settings_dict["results_settings"] = results

    db.close()

    return settings_dict


def db_clear_saved():
    db = sqlite3.connect('settings_db')
    cursor = db.cursor()

    cursor.execute('''
      DELETE FROM setting WHERE setting_id=2
    ''')

    cursor.execute('''
      DELETE FROM recipient WHERE setting_id=2
    ''')

    cursor.execute('''
      DELETE FROM credential WHERE setting_id=2
    ''')

    cursor.execute('''
      DELETE FROM result WHERE setting_id=2
    ''')

    db.commit()
    db.close()


def db_save(new_settings, default_smtp_pw_reuse):
    global default_settings

    db = sqlite3.connect('settings_db')
    cursor = db.cursor()

    if new_settings["user_pw"] == '':
        new_settings["user_pw"] = default_settings["user_pw"]

    if default_smtp_pw_reuse or not new_settings["email_alerts"]:
        new_settings["smtp_password"] = default_settings["smtp_password"]

    # cursor.execute("""
    # INSERT INTO setting(setting_id, setting_name, user_id, user_pw, terminal, al_address, al_username, al_api_key,
    #   email_alerts, smtp_server, smtp_port, smtp_username, smtp_password)
    #   VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?)
    # """, (2, 'SAVED', new_settings['user_id'], new_settings["user_pw"], new_settings['terminal'],
    #       new_settings['al_address'], new_settings['al_username'], new_settings['al_api_key'],
    #       new_settings['email_alerts'], new_settings['smtp_server'], new_settings['smtp_port'],
    #       new_settings['smtp_username'], new_settings["smtp_password"]))
    #
    # recipients = []
    # i = 1
    # for recipient in new_settings["recipients"]:
    #     recipients.append((i, recipient, 2))
    #     i += 1
    #
    # cursor.executemany("""
    # INSERT INTO recipient(recipient_id, recipient_address, setting_id)
    #   VALUES(?,?,?)
    # """, recipients)
    #
    # credentials = []
    # i = 5
    # for credential in new_settings["credential_settings"]:
    #     cred_type = credential
    #     cred_active = False
    #     cred_mandatory = False
    #     for cred in new_settings["credential_settings"][credential]:
    #         if cred == 'active':
    #             cred_active = new_settings["credential_settings"][credential][cred]
    #         elif cred == 'mandatory':
    #             cred_mandatory = new_settings["credential_settings"][credential][cred]
    #     credentials.append((i, cred_type, cred_active, cred_mandatory, 2))
    #     i += 1
    #
    # cursor.executemany("""
    # INSERT INTO credential(credential_id, credential_type, active, mandatory, setting_id)
    #   VALUES(?,?,?,?,?)
    # """, credentials)
    #
    # results = []
    # i = 8
    # for result in new_settings["results_settings"]:
    #     result_type = result
    #     result_active = new_settings["results_settings"][result]
    #     results.append((i, result_type, result_active, 2))
    #     i += 1
    #
    # cursor.executemany("""
    # INSERT INTO result(result_id, result_type, active, setting_id)
    #   VALUES(?,?,?,?)
    # """, results)
    #
    # db.commit()
    # db.close()

    default_settings = new_settings

    print "\n-------------------- Settings saved in back end"
    for i in default_settings:
        print i, default_settings[i]
    print

