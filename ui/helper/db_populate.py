import sqlite3

db = sqlite3.connect('../settings_db')

cursor = db.cursor()

cursor.execute("""
INSERT INTO setting(setting_name, user_id, user_pw, terminal, al_address, al_username, al_api_key, email_alerts,
  smtp_server, smtp_port, smtp_username, smtp_password)
  VALUES(?,?,?,?,?,?,?,?,?,?,?,?)
""", ('DEFAULT', 'admin', 'changeme', 'DEV_TERMINAL', 'https://134.190.171.253/', 'admin', '123456', 0,
      'outlook.office365.com', 587, 'rb504035@dal.ca', 'PASSWORD'))

cursor.execute("""
INSERT INTO recipient(recipient_id, recipient_address, setting_id)
  VALUES(?,?,?)
""", (1, 'robearle11@gmail.com', 2))

credentials = [(1, 'First Name', 1, 1, 1), (2, 'Last Name', 1, 1, 1), (3, 'Employee ID', 0, 0, 1), (4, 'Company Name', 0, 0, 1)]
cursor.executemany("""
INSERT INTO credential(credential_id, credential_name, active, mandatory, setting_id)
  VALUES(?,?,?,?,?)
""", credentials)

results = [(1, 'mal_files', 1, 1), (2, 'safe_files', 1, 1), (3, 'score', 1, 1), (4, 'sid', 1, 1), (5, 'file_contents', 1, 1),
           (6, 'file_services', 1, 1), (7, 'service_description', 1, 1)]
cursor.executemany("""
INSERT INTO result(result_id, result_type, active, setting_id)
  VALUES(?,?,?,?)
""", results)

db.commit()

db.close()
