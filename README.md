# Lottery App

A 3-tier web app built as a self-guided lab for evaluating application delivery platforms
(reverse proxies, CDNs, WAFs, etc.). The theme is a simple lottery ticket game.

---

## Architecture

```
Browser
   │
   ▼
Reverse Proxy / CDN / Load Balancer  (optional — see Production mode below)
   ├── frontend domain  → React frontend    (port 3000)
   ├── games domain     → FastAPI Games API (port 8001)
   └── results domain   → FastAPI Results API (port 8002)

React (browser) → calls Games API + Results API directly via their base URLs
Both FastAPIs    → Postgres over Docker internal network (port 5432 never exposed)
```

### Services

| Service | Port | Responsibility |
|---|---|---|
| `react-frontend` | 3000 | Single-page React UI |
| `fastapi-games` | 8001 | Owns `tickets` table — buying tickets, random picks |
| `fastapi-results` | 8002 | Owns `draws` table — triggering draws, checking results |
| `postgres` | 5432 (internal) | Shared Postgres 15 database |

---

## Prerequisites

- [Docker](https://docs.docker.com/get-docker/) and [Docker Compose](https://docs.docker.com/compose/install/)
- Ports `3000`, `8001`, and `8002` available on the host

---

## Quick start — local machine

All three services talk to each other inside Docker's internal network.
The React app runs in the **browser**, so it needs to reach the APIs at an address
the browser can resolve. On a laptop that is `localhost`; on a remote VM it is the
VM's LAN or public IP.

**1. Create a `.env.local` file in the project root:**

```bash
# .env.local — used for local or LAN development
REACT_APP_GAMES_API=http://localhost:8001
REACT_APP_RESULTS_API=http://localhost:8002
```

> If you are running Docker on a remote VM and opening the app from another machine,
> replace `localhost` with the VM's IP address (e.g. `http://192.168.1.10:8001`).

**2. Build and start all services:**

```bash
docker-compose --env-file .env.local up --build
```

**3. Open the app:**

```
http://localhost:3000
```

---

## Production mode — behind a reverse proxy / CDN

When you front the services with a reverse proxy, CDN, or application delivery platform
(NGINX, Caddy, F5 Distributed Cloud, AWS ALB, Cloudflare, etc.), point the React app at
the public domain names instead of the raw IP/port.

**1. Create a `.env.prod` file in the project root:**

```bash
# .env.prod — used when services are fronted by a proxy/CDN
REACT_APP_GAMES_API=https://games.yourdomain.com
REACT_APP_RESULTS_API=https://results.yourdomain.com
```

**2. Start with the prod env file:**

```bash
docker-compose --env-file .env.prod up --build
```

The frontend domain, games domain, and results domain in your proxy config should each
forward to the host running Docker on their respective port (`3000`, `8001`, `8002`).

---

## Useful commands

```bash
# Rebuild a single service without restarting others
docker-compose --env-file .env.local up --build fastapi-games

# Full no-cache rebuild of one service (when Docker layer cache is stale)
docker-compose stop fastapi-games
docker-compose rm -f fastapi-games
docker-compose build --no-cache fastapi-games
docker-compose --env-file .env.local up -d fastapi-games

# View logs for one service
docker-compose logs -f fastapi-results

# Tear everything down (keeps the pgdata volume)
docker-compose down

# Tear down AND wipe the database
docker-compose down -v
```

---

## API reference

### fastapi-games — port 8001

| Method | Path | Description |
|---|---|---|
| `GET` | `/health` | Returns container hostname + IP (useful for observing LB behaviour) |
| `GET` | `/api/tickets` | Last 10 tickets |
| `POST` | `/api/tickets` | Buy a ticket — body: `{ "numbers": [int x5] }`, values 1–50 |
| `GET` | `/api/random` | Returns 5 random numbers 1–50 |

### fastapi-results — port 8002

| Method | Path | Description |
|---|---|---|
| `GET` | `/health` | Returns container hostname + IP |
| `GET` | `/api/results/latest` | Most recent draw |
| `GET` | `/api/results` | Last 10 draws |
| `POST` | `/api/results/draw` | Trigger a draw — generates winning numbers |
| `POST` | `/api/results/check` | Check ticket against latest draw — body: `{ "numbers": [int x5] }` |

---

## Game flow

1. Pick 5 numbers (1–50) or click **Random Pick**
2. **Buy Ticket** → POST to Games API → saved to `tickets` table
3. **Trigger Draw** → POST to Results API → winning numbers generated and saved to `draws` table
4. **Check** → Results API compares your ticket against the latest draw, returns matched numbers
5. UI reveals winning numbers; matched ones are highlighted

Winning numbers are hidden until a draw is triggered, mirroring a real lottery flow.

---

## Database schema

```sql
-- postgres/init.sql (auto-applied on first container start)
CREATE TABLE tickets (
    id          SERIAL PRIMARY KEY,
    numbers     INTEGER[] NOT NULL,
    created_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE draws (
    id              SERIAL PRIMARY KEY,
    winning_numbers INTEGER[] NOT NULL,
    drawn_at        TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

Schema is initialised from `postgres/init.sql` and persisted in the `pgdata` Docker volume.

---

## Project structure

```
lottery-app/
├── docker-compose.yml
├── .env.local            # local/LAN dev env vars (git-ignored)
├── .env.prod             # production env vars    (git-ignored)
├── fastapi-games/        # Games API — port 8001
│   ├── Dockerfile
│   ├── main.py
│   └── requirements.txt
├── fastapi-results/      # Results API — port 8002
│   ├── Dockerfile
│   ├── main.py
│   └── requirements.txt
├── react-frontend/       # React UI — port 3000
│   ├── Dockerfile
│   ├── package.json
│   ├── public/
│   └── src/
│       ├── App.js        # All UI and API calls
│       └── index.js
└── postgres/
    └── init.sql          # Schema + seed data
```
