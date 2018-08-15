import subprocess
import re

active_connections = str(subprocess.check_output(['netstat', '-tuplen']))

if re.match('^.*(127.0.0.1:5000).*$', active_connections):
    print 'Success!'
else:
    print 'Failure!'
