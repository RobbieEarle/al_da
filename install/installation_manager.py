import subprocess
import logging
import sys

logging.basicConfig(stream=sys.stderr, level=logging.INFO)


def green(st):
    prefix = '\x1b[' + '32m'
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

    def sudo_apt_get(self, packages):
        # args = ['sudo', 'DEBIAN_FRONTEND=noninteractive', 'apt-get', '-y', '-q', 'install']
        args = ['sudo', 'apt-get', '-y', 'install']

        print isinstance(packages, list)
        # cmd_line = apt_args