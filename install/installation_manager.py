import subprocess
import logging
import sys

logging.basicConfig(stream=sys.stderr, level=logging.INFO)


def green(st):
    prefix = '\x1b[' + '32m'
    suffix = '\x1b[0m'
    return prefix + st + suffix


def red(st):
    prefix = '\x1b[' + '31m'
    suffix = '\x1b[0m'
    return prefix + st + suffix


def _runcmd(cmdline, shell=True, raise_on_error=True, piped_stdio=True, silent=False, cwd=None):

    if not silent:
        if not cwd:
            print "Running: %s" % cmdline
        else:
            print "Running: %s (%s)" % (cmdline, cwd)

    if piped_stdio:
        p = subprocess.Popen(cmdline, stdout=subprocess.PIPE, stderr=subprocess.PIPE, shell=shell, cwd=cwd)
    else:
        p = subprocess.Popen(cmdline, shell=shell, cwd=cwd)

    stdout, stderr = p.communicate()
    rc = p.returncode
    if raise_on_error and rc != 0:
        raise Exception("FAILED: return_code:%s\nstdout:\n%s\nstderr:\n%s" % (rc, stdout, stderr))
    return rc, stdout, stderr


class Installer(object):

    def __init__(self, session_name):
        self.log = logging.getLogger(session_name)

    @staticmethod
    def runcmd(cmdline, shell=True, raise_on_error=True, piped_stdio=True, silent=False, cwd=None):
        return _runcmd(cmdline, shell, raise_on_error, piped_stdio, silent=silent, cwd=cwd)

    def milestone(self, s):
        self.log.info(green(s))

    def fatal(self, s):
        self.log.error(red(s))

    def sudo_apt_get_install(self, packages):
        cmd_line = ['sudo', 'DEBIAN_FRONTEND=noninteractive', 'apt-get', '-y', '-q', 'install']

        if isinstance(packages, list):
            cmd_line.extend(packages)
            for package in packages:
                self.milestone('.....apt install:' + package)
        else:
            cmd_line.append(packages)
            self.milestone('.....apt install:' + packages)
        (_, _, _) = self.runcmd(cmd_line, shell=False)

    def sudo_pip_install(self, modules):
        cmd_line = ['sudo', '-H', 'pip', 'install']

        if isinstance(modules, list):
            cmd_line.extend(modules)
            for module in modules:
                self.milestone('.....pip install:' + module)
        else:
            cmd_line.append(modules)
            self.milestone('.....pip install:' + modules)
        (_, _, _) = self.runcmd(cmd_line, shell=False)

    def sign_kernal_mods(self):

        self.milestone('.....signing kernal modules')

        self.runcmd('openssl req -new -x509 -newkey rsa:2048 -keyout MOK.priv -outform DER -out '
                    'MOK.der -nodes -days 36500 -subj "/CN=virtualbox/"')
        self.runcmd('sudo /usr/src/linux-headers-$(uname -r)/scripts/sign-file sha256 ./MOK.priv '
                    './MOK.der $(modinfo -n vboxdrv)')

        self.log.info(green('\r\n\r\nWhen this script is finished running, you must perform the following steps for '
                            'VirtualBox to run properly: reboot > "Perform MDK Management" > "Enroll MDK" > Continue '
                            '> "Enroll Key" > ') +
                      red('enter your password') +
                      green(' > reboot. Below you must choose the password you will use during this process (this '
                            'password will only need to be entered once, and does need to be remembered after the the '
                            'MDK has been enrolled)\r\n'))

        try:
            self.runcmd('sudo mokutil --import MOK.der', piped_stdio=False)
            self.milestone('\r\n\r\nPassword has been successfully set. Please enter "sudo reboot" now and follow '
                           'these steps when prompted: "Perform MDK Management" > "Enroll MDK" > Continue > '
                           '"Enroll Key" > enter your password > reboot\r\n')
        except Exception as e:
            self.fatal('\r\n\r\nError setting password. Please try again')

    def setup_logging(self, cur_os):

        if 'linux' in cur_os:
            self.milestone('.....creating logging directory:')
            self.runcmd('sudo mkdir /var/log/al_da_kiosk')
            self.runcmd('sudo chmod 777 /var/log/al_da_kiosk')

    def make_service(self):
        self.milestone('.....registering Flask server as a service')
        self.runcmd('sudo cp /opt/al_da/install/flask.service /lib/systemd/system/flask.service')
        self.runcmd('sudo systemctl daemon-reload', piped_stdio=False)
        self.runcmd('sudo systemctl enable flask.service')
        self.runcmd('sudo systemctl start flask.service')
