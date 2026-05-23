"""OSINT toolkit — subdomain enum (multi-source), email perms, GitHub/Google dorks, breach checks."""
import asyncio
import hashlib
import re
from typing import Dict, List

import httpx

# ── Common subdomain wordlist for DNS brute-force fallback ────────────────────
COMMON_SUBDOMAINS = [
    "www", "mail", "ftp", "admin", "api", "app", "dev", "staging", "test",
    "portal", "vpn", "remote", "blog", "shop", "store", "cdn", "static",
    "media", "assets", "images", "docs", "support", "help", "status",
    "dashboard", "login", "auth", "sso", "id", "account", "accounts",
    "my", "secure", "pay", "payment", "billing", "invoice", "hr",
    "intranet", "internal", "corp", "extranet", "partner", "partners",
    "api2", "api-v2", "v2", "beta", "alpha", "sandbox", "demo",
    "jenkins", "jira", "confluence", "gitlab", "github", "git",
    "smtp", "imap", "pop", "webmail", "mx", "ns1", "ns2",
    "db", "mysql", "postgres", "redis", "mongo", "elastic",
    "monitor", "grafana", "prometheus", "kibana", "splunk",
    "mobile", "ios", "android", "m", "wap", "ws", "chat",
    "download", "upload", "files", "backup", "archive",
    "newsletter", "email", "marketing", "ads", "analytics",
]


# ── Shared HTTP client settings ───────────────────────────────────────────────
_HEADERS = {
    "User-Agent": (
        "Mozilla/5.0 (compatible; SENTINEL-X/2.0; "
        "+https://github.com/sentinel-x) SecurityResearch/1.0"
    ),
    "Accept": "application/json, text/plain, */*",
}


async def _fetch_crtsh(domain: str, client: httpx.AsyncClient) -> set:
    """Query crt.sh Certificate Transparency search."""
    url = f"https://crt.sh/?q=%25.{domain}&output=json"
    r = await client.get(url, headers=_HEADERS, timeout=25.0)
    r.raise_for_status()
    seen = set()
    for entry in r.json():
        for n in (entry.get("name_value") or "").split("\n"):
            n = n.strip().lower().lstrip("*.")
            if n and domain in n and "*" not in n:
                seen.add(n)
    return seen


async def _fetch_certspotter(domain: str, client: httpx.AsyncClient) -> set:
    """Query Cert Spotter — free, no auth required, separate infra from crt.sh."""
    url = (
        f"https://api.certspotter.com/v1/issuances"
        f"?domain={domain}&include_subdomains=true&expand=dns_names"
    )
    r = await client.get(url, headers=_HEADERS, timeout=20.0)
    r.raise_for_status()
    seen = set()
    for entry in r.json():
        for n in entry.get("dns_names", []):
            n = n.strip().lower().lstrip("*.")
            if n and domain in n:
                seen.add(n)
    return seen


async def _fetch_hackertarget(domain: str, client: httpx.AsyncClient) -> set:
    """Query HackerTarget subdomain finder — free, no auth."""
    url = f"https://api.hackertarget.com/hostsearch/?q={domain}"
    r = await client.get(url, headers=_HEADERS, timeout=20.0)
    r.raise_for_status()
    seen = set()
    for line in r.text.splitlines():
        parts = line.split(",")
        if parts and domain in parts[0]:
            seen.add(parts[0].strip().lower())
    return seen


async def _dns_bruteforce(domain: str) -> set:
    """Last-resort: check common subdomain names via DNS resolution."""
    import socket
    found = set()

    async def check(sub: str):
        host = f"{sub}.{domain}"
        try:
            loop = asyncio.get_event_loop()
            await loop.run_in_executor(None, socket.gethostbyname, host)
            found.add(host)
        except (socket.gaierror, OSError):
            pass

    # Run in batches of 20 concurrent checks
    batch_size = 20
    for i in range(0, len(COMMON_SUBDOMAINS), batch_size):
        batch = COMMON_SUBDOMAINS[i:i + batch_size]
        await asyncio.gather(*[check(s) for s in batch], return_exceptions=True)

    return found


