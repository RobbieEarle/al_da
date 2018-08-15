import subprocess
import time

while True:
    p = subprocess.Popen(['set', 'FLASK_APP=/home/user/al_da/ui/app.py'], stdout=subprocess.PIPE, stderr=subprocess.PIPE,
                         shell=True, cwd='/home/user/al_da/ui/')

    p = subprocess.Popen(['flask', 'run'], stdout=subprocess.PIPE, stderr=subprocess.PIPE,
                         shell=True, cwd='/home/user/al_da/ui/')

    time.sleep(10)
