# Overview

Assemblyline Device Audit (al_da) is a web application that runs in conjunction with the Assemblyline Scrape (al_scrape) 
back end service. These applications are intended to be run on a single terminal (Kiosk), into which users can
attach block devices in order to have their contents scraped and submitted to a remote Assemblyline server for 
analysis.

Assemblyline Device Audit is a Flask-Socketio application that hosts a web server for our HTML/CSS/JS front end scripts,
and also hosts a socketio server to facilitate communication between these scripts and our back end
al_scrape service. The machine on which Assemblyline Device Audit is installed should be the same machine that hosts
the VirtualBox VM on which al_scrape is running. Assemblyline Device Audit's purpose is as follows:

1. Set up Flask web server
2. Set up socketio web socket server
3. Display interactive front end UI to prompt user through scan process (HTML, CSS, Angular JS)
4. Output results from al_scrape to user
5. If desired, send email alerts to network administration

# Installation

### Pre-requisites

- Host machine should ideally be running fresh Ubuntu 16.04.x Desktop install. Other versions of Ubuntu should also 
work but have not been tested

### Download Al_da repo

- `sudo apt-get update`
- `sudo apt-get -y upgrade`
- `cd /opt`
- `sudo git clone https://github.com/RobbieEarle/al_da.git`

### Set up VirtualBox

- `python /opt/al_da/install/install_vbox.py`
- Reboot, perform MDK management, enroll MDK, continue, enroll key, enter pw, reboot

### Install al_scrape

At this point we are ready to install our al_scrape back end service. Please follow the instructions found 
[here](https://github.com/RobbieEarle/al_scrape) in their entirety before continuing

### Allow al_scrape to detect USB devices

- Close VirtualBox entirely
- `sudo adduser $USER vboxusers`
- Log out and log back in again
- Open VirtualBox
- Select alda_sandbox and go to Machine > Settings > USB
- Check "Enable USB Controller" and click "USB 2.0"
- Right click in the "USB Device Filters" box and select "Add Empty Filter"
- Right click your new filter and go to "Edit Filter"
- Rename your filter all_devices
- Click "Ok" to exit

### Install al_da

- `python /opt/al_da/install/install_alda.py`

### Done

The application runs by default on port 5000 of localhost: [http://127.0.0.1:5000/](http://127.0.0.1:5000/)

# Using Assemblyline Device Audit

### Scanning

Scanning a device is fairly straight forward as the user will be guided with simple instructions throughout the process.
Simply:

1. Wait for the VM to refresh (if necessary)
2. Plug in a block device
3. Wait for al_da to connect to the Assemblyline server
4. Enter user credentials (if necessary) and click start scan
5. Wait for scan to complete
6. View results

All files are submitted to the remote Assemblyline server specified in the Settings page. Email alerts can also be
enabled from the Settings page for when potentially malicious files are detected.

### Settings

Default username: admin

Default password: changeme

From the Settings page we are currently able to:

- Set the account settings for this kiosk (ie. username and password required to access the settings page in the future)
- Set the name of this kiosk (this name will be appended to each scanned file on the remote AL server, so that in the 
event of an alert, network admin can identify which kiosk the file originated from)
- Configure remote Assemblyline server details
- Set up email alerts:
    - Toggle alerts
    - Add / remove alert recipients
    - Configure SMTP server details
- Control what credentials must be given by user prior to scanning
- Control the level of detail the user is able to see from the scan results