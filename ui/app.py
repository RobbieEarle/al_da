from flask import Flask, render_template, json, redirect, request, session, flash
from flask_cors import CORS
from flask_socketio import SocketIO, emit
from flask_httpauth import HTTPBasicAuth
import subprocess
import smtplib

from email.MIMEMultipart import MIMEMultipart
from email.MIMEText import MIMEText

from assemblyline_client import Client, ClientError
import traceback

from helper.views import create_menu
import eventlet
import arrow
import re

import sqlite3
from cryptography.fernet import Fernet

import logging

eventlet.monkey_patch()


# ============== Logging ==============

format_str = '%(asctime)s: %(levelname)s:\t %(name)s: %(message)s'
date_format = '%Y-%m-%d %H:%M:%S'
formatter = logging.Formatter(format_str, date_format)
local_handler = logging.handlers.RotatingFileHandler('/tmp/kiosk.log', maxBytes=500000, backupCount=5)
local_handler.setFormatter(formatter)

my_logger = logging.getLogger()
my_logger.setLevel(logging.DEBUG)
my_logger.addHandler(local_handler)


# ============== Default Values ==============

# To hold default admin settings as retrieved from DB
default_settings = {}

# To hold the values entered by the user as credentials for each session
session_credentials = []

# Reflects whether or not our virtual machine is currently connected and ready to receive new devices
vm_connected = False

# Key and Cipher Suite used to decrypt DB contents
key = b'peja3W-4eEM9uuJJ95yOJU4r2iL9H6LfLBN4llb4xEs='
cipher_suite = Fernet(key)

# Set to true when user enters the wrong credentials logging into the settings page
login_failed = False


# ============== Flask & Socketio Setup ==============

app = Flask(__name__)
auth = HTTPBasicAuth()
app.config['SECRET_KEY'] = 'changeme123'
app.debug = True
socketio = SocketIO(app)
CORS(app)


# ============== Retrieving Settings From DB ==============

def db_get_saved():
    """
    Retrieves and decodes contents of our settings_db
    :return:
    """

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

    settings_dict["user_id"] = cipher_suite.decrypt(bytes(data_settings[saved][2]))
    settings_dict["user_pw"] = cipher_suite.decrypt(bytes(data_settings[saved][3]))
    settings_dict["terminal"] = cipher_suite.decrypt(bytes(data_settings[saved][4]))
    settings_dict["al_address"] = cipher_suite.decrypt(bytes(data_settings[saved][5]))
    settings_dict["al_username"] = cipher_suite.decrypt(bytes(data_settings[saved][6]))
    settings_dict["al_api_key"] = cipher_suite.decrypt(bytes(data_settings[saved][7]))
    settings_dict["email_alerts"] = bool(int(cipher_suite.decrypt(bytes(data_settings[saved][8]))))
    settings_dict["smtp_server"] = cipher_suite.decrypt(bytes(data_settings[saved][9]))
    settings_dict["smtp_port"] = cipher_suite.decrypt(bytes(data_settings[saved][10]))
    settings_dict["smtp_username"] = cipher_suite.decrypt(bytes(data_settings[saved][11]))
    settings_dict["smtp_password"] = cipher_suite.decrypt(bytes(data_settings[saved][12]))

    recipients = []
    for recipient in data_recipients:

        recip_address = cipher_suite.decrypt(bytes(recipient[1]))
        recip_setting_id = recipient[2]

        if recip_setting_id == saved + 1:
            recipients.append(recip_address)

    settings_dict["recipients"] = recipients

    credentials = []
    for credential in data_credentials:

        cred_name = cipher_suite.decrypt(bytes(credential[1]))
        cred_active = cipher_suite.decrypt(bytes(credential[2]))
        cred_mandatory = cipher_suite.decrypt(bytes(credential[3]))
        cred_setting_id = credential[4]

        if cred_setting_id == saved + 1:
            credentials.append({'name': cred_name,
                                'active': bool(int(cred_active)),
                                'mandatory': bool(int(cred_mandatory)),
                                'session_val': ''})

    settings_dict["credential_settings"] = credentials

    results = {}
    for result in data_results:

        result_type = cipher_suite.decrypt(bytes(result[1]))
        result_active = cipher_suite.decrypt(bytes(result[2]))
        result_setting_id = result[3]

        if result_setting_id == saved + 1:
            results[result_type] = bool(int(result_active))

    settings_dict["results_settings"] = results

    db.close()

    return settings_dict


