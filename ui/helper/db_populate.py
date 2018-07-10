import sqlite3

db = sqlite3.connect('../settings_db')

cursor = db.cursor()



# cursor.execute("""
# # INSERT INTO setting(setting_name, user_id, terminal, al_address, al_username, al_api_key,
# #   smtp_server, smtp_port, smtp_username, smtp_password)
# #   VALUES(?,?,?,?,?,?,?,?,?,?)
# # """, ('DEFAULT', 'admin', 'DEV_TERMINAL', 'https://134.190.171.253/', 'admin', '123456', 'outlook.office365.com',
# #       587, 'rb504035@dal.ca', 'PASSWORD'))
# #
# # cursor.execute("""
# # INSERT INTO setting(setting_name, user_id, terminal, al_address, al_username, al_api_key,
# #   smtp_server, smtp_port, smtp_username, smtp_password)
# #   VALUES(?,?,?,?,?,?,?,?,?,?)
# # """, ('SAVED', 'admin', 'DEV_TERMINAL', 'https://134.190.171.253/', 'admin', '1a2b3c4d5e6f', 'outlook.office365.com',
# #       587, 'robbieearle@dal.ca', 'PASSWORD'))
# #
# # cursor.execute("""
# # INSERT INTO recipient(recipient_id, recipient_address, setting_id)
# #   VALUES(?,?,?)
# # """, (1, 'robearle11@gmail.com', 2))
# #
# # cursor.execute("""
# # INSERT INTO recipient(recipient_id, recipient_address, setting_id)
# #   VALUES(?,?,?)
# # """, (2, 'robert.earle@165gc.onmicrosoft.com', 2))
# #
# # credentials = [(1, 'f_name', 1, 1, 1), (2, 'l_name', 1, 1, 1), (3, 'id', 0, 0, 1), (4, 'company', 0, 0, 1)]
# # cursor.executemany("""
# # INSERT INTO credential(credential_id, credential_type, active, mandatory, setting_id)
# #   VALUES(?,?,?,?,?)
# # """, credentials)
# #
# # credentials = [(5, 'f_name', 1, 1, 2), (6, 'l_name', 0, 0, 2), (7, 'id', 1, 1, 2), (8, 'company', 0, 0, 2)]
# # cursor.executemany("""
# # INSERT INTO credential(credential_id, credential_type, active, mandatory, setting_id)
# #   VALUES(?,?,?,?,?)
# # """, credentials)

results = [(1, 'mal_files', 1, 1), (2, 'safe_files', 1, 1), (3, 'score', 1, 1), (4, 'sid', 1, 1), (5, 'file_contents', 1, 1),
           (6, 'file_services', 1, 1), (7, 'service_description', 1, 1)]
cursor.executemany("""
INSERT INTO result(result_id, result_type, active, setting_id)
  VALUES(?,?,?,?)
""", results)

results = [(8, 'mal_files', 1, 2), (9, 'safe_files', 0, 2), (10, 'score', 1, 2), (11, 'sid', 0, 2), (12, 'file_contents', 1, 2),
           (13, 'file_services', 0, 2), (14, 'service_description', 1, 2)]
cursor.executemany("""
INSERT INTO result(result_id, result_type, active, setting_id)
  VALUES(?,?,?,?)
""", results)

db.commit()

db.close()


# default_settings["user_id"] = 'admin'
# default_settings["terminal"] = 'DEV_TERMINAL'
# default_settings["al_address"] = 'https://134.190.171.253/'
# default_settings["al_username"] = 'admin'
# default_settings["al_api_key"] = '123456'
# default_settings["smtp_server"] = server_addr
# default_settings["smtp_port"] = '587'
# default_settings["smtp_username"] = 'rb504035@dal.ca'
# default_settings["smtp_password"] = 'PASSWORD'
# default_settings["recipients"] = recipients
# default_settings["credential_settings"] = {
#         'f_name': {'active': True, 'mandatory': True},
#         'l_name': {'active': True, 'mandatory': True},
#         'id': {'active': False, 'mandatory': False},
#         'company': {'active': False, 'mandatory': False}
# }
# default_settings["results_settings"] = {
#     'mal_files': True,
#     'safe_files': True,
#     'score': True,
#     'sid': True,
#     'file_contents': True,
#     'file_services': True,
#     'service_description': True
# }