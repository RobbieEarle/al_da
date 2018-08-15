from installation_manager import Installer
import platform


def start():
    print
    print 'Welcome to Assemblyline Device Audit linux installer'

    cur_os = platform.system().lower()

    if 'linux' in cur_os:

        installer = Installer('install_alda')
        installer.setup_logging(cur_os)

    else:
        print
        print 'Error: Assemblyline Device Audit is not supported on Windows or Mac OS X at the moment'
        exit(1)


if __name__ == '__main__':
    start()
