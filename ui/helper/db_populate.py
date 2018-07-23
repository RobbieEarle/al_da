import sqlite3
from cryptography.fernet import Fernet

db = sqlite3.connect('../settings_db')
key = b'peja3W-4eEM9uuJJ95yOJU4r2iL9H6LfLBN4llb4xEs='
cipher_suite = Fernet(key)

cursor = db.cursor()

cursor.execute("""
INSERT INTO setting(setting_id, setting_name, user_id, user_pw, terminal, al_address, al_username, al_api_key, email_alerts,
  smtp_server, smtp_port, smtp_username, smtp_password)
  VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?)
""", (1,
      cipher_suite.encrypt(b'DEFAULT'),
      cipher_suite.encrypt(b'admin'),
      cipher_suite.encrypt(b'changeme'),
      cipher_suite.encrypt(b'DEV_TERMINAL'),
      cipher_suite.encrypt(b'https://134.190.171.253/'),
      cipher_suite.encrypt(b'admin'),
      cipher_suite.encrypt(b'123456'),
      cipher_suite.encrypt(b'0'),
      cipher_suite.encrypt(b'outlook.office365.com'),
      cipher_suite.encrypt(b'587'),
      cipher_suite.encrypt(b'rb504035@dal.ca'),
      cipher_suite.encrypt(b'PASSWORD')))

# cursor.execute("""
# INSERT INTO recipient(recipient_id, recipient_address, setting_id)
#   VALUES(?,?,?)
# """, (1, cipher_suite.encrypt(b''), 2))

# credentials = [(1, cipher_suite.encrypt(b'First Name'), cipher_suite.encrypt(b'1'), cipher_suite.encrypt(b'1'), 1),
#                (2, cipher_suite.encrypt(b'Last Name'), cipher_suite.encrypt(b'1'), cipher_suite.encrypt(b'1'), 1),
#                (3, cipher_suite.encrypt(b'Employee ID'), cipher_suite.encrypt(b'0'), cipher_suite.encrypt(b'0'), 1),
#                (4, cipher_suite.encrypt(b'Company Name'), cipher_suite.encrypt(b'0'), cipher_suite.encrypt(b'0'), 1)]
# cursor.executemany("""
# INSERT INTO credential(credential_id, credential_name, active, mandatory, setting_id)
#   VALUES(?,?,?,?,?)
# """, credentials)

# results = [(1, cipher_suite.encrypt(b'mal_files'), cipher_suite.encrypt(b'1'), 1),
#            (2, cipher_suite.encrypt(b'safe_files'), cipher_suite.encrypt(b'1'), 1),
#            (3, cipher_suite.encrypt(b'score'), cipher_suite.encrypt(b'1'), 1),
#            (4, cipher_suite.encrypt(b'sid'), cipher_suite.encrypt(b'1'), 1),
#            (5, cipher_suite.encrypt(b'file_contents'), cipher_suite.encrypt(b'1'), 1),
#            (6, cipher_suite.encrypt(b'file_services'), cipher_suite.encrypt(b'1'), 1),
#            (7, cipher_suite.encrypt(b'service_description'), cipher_suite.encrypt(b'1'), 1)]
# cursor.executemany("""
# INSERT INTO result(result_id, result_type, active, setting_id)
#   VALUES(?,?,?,?)
# """, results)

db.commit()

db.close()
