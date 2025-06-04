from fastapi import FastAPI, Query
from fastapi.middleware.cors import CORSMiddleware
from typing import Optional
from recommend import get_recommendations

app = FastAPI()

# allow local FE/BE to connect
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # replace with frontend domain
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/recommend")
def recommend(user_id: int = Query(...), mood: Optional[str] = Query(None)):
    try:
        results = get_recommendations(user_id=user_id, override_mood=mood)
        return {"success": True, "results": results}
    except Exception as e:
        return {"success": False, "error": str(e)}
