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
        self.log.info("test info")

    @staticmethod
    def runcmd(cmdline, shell=True, raise_on_error=True, piped_stdio=True, silent=False, cwd=None):
        return _runcmd(cmdline, shell, raise_on_error, piped_stdio, silent=silent, cwd=cwd)

    def milestone(self, s):
        self.log.info(green(s))

    def sudo_apt_get(self, packages):
        cmd_line = ['sudo', 'DEBIAN_FRONTEND=noninteractive', 'apt-get', '-y', '-q']
        # cmd_line = ['sudo', 'apt-get', '-y']

        if isinstance(packages, list):
            cmd_line.extend(packages)
            for p in packages:
                self.milestone('.....apt :' + p)
        else:
            cmd_line.append(packages)
            self.milestone('.....apt :' + packages)
        (_, _, _) = self.runcmd(cmd_line, shell=False)

    def sudo_apt_get_install(self, packages):
        cmd_line = ['sudo', 'DEBIAN_FRONTEND=noninteractive', 'apt-get', '-y', '-q', 'install']
        # cmd_line = ['sudo', 'apt-get', '-y']

        if isinstance(packages, list):
            cmd_line.extend(packages)
            for p in packages:
                self.milestone('.....apt install:' + p)
        else:
            cmd_line.append(packages)
            self.milestone('.....apt install:' + packages)
        (_, _, _) = self.runcmd(cmd_line, shell=False)

    def sign_kernal_mods(self):

        self.milestone('.....signing kernal modules')

        (_, _, _) = self.runcmd('openssl req -new -x509 -newkey rsa:2048 -keyout MOK.priv -outform DER -out '
                                'MOK.der -nodes -days 36500 -subj "/CN=Descriptive common name/"')
        (_, _, _) = self.runcmd('sudo /usr/src/linux-headers-$(uname -r)/scripts/sign-file sha256 ./MOK.priv '
                                './MOK.der $(modinfo -n vboxdrv)')
        self.log.info(green('\r\n\r\nWhen this script is finished running, you must perform the following steps for '
                            'VirtualBox to run properly: reboot > "Perform MDK Management" > "Enroll MDK" > Continue '
                            '> "Enroll Key" > ') +
                      red('enter your password') +
                      green(' > reboot. Below you must choose the password you will use during this process (this '
                            'password will only need to be entered once, and does need to be remembered after the the '
                            'MDK has been enrolled)\r\n'))
        (_, _, _) = self.runcmd('sudo mokutil --import MOK.der', piped_stdio=False)

