"""AI Security Analyst — rule-based intelligent assistant.

Provides expert-style security analysis without external API dependencies.
Replace _generate_response with an LLM call (OpenAI/Anthropic) for production.
"""
import re
import random


KB = {
    "sql_injection": {
        "summary": "SQL Injection (SQLi) — attackers inject malicious SQL into application queries.",
        "detection": [
            "Look for unusual chars in input: ' \" -- ; UNION SELECT",
            "Monitor query timings — time-based blind SQLi causes delays",
            "WAF rules: ModSecurity CRS, AWS WAF SQLi managed rules",
        ],
        "mitigation": [
            "Use parameterized queries / prepared statements",
            "Apply principle of least privilege on DB users",
            "Input validation + allow-listing",
            "Deploy a WAF in blocking mode",
        ],
        "tools": ["sqlmap", "Burp Suite", "OWASP ZAP"],
    },
    "xss": {
        "summary": "Cross-Site Scripting (XSS) — attackers inject scripts into pages other users view.",
        "detection": [
            "Search logs for <script>, onerror=, javascript: in params",
            "CSP violation reports",
            "DOM-based XSS — review JS sinks like innerHTML, eval",
        ],
        "mitigation": [
            "Output encoding by context (HTML, JS, URL, attribute)",
            "Strict Content-Security-Policy header",
            "HttpOnly + Secure cookies",
            "Use frameworks that auto-escape (React, Vue)",
        ],
        "tools": ["XSStrike", "DalFox", "Burp Suite"],
    },
    "ransomware": {
        "summary": "Ransomware encrypts files and demands payment. Often delivered via phishing or RDP.",
        "detection": [
            "Mass file modifications in short window",
            "Shadow copy deletion (vssadmin delete shadows)",
            "Suspicious processes: rundll32 from unusual paths, encoded PowerShell",
        ],
        "mitigation": [
            "Offline + immutable backups (3-2-1 rule)",
            "EDR with behavioral detection",
            "MFA on all remote access",
            "Patch SMB / RDP exposures (EternalBlue, BlueKeep)",
            "Network segmentation",
        ],
        "tools": ["CrowdStrike", "SentinelOne", "Velociraptor", "KAPE"],
    },
    "privilege_escalation": {
        "summary": "Privilege escalation lets attackers gain higher system rights.",
        "detection": [
            "Unusual sudo commands or unknown users in sudoers",
            "New service accounts or scheduled tasks",
            "Linux: SUID binary abuse, capability misuse",
            "Windows: token impersonation, named pipe hijack",
        ],
        "mitigation": [
            "Least-privilege IAM",
            "Patch kernel + OS regularly",
            "Disable unused SUID binaries",
            "EDR alerts on token manipulation",
        ],
        "tools": ["LinPEAS", "WinPEAS", "BloodHound", "Sysmon"],
    },
    "phishing": {
        "summary": "Phishing — social-engineering attacks via email/SMS to steal creds or deliver malware.",
        "detection": [
            "DMARC/DKIM/SPF failures",
            "Lookalike domains (homoglyph attacks)",
            "Unusual sender → recipient patterns",
        ],
        "mitigation": [
            "Enforce DMARC reject policy",
            "Phishing-resistant MFA (FIDO2)",
            "Security awareness training",
            "URL rewriting / sandboxing email gateways",
        ],
        "tools": ["GoPhish (sim)", "PhishTool", "URLScan.io"],
    },
    "ddos": {
        "summary": "DDoS — attacker floods target with traffic to exhaust resources.",
        "detection": [
            "Sudden RPS spike from many sources",
            "Unusual SYN/ACK ratios",
            "Geographic concentration anomalies",
        ],
        "mitigation": [
            "Cloudflare / AWS Shield / Akamai",
            "Rate-limiting at edge",
            "Anycast + horizontal scaling",
            "Block known botnet ASNs",
        ],
        "tools": ["fastnetmon", "wanguard", "Cloudflare Magic Transit"],
    },
}

OFFENSIVE_TIPS = [
    "Always start with passive recon — Shodan, crt.sh, archive.org — before touching the target.",
    "Enumerate before exploit. Hard tasks get easy with deep enumeration.",
    "Check default creds first. You'd be amazed how often admin/admin still works.",
    "Review the source code if you can — it's the fastest path to logic bugs.",
    "Pivot through the network with chisel/ligolo-ng once you have a foothold.",
    "Document everything — your future self and your report will thank you.",
]

DEFENSIVE_TIPS = [
    "Trust nothing — Zero Trust starts with strong identity (FIDO2 > SMS).",
    "Detection > Prevention. Assume breach and instrument heavily.",
    "Patch your edge first: VPN, firewall, email gateway. That's where APTs hit.",
    "Centralize logs. You can't detect what you can't see.",
    "Run tabletop exercises every quarter — find gaps before adversaries do.",
    "Inventory assets ruthlessly. Shadow IT kills incident response.",
]


def _match_topic(message: str) -> str | None:
    msg = message.lower()
    keywords = {
        "sql_injection": ["sqli", "sql injection", "union select", "sqlmap"],
        "xss": ["xss", "cross site scripting", "cross-site scripting", "stored xss", "reflected xss"],
        "ransomware": ["ransomware", "wannacry", "lockbit", "encrypted my files"],
        "privilege_escalation": ["privesc", "privilege escalation", "sudo abuse", "root me"],
        "phishing": ["phish", "spear phish", "smishing", "social engineering email"],
        "ddos": ["ddos", "denial of service", "flood attack", "syn flood"],
    }
    for topic, kws in keywords.items():
        if any(k in msg for k in kws):
            return topic
    return None


def ask_analyst(message: str, context: str = "general") -> dict:
    topic = _match_topic(message)
    if topic and topic in KB:
        kb = KB[topic]
        return {
            "topic": topic,
            "summary": kb["summary"],
            "detection": kb["detection"],
            "mitigation": kb["mitigation"],
            "recommended_tools": kb["tools"],
            "context": context,
            "follow_up": "Want a runbook, MITRE ATT&CK mapping, or detection rule (Sigma/YARA)?",
        }

    # Generic helpful response
    msg = message.lower()
    if any(w in msg for w in ["recon", "enumerate", "scan first"]):
        return {"topic": "recon_strategy", "advice": OFFENSIVE_TIPS[:3], "context": context}
    if any(w in msg for w in ["harden", "secure", "best practice"]):
        return {"topic": "hardening", "advice": DEFENSIVE_TIPS[:3], "context": context}
    if "tip" in msg:
        bag = OFFENSIVE_TIPS if context == "offensive" else DEFENSIVE_TIPS if context == "defensive" else OFFENSIVE_TIPS + DEFENSIVE_TIPS
        return {"topic": "tip_of_the_day", "advice": [random.choice(bag)], "context": context}

    return {
        "topic": "general",
        "summary": (
            "I'm SENTINEL-X AI Analyst. Ask me about specific threats (SQLi, XSS, ransomware, phishing, DDoS, "
            "privilege escalation), recon strategy, or defensive hardening. You can also request runbooks, "
            "MITRE ATT&CK mappings, or detection rules."
        ),
        "suggestions": [
            "How do I detect SQL injection in my logs?",
            "Give me a ransomware mitigation checklist.",
            "What's the best recon order for a black-box pentest?",
            "Explain BlueKeep (CVE-2019-0708) in 3 lines.",
        ],
        "context": context,
    }
