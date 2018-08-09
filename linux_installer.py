import subprocess
import re


def start():
    print 'Welcome to Assemblyline Device Audit linux installer'

    linux_dist = ''

    try:
        linux_dist = str(subprocess.check_output(['cat', '/etc/*-release']))
    except Exception as e:
        print '  Error identifying Linux distribution:'
        print '    ' + str(type(e)) + ': ' + str(e)
        exit(1)

    linux_dist_name = re.search('.*NAME="(.*)"', linux_dist).group(1)
    linux_dist_vers = re.search('.*VERSION_ID="(.*)"', linux_dist).group(1)

    if linux_dist_name != 'Ubuntu' or linux_dist_vers != '16.04':
        print 'Warning: the recommended Linux distribution for AL Device Audit is Ubuntu 16.04.x (your current ' \
              'version is ' + linux_dist_name + ' ' + linux_dist_vers + ')'
        print 'Would you like to continue? (y/n)'


if __name__ == '__main__':
    start()
