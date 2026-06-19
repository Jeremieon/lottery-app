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
    return {"status": "ok", "service": "games-api", "host": f"{hostname} ({ip})"}

@app.get("/api/tickets")
async def get_tickets():
    query = "SELECT * FROM tickets ORDER BY created_at DESC LIMIT 10"
    rows = await database.fetch_all(query)
    return {"tickets": [dict(row) for row in rows]}

@app.post("/api/tickets")
async def submit_ticket(payload: dict):
    numbers = payload.get("numbers", [])
    if len(numbers) != 5:
        return {"error": "You must pick exactly 5 numbers"}
    if any(n < 1 or n > 50 for n in numbers):
        return {"error": "Numbers must be between 1 and 50"}
    query = "INSERT INTO tickets (numbers) VALUES (:numbers) RETURNING *"
    row = await database.fetch_one(query=query, values={"numbers": numbers})
    return {"ticket": dict(row)}

@app.get("/api/random")
async def random_numbers():
    numbers = random.sample(range(1, 51), 5)
    return {"numbers": sorted(numbers)}
