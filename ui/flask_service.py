import subprocess
import time

p = subprocess.Popen('set FLASK_APP=/home/user/al_da/ui/app.py', stdout=subprocess.PIPE, stderr=subprocess.PIPE,
                     shell=True, cwd='/home/user/al_da/ui/')
p.communicate()

p = subprocess.Popen('flask run', stdout=subprocess.PIPE, stderr=subprocess.PIPE,
                     shell=True, cwd='/home/user/al_da/ui/')
p.communicate()

while True:
    time.sleep(10)
