"""Phishing Simulation Lab — authorized awareness-training tool.

PURPOSE: Generate phishing email templates for INTERNAL employee awareness
training and red-team engagements with explicit authorization. Includes a
header / URL analyzer to TEACH employees what red flags look like.

DOES NOT include credential-harvesting infrastructure or anything that
could be used as a turnkey attack tool. This is the same pattern as
GoPhish, KnowBe4, Hoxhunt — legitimate awareness training tooling.

ETHICAL USE: Only deploy templates against your own org with explicit
written approval from leadership / IT.
"""
import re
import random
from datetime import datetime
from typing import Dict, List


# ----- TEMPLATES -----
# Each template is a teaching example showing common phishing patterns.
# Use placeholders {{NAME}}, {{COMPANY}}, {{LINK}}, {{SENDER}} for campaigns.

TEMPLATES = [
    {
        "id": "ceo_fraud",
        "name": "CEO / Executive Impersonation",
        "category": "BEC (Business Email Compromise)",
        "difficulty": "high",
        "subject": "Quick favor — need this handled today",
        "body": (
            "Hi {{NAME}},\n\n"
            "I'm in back-to-back meetings all day but I need you to handle "
            "something urgent and confidential. Are you at your desk?\n\n"
            "Please reply asap.\n\n"
            "Sent from my iPhone\n"
            "{{SENDER_NAME}}, CEO"
        ),
        "indicators_taught": [
            "Urgency + secrecy combo ('confidential', 'asap')",
            "Mobile-signature excuse ('Sent from iPhone') to explain typos / brevity",
            "No specific task — invites a reply that opens dialogue",
            "Sender display name impersonation (verify reply-to address)",
        ],
        "mitigation": "Out-of-band verification. Always confirm financial or sensitive requests via phone or in-person.",
    },
    {
        "id": "it_password_reset",
        "name": "IT Password Reset",
        "category": "Credential Phishing",
        "difficulty": "medium",
        "subject": "[ACTION REQUIRED] Your {{COMPANY}} password expires in 24h",
        "body": (
            "Hi {{NAME}},\n\n"
            "Our records show your {{COMPANY}} password is set to expire within 24 hours. "
            "To avoid account lockout, please verify and update your password immediately.\n\n"
            "Click here to update: {{LINK}}\n\n"
            "If you don't take action, your account will be temporarily disabled.\n\n"
            "{{COMPANY}} IT Support"
        ),
        "indicators_taught": [
            "Manufactured urgency / deadline",
            "Generic threat ('account will be disabled')",
            "External-looking URL disguised as internal IT",
            "Lack of personalization beyond first name",
        ],
        "mitigation": "Real password resets happen in your IdP (Okta, Azure AD). Type the URL yourself.",
    },
    {
        "id": "package_delivery",
        "name": "Package Delivery Notification",
        "category": "Brand Impersonation",
        "difficulty": "low",
        "subject": "Your package #{{TRACKING}} could not be delivered",
        "body": (
            "Hi,\n\n"
            "We attempted delivery of your package today but were unable to complete it. "
            "Please confirm your delivery address within 48 hours to avoid return-to-sender.\n\n"
            "Confirm address: {{LINK}}\n\n"
            "Tracking: {{TRACKING}}\n\n"
            "USPS / FedEx / DHL Customer Service"
        ),
        "indicators_taught": [
            "Generic salutation ('Hi,' — no name)",
            "Vague carrier identification (multiple brands listed)",
            "Time pressure ('48 hours')",
            "Action button leads to non-carrier domain",
        ],
        "mitigation": "Track packages directly on the carrier's official site/app. Never click links in delivery emails.",
    },
    {
        "id": "invoice_attachment",
        "name": "Invoice / Document Phishing",
        "category": "Malware Delivery",
        "difficulty": "high",
        "subject": "Invoice #{{INV_NUM}} from {{VENDOR}} — payment required",
        "body": (
            "Hello,\n\n"
            "Please find attached invoice #{{INV_NUM}} from {{VENDOR}} for services rendered "
            "in the previous billing period. Payment is due within 7 days of receipt.\n\n"
            "[ View Invoice ({{LINK}}) ]\n\n"
            "If you have questions about this invoice, please contact accounts@{{VENDOR}}.com.\n\n"
            "Best regards,\n"
            "{{VENDOR}} Accounting"
        ),
        "indicators_taught": [
            "Unrecognized vendor name",
            "Pressure to open attachment / link to view 'invoice'",
            "Often delivers Emotet, IcedID, QakBot family malware",
            "Frequently spoofs sender domain",
        ],
        "mitigation": "Verify all invoices through finance team. Open attachments only in sandboxed viewer.",
    },
    {
        "id": "calendar_invite",
        "name": "Fake Calendar Invite",
        "category": "Social Engineering",
        "difficulty": "high",
        "subject": "Meeting invite: Q4 Performance Review",
        "body": (
            "{{NAME}},\n\n"
            "You've been added to a meeting:\n\n"
            "Q4 Performance Review\n"
            "{{DATE}} · 30 minutes\n"
            "Microsoft Teams Meeting\n\n"
            "Join meeting → {{LINK}}\n\n"
            "Sent on behalf of HR via Microsoft Outlook"
        ),
        "indicators_taught": [
            "Anxiety-inducing topic (performance review)",
            "Looks like genuine Outlook formatting",
            "Direct join link bypasses normal calendar UI",
            "No actual calendar entry created",
        ],
        "mitigation": "Always join meetings via your calendar app, never email links.",
    },
    {
        "id": "mfa_bypass",
        "name": "MFA Fatigue / Push Bombing",
        "category": "Credential Phishing",
        "difficulty": "high",
        "subject": "Approve sign-in to {{SERVICE}}",
        "body": (
            "Hi {{NAME}},\n\n"
            "We detected a sign-in attempt to your {{SERVICE}} account from a new device. "
            "If this was you, please approve the request in your authenticator app.\n\n"
            "If you did not initiate this, please review recent activity: {{LINK}}\n\n"
            "{{SERVICE}} Security Team"
        ),
        "indicators_taught": [
            "Trains user to blindly approve push notifications",
            "Often combined with MFA-bombing (repeated push spam)",
            "Real attack pattern used in Uber 2022 breach",
        ],
        "mitigation": "Use number-matching MFA or FIDO2/WebAuthn. Never approve unrequested pushes.",
    },
    {
        "id": "shared_doc",
        "name": "Shared Document (Google/SharePoint)",
        "category": "Credential Phishing",
        "difficulty": "medium",
        "subject": "{{COLLEAGUE}} shared a document with you",
        "body": (
            "{{COLLEAGUE}} has shared a document with you:\n\n"
            "📄 \"Q4 Strategy - Confidential.docx\"\n\n"
            "Open document → {{LINK}}\n\n"
            "This file is hosted on Google Drive. Sign in with your work account to view."
        ),
        "indicators_taught": [
            "Curiosity hook ('Confidential' document)",
            "Lookalike Google / Microsoft sign-in page on click",
            "Often spoofs an actual colleague's name",
        ],
        "mitigation": "Verify shares via direct chat with colleague. Check sign-in URL bar carefully.",
    },
    {
        "id": "hr_benefits",
        "name": "HR Benefits Enrollment",
        "category": "Credential Phishing",
        "difficulty": "low",
        "subject": "Open Enrollment for 2026 Benefits — action required",
        "body": (
            "Hi {{NAME}},\n\n"
            "Open enrollment for your 2026 benefits closes this Friday. To make your selections "
            "(health, dental, vision, 401k), log in to the benefits portal:\n\n"
            "{{LINK}}\n\n"
            "If you do not make selections by the deadline, your current benefits will roll over.\n\n"
            "{{COMPANY}} HR Team"
        ),
        "indicators_taught": [
            "Time-bound HR action",
            "Universally relevant topic",
            "Often spoofs internal HR sender",
        ],
        "mitigation": "HR portals are usually accessible via your SSO dashboard. Navigate there directly.",
    },
]


