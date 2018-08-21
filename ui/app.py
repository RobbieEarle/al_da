from flask import Flask, render_template, json, redirect, request, session
from werkzeug.utils import secure_filename
from werkzeug.exceptions import RequestEntityTooLarge
from flask_cors import CORS
from flask_socketio import SocketIO, emit
from flask_httpauth import HTTPBasicAuth
from email.MIMEMultipart import MIMEMultipart
from email.MIMEText import MIMEText
from assemblyline_client import Client, ClientError
from helper.views import create_menu
from logging.handlers import RotatingFileHandler
from helper.loggers import StreamToLogger
from cryptography.fernet import Fernet
from threading import Thread
import logging
import sys
import eventlet
import arrow
import re
import traceback
import smtplib
import sqlite3
import time
import subprocess
import os

eventlet.monkey_patch()

# ============== Logging ==============

formatter = logging.Formatter('%(asctime)s: %(levelname)s:\t %(message)s', '%Y-%m-%d %H:%M:%S')

# -- OS CHANGES
local_handler = logging.handlers.RotatingFileHandler('/var/log/al_da_kiosk/kiosk.log', maxBytes=100000, backupCount=5)
# local_handler = logging.handlers.RotatingFileHandler('C:/Users/Robert Earle/Desktop/al_device_audit/al_da/ui/kiosk.log', maxBytes=500000, backupCount=5)

local_handler.setFormatter(formatter)

my_logger = logging.getLogger('alda')
my_logger.setLevel(logging.DEBUG)
my_logger.addHandler(local_handler)
sys.stderr = StreamToLogger(my_logger, logging.ERROR)

# ============== Default Values ==============

# To hold default admin settings as retrieved from DB
default_settings = {}

# To hold the values entered by the user as credentials for each session
session_credentials = []

# Key and Cipher Suite used to decrypt DB contents
key = b'peja3W-4eEM9uuJJ95yOJU4r2iL9H6LfLBN4llb4xEs='
cipher_suite = Fernet(key)

# Set to true when user enters the wrong credentials logging into the settings page
login_failed = False

# Holds a reference to logo file that has been uploaded
file_awaiting_upload = None

# Set to true when user tries to upload file greater than 5mb
file_upload_error = False

# Set to true when user tries to upload non-approved file type
wrong_file_type = False

# List of usb devices that are present on the host machine by default
default_devices = []

# Set to true when our VM has been restarted and is ready to accept a new device
accepting_devices = False

# True when a scan session has been initiated but then 'New Session' button hasn't been clicked yet
session_in_progress = False

# ============== Flask & Socketio Setup ==============

# -- OS CHANGES
UPLOAD_FOLDER = '/opt/al_da/ui/static/uploads'
# UPLOAD_FOLDER = 'C:\\Users\\Robert Earle\\Desktop\\al_device_audit\\al_da\\ui\\static\\uploads'

ALLOWED_EXTENSIONS = ['png', 'jpg', 'jpeg', 'svg']

app = Flask(__name__)
auth = HTTPBasicAuth()
app.config['SECRET_KEY'] = 'changeme123'
app.config['UPLOAD_FOLDER'] = UPLOAD_FOLDER
app.config['MAX_CONTENT_LENGTH'] = 2 * 1024 * 1024
app.debug = True
socketio = SocketIO(app, logger=my_logger)
CORS(app)


# ============== Retrieving Settings From DB ==============

