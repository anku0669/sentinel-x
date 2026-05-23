"""Bug Bounty Hub — recon checklist, CVSS, report templates, vuln library, wordlists.

A reference / workbench for authorized bug-bounty hunters and pentesters.
"""
import math
import re
from typing import Dict, List


# ----- BUG BOUNTY METHODOLOGY (recon → enumeration → exploit → report) -----

METHODOLOGY = {
    "phases": [
        {
            "name": "1. Scope Verification",
            "checks": [
                "Read program scope CAREFULLY — in-scope assets, OOS items, allowed test types",
                "Note rate limits, prohibited testing (DoS, social eng, physical)",
                "Check disclosure policy (public / coordinated / private)",
                "Save scope screenshot (programs change; you need proof)",
                "Note bounty range and severity model (CVSS / custom)",
            ],
        },
        {
            "name": "2. Passive Recon",
            "checks": [
                "crt.sh — find all subdomains via cert transparency logs",
                "Shodan / Censys / Fofa — exposed services, banners",
                "Wayback Machine — historical paths, removed endpoints",
                "Google dorks — site:target.com filetype:pdf, intext:'api_key'",
                "GitHub recon — leaked credentials, internal repos, hardcoded URLs",
                "Hunter.io / phonebook.cz — emails for password-spray context",
                "DNS history (SecurityTrails, DNSDumpster)",
                "ASN lookup — find all ranges owned by target",
            ],
        },
        {
            "name": "3. Active Recon",
            "checks": [
                "Subdomain enum: subfinder + amass + assetfinder + ffuf",
                "DNS bruteforce: puredns with massdns + Jhaddix all.txt",
                "Port scan: naabu / masscan → nmap on found ports",
                "HTTP probing: httpx with -title -status-code -tech-detect",
                "Web tech: wappalyzer / whatweb / webanalyze",
                "Screenshot all live hosts: gowitness / aquatone",
                "Find WAF: wafw00f",
                "TLS: testssl.sh, sslyze",
            ],
        },
        {
            "name": "4. Content Discovery",
            "checks": [
                "Directory bruteforce: feroxbuster / ffuf with raft / SecLists",
                "Parameter discovery: arjun / ParamSpider / x8",
                "JS file analysis: getJS, LinkFinder, jsleak — endpoints, secrets",
                "API discovery: kiterunner with API wordlists",
                "robots.txt, sitemap.xml, .well-known/, security.txt",
                "Hidden git: .git/, .svn/, .DS_Store, .env, backup.zip",
                "Wayback URLs: gau / waybackurls → filter for params/extensions",
            ],
        },
        {
            "name": "5. Vulnerability Hunting",
            "checks": [
                "OWASP Top 10 — systematic check on every endpoint",
                "IDOR — change IDs, UUIDs, JWT subs across users",
                "SSRF — every URL parameter, file uploads, webhooks, image processors",
                "XSS — reflected, stored, DOM, template injection",
                "SQLi / NoSQLi — sqlmap, manual error-based + blind tests",
                "XXE / XML — file uploads, SOAP, SAML",
                "Deserialization — cookies, viewstate, java serialized",
                "Auth bypass — JWT alg:none, signature stripping, kid header",
                "Race conditions — concurrent requests with Turbo Intruder",
                "Business logic — coupons, refunds, tier upgrades, multi-step flows",
                "RCE / Command injection on every input passing to system call",
                "SSTI — {{7*7}}, ${7*7}, <%= 7*7 %>",
                "OAuth flaws — open redirect, state misuse, scope confusion",
                "GraphQL — introspection, batching, depth limit, alias overload",
            ],
        },
        {
            "name": "6. Exploitation & Impact",
            "checks": [
                "Build clean PoC — minimal reproducer, no chaining unless needed",
                "Demonstrate real impact (data access, account takeover)",
                "Stop at proof — DO NOT exfil more data than necessary",
                "Record video/screenshots of full chain",
                "Document affected users / records counts (estimate, don't enumerate)",
            ],
        },
        {
            "name": "7. Report",
            "checks": [
                "Title: clear vuln class + asset",
                "Severity + CVSS vector",
                "Steps to reproduce — copy/paste commands",
                "PoC artifacts (video, screenshots, raw HTTP)",
                "Impact statement",
                "Remediation suggestion",
                "Credit / contact info",
            ],
        },
    ],
}


