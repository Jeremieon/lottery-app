from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from databases import Database
import random
import os
import socket

DATABASE_URL = os.getenv("DATABASE_URL", "postgresql://lottery:lottery123@postgres:5432/lotterydb")
database = Database(DATABASE_URL)

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.on_event("startup")
async def startup():
    await database.connect()

@app.on_event("shutdown")
async def shutdown():
    await database.disconnect()

@app.get("/health")
async def health():
    hostname = socket.gethostname()
    ip = socket.gethostbyname(hostname)
    return {"status": "ok", "service": "results-api", "host": f"{hostname} ({ip})"}

@app.get("/api/results/latest")
async def get_latest():
    query = "SELECT * FROM draws ORDER BY drawn_at DESC LIMIT 1"
    row = await database.fetch_one(query)
    if not row:
        return {"draw": None}
    return {"draw": dict(row)}

@app.get("/api/results")
async def get_all_results():
    query = "SELECT * FROM draws ORDER BY drawn_at DESC LIMIT 10"
    rows = await database.fetch_all(query)
    return {"draws": [dict(row) for row in rows]}

@app.post("/api/results/draw")
async def trigger_draw():
    winning_numbers = sorted(random.sample(range(1, 51), 5))
    query = "INSERT INTO draws (winning_numbers) VALUES (:numbers) RETURNING *"
    row = await database.fetch_one(query=query, values={"numbers": winning_numbers})
    return {"draw": dict(row)}

@app.post("/api/results/check")
async def check_ticket(payload: dict):
    ticket_numbers = set(payload.get("numbers", []))
    query = "SELECT * FROM draws ORDER BY drawn_at DESC LIMIT 1"
    row = await database.fetch_one(query)
    if not row:
        return {"error": "No draws yet"}
    winning = set(dict(row)["winning_numbers"])
    matched = ticket_numbers & winning
    return {
        "ticket_numbers": sorted(ticket_numbers),
        "winning_numbers": sorted(winning),
        "matched": sorted(matched),
        "matched_count": len(matched),
        "message": f"🎉 You matched {len(matched)} numbers!" if matched else "😔 No matches this time"
    }