# ============== Page Rendering ==============

@app.route('/')
def index():
    """
    Called when we navigate to our default domain
    :return:
    """

    global default_settings

    # Refreshes default settings to make sure it is up to date with DB
    default_settings = db_get_saved()

    # Sets the logged in attribute of our session to false, which will force the user to re-enter their login
    # credentials if they attempt to visit the settings page
    session['logged_in'] = False

    # Renders the scan.html page
    return render("scan.html", request.path)


@app.route('/scan')
def scan():
    """
    Called when we navigate to the /scan subdomain. Redirects to default domain
    :return:
    """

    # Sets the logged in attribute of our session to false, which will force the user to re-enter their login
    # credentials if they attempt to visit the settings page
    session['logged_in'] = False

    # Redirects to default domain
    return redirect('/', code=301)


@app.route('/admin')
def admin():
    """
    Called when we successfully navigate to the administrative settings page
    :return:
    """

    global default_settings

    # Refreshes default settings to make sure it is up to date with DB
    default_settings = db_get_saved()

    # If we have been logged out by the scan page, forces user to re-enter credentials
    if not session.get('logged_in') and default_settings["user_pw"] != '':
        return render_template('login.html', app_name='AL Device Audit', menu=create_menu(request.path))

    # Otherwise renders the admin.html page
    else:
        return render("admin.html", request.path)


@app.route('/login', methods=['POST'])
def do_admin_login():
    """
    POST method called when a user attempts to log in. Validates their credentials and shows /admin page if valid
    :return:
    """

    global default_settings
    global login_failed

    # Checks if credentials entered by the user match those on record; if so sets logged_in to true allowing admin.html
    # to render
    if request.form['password'] == default_settings['user_pw'] and request.form['username'] == default_settings['user_id']:
        session['logged_in'] = True

    # Otherwise sets login_failed to True. When the login.html page is brought up it will emit fe_login_status, which
    # will check this variable to tell whether or not a failed login has occurred
    else:
        login_failed = True

    # Redirects to /admin
    return redirect('/admin', code=301)


# ============== Logging ==============
@socketio.on('logging')
def logging(msg):
    """
    Logs events coming from scrape_drive
    :return:
    """
    my_logger.debug(msg)


# ============== Front End Socketio Listeners ==============

@socketio.on('fe_scan_start')
def fe_scan_start():
    """
    Called when our scan page first loads
    :return:
    """

    # vm_control('restart')


@socketio.on('fe_get_credentials')
def fe_get_credentials():
    """
    Called when our front end wants to populate screen 1 of the scan page (credentials)
    :return: The credential settings as chosen by admin
    """

    global default_settings

    return default_settings["credential_settings"]


@socketio.on('fe_get_results_settings')
def fe_get_results_settings():
    """
    Called when our front end wants to populate the results section of the scan page
    :return: The results settings as chosen by admin
    """

    global default_settings

    return default_settings["results_settings"]


@socketio.on('fe_set_session_credentials')
def fe_set_session_credentials(credentials):
    """
    Called when the front end has received a set of user credentials for a session
    :param credentials: The user credentials for this session
    :return:
    """

    global session_credentials

    session_credentials = credentials

    # Tells back end script that credentials have been receieved and we can start our submit / receive threads
    socketio.emit('start_scan')


@socketio.on('fe_login_status')
def fe_login_status():
    """
    Called when we load our login.html page. Checks if the user previously tried to log in and failed, outputs an error
    message if necessary
    :return:
    """

    global login_failed

    if login_failed:
        login_failed = False
        return True
    else:
        return False


@socketio.on('fe_validate_email')
def fe_validate_email(addr):
    """
    Called by the front end when it wants to validate an email address entered in the settings page as a email alert
    recipient
    :param addr: The email address to be validated
    :return: Whether or not the email address is valid
    """

    # Runs entry through simple regex
    if re.match('^[_a-z0-9-]+(\.[_a-z0-9-]+)*@[a-z0-9-]+(\.[a-z0-9-]+)*(\.[a-z]{2,4})$', addr) is not None:
        return True

    return False


