import sys
sys.path.append("../dejavu")

from dejavu import Dejavu
from dejavu.logic.recognizer.file_recognizer import FileRecognizer
from dejavu_config import config
import shutil
import os
from fastapi import FastAPI, File, UploadFile
from fastapi.responses import JSONResponse

app = FastAPI()
djv = Dejavu(config)

@app.post("/match-audio")
async def match_audio(audio: UploadFile = File(...)):
    file_location = f"temp_{audio.filename}"
    with open(file_location, "wb") as buffer:
        shutil.copyfileobj(audio.file, buffer)

    try:
        result = djv.recognize(FileRecognizer, file_location)
        os.remove(file_location)
        return JSONResponse(content=result)
    except Exception as e:
        os.remove(file_location)
        return JSONResponse(content={"error": str(e)}, status_code=500)