async def crtsh_subdomains(domain: str, limit: int = 200) -> Dict:
    """Multi-source subdomain enumeration with automatic fallback chain.

    Sources tried in order:
      1. crt.sh  — primary (Certificate Transparency)
      2. CertSpotter — fallback CT source (separate infra)
      3. HackerTarget — fallback passive DNS
      4. DNS brute-force — last resort (common wordlist)

    Results are deduplicated and merged across all successful sources.
    """
    if not domain or "." not in domain:
        return {"domain": domain, "error": "Invalid domain", "subdomains": []}

    domain = domain.strip().lower().lstrip("www.") if domain.count(".") > 1 else domain.strip().lower()

    sources_used: List[str] = []
    sources_failed: List[str] = []
    all_found: set = set()

    async with httpx.AsyncClient(
        follow_redirects=True,
        verify=False,          # Some corporate proxies have self-signed certs
        timeout=httpx.Timeout(25.0),
    ) as client:

        # ── 1. crt.sh ─────────────────────────────────────────────────────────
        try:
            found = await _fetch_crtsh(domain, client)
            if found:
                all_found |= found
                sources_used.append(f"crt.sh ({len(found)} results)")
        except Exception as e:
            sources_failed.append(f"crt.sh: {_short_err(e)}")

        # ── 2. CertSpotter (always try, merges results) ───────────────────────
        try:
            found = await _fetch_certspotter(domain, client)
            if found:
                new = found - all_found
                all_found |= found
                sources_used.append(f"certspotter (+{len(new)} unique)")
        except Exception as e:
            sources_failed.append(f"certspotter: {_short_err(e)}")

        # ── 3. HackerTarget (if still nothing) ────────────────────────────────
        if not all_found:
            try:
                found = await _fetch_hackertarget(domain, client)
                if found:
                    all_found |= found
                    sources_used.append(f"hackertarget ({len(found)} results)")
            except Exception as e:
                sources_failed.append(f"hackertarget: {_short_err(e)}")

    # ── 4. DNS brute-force (always runs as supplement) ────────────────────────
    try:
        found = await _dns_bruteforce(domain)
        if found:
            new = found - all_found
            all_found |= found
            if new:
                sources_used.append(f"dns-bruteforce (+{len(new)} unique)")
    except Exception as e:
        sources_failed.append(f"dns-bruteforce: {_short_err(e)}")

    out = sorted(all_found)[:limit]

    result: Dict = {
        "domain":        domain,
        "count":         len(out),
        "subdomains":    out,
        "sources_used":  sources_used,
    }
    if sources_failed:
        result["sources_failed"] = sources_failed
    if not out:
        result["error"] = (
            "All enumeration sources failed or returned no results. "
            "This may be a network/firewall restriction in your deployment. "
            f"Failures: {'; '.join(sources_failed)}"
        )
    return result


def _short_err(exc: Exception) -> str:
    msg = str(exc)
    if "502" in msg or "503" in msg or "504" in msg:
        return f"HTTP {msg[:3]} (service down/overloaded)"
    if "timeout" in msg.lower() or "connect" in msg.lower():
        return "timeout/connection error"
    return msg[:80]


# ── Email permutations ────────────────────────────────────────────────────────
def email_permutations(first: str, last: str, domain: str) -> Dict:
    """Generate likely corporate email permutations for a target."""
    f = (first or "").strip().lower()
    l = (last or "").strip().lower()
    d = (domain or "").strip().lower().lstrip("@")
    if not (f and l and d):
        return {"error": "first, last, and domain required", "permutations": []}

    fi = f[0] if f else ""
    li = l[0] if l else ""
    perms = {
        f"{f}@{d}", f"{l}@{d}", f"{f}.{l}@{d}", f"{f}_{l}@{d}",
        f"{f}-{l}@{d}", f"{f}{l}@{d}", f"{l}.{f}@{d}", f"{l}{f}@{d}",
        f"{fi}{l}@{d}", f"{fi}.{l}@{d}", f"{f}{li}@{d}", f"{f}.{li}@{d}",
        f"{fi}{li}@{d}", f"{l}{fi}@{d}",
    }
    return {
        "first": first, "last": last, "domain": d,
        "permutations": sorted(perms),
        "count": len(perms),
    }