@socketio.on('fe_get_settings')
def fe_get_settings():
    """
    Called by front end when settings page is fist opened. Returns all default settings from DB
    :return:
    """

    global default_settings

    default_settings = db_get_saved()

    # Makes a copy of default settings to send out, but with user_pw set to nothing and smtp_password set to a
    # placeholder value
    default_settings_output = default_settings.copy()
    default_settings_output["user_pw"] = ''
    default_settings_output["smtp_password"] = convert_dots(default_settings["smtp_password"])

    # Converts settings to JSON object and outputs to front end
    settings_json = json.dumps(default_settings_output)
    socketio.emit('populate_settings', settings_json)


@socketio.on('fe_validate_settings')
def fe_validate_settings(settings):
    """
    Called by front end when the settings page wants to check if all input fields have been populated with valid data
    :param settings: The pre-validation settings as entered by the user
    :return: Array of alerts that were generated
    """

    alerts = []

    # User ID cannot be empty
    if settings["user_id"] == '':
        alerts.append('user_id')

    # User cannot change admin password to the same password
    if settings["user_pw"] == default_settings["user_pw"]:
        alerts.append('repeat_pw')

    # Terminal name cannot be empty
    if settings["terminal"] == '':
        alerts.append('terminal_blank')

    return alerts


@socketio.on('fe_settings_save')
def fe_settings_save(new_settings, default_smtp_pw_reuse):
    """
    Called when the front end is ready to save new user settings to our DB.
    :param new_settings: The new user settings
    :param default_smtp_pw_reuse: Boolean value representing whether or not to use previous smtp password
    :return:
    """

    # Clears old saved DB values
    db_clear_saved()

    # Saves new settings to DB
    db_save(new_settings, default_smtp_pw_reuse)


@socketio.on('fe_test_connection_smtp')
def fe_test_connection_smtp(smtp_server, smtp_port, smtp_username, smtp_password, reuse_pw):
    """
    Called by front end settings page when user wants to test connection to an smtp server
    :param smtp_server: Server address
    :param smtp_port: Server port
    :param smtp_username: Username
    :param smtp_password: Password
    :param reuse_pw: Boolean value; if true we use the same password as in DB
    :return: Connection success
    """

    global default_settings

    # If the password field has not been altered, use the same password as in the original default settings
    if reuse_pw:
        smtp_password = default_settings["smtp_password"]

    # Tries to connect to SMTP server using given address and port. Times out after 8 seconds
    try:
        server = smtplib.SMTP(smtp_server, int(smtp_port), timeout=8)
        server.quit()
        server = smtplib.SMTP(smtp_server, int(smtp_port))
    except Exception as e:
        output_txt = "Server connection error: " + traceback.format_exception_only(type(e), e)[0]
        return [False, output_txt]

    # Tries to log in using given username and password
    try:
        server.starttls()
        server.login(smtp_username, smtp_password)
    except Exception as e:
        server.quit()
        output_txt = "Login error: " + traceback.format_exception_only(type(e), e)[0]
        return [False, output_txt]

    server.quit()
    return [True, 'Connection successful']


@socketio.on('fe_test_connection_al')
def fe_test_connection_al(al_ip_address, al_username, al_api_key):
    """
    Called by front end settings page when user wants to test connection to an Assemblyline server
    :param al_ip_address: Assemblyline server IP address
    :param al_username: Username
    :param al_api_key: Api key
    :return: Connection success
    """

    # Tries to connect to Assembyline server
    try:
        Client(al_ip_address, apikey=(al_username, al_api_key), verify=False)
    except Exception as e:
        if type(e) is ClientError:
            output_txt = json.loads(str(e))
            return [False, "Login error: " + output_txt["api_error_message"]]
        else:
            return [False, traceback.format_exception_only(type(e), e)[0]]

    return [True, 'Connection successful']


@socketio.on('vm_control')
def vm_control(vm_command):
    """
    Called when front end wants to turn off or restart the virtual machine running our scrape application
    :param args:
    :return:
    """

    global client_f_name, client_l_name, vm_connected

    # client_f_name = ''
    # client_l_name = ''
    # vm_connected = False
    #
    # print "VM Control: " + vm_command

    # if vm_command == 'off' or 'restart':
    #     subprocess.call('"C:\Program Files\Oracle\VirtualBox\VBoxManage.exe" controlvm sandbox poweroff')
    #     subprocess.call('"C:\Program Files\Oracle\VirtualBox\VBoxManage.exe" snapshot sandbox restore Test')
    # if vm_command == 'restart' or 'on':
    #     subprocess.call('"C:\Program Files\Oracle\VirtualBox\VBoxManage.exe" startvm sandbox --type emergencystop '
    #                     '--type headless')


