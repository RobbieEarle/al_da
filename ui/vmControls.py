import subprocess
import time

# p = subprocess.call('"C:\Program Files\Oracle\VirtualBox\VBoxManage.exe" controlvm sandbox poweroff')
# p = subprocess.call('"C:\Program Files\Oracle\VirtualBox\VBoxManage.exe" snapshot sandbox restore Default')
# # p = subprocess.call('"C:\Program Files\Oracle\VirtualBox\VBoxManage.exe" discardstate sandbox')
# p = subprocess.call('"C:\Program Files\Oracle\VirtualBox\VBoxManage.exe" startvm sandbox --type headless')


# p = subprocess.Popen('"C:\Program Files\Oracle\VirtualBox\VBoxManage.exe" controlvm sandbox poweroff',
#                 stdout=subprocess.PIPE,
#                 stderr=subprocess.PIPE)
# for line in p.stdout:
#     print line
# p.communicate()
#
# p = subprocess.Popen('"C:\Program Files\Oracle\VirtualBox\VBoxManage.exe" snapshot sandbox restore Default',
#                 stdout=subprocess.PIPE,
#                 stderr=subprocess.PIPE)
# for line in p.stdout:
#     print line
# p.communicate()

p = subprocess.Popen('"C:\Program Files\Oracle\VirtualBox\VBoxManage.exe" startvm sandbox --type headless',
                stdout=subprocess.PIPE,
                stderr=subprocess.PIPE)
for line in p.stdout:
    print line
p.communicate()


# p = subprocess.Popen('"C:\Program Files\Oracle\VirtualBox\VBoxManage.exe" list vms',
#                 stdout=subprocess.PIPE,
#                 stderr=subprocess.PIPE)
# for line in p.stdout:
#     print line
# p.communicate()


# result = []
# win_cmd = 'VBoxManage controlvm ui-al_devVM poweroff'
# win_cmd = '"C:\Program Files\Oracle\VirtualBox\VBoxManage.exe" controlvm ui-al_devVM poweroff'
# win_cmd = '"C:\Program Files\Oracle\VirtualBox\VBoxManage.exe" startvm ui-al_devVM'
# win_cmd = '"C:\Program Files\Oracle\VirtualBox\VBoxManage.exe" startvm ui-al_devVM --type headless'
# win_cmd = '"C:\Program Files\Oracle\VirtualBox\VBoxManage.exe" snapshot ui-al_devVM restore Default'


# p = subprocess.call('"C:\Program Files\Oracle\VirtualBox\VBoxManage.exe" --nologo guestcontrol sandbox run '
#                     '--exe "/home/user/al_ui/test.py" --username user --password $piderman11 --wait-stdout')

# p = subprocess.call('"C:\Program Files\Oracle\VirtualBox\VBoxManage.exe" guestcontrol sandbox '
#                     'run --exe /home/user/al_ui/test.py --username user --password $piderman11 '
#                     '--wait-stdout --wait-stderr')


# p = subprocess.call('"C:\Program Files\Oracle\VirtualBox\VBoxManage.exe" snapshot sandbox restore Default')
# while p:
#     pass


# p = subprocess.Popen('"C:\Program Files\Oracle\VirtualBox\VBoxManage.exe" controlvm sandbox poweroff',
#                 stdout=subprocess.PIPE,
#                 stderr=subprocess.PIPE)
# print "Closing"
# for line in p.stdout:
#     print line
# p.communicate()
# p.wait()
#
# p = subprocess.Popen('"C:\Program Files\Oracle\VirtualBox\VBoxManage.exe" snapshot sandbox restore Default',
#                 stdout=subprocess.PIPE,
#                 stderr=subprocess.PIPE)
# for line in p.stdout:
#     print line
# p.communicate()
# p.wait()
#
# p = subprocess.Popen('"C:\Program Files\Oracle\VirtualBox\VBoxManage.exe" discardstate sandbox',
#                 stdout=subprocess.PIPE,
#                 stderr=subprocess.PIPE)
# for line in p.stdout:
#     print line
# p.communicate()
# p.wait()
#
# p = subprocess.Popen('"C:\Program Files\Oracle\VirtualBox\VBoxManage.exe" startvm sandbox',
#                 stdout=subprocess.PIPE,
#                 stderr=subprocess.PIPE)
# print "Opening"
# for line in p.stdout:
#     print line
# p.communicate()
# p.wait()
