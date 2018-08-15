import subprocess
import os
from installation_manager import Installer


def start():

    installer = Installer('install_vbox')

    packages = ['virtualbox', 'virtualbox-dkms', 'virtualbox-ext-pack', 'linux-headers-generic']
    installer.sudo_apt_get_install(packages)
    installer.sign_kernal_mods()

    installer.milestone('\r\n\r\nPassword has been successfully set. Please enter "sudo reboot" now and follow these '
                        'steps when prompted: "Perform MDK Management" > "Enroll MDK" > Continue '
                        '> "Enroll Key" > enter your password > reboot\r\n\r\n')


if __name__ == '__main__':
    start()
