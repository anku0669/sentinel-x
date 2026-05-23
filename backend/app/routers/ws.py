"""WebSocket endpoints — real-time threat feed and log stream.

Replaces polling-based /api/defensive/threats/live with a persistent
WebSocket connection that pushes new events every second.
"""
import asyncio
import json
import random
from datetime import datetime, timedelta

from fastapi import APIRouter, WebSocket, WebSocketDisconnect

from ..services.threat_intel import generate_threat_event

router = APIRouter(tags=["websockets"])


@router.websocket("/ws/threats")
async def threat_stream(websocket: WebSocket):
    """Push live threat events every 1-2 seconds."""
    await websocket.accept()
    try:
        while True:
            event = generate_threat_event()
            await websocket.send_text(json.dumps(event))
            await asyncio.sleep(random.uniform(0.8, 2.0))
    except WebSocketDisconnect:
        pass
    except Exception:
        pass


@router.websocket("/ws/logs")
async def log_stream(websocket: WebSocket):
    """Push simulated SIEM log events every 0.5-1.5 seconds."""
    await websocket.accept()
    sources  = ["firewall", "ids", "auth", "web-app", "endpoint", "k8s-audit", "vpn"]
    levels   = ["INFO", "WARN", "ERROR", "CRITICAL"]
    messages = [
        "Failed SSH auth from {ip}",
        "WAF blocked SQLi pattern from {ip}",
        "Outbound connection to suspicious domain cdn-delivery.tk",
        "User {user} privilege change detected",
        "EDR quarantined: powershell.exe encoded command",
        "DNS request to known C2: malicious-domain.xyz",
        "VPN login from new geolocation: {ip}",
        "Container escape attempt blocked",
        "Kerberoasting attempt detected on DC01",
        "Mimikatz signature detected in memory",
        "Unsigned binary execution from {ip}",
    ]
    try:
        while True:
            ip   = f"{random.randint(1,254)}.{random.randint(0,254)}." \
                   f"{random.randint(0,254)}.{random.randint(1,254)}"
            user = random.choice(["alice", "bob", "svc_backup", "admin"])
            msg  = random.choice(messages).format(ip=ip, user=user)
            level = random.choices(levels, weights=[40, 30, 20, 10])[0]
            risk  = {"INFO": 0.1, "WARN": 0.4, "ERROR": 0.7, "CRITICAL": 0.95}[level]
            log = {
                "timestamp": datetime.utcnow().isoformat(),
                "source":    random.choice(sources),
                "level":     level,
                "message":   msg,
                "risk":      risk,
            }
            await websocket.send_text(json.dumps(log))
            await asyncio.sleep(random.uniform(0.5, 1.5))
    except WebSocketDisconnect:
        pass
    except Exception:
        pass


@router.websocket("/ws/anomaly")
async def anomaly_stream(websocket: WebSocket):
    """Stream anomaly-check results for synthetic network flows."""
    await websocket.accept()
    from ..services.threat_intel import detect_anomaly
    import numpy as np
    rng = np.random.default_rng()
    try:
        while True:
            # Occasionally inject an anomalous flow
            if random.random() < 0.15:
                features = [
                    float(rng.integers(1_000_000, 5_000_000)),  # bytes_sent spike
                    float(rng.integers(100, 500)),               # bytes_recv tiny
                    float(rng.integers(2000, 5000)),             # rpm DDoS-level
                    float(rng.uniform(0.4, 0.9)),                # error_rate high
                    float(rng.integers(200, 500)),               # unique_dest scanning
                ]
            else:
                features = [
                    float(rng.lognormal(8.0, 0.5)),   # normal bytes_sent
                    float(rng.lognormal(9.5, 0.6)),   # normal bytes_recv
                    float(rng.poisson(55)),            # normal rpm
                    float(rng.beta(1.2, 18)),          # normal error_rate
                    float(rng.lognormal(1.5, 0.5)),   # normal unique_dest
                ]
            result = detect_anomaly(features)
            await websocket.send_text(json.dumps(result))
            await asyncio.sleep(2)
    except WebSocketDisconnect:
        pass
    except Exception:
        pass
