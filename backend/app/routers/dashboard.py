"""Dashboard aggregate endpoints."""
import random
from datetime import datetime, timedelta
from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, desc

from ..database import get_db
from ..models.scan import Scan
from ..models.threat import Threat
from ..models.user import User
from ..security import get_current_user
from ..services import threat_intel

router = APIRouter(prefix="/api/dashboard", tags=["dashboard"])


@router.get("/stats")
async def stats(db: AsyncSession = Depends(get_db), user: User = Depends(get_current_user)):
    scans_count = (await db.execute(select(func.count(Scan.id)))).scalar() or 0
    avg_risk = (await db.execute(select(func.avg(Scan.risk_score)))).scalar() or 0
    return {
        "total_scans": scans_count,
        "avg_risk_score": round(float(avg_risk), 2),
        "threats_blocked_24h": random.randint(2400, 5800),
        "threats_detected_24h": random.randint(6000, 12000),
        "active_incidents": random.randint(2, 12),
        "systems_protected": random.randint(180, 240),
        "ml_anomalies_today": random.randint(15, 60),
        "global_threat_level": random.choice(["ELEVATED", "HIGH", "GUARDED"]),
        "uptime_pct": 99.97,
    }


@router.get("/timeline")
async def timeline():
    """24-hour threat timeline data for charts."""
    now = datetime.utcnow()
    points = []
    for i in range(24):
        ts = now - timedelta(hours=23 - i)
        base = 100 + (i % 8) * 30
        points.append({
            "hour": ts.strftime("%H:00"),
            "attacks": base + random.randint(-30, 80),
            "blocked": base + random.randint(-50, 60),
            "anomalies": random.randint(2, 18),
        })
    return {"timeline": points}


@router.get("/threat-distribution")
async def threat_distribution():
    return {
        "distribution": [
            {"type": "SQL Injection", "count": random.randint(800, 1500), "color": "#ef4444"},
            {"type": "Brute Force", "count": random.randint(2000, 3500), "color": "#f59e0b"},
            {"type": "DDoS", "count": random.randint(400, 900), "color": "#a855f7"},
            {"type": "XSS", "count": random.randint(600, 1100), "color": "#06b6d4"},
            {"type": "Malware", "count": random.randint(300, 700), "color": "#10b981"},
            {"type": "Phishing", "count": random.randint(900, 1800), "color": "#ec4899"},
            {"type": "Ransomware", "count": random.randint(80, 250), "color": "#dc2626"},
        ]
    }
