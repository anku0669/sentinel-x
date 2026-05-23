"""Defensive (Blue Team) endpoints."""
import random
from datetime import datetime, timedelta
from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, desc, func

from ..database import get_db
from ..models.threat import Threat
from ..models.user import User
from ..schemas import PasswordAnalysis, HashCrackRequest
from ..security import get_current_user
from ..services import threat_intel, password_lab

router = APIRouter(prefix="/api/defensive", tags=["defensive"])


@router.get("/threats/live")
async def live_threats(limit: int = 20):
    """Generate fresh simulated threat events (live feed)."""
    return {"threats": threat_intel.generate_threat_batch(limit), "generated_at": datetime.utcnow().isoformat()}


@router.get("/threats/map")
async def attack_map():
    return {"attacks": threat_intel.get_global_attack_map()}


@router.post("/password/analyze")
async def analyze_password(req: PasswordAnalysis, user: User = Depends(get_current_user)):
    return password_lab.analyze_password(req.password)


@router.post("/hash/crack")
async def crack_hash(req: HashCrackRequest, user: User = Depends(get_current_user)):
    return password_lab.crack_hash(req.hash_value, req.hash_type)


@router.get("/anomaly/check")
async def check_anomaly(bytes_sent: float = 5000, bytes_recv: float = 8000, rpm: float = 60, error_rate: float = 0.02, unique_dest: float = 5):
    return threat_intel.detect_anomaly([bytes_sent, bytes_recv, rpm, error_rate, unique_dest])


@router.get("/logs/stream")
async def log_stream():
    """Simulated SIEM log stream."""
    sources = ["firewall", "ids", "auth", "web-app", "endpoint", "k8s-audit", "vpn"]
    levels = ["INFO", "WARN", "ERROR", "CRITICAL"]
    msgs = [
        "Failed SSH auth from {ip}",
        "WAF blocked SQLi pattern from {ip}",
        "Outbound connection to suspicious domain (cdn-delivery.tk)",
        "User {user} privilege change detected",
        "EDR quarantined process: powershell.exe encoded cmd",
        "DNS request to known C2: malicious-domain.xyz",
        "VPN login from new geolocation",
        "Container escape attempt blocked",
        "Kerberoasting attempt detected on DC01",
        "Mimikatz signature in memory",
        "Unsigned binary execution: {ip}",
    ]
    logs = []
    now = datetime.utcnow()
    for i in range(50):
        msg = random.choice(msgs).format(
            ip=f"{random.randint(1,254)}.{random.randint(0,254)}.{random.randint(0,254)}.{random.randint(1,254)}",
            user=random.choice(["alice", "bob", "svc_backup", "admin"]),
        )
        level = random.choices(levels, weights=[40, 30, 20, 10])[0]
        risk = {"INFO": 0.1, "WARN": 0.4, "ERROR": 0.7, "CRITICAL": 0.95}[level]
        logs.append({
            "timestamp": (now - timedelta(seconds=i * random.randint(1, 5))).isoformat(),
            "source": random.choice(sources),
            "level": level,
            "message": msg,
            "risk": risk,
        })
    return {"logs": logs}