# ----- VULNERABILITY CLASS LIBRARY -----

VULN_CLASSES = [
    {
        "id": "idor",
        "name": "Insecure Direct Object Reference",
        "owasp": "A01:2021 Broken Access Control",
        "avg_payout": "$500 – $5,000",
        "where": ["/api/users/{id}", "/orders/{order_id}", "GET /api/v1/profile?user_id=..."],
        "test": [
            "Replace your ID with another user's ID",
            "Try sequential / UUID / hashed IDs",
            "Test in PUT/DELETE/PATCH (often missed)",
            "Try old API versions: /v1/, /v2/, /internal/",
        ],
        "fix": "Object-level authorization on every request. Use indirect references mapped per-user.",
        "tools": ["Burp Autorize", "Authmatrix", "ffuf"],
    },
    {
        "id": "ssrf",
        "name": "Server-Side Request Forgery",
        "owasp": "A10:2021 SSRF",
        "avg_payout": "$1,500 – $15,000",
        "where": ["URL/avatar import", "PDF/HTML render", "Webhooks", "Image proxies", "OAuth redirect_uri"],
        "test": [
            "http://169.254.169.254/latest/meta-data/ (AWS IMDSv1)",
            "http://metadata.google.internal/computeMetadata/v1/",
            "http://localhost:6379/ (Redis)",
            "gopher:// — internal protocol smuggling",
            "DNS rebinding for filter bypass",
            "file:///etc/passwd",
        ],
        "fix": "Allow-list of destination IPs. Block private ranges + 169.254.0.0/16. Use IMDSv2.",
        "tools": ["Burp Collaborator", "interactsh", "SSRFmap"],
    },
    {
        "id": "xss_stored",
        "name": "Stored XSS",
        "owasp": "A03:2021 Injection",
        "avg_payout": "$500 – $7,500",
        "where": ["Comments", "Profile fields", "File uploads (SVG/HTML)", "Email rendering"],
        "test": [
            "<script>alert(1)</script>",
            "<svg onload=alert(1)>",
            "Image with malicious EXIF",
            "SVG upload with embedded JS",
            "Markdown with <img src=x onerror=...>",
        ],
        "fix": "Output encoding by context. CSP with nonce/hash. HTML sanitizer (DOMPurify).",
        "tools": ["XSStrike", "DalFox", "BeEF"],
    },
    {
        "id": "rce",
        "name": "Remote Code Execution",
        "owasp": "A03:2021 Injection",
        "avg_payout": "$5,000 – $50,000+",
        "where": ["File upload", "Image processors (ImageMagick)", "Deserialization", "Template engines", "Eval inputs"],
        "test": [
            "ImageMagick: MVG/MSL polyglots",
            "Log4Shell: ${jndi:ldap://...}",
            "Spring4Shell: class.module.classLoader.*",
            "PHP unserialize gadgets",
            "Node prototype pollution → RCE",
        ],
        "fix": "Patch promptly. Sandboxing. Input allow-listing. Avoid eval/exec.",
        "tools": ["ysoserial", "marshalsec", "tplmap", "nuclei"],
    },
    {
        "id": "auth_bypass_jwt",
        "name": "JWT / Auth Bypass",
        "owasp": "A07:2021 Identification & Authentication Failures",
        "avg_payout": "$1,000 – $10,000",
        "where": ["Authorization header", "Cookie tokens", "API auth"],
        "test": [
            "alg:none — strip signature",
            "Weak HMAC secret — crack with hashcat / jwt-cracker",
            "Algorithm confusion (RS256 → HS256 with public key as secret)",
            "kid header injection / path traversal",
            "Replay old tokens",
        ],
        "fix": "Strict alg whitelist. Strong rotated keys. Short expirations. Reject 'none'.",
        "tools": ["jwt_tool", "jwt-cracker", "Burp JSON Web Tokens ext"],
    },
    {
        "id": "race_condition",
        "name": "Race Condition",
        "owasp": "A04:2021 Insecure Design",
        "avg_payout": "$1,500 – $15,000",
        "where": ["Coupon redemption", "Withdrawals", "Account creation", "MFA verification"],
        "test": [
            "Send 30 concurrent requests via Turbo Intruder",
            "Single-packet attack (HTTP/2)",
            "Look for off-by-one in business state",
        ],
        "fix": "Database row locks / transactions. Idempotency keys. Optimistic concurrency.",
        "tools": ["Burp Turbo Intruder", "race-the-web", "Frogger"],
    },
    {
        "id": "ssti",
        "name": "Server-Side Template Injection",
        "owasp": "A03:2021 Injection",
        "avg_payout": "$2,000 – $15,000",
        "where": ["Email templates", "PDF generators", "CMS preview", "User profile bios"],
        "test": [
            "{{7*7}} → 49? (Jinja2 / Twig)",
            "${7*7} → 49? (FreeMarker / Velocity)",
            "<%= 7*7 %> → 49? (ERB)",
            "{{config}} in Jinja → secrets disclosure",
        ],
        "fix": "Sandboxed template engines. Never let users control template syntax.",
        "tools": ["tplmap", "Burp + manual"],
    },
    {
        "id": "graphql",
        "name": "GraphQL Vulnerabilities",
        "owasp": "A05:2021 Security Misconfiguration",
        "avg_payout": "$500 – $10,000",
        "where": ["/graphql", "/api/graphql", "/v1/graphql"],
        "test": [
            "Introspection enabled in production",
            "Batched queries → DoS / auth bypass",
            "Field suggestions leak schema",
            "Deeply nested queries → resource exhaustion",
            "Alias overloading",
        ],
        "fix": "Disable introspection in prod. Depth + complexity limits. Per-field auth.",
        "tools": ["graphw00f", "InQL", "clairvoyance"],
    },
    {
        "id": "oauth",
        "name": "OAuth / SSO Flaws",
        "owasp": "A07:2021",
        "avg_payout": "$1,500 – $20,000",
        "where": ["/oauth/authorize", "redirect_uri", "/.well-known/oauth"],
        "test": [
            "redirect_uri to attacker-controlled origin",
            "state parameter missing → CSRF",
            "code reuse / no PKCE",
            "Account-link confusion (attacker pre-links email)",
            "Token leakage in Referer",
        ],
        "fix": "Strict redirect_uri matching. Mandatory state + PKCE. Short auth-code lifetime.",
        "tools": ["Burp + manual", "BApp Store: OAuthScan"],
    },
]