def db_get_saved():
    """
    Retrieves and decodes contents of our settings_db
    :return: dict, contains all settings from out database
    """

    settings_dict = {}

    # Tries to connect to our settings_db
    try:
        db = sqlite3.connect('settings_db')
        cursor = db.cursor()
    except Exception as e:
        my_logger.error('Error connecting to database: ' + str(e))
        return settings_dict

    # Tries to pull data from all tables in our database
    try:
        cursor.execute("""SELECT * from setting""")
        data_settings = cursor.fetchall()

        cursor.execute("""SELECT * from recipient""")
        data_recipients = cursor.fetchall()

        cursor.execute("""SELECT * from credential""")
        data_credentials = cursor.fetchall()

        cursor.execute("""SELECT * from result""")
        data_results = cursor.fetchall()
    except Exception as e:
        my_logger.error('Error retrieving settings from database: ' + str(e))

    # Decrypts and passes data from the setting table into our settings dict
    try:
        saved = len(data_settings) - 1
        settings_dict['user_id'] = cipher_suite.decrypt(bytes(data_settings[saved][2]))
        settings_dict['user_pw'] = cipher_suite.decrypt(bytes(data_settings[saved][3]))
        settings_dict['terminal'] = cipher_suite.decrypt(bytes(data_settings[saved][4]))
        settings_dict['al_address'] = cipher_suite.decrypt(bytes(data_settings[saved][5]))
        settings_dict['al_username'] = cipher_suite.decrypt(bytes(data_settings[saved][6]))
        settings_dict['al_api_key'] = cipher_suite.decrypt(bytes(data_settings[saved][7]))
        settings_dict['email_alerts'] = bool(int(cipher_suite.decrypt(bytes(data_settings[saved][8]))))
        settings_dict['smtp_server'] = cipher_suite.decrypt(bytes(data_settings[saved][9]))
        settings_dict['smtp_port'] = cipher_suite.decrypt(bytes(data_settings[saved][10]))
        settings_dict['smtp_username'] = cipher_suite.decrypt(bytes(data_settings[saved][11]))
        settings_dict['smtp_password'] = cipher_suite.decrypt(bytes(data_settings[saved][12]))
        settings_dict['company_logo'] = cipher_suite.decrypt(bytes(data_settings[saved][13]))
        settings_dict['kiosk_footer'] = cipher_suite.decrypt(bytes(data_settings[saved][14]))
        settings_dict['pass_message'] = cipher_suite.decrypt(bytes(data_settings[saved][15]))
        settings_dict['fail_message'] = cipher_suite.decrypt(bytes(data_settings[saved][16]))
        settings_dict['error_timeout'] = cipher_suite.decrypt(bytes(data_settings[saved][17]))
        settings_dict['error_removal'] = cipher_suite.decrypt(bytes(data_settings[saved][18]))
    except Exception as e:
        my_logger.error('Error parsing decrypting settings: ' + str(e))

    # Populates a list with the data from our recipient table passes that list into our settings dict
    recipients = []
    for recipient in data_recipients:

        recip_address = cipher_suite.decrypt(bytes(recipient[1]))
        recip_setting_id = recipient[2]

        if recip_setting_id == saved + 1:
            recipients.append(recip_address)

    settings_dict['recipients'] = recipients

    # Populates a list with the data from our credential table passes that list into our settings dict
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

    settings_dict['credential_settings'] = credentials

    # Populates a dict with the data from our recipient table passes that list into our settings dict
    results = {}
    for result in data_results:

        result_type = cipher_suite.decrypt(bytes(result[1]))
        result_active = cipher_suite.decrypt(bytes(result[2]))
        result_setting_id = result[3]

        if result_setting_id == saved + 1:
            results[result_type] = bool(int(result_active))

    settings_dict['results_settings'] = results

    db.close()

    my_logger.info('Settings successfully retrieved from database')

    return settings_dict


# ============== Page Rendering ==============

@app.route('/')
def index():
    """
    Called when we navigate to our default domain
    :return: Flask.render_template, for the scan.html
    """

    global default_settings

    # Refreshes default settings to make sure it is up to date with DB
    default_settings = db_get_saved()

    # Sets the logged in attribute of our session to false, which will force the user to re-enter their login
    # credentials if they attempt to visit the settings page
    session['logged_in'] = False

    my_logger.info('============= PAGE LOADED: index')

    # Renders the scan.html page
    return render('scan.html', request.path)


@app.route('/scan')
def scan():
    """
    Called when we navigate to the /scan subdomain. Redirects to default domain
    :return: Flask.redirect, pointing towards our home page
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
    :return: Flask.render_template, corresponding either to login.html or admin.html (depending on if credentials
    were valid)
    """

    global default_settings

    my_logger.info('============= PAGE LOADED: settings')

    # Refreshes default settings to make sure it is up to date with DB
    default_settings = db_get_saved()

    # If we have been logged out by the scan page, forces user to re-enter credentials
    if not session.get('logged_in') and default_settings['user_pw'] != '':
        return render('login.html', request.path)

    # Otherwise renders the admin.html page
    else:
        return render('admin.html', request.path)