def list_templates() -> List[Dict]:
    return [{k: v for k, v in t.items()} for t in TEMPLATES]


def get_template(template_id: str, variables: Dict = None) -> Dict:
    t = next((x for x in TEMPLATES if x["id"] == template_id), None)
    if not t:
        return {"error": "template not found"}
    out = dict(t)
    body = out["body"]
    subject = out["subject"]
    if variables:
        for k, v in variables.items():
            body = body.replace(f"{{{{{k}}}}}", str(v))
            subject = subject.replace(f"{{{{{k}}}}}", str(v))
    out["rendered_subject"] = subject
    out["rendered_body"] = body
    return out


# ----- PHISHING ANALYZER -----
# Detects suspicious patterns in emails/URLs.

URGENCY_TERMS = [
    "urgent", "immediately", "action required", "asap", "right away",
    "expires", "within 24 hours", "deadline", "final notice", "last warning",
    "account will be", "suspended", "locked", "disabled", "verify now",
]

THREAT_TERMS = [
    "suspended", "terminate", "legal action", "fine", "penalty",
    "unauthorized", "breach", "compromise", "blocked",
]

GREETING_RED_FLAGS = [
    r"\bdear (customer|user|sir/madam|valued customer|account holder)\b",
    r"^hi,$", r"^hello,$", r"^greetings,$",
]

