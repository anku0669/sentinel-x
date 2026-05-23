"""OSINT endpoints."""
from fastapi import APIRouter, Depends
from pydantic import BaseModel
from typing import Optional
from ..security import get_current_user
from ..models.user import User
from ..services import osint

router = APIRouter(prefix="/api/osint", tags=["osint"])


class DomainReq(BaseModel):
    domain: str


class EmailPermReq(BaseModel):
    first: str
    last: str
    domain: str


class QueryReq(BaseModel):
    query: str


class EmailReq(BaseModel):
    email: str


class PasswordReq(BaseModel):
    password: str


@router.post("/subdomains")
async def subdomains(req: DomainReq, user: User = Depends(get_current_user)):
    return await osint.crtsh_subdomains(req.domain)


@router.post("/email-perms")
async def email_perms(req: EmailPermReq, user: User = Depends(get_current_user)):
    return osint.email_permutations(req.first, req.last, req.domain)


@router.post("/github-dorks")
async def github_dorks(req: QueryReq, user: User = Depends(get_current_user)):
    return osint.github_dorks(req.query)


@router.post("/google-dorks")
async def google_dorks(req: DomainReq, user: User = Depends(get_current_user)):
    return osint.google_dorks(req.domain)


@router.post("/breach-check")
async def breach(req: EmailReq, user: User = Depends(get_current_user)):
    return await osint.breach_check(req.email)


@router.post("/password-pwned")
async def pwned(req: PasswordReq, user: User = Depends(get_current_user)):
    return osint.password_breach_check(req.password)