# ----- CVSS 3.1 BASE SCORE CALCULATOR -----

CVSS_METRICS = {
    "AV": {"N": 0.85, "A": 0.62, "L": 0.55, "P": 0.2},  # Attack Vector
    "AC": {"L": 0.77, "H": 0.44},  # Attack Complexity
    "PR": {  # Privileges Required (depends on Scope)
        "U": {"N": 0.85, "L": 0.62, "H": 0.27},
        "C": {"N": 0.85, "L": 0.68, "H": 0.5},
    },
    "UI": {"N": 0.85, "R": 0.62},  # User Interaction
    "S": ["U", "C"],  # Scope
    "C": {"N": 0, "L": 0.22, "H": 0.56},  # Confidentiality
    "I": {"N": 0, "L": 0.22, "H": 0.56},  # Integrity
    "A": {"N": 0, "L": 0.22, "H": 0.56},  # Availability
}


def calculate_cvss(vector: Dict) -> Dict:
    """Compute CVSS 3.1 base score from a metric dict.

    Required keys: AV, AC, PR, UI, S, C, I, A — each with one of valid values.
    """
    try:
        AV = CVSS_METRICS["AV"][vector["AV"]]
        AC = CVSS_METRICS["AC"][vector["AC"]]
        S = vector["S"]
        PR = CVSS_METRICS["PR"][S][vector["PR"]]
        UI = CVSS_METRICS["UI"][vector["UI"]]
        C = CVSS_METRICS["C"][vector["C"]]
        I = CVSS_METRICS["I"][vector["I"]]
        A = CVSS_METRICS["A"][vector["A"]]
    except KeyError as e:
        return {"error": f"invalid metric: {e}"}

    iss = 1 - ((1 - C) * (1 - I) * (1 - A))
    if S == "U":
        impact = 6.42 * iss
    else:
        impact = 7.52 * (iss - 0.029) - 3.25 * (iss - 0.02) ** 15

    exploitability = 8.22 * AV * AC * PR * UI

    if impact <= 0:
        base = 0.0
    elif S == "U":
        base = min(impact + exploitability, 10)
    else:
        base = min(1.08 * (impact + exploitability), 10)

    base = math.ceil(base * 10) / 10

    if base == 0: severity = "None"
    elif base < 4.0: severity = "Low"
    elif base < 7.0: severity = "Medium"
    elif base < 9.0: severity = "High"
    else: severity = "Critical"

    vector_str = "CVSS:3.1/" + "/".join(f"{k}:{vector[k]}" for k in ["AV", "AC", "PR", "UI", "S", "C", "I", "A"])

    return {
        "score": base,
        "severity": severity,
        "vector_string": vector_str,
        "impact_subscore": round(impact, 2),
        "exploitability_subscore": round(exploitability, 2),
    }


