# Overview

Assemblyline Device Audit (al_da) is a web application that runs in conjunction with the Assemblyline Scrape (al_scrape) 
back end script. These applications are intended to be run on a single terminal (Kiosk), into which users can
attach block devices in order to have their contents scraped and submitted to a remote Assemblyline server for 
analysis.

Assemblyline Device Audit is a Flask-Socketio application that hosts our HTML/CSS/JS scripts for the 
application front end, and hosts a socketio server to facilitate communication between these scripts and our back end
al_scrape script. The machine on which Assemblyline Device Audit is installed should be the same machine that hosts
the VirtualBox VM on which al_scrape is running. Assemblyline Device Audit's purpose is as follows:

1. Set up Flask web server
2. Set up socketio web socket server
3. Display interactive front end UI to prompt user through scan process (HTML, CSS, Angular JS)
4. Output results from al_scrape to user
5. If desired, send email alerts to network administration

**NOTE: Currently in the process of making an installation script that will simplify the installation process. In the
meantime the following steps can be followed to get al_scrape working for code review*

# Installation

## Pre-requisites

- Host machine should be running fresh Ubuntu 16.04.x Desktop install

### Set up VirtualBox

##### Installing VirtualBox

- `sudo apt-get update`
- `sudo apt-get upgrade`
- `sudo apt-get install virtualbox`
- `sudo apt-get install virtualbox-dkms`
- `sudo apt-get install virtualbox-ext-pack`
- `sudo apt-get install linux-headers generic`

##### Signing kernel modules

- `openssl req -new -x509 -newkey rsa:2048 -keyout MOK.priv -outform DER -out MOK.der -nodes -days 36500 -subj 
"/CN=al_scrape/"`
- `sudo /usr/src/linux-headers-$(uname -r)/scripts/sign-file sha256 ./MOK.priv ./MOK.der $(modinfo -n vboxdrv)`
- `tail $(modinfo -n vboxdrv) | grep "Module signature appended"`
- `sudo mokutil --import MOK.der"`
- `mokutil --test-key MOK.der`
- Reboot, perform MDK management, enroll MDK, continue, enroll key, enter pw, reboot

### Install al_scrape

At this point we are ready to install our al_scrape back end service. Please follow the instructions found 
[here](https://github.com/RobbieEarle/al_scrape) in their entirety before continuing.

### Allow al_scrape to detect USB devices

- Close VirtualBox
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

**Install dependencies**

- `sudo mkdir /var/log/al_da_kiosk`
- `sudo chmod 661 /var/log/al_da_kiosk`
- `sudo apt install python2.7 python-pip`
- `sudo pip install flask==1.0.2`
- `sudo pip install flask-socketio==3.0.1`
- `sudo pip install flask-cors==3.0.6`
- `sudo pip install eventlet==0.23.0`
- `sudo pip install assemblyline-client==3.7.3`
- `sudo pip install cryptography==2.3`
- `sudo pip install email==4.0.2`
- `sudo pip install flask-httpauth==3.2.4`
- `sudo pip install arrow==0.12.1`

**Install al_da**

- `cd ~`
- `sudo git clone https://github.com/RobbieEarle/al_da.git`

### Done

To start receiving devices simply:

- `cd ~/al_da/ui`
- `set FLASK_APP=app.py`
- `flask run`

The application runs by default on port 5000 of localhost: [http://127.0.0.1:5000/](http://127.0.0.1:5000/)