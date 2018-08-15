import subprocess
import time
import re

while True:
    active_connections = str(subprocess.check_output(['netstat', '-tuplen']))

    if not re.match('^[\s\S]*(127.0.0.1:5000)[^0][\s\S]*$', active_connections):
        p = subprocess.Popen('set FLASK_APP=/opt/al_da/ui/app.py', stdout=subprocess.PIPE, stderr=subprocess.PIPE,
                             shell=True, cwd='/opt/al_da/ui/')
        p.communicate()

        p = subprocess.Popen('flask run', stdout=subprocess.PIPE, stderr=subprocess.PIPE,
                             shell=True, cwd='/opt/al_da/ui/')
        p.communicate()

    time.sleep(10)