# ----- REPORT TEMPLATE GENERATOR -----

REPORT_TEMPLATE = """# {title}

**Severity:** {severity} ({cvss_score}/10)
**CVSS:** `{cvss_vector}`
**Asset:** {asset}
**Reporter:** {reporter}
**Date:** {date}

---

## Summary

{summary}

## Steps to Reproduce

{steps}

## Proof of Concept

```http
{poc}
```

## Impact

{impact}

## Recommended Fix

{fix}

## References

{refs}

---

*Reported via SENTINEL-X · {date}*
"""


def generate_report(
    title: str, severity: str = "High", cvss_score: float = 7.5,
    cvss_vector: str = "CVSS:3.1/AV:N/AC:L/PR:N/UI:N/S:U/C:H/I:H/A:N",
    asset: str = "https://target.com",
    reporter: str = "@yourhandle",
    summary: str = "Brief description of the vulnerability and its root cause.",
    steps: str = "1. Visit X\n2. Submit Y\n3. Observe Z",
    poc: str = "GET /api/users/123 HTTP/1.1\nHost: target.com\nAuthorization: Bearer ...",
    impact: str = "Attacker can read any user's profile data without authorization.",
    fix: str = "Implement object-level authorization on the endpoint.",
    refs: str = "- OWASP A01:2021\n- CWE-639",
    date: str = "",
) -> str:
    from datetime import datetime
    return REPORT_TEMPLATE.format(
        title=title, severity=severity, cvss_score=cvss_score, cvss_vector=cvss_vector,
        asset=asset, reporter=reporter, summary=summary, steps=steps, poc=poc,
        impact=impact, fix=fix, refs=refs,
        date=date or datetime.utcnow().strftime("%Y-%m-%d"),
    )


# ----- WORDLISTS -----

