import subprocess
import re


def start():
    
    print
    print 'Welcome to Assemblyline Device Audit linux installer'

    # linux_dist = ''
    #
    # try:
    #     linux_dist = str(subprocess.check_output(['cat', '/etc/os-release']))
    # except Exception as e:
    #     print '  Error identifying Linux distribution:'
    #     print '    ' + str(type(e)) + ': ' + str(e)
    #     exit(1)
    #
    # linux_dist_name = re.search('.*NAME="(.*)"', linux_dist).group(1)
    # linux_dist_vers = re.search('.*VERSION_ID="(.*)"', linux_dist).group(1)

    linux_dist_name = "Ubuntu"
    linux_dist_vers = "18.04"

    if linux_dist_name != 'Ubuntu' or linux_dist_vers != '16.04':
        print
        print '  Warning: the recommended Linux distribution for AL Device Audit is Ubuntu 16.04.x (your current ' \
              'version is ' + linux_dist_name + ' ' + linux_dist_vers + ')'

        while True:
            user_input = raw_input('  Would you like to continue? (y/n) ')
            if user_input == 'n':
                exit(1)
            elif user_input == 'y':
                break
            else:
                print '    Error: invalid input (must be y or n)'
                print


if __name__ == '__main__':
    start()
