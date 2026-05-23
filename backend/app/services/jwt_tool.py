"""JWT Toolkit — decode, audit, and dictionary-attack JWTs."""
import base64
import json
import hmac
import hashlib
import time
from typing import Dict, List


def _b64url_decode(s: str) -> bytes:
    pad = "=" * (-len(s) % 4)
    return base64.urlsafe_b64decode(s + pad)


def decode_jwt(token: str) -> Dict:
    """Decode JWT header + payload (no signature verification)."""
    parts = (token or "").strip().split(".")
    if len(parts) < 2:
        return {"error": "Not a valid JWT (need at least 2 parts)"}
    out = {"header": None, "payload": None, "signature_present": len(parts) == 3, "signature": parts[2] if len(parts) == 3 else None}
    try:
        out["header"] = json.loads(_b64url_decode(parts[0]))
    except Exception as e:
        out["header_error"] = f"Could not decode header: {e}"
    try:
        out["payload"] = json.loads(_b64url_decode(parts[1]))
    except Exception as e:
        out["payload_error"] = f"Could not decode payload: {e}"
    return out


def audit_jwt(token: str) -> Dict:
    """Decode + run security audit. Returns issues, severity, recommendations."""
    decoded = decode_jwt(token)
    issues: List[Dict] = []

    header = decoded.get("header") or {}
    payload = decoded.get("payload") or {}

    # alg
    alg = (header.get("alg") or "").upper()
    if alg in ("NONE", ""):
        issues.append({"severity": "critical", "label": "alg:none — signature can be stripped trivially"})
    if alg.startswith("HS"):
        issues.append({"severity": "info", "label": f"Symmetric ({alg}) — secret can be cracked if weak"})
    if alg.startswith("RS") or alg.startswith("ES"):
        issues.append({"severity": "info", "label": f"Asymmetric ({alg}) — verify alg confusion isn't possible (RS→HS)"})

    # kid header
    if "kid" in header:
        kid = header["kid"]
        if any(c in str(kid) for c in ("/", "..", "\\")):
            issues.append({"severity": "high", "label": f"Suspicious 'kid' header value: {kid} — potential path traversal"})

    # Required time claims
    now = int(time.time())
    if "exp" not in payload:
        issues.append({"severity": "high", "label": "No 'exp' claim — token never expires"})
    else:
        exp = payload.get("exp")
        if isinstance(exp, (int, float)):
            if exp < now:
                issues.append({"severity": "info", "label": "Token already expired"})
            elif exp - now > 86400 * 365:
                issues.append({"severity": "medium", "label": f"Very long-lived token ({(exp - now) // 86400} days remaining)"})
            elif exp - now > 86400 * 30:
                issues.append({"severity": "low", "label": f"Long-lived token ({(exp - now) // 86400} days remaining)"})

    if "iat" not in payload:
        issues.append({"severity": "low", "label": "No 'iat' (issued-at) claim"})
    if "nbf" not in payload:
        issues.append({"severity": "low", "label": "No 'nbf' (not-before) claim"})

    # Recommended claims
    for c in ("iss", "aud"):
        if c not in payload:
            issues.append({"severity": "low", "label": f"No '{c}' claim — relying parties can't bind audience"})

    # Sensitive data in payload
    sensitive_keys = {"password", "ssn", "credit_card", "secret", "api_key", "private_key", "session_id"}
    for k in payload.keys():
        if k.lower() in sensitive_keys:
            issues.append({"severity": "critical", "label": f"Sensitive claim '{k}' inside JWT payload (it's NOT encrypted)"})

    # Role / privilege claims worth highlighting
    privilege_keys = []
    for k in ("role", "roles", "scope", "scopes", "admin", "is_admin", "permissions", "groups"):
        if k in payload:
            privilege_keys.append({"key": k, "value": payload[k]})

    return {
        "decoded": decoded,
        "alg": alg,
        "issues": issues,
        "privilege_claims": privilege_keys,
        "claim_count": len(payload),
        "issued_at": payload.get("iat"),
        "expires_at": payload.get("exp"),
        "subject": payload.get("sub"),
    }


# Built-in JWT-secret wordlist (common HMAC keys observed in CTFs / disclosure reports)
COMMON_SECRETS = [
    "secret", "secret123", "password", "password123", "your-256-bit-secret",
    "admin", "test", "key", "jwt", "jwtsecret", "supersecret", "topsecret",
    "changeme", "default", "myaverysecretkey", "your_jwt_secret", "shh",
    "qwerty", "letmein", "1234", "12345", "123456", "secretkey",
    "your-secret-key", "MIIEvgIBADANBgkqhkiG9w0BAQEFAASCBKgwggSkAgEAAo",
    "private", "demo", "dev", "production", "staging", "prod",
    "node-jwt-secret", "django-jwt-secret", "express-jwt-secret",
]


def crack_jwt(token: str, wordlist: List[str] = None) -> Dict:
    """Try to crack the HMAC secret of an HSxxx JWT against a wordlist."""
    parts = (token or "").strip().split(".")
    if len(parts) != 3:
        return {"cracked": False, "error": "JWT must have 3 parts (header.payload.signature)"}

    header_b64, payload_b64, sig_b64 = parts
    try:
        header = json.loads(_b64url_decode(header_b64))
    except Exception as e:
        return {"cracked": False, "error": f"bad header: {e}"}

    alg = (header.get("alg") or "").upper()
    hash_map = {"HS256": hashlib.sha256, "HS384": hashlib.sha384, "HS512": hashlib.sha512}
    if alg not in hash_map:
        return {"cracked": False, "error": f"only HS256/HS384/HS512 supported, got {alg}"}

    expected_sig = sig_b64.encode()
    msg = f"{header_b64}.{payload_b64}".encode()
    func = hash_map[alg]

    wl = wordlist or COMMON_SECRETS
    attempts = 0
    for secret in wl:
        attempts += 1
        sig = hmac.new(secret.encode("utf-8"), msg, func).digest()
        sig_b64_calc = base64.urlsafe_b64encode(sig).rstrip(b"=")
        if sig_b64_calc == expected_sig:
            return {
                "cracked": True,
                "secret": secret,
                "alg": alg,
                "attempts": attempts,
                "wordlist_size": len(wl),
            }
    return {
        "cracked": False, "alg": alg, "attempts": attempts,
        "wordlist_size": len(wl),
        "message": "Secret not in built-in wordlist. Try a larger custom wordlist (rockyou.txt, etc).",
    }
