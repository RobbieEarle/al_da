from installation_manager import Installer
import platform


def start():
    cur_os = platform.system().lower()

    if 'linux' in cur_os:

        installer = Installer('install_alda')
        # installer.setup_logging(cur_os)
        # installer.sudo_apt_get_install([
        #     'python2.7',
        #     'python-pip'
        # ])
        #
        # installer.sudo_pip_install([
        #     'flask==1.0.2',
        #     'flask-socketio==3.0.1',
        #     'flask-cors==3.0.6',
        #     'eventlet==0.23.0',
        #     'assemblyline-client==3.7.3',
        #     'cryptography==2.3',
        #     'email==4.0.2',
        #     'flask-httpauth==3.2.4',
        #     'arrow==0.12.1'
        # ])

        installer.make_service()

    else:
        print
        print 'Error: Assemblyline Device Audit is not supported on Windows or Mac OS X at the moment'
        exit(1)


if __name__ == '__main__':
    start()
