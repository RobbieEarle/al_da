import sqlite3

db = sqlite3.connect('../settings_db')

cursor = db.cursor()

cursor.execute('''
CREATE TABLE setting(
  setting_id INTEGER PRIMARY KEY AUTOINCREMENT,
  setting_name TEXT, 
  user_id TEXT,
  user_pw TEXT,
  terminal TEXT,
  al_address TEXT,
  al_username TEXT,
  al_api_key TEXT,
  email_alerts INTEGER,
  smtp_server TEXT,
  smtp_port INTEGER,
  smtp_username TEXT,
  smtp_password TEXT
)
''')

# cursor.execute('''
# CREATE TABLE recipient(
#   recipient_id INTEGER PRIMARY KEY AUTOINCREMENT,
#   recipient_address TEXT,
#   setting_id INTEGER,
#   FOREIGN KEY(setting_id) REFERENCES settings(setting_id)
# )
# ''')
#
# cursor.execute('''
# CREATE TABLE credential(
#   credential_id INTEGER PRIMARY KEY AUTOINCREMENT,
#   credential_type TEXT,
#   active INTEGER,
#   mandatory INTEGER,
#   setting_id INTEGER,
#   FOREIGN KEY(setting_id) REFERENCES settings(setting_id)
# )
# ''')
#
# cursor.execute('''
# CREATE TABLE result(
#   result_id INTEGER PRIMARY KEY AUTOINCREMENT,
#   result_type TEXT,
#   active INTEGER,
#   setting_id INTEGER,
#   FOREIGN KEY(setting_id) REFERENCES settings(setting_id)
# )
# ''')

db.commit()

db.close()
