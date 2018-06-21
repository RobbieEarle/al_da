import subprocess
import time

# result = []
# win_cmd = 'VBoxManage controlvm ui-al_devVM poweroff'
# win_cmd = '"C:\Program Files\Oracle\VirtualBox\VBoxManage.exe" controlvm ui-al_devVM poweroff'
# win_cmd = '"C:\Program Files\Oracle\VirtualBox\VBoxManage.exe" startvm ui-al_devVM'
# win_cmd = '"C:\Program Files\Oracle\VirtualBox\VBoxManage.exe" startvm ui-al_devVM --type headless'
# win_cmd = '"C:\Program Files\Oracle\VirtualBox\VBoxManage.exe" snapshot ui-al_devVM restore Default'

subprocess.call('"C:\Program Files\Oracle\VirtualBox\VBoxManage.exe" controlvm sandbox poweroff')
subprocess.call('"C:\Program Files\Oracle\VirtualBox\VBoxManage.exe" snapshot sandbox restore Default')
time.sleep(2)
subprocess.call('"C:\Program Files\Oracle\VirtualBox\VBoxManage.exe" discardstate sandbox')
subprocess.call('"C:\Program Files\Oracle\VirtualBox\VBoxManage.exe" startvm sandbox')




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
