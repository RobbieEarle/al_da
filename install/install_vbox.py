from installation_manager import Installer


def start():

    installer = Installer('install_vbox')

    packages = ['virtualbox', 'virtualbox-dkms', 'virtualbox-ext-pack', 'linux-headers-generic']
    installer.sudo_apt_get_install(packages)
    installer.sign_kernal_mods()


if __name__ == '__main__':
    start()
