"""SENTINEL-X — AI Cybersecurity Command Center API."""
from contextlib import asynccontextmanager
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.util import get_remote_address
from slowapi.errors import RateLimitExceeded
from sqlalchemy import select

from .config import settings
from .database import init_db, AsyncSessionLocal
from .models.user import User
from .security import hash_password
from .routers import (
    auth, offensive, defensive, ai, dashboard,
    phishing, bugbounty, mcp, osint, jwt_router,
    reports, ws,
)

# ── Rate limiter ──────────────────────────────────────────────────────────────
limiter = Limiter(key_func=get_remote_address)


@asynccontextmanager
async def lifespan(app: FastAPI):
    await init_db()
    async with AsyncSessionLocal() as db:
        result = await db.execute(select(User).where(User.username == "admin"))
        if not result.scalar_one_or_none():
            db.add(User(username="admin",   email="admin@sentinel-x.local",
                        hashed_password=hash_password("admin1234"),   role="admin"))
            db.add(User(username="analyst", email="analyst@sentinel-x.local",
                        hashed_password=hash_password("analyst123"), role="analyst"))
            await db.commit()
    yield


app = FastAPI(
    title="SENTINEL-X",
    description=(
        "AI-Powered Unified Cybersecurity Command Center — "
        "Offensive · Defensive · AI Red Team · Phishing · Bug Bounty · OSINT · JWT · MCP"
    ),
    version="2.0.0",
    lifespan=lifespan,
)

# Rate limiting
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS + ["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Routers
app.include_router(auth.router)
app.include_router(offensive.router)
app.include_router(defensive.router)
app.include_router(ai.router)
app.include_router(dashboard.router)
app.include_router(phishing.router)
app.include_router(bugbounty.router)
app.include_router(mcp.router)
app.include_router(osint.router)
app.include_router(jwt_router.router)
app.include_router(reports.router)
app.include_router(ws.router)   # WebSocket endpoints (no prefix — /ws/*)


@app.get("/")
@limiter.limit("60/minute")
async def root(request: Request):
    return {
        "app": settings.APP_NAME,
        "status": "operational",
        "version": "2.0.0",
        "docs": "/docs",
        "modules": [
            "offensive", "defensive", "ai-analyst", "ai-redteam",
            "phishing", "bugbounty", "osint", "jwt", "mcp",
            "dashboard", "reports", "websockets",
        ],
    }


@app.get("/api/health")
async def health():
    return {"status": "ok"}