WORDLISTS = {
    "common_dirs": [
        "admin", "api", "backup", "config", "db", "debug", "dev", "docs",
        "files", "images", "include", "internal", "js", "logs", "old",
        "private", "secret", "staging", "static", "test", "tmp", "upload",
        "uploads", "v1", "v2", "v3", "wp-admin", "wp-content", ".git",
        ".env", ".aws", "robots.txt", "sitemap.xml", ".well-known/security.txt",
        "phpinfo.php", "info.php", "server-status", "server-info",
        ".DS_Store", "Thumbs.db", "actuator", "actuator/env",
    ],
    "common_params": [
        "id", "user", "user_id", "uid", "username", "email", "token", "key",
        "api_key", "session", "redirect", "url", "next", "callback", "return",
        "file", "filename", "path", "dir", "page", "include", "cmd", "exec",
        "query", "search", "q", "lang", "locale", "debug", "test", "dev",
    ],
    "lfi_payloads": [
        "../../../etc/passwd",
        "....//....//....//etc/passwd",
        "/etc/passwd%00",
        "..%252f..%252f..%252fetc/passwd",
        "C:\\Windows\\System32\\drivers\\etc\\hosts",
        "php://filter/convert.base64-encode/resource=index.php",
        "expect://id",
    ],
    "ssrf_payloads": [
        "http://127.0.0.1:80/",
        "http://localhost/",
        "http://[::]:80/",
        "http://169.254.169.254/latest/meta-data/",
        "http://metadata.google.internal/computeMetadata/v1/",
        "http://169.254.170.2/v2/credentials/",
        "gopher://127.0.0.1:6379/_INFO",
        "file:///etc/passwd",
        "dict://localhost:11211/stats",
    ],
    "subdomains_top": [
        "www", "mail", "ftp", "admin", "api", "dev", "staging", "test",
        "demo", "portal", "vpn", "remote", "intranet", "blog", "shop",
        "store", "support", "help", "docs", "status", "git", "jenkins",
        "jira", "confluence", "grafana", "prometheus", "kubernetes", "k8s",
        "internal", "corp", "old", "beta", "alpha", "preview", "cdn",
        "static", "assets", "media", "img", "video", "stream", "auth",
        "sso", "login", "secure", "pay", "billing", "account", "my",
    ],
}


# ----- BUG BOUNTY PLATFORMS -----

PLATFORMS = [
    {"name": "HackerOne", "url": "https://hackerone.com", "type": "public + private", "payouts": "$50 – $1M+"},
    {"name": "Bugcrowd", "url": "https://bugcrowd.com", "type": "public + private", "payouts": "$50 – $500k+"},
    {"name": "Intigriti", "url": "https://intigriti.com", "type": "EU-focused", "payouts": "€50 – €100k+"},
    {"name": "YesWeHack", "url": "https://yeswehack.com", "type": "EU + global", "payouts": "€100 – €100k+"},
    {"name": "Synack Red Team", "url": "https://synack.com", "type": "private invite-only", "payouts": "varies"},
    {"name": "Open Bug Bounty", "url": "https://openbugbounty.org", "type": "non-profit / responsible disc.", "payouts": "kudos / no $"},
    {"name": "Google VRP", "url": "https://bughunters.google.com", "type": "vendor-direct", "payouts": "up to $1.5M (Android)"},
    {"name": "Microsoft MSRC", "url": "https://msrc.microsoft.com", "type": "vendor-direct", "payouts": "up to $250k"},
    {"name": "Apple Security Bounty", "url": "https://security.apple.com/bounty", "type": "vendor-direct", "payouts": "up to $2M (kernel)"},
    {"name": "Meta Bug Bounty", "url": "https://bugbounty.meta.com", "type": "vendor-direct", "payouts": "up to $300k+"},
]


def methodology() -> Dict:
    return METHODOLOGY


def vuln_classes() -> List[Dict]:
    return VULN_CLASSES


def get_vuln_class(vid: str) -> Dict:
    return next((v for v in VULN_CLASSES if v["id"] == vid), None) or {"error": "not found"}


def wordlist(name: str) -> Dict:
    return {"name": name, "items": WORDLISTS.get(name, [])}


def all_wordlists() -> List[str]:
    return list(WORDLISTS.keys())


def platforms() -> List[Dict]:
    return PLATFORMS