# ============== Back End Socketio Listeners ==============

@socketio.on('be_retrieve_settings')
def be_retrieve_settings():
    """
    Called by the back end to retrieve the login settings for the Assemblyline server
    :return: Assemblyline login settings from DB
    """

    global default_settings

    al_settings = {
        "address": default_settings["al_address"],
        "username": default_settings["al_username"],
        "api_key": default_settings["al_api_key"],
        "id": default_settings["terminal"]
    }

    return al_settings


@socketio.on('be_device_event')
def be_device_event(event_type, *args):
    """
    Called by back end when a device event occurs (connected, loading, disconnected)
    :param event_type: specifies what type of device event occurred
    :return:
    """

    if event_type == 'done_loading':

        args = list(args)

        try:

            terminal = Client(default_settings["al_address"],
                              apikey=(default_settings["al_username"], default_settings["al_api_key"]),
                              verify=False)

            if args[0] is not None:

                pass_files = []
                for sid in args[0]:
                    pass_files.append(get_sid_info(terminal, sid, False))

                pass_files_json = json.dumps(pass_files)
                socketio.emit('pass_files_json', pass_files_json)

            if args[1] is not None:
                mal_files = []
                for sid in args[1]:
                    mal_files.append(get_sid_info(terminal, sid, True))

                mal_files_json = json.dumps(mal_files)
                socketio.emit('mal_files_json', mal_files_json)

                # Sends email alert to all users on the recipient list
                email_alert(mal_files)

        except Exception as e:
            my_logger.error("Error retrieving file information from server: " + str(e))

    socketio.emit('dev_event', event_type)


@socketio.on('be_to_kiosk')
def be_to_kiosk(msg):
    """
    Called by back end to send textual progress information to the front end
    :param msg: message to be sent
    :return:
    """

    socketio.emit('output', msg)



@socketio.on('be_ingest_status')
def be_ingest_status(update_type):
    """
    Called by the back end whenever a new file is submitted or received. Information is sent to front end in order to
    update the progress bar in the scan screen
    :param update_type: Gives the type of ingestion event that occurred
    :return:
    """

    socketio.emit('update_ingest', update_type)


# ============== Helper Functions ==============

def render(template, path):
    """
    Called by our Flask app when a new page is loaded. Renders corresponding HTML document
    :param template: Name of the HTML document to be rendered
    :param path: Path of this document
    :return:
    """

    return render_template(template, app_name='AL Device Audit', menu=create_menu(path), user_js='admin')


def convert_dots(input_str):
    """
    Takes in a string and returns a string of dots of the same length
    :param input_str:
    :return:
    """
    if len(input_str) != 0:
        return_str = ''
        for i in input_str:
            return_str = return_str + '.'
        return return_str
    else:
        return ''


def get_sid_info(terminal, sid, adv):

    if adv:
        details = terminal.submission.full(sid)
    else:
        details = terminal.submission(sid)

    full_path = details['submission']['metadata']['path']
    details['submission']['metadata']['path'] = full_path[full_path.find('temp_device') + 11:]

    return details


def email_alert(mal_files):
    """
    Sends email alert to all addresses in the recipients list
    :param mal_files: List of files that were flagged
    :param terminal_id: Name of the terminal that generated the alert
    :return:
    """

    global default_settings

    # Only sends if there is at least one recipient, and if email alerts have been turned on
    if len(default_settings["recipients"]) > 0 and default_settings["email_alerts"]:

        # Constructs message
        msg = MIMEMultipart()
        msg['From'] = default_settings["smtp_username"]
        msg['To'] = ", ".join(default_settings["recipients"])
        msg['X-Priority'] = '2'
        msg['Subject'] = "Assemblyline Kiosk Alert: Malicious files detected on device"

        body = 'Alert generated by (' + default_settings["terminal"] + ') at: ' + arrow.now().format('YYYY-MM-DD HH:mm') + '\r\n'

        body = body + '\r\n-- Session Details: ' + '\r\n'
        for credential in session_credentials:
            body = body + credential["name"] + ': ' + credential["value"] + '\r\n'

        body = body + '\r\n-- Flagged Files: ' + '\r\n'
        for x in mal_files:
            body = body + 'Filename: ' + x['submission']['metadata']['filename'] + '\r\n'
            body = body + 'SSID: ' + str(x['submission']['sid']) + '\r\n'
            body = body + 'Score: ' + str(x['submission']['max_score']) + '\r\n'
            body = body + '\r\n'

        msg.attach(MIMEText(body, 'plain'))

        # Tries to connect to SMTP server and send message using credentials from settings screen
        try:
            server = smtplib.SMTP(default_settings["smtp_server"], 587)
            server.starttls()
            server.login(default_settings["smtp_username"], default_settings["smtp_password"])
            text = msg.as_string()
            server.sendmail(default_settings["smtp_username"], default_settings["recipients"], text)
            server.quit()
        except:
            my_logger.error("Error sending email")


