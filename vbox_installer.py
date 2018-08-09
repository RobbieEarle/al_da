import subprocess

try:
    # subprocess.call(['sudo', 'apt-get', 'install', 'virtualbox'])
    subprocess.call(['sudo', 'apt-get', 'update'])
except Exception as e:
    print "  Error installing VirtualBox: " + str(e)
    print '    ' + str(type(e)) + ': ' + str(e)
    exit(1)

# os.system('sudo apt-get install virtualbox-dkms')
# os.system('sudo apt-get install virtualbox-ext-pack')
# os.system('sudo apt-get install linux-headers generic')