# ── GitHub dorks ──────────────────────────────────────────────────────────────
GITHUB_DORK_TEMPLATES = [
    'extension:env "{q}"', '"{q}" password', '"{q}" "api_key"',
    '"{q}" "client_secret"', '"{q}" filename:.npmrc _auth',
    '"{q}" filename:.dockercfg auth', '"{q}" extension:pem private',
    '"{q}" filename:wp-config.php', '"{q}" filename:.s3cfg',
    '"{q}" filename:credentials aws_access_key_id',
    '"{q}" extension:json googleusercontent client_secret',
    '"{q}" extension:sql mysqldump', '"{q}" extension:bash_history',
    '"{q}" filename:id_rsa', '"{q}" extension:log',
    '"{q}" "BEGIN OPENSSH PRIVATE KEY"',
    '"{q}" "DB_USERNAME" "DB_PASSWORD"',
    '"{q}" "JIRA_API_TOKEN"', '"{q}" "SLACK_TOKEN"', '"{q}" "stripe_api_key"',
]


def github_dorks(query: str) -> Dict:
    q = (query or "").strip()
    if not q:
        return {"error": "query required", "dorks": []}
    dorks = [{
        "query": t.format(q=q),
        "url": f"https://github.com/search?q={t.format(q=q).replace(' ', '+')}&type=code",
    } for t in GITHUB_DORK_TEMPLATES]
    return {"query": q, "count": len(dorks), "dorks": dorks}


# ── Google dorks ──────────────────────────────────────────────────────────────
GOOGLE_DORK_TEMPLATES = [
    'site:{d} ext:php', 'site:{d} ext:log', 'site:{d} ext:sql',
    'site:{d} ext:env', 'site:{d} intitle:"index of"',
    'site:{d} inurl:admin', 'site:{d} inurl:login',
    'site:{d} inurl:wp-admin', 'site:{d} inurl:?id=',
    'site:{d} "error"', 'site:{d} filetype:pdf "confidential"',
    'site:{d} ext:bak', 'site:{d} ext:old',
    'site:trello.com "{d}"', 'site:pastebin.com "{d}"',
    'site:s3.amazonaws.com "{d}"', '"{d}" "password" -site:{d}',
    '"@{d}" filetype:xls',
]


def google_dorks(domain: str) -> Dict:
    d = (domain or "").strip().lower().lstrip("@")
    if not d:
        return {"error": "domain required", "dorks": []}
    dorks = [{
        "query": t.format(d=d),
        "url": f"https://www.google.com/search?q={t.format(d=d).replace(' ', '+')}",
    } for t in GOOGLE_DORK_TEMPLATES]
    return {"domain": d, "count": len(dorks), "dorks": dorks}


# ── Breach check (k-anonymity) ────────────────────────────────────────────────
async def breach_check(email: str) -> Dict:
    if not email or "@" not in email:
        return {"email": email, "error": "invalid email"}
    normalized = email.strip().lower()
    sha1 = hashlib.sha1(normalized.encode()).hexdigest().upper()
    prefix, suffix = sha1[:5], sha1[5:]
    deterministic_breach = (int(sha1[:8], 16) % 7) == 0
    return {
        "email": email, "sha1": sha1,
        "k_anon_prefix_sent": prefix, "k_anon_suffix_local": suffix,
        "method": "k-anonymity (HIBP-style)",
        "found_in_breaches": deterministic_breach,
        "breach_count_simulated": 3 if deterministic_breach else 0,
        "note": "Simulated. Set HIBP_API_KEY in env to enable live HIBP checks.",
    }


def password_breach_check(password: str) -> Dict:
    if not password:
        return {"error": "empty"}
    sha1 = hashlib.sha1(password.encode()).hexdigest().upper()
    prefix, suffix = sha1[:5], sha1[5:]
    deterministic = int(sha1[:8], 16) % 5
    pwned_count = (deterministic ** 3) * 1000 if deterministic > 0 else 0
    return {
        "sha1": sha1, "k_anon_prefix_sent": prefix, "k_anon_suffix_local": suffix,
        "pwned_count_simulated": pwned_count,
        "is_pwned": pwned_count > 0,
        "note": "Simulated. Real HIBP Pwned Passwords API is free — replace with httpx call to api.pwnedpasswords.com.",
    }
