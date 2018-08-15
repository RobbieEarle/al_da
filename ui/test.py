import subprocess
import re

active_connections = str(subprocess.check_output(['netstat', '-tuplen']))

print active_connections

if re.match('^[\s\S]*(127.0.0.1:5000)[^0][\s\S]*$', active_connections):
    print 'Success!'
else:
    print 'Failure!'
