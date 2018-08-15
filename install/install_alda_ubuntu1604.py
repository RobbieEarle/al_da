import subprocess
import re
import platform


def start():
    print
    print 'Welcome to Assemblyline Device Audit linux installer'

    print platform.system().lower()

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
    #
    # # linux_dist_name = "Ubuntu"
    # # linux_dist_vers = "18.04"
    #
    # if linux_dist_name != 'Ubuntu' or linux_dist_vers != '16.04':
    #     print
    #     print '  Warning: the recommended Linux distribution for AL Device Audit is Ubuntu 16.04.x (your current ' \
    #           'version is ' + linux_dist_name + ' ' + linux_dist_vers + ')'
    #
    #     while True:
    #         user_input = raw_input('  Would you like to continue? (y/n) ')
    #         user_result = check_input(user_input)
    #         if not user_result:
    #             exit(1)
    #         elif user_result == 1:
    #             break
    #         else:
    #             print '    Error: please enter y or n'
    #             print


def check_input(user_input):
    if user_input == 'y' or user_input == 'yes' or user_input == 'Y' or user_input == 'Yes':
        return 1
    elif user_input == 'n' or user_input == 'no' or user_input == 'N' or user_input == 'No':
        return 0
    else:
        return -1


if __name__ == '__main__':
    start()
