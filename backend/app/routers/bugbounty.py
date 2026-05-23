"""Bug bounty hub routes."""
from fastapi import APIRouter, Depends
from pydantic import BaseModel
from typing import Optional
from ..security import get_current_user
from ..models.user import User
from ..services import bug_bounty

router = APIRouter(prefix="/api/bugbounty", tags=["bugbounty"])


class CVSSReq(BaseModel):
    AV: str = "N"
    AC: str = "L"
    PR: str = "N"
    UI: str = "N"
    S: str = "U"
    C: str = "H"
    I: str = "H"
    A: str = "N"


class ReportReq(BaseModel):
    title: str
    severity: Optional[str] = "High"
    cvss_score: Optional[float] = 7.5
    cvss_vector: Optional[str] = "CVSS:3.1/AV:N/AC:L/PR:N/UI:N/S:U/C:H/I:H/A:N"
    asset: Optional[str] = "https://target.com"
    reporter: Optional[str] = "@you"
    summary: Optional[str] = ""
    steps: Optional[str] = ""
    poc: Optional[str] = ""
    impact: Optional[str] = ""
    fix: Optional[str] = ""
    refs: Optional[str] = ""


@router.get("/methodology")
async def get_methodology():
    return bug_bounty.methodology()


@router.get("/vulns")
async def list_vulns():
    return {"vulns": bug_bounty.vuln_classes()}


@router.get("/vulns/{vid}")
async def get_vuln(vid: str):
    return bug_bounty.get_vuln_class(vid)


@router.post("/cvss")
async def cvss(req: CVSSReq):
    return bug_bounty.calculate_cvss(req.model_dump())


@router.post("/report")
async def report(req: ReportReq, user: User = Depends(get_current_user)):
    return {"markdown": bug_bounty.generate_report(**req.model_dump())}


@router.get("/wordlists")
async def list_wordlists():
    return {"wordlists": bug_bounty.all_wordlists()}


@router.get("/wordlists/{name}")
async def get_wordlist(name: str):
    return bug_bounty.wordlist(name)


@router.get("/platforms")
async def platforms():
    return {"platforms": bug_bounty.platforms()}
