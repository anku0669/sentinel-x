"""Phishing simulation + analysis routes."""
from fastapi import APIRouter, Depends
from pydantic import BaseModel
from typing import Optional, List
from ..security import get_current_user
from ..models.user import User
from ..services import phishing_sim, url_intel

router = APIRouter(prefix="/api/phishing", tags=["phishing"])


class TemplateRender(BaseModel):
    template_id: str
    variables: Optional[dict] = None


class EmailAnalysisReq(BaseModel):
    content: str
    sender: Optional[str] = ""
    urls: Optional[List[str]] = None


class URLAnalysisReq(BaseModel):
    url: str


class URLLiveReq(BaseModel):
    url: str
    deep: bool = True


class LookalikeReq(BaseModel):
    domain: str


@router.get("/templates")
async def list_templates(user: User = Depends(get_current_user)):
    return {"templates": phishing_sim.list_templates()}


@router.post("/templates/render")
async def render_template(req: TemplateRender, user: User = Depends(get_current_user)):
    return phishing_sim.get_template(req.template_id, req.variables or {})


@router.post("/analyze/email")
async def analyze_email(req: EmailAnalysisReq, user: User = Depends(get_current_user)):
    return phishing_sim.analyze_email(req.content, req.sender or "", req.urls or [])


@router.post("/analyze/url")
async def analyze_url(req: URLAnalysisReq, user: User = Depends(get_current_user)):
    return phishing_sim.analyze_url(req.url)


@router.post("/analyze/url/live")
async def analyze_url_live(req: URLLiveReq, user: User = Depends(get_current_user)):
    """Combined static + LIVE inspection (HTTP fetch, redirects, TLS, IP, headers)."""
    static = phishing_sim.analyze_url(req.url)
    if req.deep:
        live = await url_intel.live_check(req.url)
        return {"static": static, "live": live}
    return {"static": static}


@router.post("/lookalikes")
async def lookalikes(req: LookalikeReq, user: User = Depends(get_current_user)):
    return {"domain": req.domain, "lookalikes": phishing_sim.lookalike_domains(req.domain)}
