import subprocess


def start():
    try:
        subprocess.call(['sudo', 'apt-get', 'install', 'virtualbox'])
    except Exception as e:
        print "  Error installing virtualbox: " + str(e)
        print '    ' + str(type(e)) + ': ' + str(e)
        exit(1)

    try:
        subprocess.call(['sudo', 'apt-get', 'install', 'virtualbox-dkms'])
    except Exception as e:
        print "  Error installing virtualbox-dkms: " + str(e)
        print '    ' + str(type(e)) + ': ' + str(e)
        exit(1)

    try:
        subprocess.call(['sudo', 'apt-get', 'install', 'virtualbox-ext-pack'])
    except Exception as e:
        print "  Error installing virtualbox-ext-pack: " + str(e)
        print '    ' + str(type(e)) + ': ' + str(e)
        exit(1)

    try:
        subprocess.call(['sudo', 'apt-get', 'install', 'linux-headers-generic'])
    except Exception as e:
        print "  Error installing generic linux-headers: " + str(e)
        print '    ' + str(type(e)) + ': ' + str(e)
        exit(1)

    try:
        subprocess.call(['openssl', 'req', '-new', '-x509', '-newkey', 'rsa:2048', '-keyout', 'MOK.priv', '-outform',
                         'DER', '-out', 'MOK.der', '-nodes', '-days', '36500', '-subj', '"/CN=al_scrape/"'])
        subprocess.call(['sudo', '/usr/src/linux-headers-$(uname -r)/scripts/sign-file', 'sha256', './MOK.priv',
                         './MOK.der', '$(modinfo -n vboxdrv)'])
    except Exception as e:
        print "  Error signing kernel modules: " + str(e)
        print '    ' + str(type(e)) + ': ' + str(e)
        exit(1)


if __name__ == '__main__':
    start()
