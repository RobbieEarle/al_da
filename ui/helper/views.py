def create_menu(path):

    menu = [{"class": "",
             "active": path == "/scan" or path == "/",
             "link": "/scan",
             "title": "Scan",
             "has_submenu": False},
            {"class": "",
             "active": path == "/admin" or path == "/login",
             "link": "/admin",
             "title": "Settings",
             "has_submenu": False}]

    return menu