def db_clear_saved():
    """
    Clears previously saved entries from our DB. Only targets entries where setting_id = 2, as these are saved entries.
    Entries with setting_id = 1 are default values for when no saved entry is present.
    :return:
    """

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
    """
    Encrypts and saves new settings to our DB
    :param new_settings: New settings as determined by admin in settings page of front end
    :param default_smtp_pw_reuse: Boolean value represents whether or not we should use same SMTP password
    :return:
    """

    global default_settings

    db = sqlite3.connect('settings_db')
    cursor = db.cursor()

    # If new passwords have not been provided then old passwords are reused
    if new_settings["user_pw"] == '':
        new_settings["user_pw"] = default_settings["user_pw"]
    if default_smtp_pw_reuse or not new_settings["email_alerts"]:
        new_settings["smtp_password"] = default_settings["smtp_password"]

    # -- Settings table
    cursor.execute("""
    INSERT INTO setting(setting_id, setting_name, user_id, user_pw, terminal, al_address, al_username, al_api_key,
      email_alerts, smtp_server, smtp_port, smtp_username, smtp_password)
      VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?)
    """, (2,
          cipher_suite.encrypt(b'SAVED'),
          cipher_suite.encrypt(bytes(new_settings['user_id'])),
          cipher_suite.encrypt(bytes(new_settings["user_pw"])),
          cipher_suite.encrypt(bytes(new_settings['terminal'])),
          cipher_suite.encrypt(bytes(new_settings['al_address'])),
          cipher_suite.encrypt(bytes(new_settings['al_username'])),
          cipher_suite.encrypt(bytes(new_settings['al_api_key'])),
          cipher_suite.encrypt(bytes(int(new_settings['email_alerts']))),
          cipher_suite.encrypt(bytes(new_settings['smtp_server'])),
          cipher_suite.encrypt(bytes(new_settings['smtp_port'])),
          cipher_suite.encrypt(bytes(new_settings['smtp_username'])),
          cipher_suite.encrypt(bytes(new_settings["smtp_password"]))))

    # -- Recipients table
    recipients = []
    i = 1
    for recipient in new_settings["recipients"]:
        recipients.append((i, cipher_suite.encrypt(bytes(recipient)), 2))
        i += 1
    cursor.executemany("""
    INSERT INTO recipient(recipient_id, recipient_address, setting_id)
      VALUES(?,?,?)
    """, recipients)

    # -- Credentials table
    credentials = []
    i = 5
    for credential in new_settings["credential_settings"]:
        cred_name = credential["name"]
        cred_active = credential["active"]
        cred_mandatory = credential["mandatory"]
        credentials.append((i, cipher_suite.encrypt(bytes(cred_name)),
                            cipher_suite.encrypt(bytes(int(cred_active))),
                            cipher_suite.encrypt(bytes(int(cred_mandatory))), 2))
        i += 1
    cursor.executemany("""
    INSERT INTO credential(credential_id, credential_name, active, mandatory, setting_id)
      VALUES(?,?,?,?,?)
    """, credentials)

    # -- Results table
    results = []
    i = 8
    for result in new_settings["results_settings"]:
        result_type = cipher_suite.encrypt(bytes(result))
        result_active = cipher_suite.encrypt(bytes(int(new_settings["results_settings"][result])))
        results.append((i, result_type, result_active, 2))
        i += 1
    cursor.executemany("""
    INSERT INTO result(result_id, result_type, active, setting_id)
      VALUES(?,?,?,?)
    """, results)

    db.commit()
    db.close()

    default_settings = new_settings


if __name__ == '__main__':
    socketio.run(app, threaded=True)