@app.route('/login', methods=['POST'])
def do_admin_login():
    """
    POST method called when a user attempts to log in. Validates their credentials and shows /admin page if valid
    :return: Flask.redirect, pointing to the admin page
    """

    global default_settings, login_failed, accepting_devices

    accepting_devices = False

    # Checks if credentials entered by the user match those on record; if so sets logged_in to true allowing admin.html
    # to render
    if request.form['password'] == default_settings['user_pw'] and request.form['username'] == default_settings[
        'user_id']:
        session['logged_in'] = True

    # Otherwise sets login_failed to True. When the login.html page is brought up it will emit fe_login_status, which
    # will check this variable to tell whether or not a failed login has occurred
    else:
        login_failed = True

    # Redirects to /admin
    return redirect('/admin', code=301)


@app.route('/uploader', methods=['GET', 'POST'])
def upload_file():
    global file_awaiting_upload, file_upload_error, wrong_file_type

    try:
        if request.method == 'POST':
            if 'file' not in request.files:
                return redirect('/admin', code=301)
            f = request.files['file']
            if f.filename != '' and f and allowed_file(f.filename):
                filename = secure_filename(f.filename)
                f.save(os.path.join(app.config['UPLOAD_FOLDER'], filename))
                file_awaiting_upload = filename
            else:
                wrong_file_type = True

    except RequestEntityTooLarge as e:
        file_upload_error = True

    return redirect('/admin', code=301)


