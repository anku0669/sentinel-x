"""JWT toolkit endpoints."""
from fastapi import APIRouter, Depends
from pydantic import BaseModel
from typing import Optional, List
from ..security import get_current_user
from ..models.user import User
from ..services import jwt_tool

router = APIRouter(prefix="/api/jwt", tags=["jwt"])


class JWTRequest(BaseModel):
    token: str


class JWTCrackRequest(BaseModel):
    token: str
    wordlist: Optional[List[str]] = None


@router.post("/decode")
async def decode(req: JWTRequest, user: User = Depends(get_current_user)):
    return jwt_tool.decode_jwt(req.token)


@router.post("/audit")
async def audit(req: JWTRequest, user: User = Depends(get_current_user)):
    return jwt_tool.audit_jwt(req.token)


@router.post("/crack")
async def crack(req: JWTCrackRequest, user: User = Depends(get_current_user)):
    return jwt_tool.crack_jwt(req.token, req.wordlist)
