from dotenv import load_dotenv
import os
from pathlib import Path

env_path = Path(__file__).resolve().parent / ".env"
print("Path:", env_path)
load_dotenv(dotenv_path=str(env_path))
print("User:", os.getenv("DEJAVU_DB_USER"))
