import subprocess
import os
from install import Installer


def start():

    installer = Installer()

    # try:
    #     subprocess.call(['sudo', 'apt-get', 'install', 'virtualbox'])
    # except Exception as e:
    #     print "  Error installing virtualbox: " + str(e)
    #     print '    ' + str(type(e)) + ': ' + str(e)
    #     exit(1)
    #
    # try:
    #     subprocess.call(['sudo', 'apt-get', 'install', 'virtualbox-dkms'])
    # except Exception as e:
    #     print "  Error installing virtualbox-dkms: " + str(e)
    #     print '    ' + str(type(e)) + ': ' + str(e)
    #     exit(1)
    #
    # try:
    #     subprocess.call(['sudo', 'apt-get', 'install', 'virtualbox-ext-pack'])
    # except Exception as e:
    #     print "  Error installing virtualbox-ext-pack: " + str(e)
    #     print '    ' + str(type(e)) + ': ' + str(e)
    #     exit(1)
    #
    # try:
    #     subprocess.call(['sudo', 'apt-get', 'install', 'linux-headers-generic'])
    # except Exception as e:
    #     print "  Error installing generic linux-headers: " + str(e)
    #     print '    ' + str(type(e)) + ': ' + str(e)
    #     exit(1)
    #
    # os.system('openssl req -new -x509 -newkey rsa:2048 -keyout MOK.priv -outform DER -out MOK.der -nodes -days '
    #           '36500 -subj "/CN=Descriptive common name/"')
    # os.system('sudo /usr/src/linux-headers-$(uname -r)/scripts/sign-file sha256 ./MOK.priv ./MOK.der $(modinfo '
    #           '-n vboxdrv)')
    # os.system('sudo mokutil --import MOK.der')

    # NEXT : Prompt user to restart their machine


if __name__ == '__main__':
    start()
