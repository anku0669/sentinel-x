"""Offensive (Red Team) endpoints."""
import json
from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from ..database import get_db
from ..models.scan import Scan
from ..models.user import User
from ..schemas import ScanRequest, PayloadRequest
from ..security import get_current_user
from ..services import scanner, payload_gen

router = APIRouter(prefix="/api/offensive", tags=["offensive"])


@router.post("/scan/port")
async def run_port_scan(req: ScanRequest, db: AsyncSession = Depends(get_db), user: User = Depends(get_current_user)):
    result = await scanner.port_scan(req.target)
    scan = Scan(
        target=req.target, scan_type="port",
        risk_score=result.get("risk_score", 0),
        result=json.dumps(result), user_id=user.id,
    )
    db.add(scan)
    await db.commit()
    await db.refresh(scan)
    return {"id": scan.id, **result}


@router.post("/scan/web")
async def run_web_recon(req: ScanRequest, db: AsyncSession = Depends(get_db), user: User = Depends(get_current_user)):
    result = await scanner.web_recon(req.target)
    scan = Scan(
        target=req.target, scan_type="web_recon",
        risk_score=result.get("risk_score", 0),
        result=json.dumps(result), user_id=user.id,
    )
    db.add(scan)
    await db.commit()
    await db.refresh(scan)
    return {"id": scan.id, **result}


@router.post("/payload/generate")
async def gen_payload(req: PayloadRequest, user: User = Depends(get_current_user)):
    pt = req.payload_type.lower()
    if pt in ("reverse_shell", "rev_shell"):
        return {"type": "reverse_shell", "payloads": payload_gen.reverse_shell(req.target_os, req.lhost, req.lport)}
    if pt == "xss":
        return {"type": "xss", "payloads": payload_gen.generate_xss()}
    if pt in ("sqli", "sql_injection"):
        return {"type": "sqli", "payloads": payload_gen.generate_sqli()}
    if pt == "lfi":
        return {"type": "lfi", "payloads": payload_gen.generate_lfi()}
    if pt == "encode":
        text = (req.options or {}).get("text", "id")
        return {"type": "encoded", "payloads": payload_gen.encode_payload(text)}
    return {"error": "unknown payload_type", "supported": ["reverse_shell", "xss", "sqli", "lfi", "encode"]}


@router.get("/scans/recent")
async def recent_scans(db: AsyncSession = Depends(get_db), user: User = Depends(get_current_user)):
    from sqlalchemy import select, desc
    result = await db.execute(select(Scan).where(Scan.user_id == user.id).order_by(desc(Scan.created_at)).limit(20))
    scans = result.scalars().all()
    return [
        {
            "id": s.id, "target": s.target, "scan_type": s.scan_type,
            "risk_score": s.risk_score, "status": s.status,
            "result": json.loads(s.result) if s.result else None,
            "created_at": s.created_at.isoformat(),
        }
        for s in scans
    ]
