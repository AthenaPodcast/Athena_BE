import sys
import os
from pathlib import Path
from typing import Optional
from dotenv import load_dotenv

env_path = Path(__file__).resolve().parent / ".env"
load_dotenv(dotenv_path=env_path)

sys.path.append(str(Path(__file__).resolve().parent.parent / "dejavu"))

from dejavu import Dejavu
from dejavu.logic.recognizer.file_recognizer import FileRecognizer
from matcher.dejavu_config import config

import shutil
from fastapi import FastAPI, File, UploadFile
from fastapi.responses import JSONResponse
from fastapi.encoders import jsonable_encoder
from fastapi import Query

app = FastAPI()
djv = Dejavu(config)

def safe_convert(obj):
    if isinstance(obj, bytes):
        return obj.decode(errors="ignore")
    elif isinstance(obj, (int, float, str, bool, type(None))):
        return obj
    elif hasattr(obj, "__dict__"):
        return {k: safe_convert(v) for k, v in vars(obj).items()}
    elif isinstance(obj, dict):
        return {k: safe_convert(v) for k, v in obj.items()}
    elif isinstance(obj, (list, tuple, set)):
        return [safe_convert(v) for v in obj]
    else:
        return str(obj)

@app.post("/match-audio")
async def match_audio(audio: UploadFile = File(...)):
    file_location = f"temp_{audio.filename}"
    try:
        with open(file_location, "wb") as buffer:
            shutil.copyfileobj(audio.file, buffer)

        result = djv.recognize(FileRecognizer, file_location)
        cleaned_result = safe_convert(result)

        return JSONResponse(content=cleaned_result)
    except Exception as e:
        return JSONResponse(content={"error": str(e)}, status_code=500)
        
    finally:
        if os.path.exists(file_location):
            os.remove(file_location)

@app.post("/fingerprint")
async def fingerprint_audio(
    audio: UploadFile = File(...),
    song_name: Optional[str] = Query(None)
):
    file_location = f"temp_{audio.filename}"
    try:
        with open(file_location, "wb") as buffer:
            shutil.copyfileobj(audio.file, buffer)

        name = song_name or os.path.basename(file_location)

        djv.fingerprint_file(file_location, song_name=name)
        return JSONResponse(content={"message": "Fingerprinting successful", "used_name": name})
    except Exception as e:
        return JSONResponse(content={"error": str(e)}, status_code=500)
    finally:
        if os.path.exists(file_location):
            os.remove(file_location)
