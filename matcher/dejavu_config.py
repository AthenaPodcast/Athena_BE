import os
from dotenv import load_dotenv
load_dotenv()

config = {
    "database_type": "postgres", 
    "database": {
        "host": os.getenv("DEJAVU_DB_HOST"),
        "user": os.getenv("DEJAVU_DB_USER"),
        "password": os.getenv("DEJAVU_DB_PASS"),
        "database": os.getenv("DEJAVU_DB_NAME"),
        "port": int(os.getenv("DEJAVU_DB_PORT", 5432))
    }
}
