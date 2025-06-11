import os
from pathlib import Path
from dotenv import load_dotenv

env_path = Path(__file__).resolve().parent.parent / ".env"
load_dotenv(dotenv_path=str(env_path))  

print("DEJAVU_DB_USER =", os.getenv("DEJAVU_DB_USER"))

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