# ============== Logging ==============
@socketio.on('logging')
def logging(msg):
    """
    Logs events coming from scrape_drive.py (script running on our VM)
    :param msg: string, message coming from scrape_drive
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

    my_logger.info('============= FRONTEND CONNECTED')
    vm_refresh()


@socketio.on('fe_get_text_boxes')
def fe_get_text_boxes():
    """
    Called when our front on initialization. Populates all customizable text boxes
    :return: list, strings to populate text boxes
    """

    global default_settings

    default_settings = db_get_saved()

    text_boxes = {
        'kiosk_footer': default_settings['kiosk_footer'],
        'pass_message': default_settings['pass_message'],
        'fail_message': default_settings['fail_message'],
        'error_timeout': default_settings['error_timeout'],
        'error_removal': default_settings['error_removal']
    }

    return text_boxes


@socketio.on('fe_get_credentials')
def fe_get_credentials():
    """
    Called when our front end wants to populate screen 1 of the scan page (credentials)
    :return: list, the credential settings as chosen by admin
    """

    global default_settings

    my_logger.info('Sent credentials to front end')

    return default_settings['credential_settings']


@socketio.on('fe_get_results_settings')
def fe_get_results_settings():
    """
    Called when our front end wants to populate the results section of the scan page
    :return: dict, the results settings as chosen by admin
    """

    global default_settings

    my_logger.info('Sent results settings to front end')

    return default_settings['results_settings']


@socketio.on('fe_set_session_credentials')
def fe_set_session_credentials(credentials):
    """
    Called when the front end has received a set of user credentials for a session
    :param credentials: list, holds the user credentials for this session
    :return:
    """

    global session_credentials, session_in_progress

    my_logger.info('Credentials successfully entered')

    session_in_progress = True
    session_credentials = credentials

    my_logger.info('Starting new scan')
    # Tells back end script that credentials have been receieved and we can start our submit / receive threads
    socketio.emit('start_scan')


@socketio.on('fe_session_complete')
def fe_session_complete():
    """
    Called by front end when a session finishes
    :return:
    """

    global session_in_progress

    session_in_progress = False


@socketio.on('fe_login_status')
def fe_login_status():
    """
    Called when we load our login.html page. Checks if the user previously tried to log in and failed
    :return: boolean, whether or not this is the user's first attempt at logging in
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
    :param addr: string, the email address to be validated
    :return: boolean, whether or not the email address is valid
    """

    # Runs entry through simple regex
    if re.match('^[_a-z0-9-]+(\.[_a-z0-9-]+)*@[a-z0-9-]+(\.[a-z0-9-]+)*(\.[a-z]{2,4})$', addr) is not None:
        my_logger.info('Email validation successful')
        return True

    my_logger.info('Email validation failure')
    return False


@socketio.on('fe_get_settings')
def fe_get_settings():
    """
    Called by front end when settings page is first opened. Returns all default settings from DB
    :return:
    """

    global default_settings, file_awaiting_upload, file_upload_error, wrong_file_type

    default_settings = db_get_saved()

    # Makes a copy of default settings to send out, but with user_pw set to nothing and smtp_password set to a
    # placeholder value
    default_settings_output = default_settings.copy()

    default_settings_output['user_pw'] = ''
    default_settings_output['smtp_password'] = convert_dots(default_settings['smtp_password'])

    if file_awaiting_upload is not None:
        default_settings_output['company_logo'] = str(file_awaiting_upload)
        file_awaiting_upload = None
    else:
        default_settings_output['company_logo'] = ''

    if file_upload_error:
        default_settings_output['show_upload_error'] = True
        file_upload_error = False
    else:
        default_settings_output['show_upload_error'] = False

    if wrong_file_type:
        default_settings_output['wrong_file_type'] = True
        wrong_file_type = False
    else:
        default_settings_output['wrong_file_type'] = False

    # Converts settings to JSON object and outputs to front end
    settings_json = json.dumps(default_settings_output)
    my_logger.info('Settings sent to front end')
    socketio.emit('populate_settings', settings_json)


@socketio.on('fe_validate_settings')
def fe_validate_settings(settings):
    """
    Called by front end when the settings page wants to check if all input fields have been populated with valid data
    :param settings: dict, the pre-validation settings as entered by the user
    :return: list, all alerts that were generated
    """

    alerts = []

    # User ID cannot be empty
    if settings['user_id'] == '':
        alerts.append('user_id')

    # User cannot change admin password to the same password
    if settings['user_pw'] == default_settings['user_pw']:
        alerts.append('repeat_pw')

    # Terminal name cannot be empty
    if settings['terminal'] == '':
        alerts.append('terminal_blank')

    return alerts


@socketio.on('fe_settings_save')
def fe_settings_save(new_settings, default_smtp_pw_reuse):
    """
    Called when the front end is ready to save new user settings to our DB.
    :param new_settings: dict, the new user settings
    :param default_smtp_pw_reuse: boolean, represents whether or not to use previous smtp password
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
    :param smtp_server: string, server address
    :param smtp_port: string, server port
    :param smtp_username: string, username
    :param smtp_password: string, password
    :param reuse_pw: boolean, if true we use the same password as in DB
    :return: boolean, whether or not connection was successful
    """

    global default_settings

    # If the password field has not been altered, use the same password as in the original default settings
    if reuse_pw:
        smtp_password = default_settings['smtp_password']

    # Tries to connect to SMTP server using given address and port. Times out after 8 seconds
    try:
        server = smtplib.SMTP(smtp_server, int(smtp_port), timeout=8)
        server.quit()
        server = smtplib.SMTP(smtp_server, int(smtp_port))
    except Exception as e:
        output_txt = 'Server connection error: ' + traceback.format_exception_only(type(e), e)[0]
        my_logger.error(output_txt)
        return [False, output_txt]

    # Tries to log in using given username and password
    try:
        server.starttls()
        server.login(smtp_username, smtp_password)
    except Exception as e:
        server.quit()
        output_txt = 'Login error: ' + traceback.format_exception_only(type(e), e)[0]
        my_logger.error(output_txt)
        return [False, output_txt]

    server.quit()
    my_logger.info('SMTP connection test successful')
    return [True, 'Connection successful']


@socketio.on('fe_test_connection_al')
def fe_test_connection_al(al_ip_address, al_username, al_api_key):
    """
    Called by front end settings page when user wants to test connection to an Assemblyline server
    :param al_ip_address: string, Assemblyline server IP address
    :param al_username: string, username
    :param al_api_key: sting, api key
    :return: boolean, whether or not connection was successful
    """

    # Tries to connect to Assembyline server
    try:
        Client(al_ip_address, apikey=(al_username, al_api_key), verify=False)
    except Exception as e:
        if type(e) is ClientError:
            output_txt = json.loads(str(e))
            my_logger.error(output_txt)
            return [False, 'Login error: ' + output_txt['api_error_message']]
        else:
            my_logger.error(traceback.format_exception_only(type(e), e)[0])
            return [False, traceback.format_exception_only(type(e), e)[0]]

    my_logger.info('Assemblyline server connection test successful')
    return [True, 'Connection successful']


# ============== Back End Socketio Listeners ==============

@socketio.on('be_connected')
def be_connected():
    """
    Called by back end when VM is initialized and ready to receive a new device
    :return:
    """

    global accepting_devices

    my_logger.info('============= BACKEND CONNECTED')
    socketio.emit('vm_refreshing', False)
    my_logger.info('VM finished refreshing')

    if not accepting_devices:
        accepting_devices = True
        Thread(target=detect_new_device, args=(), name='detect_new_device').start()


@socketio.on('be_retrieve_settings')
def be_retrieve_settings():
    """
    Called by the back end to retrieve the login settings for the Assemblyline server
    :return: dict, Assemblyline login settings from DB
    """
    global default_settings

    # Refreshes default settings to make sure it is up to date with DB
    default_settings = db_get_saved()

    my_logger.info('Sandbox retrieved Assemblyline server settings')

    al_settings = {
        'address': default_settings['al_address'],
        'username': default_settings['al_username'],
        'api_key': default_settings['al_api_key'],
        'id': default_settings['terminal']
    }

    return al_settings


@socketio.on('be_device_event')
def be_device_event(event_type, *args):
    """
    Called by back end when a device event occurs (connected, loading, disconnected, etc)
    :param event_type: string, specifies what type of device event occurred
    :param args: If present, these arguments will contain lists of the pass files and mal files to be sent to front end
    :return:
    """

    my_logger.info('Device event : ' + event_type)
    args = list(args)

    # The length of args will be two whenever pass/mal file arrays are passed in (ie. when a device is disconnected or
    # when a scan has been completed.
    if len(args) == 2:

        # Tells front end that we are currently waiting on detailed results from server
        socketio.emit('dev_event', 'loading_results')

        # Tries to connect to Assemblyline server
        try:
            terminal = Client(default_settings['al_address'],
                              apikey=(default_settings['al_username'], default_settings['al_api_key']),
                              verify=False)
        except Exception as e:
            my_logger.error('Error connecting to server: ' + str(e))
            terminal = None

        if terminal is not None:
            # Populates pass_files array with basic file info for each sid passed from back end, and emits JSON dump to
            # front end
            pass_files = []
            for file_info in args[0]:
                pass_files.append(file_info)
            pass_files_json = json.dumps(pass_files)
            socketio.emit('pass_files_json', pass_files_json)

            # Populates mal array with detailed file info for each sid passed from back end, and emits JSON dump to
            # front end
            mal_files = []
            for file_info in args[1]:
                mal_files.append(get_detailed_info(terminal, file_info))
            mal_files_json = json.dumps(mal_files)
            socketio.emit('mal_files_json', mal_files_json)

            # Sends email alert to all users on the recipient list
            email_alert(mal_files)

    # Tells front end that a device event has occurred and what type
    socketio.emit('dev_event', event_type)

    time.sleep(0.2)

    # If the device event is a disconnection, refreshes our VM
    if event_type == 'remove_detected':
        vm_refresh()


@socketio.on('be_ingest_status')
def be_ingest_status(update_type, filename):
    """
    Called by the back end whenever a new file is submitted or received. Information is sent to front end which is used
    to update the progress bar in the scan screen
    :param update_type: string, gives the type of ingestion event that occurred
    :param filename: string, gives the name of the file that has been submitted or received
    :return:
    """

    args = {
        'update_type': update_type,
        'filename': filename
    }

    if update_type == 'submit_file':
        my_logger.info(' - submitted file : ' + filename)
    elif update_type == 'receive_file':
        my_logger.info(' -    received file : ' + filename)

    socketio.emit('update_ingest', args)


# ============== Helper Functions ==============

def render(template, path):
    """
    Called by our Flask app when a new page is loaded. Renders corresponding HTML document
    :param template: string, name of the HTML document to be rendered
    :param path: string, path of this document
    :param logo_menu: company logo to be displayed on front page in the menu bar
    :param logo_footer: company logo to be displayed on front page in footer
    :return: Flask.render_template, corresponds to the passed in parameters
    """

    my_logger.info('Rendering page: ' + template)

    logo = ''

    if default_settings["company_logo"] != '':
        logo = '/static/uploads/' + default_settings["company_logo"]

    return render_template(template, app_name='AL Device Audit', menu=create_menu(path), user_js='admin',
                           logo=logo)


def allowed_file(filename):
    return '.' in filename and \
           filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS


def get_vm_state():
    """
    Called within the vm_refresh function whenever we want to check the state of the virtual machine (ie. running,
    poweroff, saved, etc)
    :return: String; the current state of the VM
    """

    vm_info = str(subprocess.check_output(['VBoxManage', 'showvminfo', '--machinereadable', 'alda_sandbox']))
    vm_state = re.search('.*VMState="(.*)"', vm_info).group(1)
    return vm_state


def vm_refresh():
    """
    Called when front end wants to turn off or restart the virtual machine running our scrape application
    :return:
    """

    global default_devices, accepting_devices

    # Tells front end that the VM is currently refreshing
    socketio.emit('vm_refreshing', True)

    accepting_devices = False

    # If our VM is not currently turned off, then we use VBoxManage to turn it off
    if get_vm_state() == 'running':
        subprocess.call(['VBoxManage', 'controlvm', 'alda_sandbox', 'poweroff'])
        my_logger.info('Powering off VM')

    # Waits until the VM has been successfully been turned off
    while get_vm_state() == 'running':
        time.sleep(1)
        pass

    time.sleep(1)

    # Restores the default snapshot of our VM
    subprocess.call(['VBoxManage', 'snapshot', 'alda_sandbox', 'restore', 'alda_clean'])
    my_logger.info('Restoring VM snapshot')

    # Waits until the snapshot has successfully been restored
    while get_vm_state() != 'saved':
        time.sleep(1)
        pass

    time.sleep(1)

    while True:

        # Tries to start our VM
        try:
            subprocess.call(['VBoxManage', 'startvm', 'alda_sandbox', '--type', 'headless'])
            break
        # If unsuccessful, logs an error
        except Exception as e:
            my_logger.error('Error starting VM: ' + str(e))
            my_logger.error('Retrying....')
            time.sleep(2)

            # Tries to start VM again, this time with an emergency stop in case the VM still has some process running
            try:
                subprocess.call(
                    ['VBoxManage', 'startvm', 'alda_sandbox', '--type', 'headless', '--type', 'emergencystop'])
                break
            # If unsuccessful, logs an error before trying to connect again normally
            except Exception as e2:
                my_logger.error('Error starting VM: ' + str(e))
                my_logger.error('Retrying....')
                time.sleep(2)

    # Detect which devices are attached to our host machine by default
    default_devices = find_default_devices()

    # Tells front end that VM has finished refreshing
    my_logger.info('Starting VM')


def find_default_devices():
    """
    Called by our refresh_vm function after removing all usb filters. The user is told to remove all devices while the
    VM is refreshing, so we can assume for the duration of the refresh_vm function the only devices that are attached
    are those that are always attached to the host by default (if any). Thus we put these in a list for later when we
    start listening for new devices.
    :return:
    """

    devices_found = []

    connected_devices = str(subprocess.check_output(['VBoxManage', 'list', 'usbhost']))
    connected_devices = connected_devices.splitlines()
    for line in connected_devices:
        output = re.search('UUID:\s*(.*)', line)
        if output is not None:
            devices_found.append(output.group(1).strip())

    return devices_found


def detect_new_device():
    """
    Thread that starts when our VM has successfully finished refreshing. At this point the VM is ready to receive a new
    device, so we start checking for new devices attached to our host machine. If one is detected, attaches it to the
    VM and prevents any more from becoming attached. Once a device is attached, no more are accepted by the VM until it
    is refreshed following device removal.
    :return:
    """

    global accepting_devices

    my_logger.info('Listening for new devices... ')

    while accepting_devices:

        # Checks if a session is still in progress. This check is made for when a device is removed, but the user
        # remains on the results page for a little while. In this case, the VM could finish refreshing in the
        # background and thus accepting_devices would be true, but we do not want the VM to pick up a new device just
        # yet as the front end is not in a state to properly guide the user. This way our loop keeps running but
        # doesn't attach new devices until the 'New Session' button has been pressed, and the front end is back to it's
        # starting state
        if not session_in_progress:

            # Gets all devices that are currently connected to host
            connected_devices = str(subprocess.check_output(['VBoxManage', 'list', 'usbhost']))
            connected_devices = connected_devices.splitlines()

            for line in connected_devices:

                # Finds the UUID for each device
                output = re.search('UUID:\s*(.*)', line)
                if output is not None:
                    output = output.group(1).strip()
                    found_new_device = True

                    # Goes through the list of devices that are attached to the host by default, as determined when the
                    # VM was refreshing. If a device is present that is not in this list, we know we have a new device.
                    for device in default_devices:
                        if output == device:
                            found_new_device = False

                    # If we find a new device, attaches it to our VM and prevents any more devices from attaching
                    if found_new_device and accepting_devices:
                        subprocess.call(['VBoxManage', 'controlvm', 'alda_sandbox', 'usbattach', output])
                        my_logger.info('Attached: ' + str(output))
                        accepting_devices = False

        time.sleep(1)

    my_logger.info('Stopped listening for devices')


def convert_dots(input_str):
    """
    Takes in a string and returns a string of dots of the same length
    :param input_str: string, to be converted to dots
    :return: string, a bunch of dots
    """

    if len(input_str) != 0:
        return_str = ''
        for letter in input_str:
            return_str = return_str + '.'
        return return_str
    else:
        return ''


def get_detailed_info(terminal, file_info):
    """
    Retrieves file details from Assemblyline server corrseponding to a given sid
    :param terminal: Client, Assemblyline Client object
    :param file_info: dict, contains basic file details
    :return: dict, contains file details
    """

    details = {}

    try:
        details = terminal.submission.full(file_info['sid'])
    except ClientError as e:
        my_logger.error("Error - Cannot find submission details for given SID:\r\n" + str(e))

    details['name'] = file_info['name']
    details['score'] = file_info['score']
    details['sid'] = file_info['sid']

    # Before being submitted to the server, each file from our device is copied into a temporary folder. The statement
    # below strips the first part of the path (ie. the part that references the location of this temporary folder) so
    # that the path of this file matches what it would be on the device
    details['path'] = file_info['path'][file_info['path'].find('temp_device') + 11:]

    return details


def email_alert(mal_files):
    """
    Sends email alert to all addresses in the recipients list
    :param mal_files: list, all files that were flagged
    :return:
    """

    global default_settings

    # Only sends if there is at least one recipient, and if email alerts have been turned on
    if len(default_settings['recipients']) > 0 and len(mal_files) > 0 and default_settings['email_alerts']:

        # Constructs message
        msg = MIMEMultipart()
        msg['From'] = default_settings['smtp_username']
        msg['To'] = ', '.join(default_settings['recipients'])
        msg['X-Priority'] = '2'
        msg['Subject'] = 'Assemblyline Kiosk Alert: Malicious files detected on device'

        body = 'Alert generated by (' + default_settings['terminal'] + ') at: ' + \
               arrow.now().format('YYYY-MM-DD HH:mm') + '\r\n'

        body += '\r\n-- Session Details: ' + '\r\n'
        for credential in session_credentials:
            body += credential['name'] + ': ' + credential['value'] + '\r\n'

        body += '\r\n-- Flagged Files: ' + '\r\n'
        for item in mal_files:
            body += 'Filename: ' + item['submission']['metadata']['filename'] + '\r\n'
            body += 'SSID: ' + str(item['submission']['sid']) + '\r\n'
            body += 'Score: ' + str(item['submission']['max_score']) + '\r\n'
            body += '\r\n'

        msg.attach(MIMEText(body, 'plain'))

        # Tries to connect to SMTP server and send message using credentials from settings screen
        try:
            server = smtplib.SMTP(default_settings['smtp_server'], 587)
            server.starttls()
            server.login(default_settings['smtp_username'], default_settings['smtp_password'])
            text = msg.as_string()
            server.sendmail(default_settings['smtp_username'], default_settings['recipients'], text)
            server.quit()
            my_logger.info('Email alert successfully sent')
        except Exception as e:
            my_logger.error('Error sending email alert: ' + str(e))


def db_clear_saved():
    """
    Clears previously saved entries from our DB. Only targets entries where setting_id = 2, as these are saved entries.
    Entries with setting_id = 1 are default values for when no saved entry is present.
    :return:
    """

    try:
        db = sqlite3.connect('settings_db')
        cursor = db.cursor()
    except Exception as e:
        my_logger.error('Error connecting to database: ' + str(e))
        cursor = None

    if cursor is not None:
        try:
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
            my_logger.info('Successfully cleared previous database values')

        except Exception as e:
            my_logger.error('Error clearing previous database values: ' + str(e))


def db_save(new_settings, default_smtp_pw_reuse):
    """
    Encrypts and saves new settings to our DB
    :param new_settings: dict, new settings as determined by admin in settings page of front end
    :param default_smtp_pw_reuse: boolean, represents whether or not we should use same SMTP password
    :return:
    """

    global default_settings

    try:
        db = sqlite3.connect('settings_db')
        cursor = db.cursor()
    except Exception as e:
        my_logger.error('Error connecting to database: ' + str(e))
        cursor = None

    if cursor is not None:

        # If new passwords have not been provided then old passwords are reused
        if new_settings['user_pw'] == '':
            new_settings['user_pw'] = default_settings['user_pw']
        if default_smtp_pw_reuse or not new_settings['email_alerts']:
            new_settings['smtp_password'] = default_settings['smtp_password']

        # If a new picture hasn't been chosen, use the old picture
        if new_settings['company_logo'] == '':
            new_settings['company_logo'] = default_settings['company_logo']

        # -- Settings table
        try:
            cursor.execute("""
            INSERT INTO setting(setting_id, setting_name, user_id, user_pw, terminal, al_address, al_username, 
            al_api_key, email_alerts, smtp_server, smtp_port, smtp_username, smtp_password, company_logo, 
            kiosk_footer, pass_message, fail_message, error_timeout, error_removal)
              VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)
            """, (2,
                  cipher_suite.encrypt(b'SAVED'),
                  cipher_suite.encrypt(bytes(new_settings['user_id'])),
                  cipher_suite.encrypt(bytes(new_settings['user_pw'])),
                  cipher_suite.encrypt(bytes(new_settings['terminal'])),
                  cipher_suite.encrypt(bytes(new_settings['al_address'])),
                  cipher_suite.encrypt(bytes(new_settings['al_username'])),
                  cipher_suite.encrypt(bytes(new_settings['al_api_key'])),
                  cipher_suite.encrypt(bytes(int(new_settings['email_alerts']))),
                  cipher_suite.encrypt(bytes(new_settings['smtp_server'])),
                  cipher_suite.encrypt(bytes(new_settings['smtp_port'])),
                  cipher_suite.encrypt(bytes(new_settings['smtp_username'])),
                  cipher_suite.encrypt(bytes(new_settings['smtp_password'])),
                  cipher_suite.encrypt(bytes(new_settings['company_logo'])),
                  cipher_suite.encrypt(bytes(new_settings['kiosk_footer'])),
                  cipher_suite.encrypt(bytes(new_settings['pass_message'])),
                  cipher_suite.encrypt(bytes(new_settings['fail_message'])),
                  cipher_suite.encrypt(bytes(new_settings['error_timeout'])),
                  cipher_suite.encrypt(bytes(new_settings['error_removal'])),
                  ))
        except Exception as e:
            my_logger.error('Error writing to setting table: ' + str(e))
            return

        # -- Recipients table
        recipients = []
        i = 1
        for recipient in new_settings['recipients']:
            recipients.append((i, cipher_suite.encrypt(bytes(recipient)), 2))
            i += 1
        try:
            cursor.executemany("""
            INSERT INTO recipient(recipient_id, recipient_address, setting_id)
              VALUES(?,?,?)
            """, recipients)
        except Exception as e:
            my_logger.error('Error writing to result table: ' + str(e))
            return

        # -- Credentials table
        credentials = []
        i = 5
        for credential in new_settings['credential_settings']:
            cred_name = credential['name']
            cred_active = credential['active']
            cred_mandatory = credential['mandatory']
            credentials.append((i, cipher_suite.encrypt(bytes(cred_name)),
                                cipher_suite.encrypt(bytes(int(cred_active))),
                                cipher_suite.encrypt(bytes(int(cred_mandatory))), 2))
            i += 1
        try:
            cursor.executemany("""
            INSERT INTO credential(credential_id, credential_name, active, mandatory, setting_id)
              VALUES(?,?,?,?,?)
            """, credentials)
        except Exception as e:
            my_logger.error('Error writing to credential table: ' + str(e))
            return

        # -- Results table
        results = []
        i = 8
        for result in new_settings['results_settings']:
            result_type = cipher_suite.encrypt(bytes(result))
            result_active = cipher_suite.encrypt(bytes(int(new_settings['results_settings'][result])))
            results.append((i, result_type, result_active, 2))
            i += 1
        try:
            cursor.executemany("""
            INSERT INTO result(result_id, result_type, active, setting_id)
              VALUES(?,?,?,?)
            """, results)
        except Exception as e:
            my_logger.error('Error writing to result table: ' + str(e))
            return

        db.commit()
        db.close()

        default_settings = new_settings
        my_logger.info('New settings successfully saved to database')


if __name__ == '__main__':
    socketio.run(app, threaded=True)