SUSPICIOUS_TLDS = {
    ".tk", ".ml", ".ga", ".cf", ".gq", ".xyz", ".top", ".club",
    ".info", ".online", ".click", ".loan", ".work", ".support",
}

KNOWN_BRANDS = {
    "paypal": "paypal.com",
    "microsoft": "microsoft.com",
    "google": "google.com",
    "apple": "apple.com",
    "amazon": "amazon.com",
    "netflix": "netflix.com",
    "facebook": "facebook.com",
    "linkedin": "linkedin.com",
    "github": "github.com",
    "dhl": "dhl.com",
    "fedex": "fedex.com",
    "ups": "ups.com",
    "usps": "usps.com",
    "instagram": "instagram.com",
    "whatsapp": "whatsapp.com",
}


def analyze_email(content: str, sender: str = "", urls: List[str] = None) -> Dict:
    """Analyze an email body / headers / URLs for phishing indicators."""
    findings = []
    score = 0
    text = (content or "").lower()

    # Urgency
    urg_hits = [t for t in URGENCY_TERMS if t in text]
    if urg_hits:
        findings.append({"category": "urgency", "severity": "high", "label": "Urgency / time-pressure language", "evidence": urg_hits[:5]})
        score += min(len(urg_hits) * 6, 25)

    # Threats
    thr_hits = [t for t in THREAT_TERMS if t in text]
    if thr_hits:
        findings.append({"category": "threat", "severity": "high", "label": "Threatening language", "evidence": thr_hits[:5]})
        score += min(len(thr_hits) * 5, 20)

    # Generic greeting
    for pat in GREETING_RED_FLAGS:
        if re.search(pat, text, re.I | re.M):
            findings.append({"category": "personalization", "severity": "medium", "label": "Generic / impersonal greeting"})
            score += 8
            break

    # Sender analysis
    if sender:
        sender_l = sender.lower()
        # Display-name spoofing pattern: "Brand Name <unrelated@domain>"
        m = re.search(r"<([^>]+)>", sender)
        if m:
            email = m.group(1)
            display = sender.split("<")[0].strip().strip('"').lower()
            for brand, real in KNOWN_BRANDS.items():
                if brand in display and real not in email.lower():
                    findings.append({
                        "category": "sender_spoofing", "severity": "critical",
                        "label": f"Display name claims '{brand}' but email is from {email.split('@')[-1] if '@' in email else email}",
                    })
                    score += 30
                    break
        # Free webmail for "corporate" sender
        if any(d in sender_l for d in ["@gmail.com", "@yahoo.com", "@hotmail.com", "@outlook.com"]) and \
           any(b in sender_l for b in KNOWN_BRANDS):
            findings.append({"category": "sender_anomaly", "severity": "high", "label": "Brand impersonation from free webmail"})
            score += 22

    # URL extraction & analysis
    found_urls = list(urls or [])
    found_urls += re.findall(r"https?://[^\s<>\"']+", content or "")
    for url in found_urls[:20]:
        url_findings = analyze_url(url)
        if url_findings["risk_score"] > 0:
            findings.append({
                "category": "suspicious_url", "severity": url_findings["severity"],
                "label": f"Suspicious URL: {url[:80]}",
                "evidence": url_findings["reasons"], "url": url,
            })
            score += min(url_findings["risk_score"] // 2, 20)

    # Attachment hints
    if re.search(r"\.(exe|zip|rar|iso|js|vbs|hta|scr|lnk|docm|xlsm)\b", text, re.I):
        findings.append({"category": "attachment", "severity": "high", "label": "Risky attachment file type referenced"})
        score += 15

    # MFA-fatigue keywords
    if re.search(r"\b(approve|confirm)\s+(sign-?in|login|push|request)\b", text, re.I):
        findings.append({"category": "mfa_fatigue", "severity": "high", "label": "Possible MFA push-bombing / fatigue attempt"})
        score += 18

    # HTML link masking — anchor text contains a different URL than href
    href_match = re.search(r'<a\s+[^>]*href=["\'](https?://[^"\']+)["\'][^>]*>([^<]+)</a>', content or "", re.I)
    if href_match:
        href_url = href_match.group(1).lower()
        anchor_text = href_match.group(2).strip().lower()
        # If anchor text looks like a URL but differs from href domain
        if "http" in anchor_text or "." in anchor_text:
            anchor_domain = re.sub(r"^https?://", "", anchor_text).split("/")[0]
            href_domain = re.sub(r"^https?://", "", href_url).split("/")[0]
            if anchor_domain and href_domain and anchor_domain not in href_domain and href_domain not in anchor_domain:
                findings.append({"category": "link_disguise", "severity": "high", "label": f"Link text '{anchor_domain}' but actual URL '{href_domain}'"})
                score += 18

    # Score capping + rating
    score = min(score, 100)
    if score >= 70: rating = "ALMOST CERTAINLY PHISHING"
    elif score >= 45: rating = "LIKELY PHISHING"
    elif score >= 25: rating = "SUSPICIOUS"
    elif score >= 10: rating = "MILD CONCERNS"
    else: rating = "LOOKS BENIGN"

    return {
        "score": score,
        "rating": rating,
        "findings": findings,
        "url_count": len(found_urls),
        "scanned_at": datetime.utcnow().isoformat(),
    }


def analyze_url(url: str) -> Dict:
    """Inspect a URL for homograph, suspicious TLD, IP-based, redirect-stuffing, etc."""
    reasons = []
    score = 0
    if not url:
        return {"url": url, "risk_score": 0, "reasons": [], "severity": "low"}

    u = url.strip()
    # IP-based URL
    if re.search(r"https?://\d{1,3}(\.\d{1,3}){3}", u):
        reasons.append("Uses raw IP instead of domain"); score += 25

    # Suspicious TLD
    for tld in SUSPICIOUS_TLDS:
        if u.lower().endswith(tld) or tld + "/" in u.lower():
            reasons.append(f"Suspicious TLD: {tld}"); score += 15
            break

    # Homograph / brand impersonation
    domain = re.sub(r"^https?://", "", u).split("/")[0].lower()
    for brand, real in KNOWN_BRANDS.items():
        if brand in domain and real not in domain:
            # Common tricks: paypa1.com, paypal-secure.com, paypa.l.support.tk
            if re.search(brand + r"[-.0-9]", domain) or any(x in domain for x in ["secure", "verify", "login", "account"]) and brand in domain:
                reasons.append(f"Possible {brand} impersonation: {domain}")
                score += 30
                break

    # Excessive subdomains
    sub_count = domain.count(".")
    if sub_count >= 4:
        reasons.append(f"Excessive subdomains ({sub_count})"); score += 10

    # @ in URL (older trick)
    if "@" in u.split("//", 1)[-1]:
        reasons.append("'@' in URL (auth-bypass trick)"); score += 18

    # Punycode
    if "xn--" in u.lower():
        reasons.append("Punycode (possible homograph attack)"); score += 22

    # URL shorteners
    if any(s in domain for s in ["bit.ly", "tinyurl.com", "t.co", "goo.gl", "ow.ly", "is.gd", "buff.ly"]):
        reasons.append(f"URL shortener ({domain}) — destination unknown"); score += 12

    # Long URL (often used to hide real destination after subdomain stuffing)
    if len(u) > 150:
        reasons.append("Unusually long URL"); score += 6

    score = min(score, 100)
    severity = "critical" if score >= 50 else "high" if score >= 25 else "medium" if score >= 10 else "low"
    return {"url": u, "domain": domain, "risk_score": score, "reasons": reasons, "severity": severity}


def lookalike_domains(brand_domain: str) -> List[str]:
    """Generate likely lookalike / typo-squat variants of a brand domain (defensive monitoring)."""
    if not brand_domain or "." not in brand_domain:
        return []
    name, tld = brand_domain.rsplit(".", 1)
    out = set()

    # Character substitution
    swaps = {"o": "0", "i": "1", "l": "1", "e": "3", "a": "@", "s": "5"}
    for orig, rep in swaps.items():
        if orig in name:
            out.add(name.replace(orig, rep, 1) + "." + tld)

    # Adjacent doubling
    for i in range(len(name) - 1):
        out.add(name[:i] + name[i] * 2 + name[i+1:] + "." + tld)

    # Adjacent transposition
    for i in range(len(name) - 1):
        out.add(name[:i] + name[i+1] + name[i] + name[i+2:] + "." + tld)

    # Hyphen insertion + suffixes
    suffixes = ["-secure", "-login", "-verify", "-support", "-account", "-update"]
    for s in suffixes:
        out.add(name + s + "." + tld)

    # Different TLDs
    for alt_tld in ["co", "net", "info", "online", "support", "xyz", "tk", "io"]:
        if alt_tld != tld:
            out.add(name + "." + alt_tld)

    # Plural / hyphenation
    out.add(name + "s." + tld)

    # Drop original
    out.discard(brand_domain)
    return sorted(out)[:30]
