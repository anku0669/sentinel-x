"""PDF Report Generator — one-click engagement report export.

Generates a polished PDF with:
- Cover page (target, analyst, date)
- Executive summary
- Findings table with severity colour coding
- MITRE ATT&CK technique mappings
- Per-finding detail sections with remediation advice
- Appendix: raw scan data

Dependencies (already in requirements.txt):
    reportlab>=4.0
"""
from __future__ import annotations

import io
from datetime import datetime
from typing import Any

from reportlab.lib import colors
from reportlab.lib.enums import TA_CENTER, TA_LEFT
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
from reportlab.lib.units import cm
from reportlab.platypus import (
    HRFlowable, PageBreak, Paragraph, SimpleDocTemplate, Spacer, Table,
    TableStyle,
)

# ── Colour palette (matches SENTINEL-X glass-morphism brand) ─────────────────
CYAN   = colors.HexColor("#00f5ff")
PURPLE = colors.HexColor("#a855f7")
DARK   = colors.HexColor("#0d1117")
WHITE  = colors.white
CRITICAL_COLOR = colors.HexColor("#ef4444")
HIGH_COLOR     = colors.HexColor("#f97316")
MEDIUM_COLOR   = colors.HexColor("#eab308")
LOW_COLOR      = colors.HexColor("#22c55e")
INFO_COLOR     = colors.HexColor("#3b82f6")

SEV_COLOR = {
    "critical": CRITICAL_COLOR,
    "high":     HIGH_COLOR,
    "medium":   MEDIUM_COLOR,
    "low":      LOW_COLOR,
    "info":     INFO_COLOR,
}

MITRE_MAP = {
    "sql_injection":        ("T1190", "Exploit Public-Facing Application"),
    "xss":                  ("T1059.007", "Command & Scripting Interpreter: JavaScript"),
    "brute_force":          ("T1110", "Brute Force"),
    "ddos":                 ("T1498", "Network Denial of Service"),
    "malware_c2":           ("T1071", "Application Layer Protocol (C2)"),
    "port_scan":            ("T1046", "Network Service Discovery"),
    "ransomware":           ("T1486", "Data Encrypted for Impact"),
    "phishing":             ("T1566", "Phishing"),
    "rce":                  ("T1203", "Exploitation for Client Execution"),
    "privilege_escalation": ("T1068", "Exploitation for Privilege Escalation"),
    "data_exfiltration":    ("T1041", "Exfiltration Over C2 Channel"),
    "crypto_mining":        ("T1496", "Resource Hijacking"),
    "prompt_injection":     ("AML.T0051", "LLM Prompt Injection (MITRE ATLAS)"),
    "jailbreak":            ("AML.T0054", "LLM Jailbreak (MITRE ATLAS)"),
}

REMEDIATION = {
    "sql_injection":        "Use parameterised queries / prepared statements. Deploy WAF with SQLi ruleset.",
    "xss":                  "Implement strict Content-Security-Policy. Output-encode all user-controlled data.",
    "brute_force":          "Enforce account lockout + CAPTCHA. Require MFA on all externally-exposed services.",
    "ddos":                 "Deploy CDN-level DDoS mitigation (Cloudflare Magic Transit / AWS Shield Advanced).",
    "malware_c2":           "Block known C2 domains via DNS sinkholing. Deploy EDR with network telemetry.",
    "port_scan":            "Firewall egress; alert on sequential connection patterns using Zeek/Suricata.",
    "ransomware":           "Maintain offline backups (3-2-1 rule). Segment network. Patch SMB/RDP.",
    "phishing":             "Enforce DMARC reject policy. Deploy FIDO2 MFA. Run regular phishing simulations.",
    "rce":                  "Patch Log4j to >= 2.17. Disable JNDI. Validate and sanitise all input.",
    "privilege_escalation": "Apply least-privilege IAM. Monitor sudo logs. Patch kernel regularly.",
    "data_exfiltration":    "Enable DLP on network egress. Alert on large transfers to non-corporate ASNs.",
    "crypto_mining":        "Monitor for CPU/GPU spikes. Block known mining pool IPs at firewall.",
    "prompt_injection":     "Sanitise LLM inputs. Use a prompt firewall (NeMo Guardrails / Rebuff).",
    "jailbreak":            "Implement output classifiers. Log and review unusual LLM interactions.",
}


# ── Styles ────────────────────────────────────────────────────────────────────
def _build_styles():
    base = getSampleStyleSheet()
    styles = {
        "cover_title": ParagraphStyle(
            "cover_title", parent=base["Title"],
            fontSize=28, textColor=CYAN, spaceAfter=6, alignment=TA_CENTER,
        ),
        "cover_sub": ParagraphStyle(
            "cover_sub", parent=base["Normal"],
            fontSize=13, textColor=PURPLE, alignment=TA_CENTER, spaceAfter=4,
        ),
        "cover_meta": ParagraphStyle(
            "cover_meta", parent=base["Normal"],
            fontSize=11, textColor=WHITE, alignment=TA_CENTER, spaceAfter=3,
        ),
        "h1": ParagraphStyle(
            "h1", parent=base["Heading1"],
            fontSize=16, textColor=CYAN, spaceAfter=6, spaceBefore=14,
        ),
        "h2": ParagraphStyle(
            "h2", parent=base["Heading2"],
            fontSize=13, textColor=PURPLE, spaceAfter=4, spaceBefore=10,
        ),
        "body": ParagraphStyle(
            "body", parent=base["Normal"],
            fontSize=10, textColor=WHITE, spaceAfter=4, leading=14,
        ),
        "code": ParagraphStyle(
            "code", parent=base["Code"],
            fontSize=8, textColor=CYAN, backColor=colors.HexColor("#1a1f2e"),
            leftIndent=12, rightIndent=12, spaceAfter=4, leading=12,
        ),
        "sev": ParagraphStyle(
            "sev", parent=base["Normal"],
            fontSize=9, textColor=WHITE, alignment=TA_CENTER,
        ),
    }
    return styles


# ── Helper: severity badge cell ───────────────────────────────────────────────
def _sev_cell(severity: str, styles) -> Paragraph:
    col = SEV_COLOR.get(severity.lower(), INFO_COLOR)
    s = ParagraphStyle("sev_inline", parent=styles["sev"],
                       backColor=col, borderPadding=3)
    return Paragraph(severity.upper(), s)


# ── Main report builder ───────────────────────────────────────────────────────
def generate_report(
    target:   str,
    analyst:  str,
    findings: list[dict[str, Any]],
    scan_meta: dict[str, Any] | None = None,
) -> bytes:
    """Build a PDF engagement report.

    Args:
        target:    Hostname / IP / scope string.
        analyst:   Name of the analyst (from JWT token username).
        findings:  List of finding dicts:
                   {type, severity, description, source_ip?, mitre_id?}
        scan_meta: Optional raw metadata to include in the appendix.

    Returns:
        PDF bytes ready to stream to the client.
    """
    buf = io.BytesIO()
    doc = SimpleDocTemplate(
        buf, pagesize=A4,
        leftMargin=2*cm, rightMargin=2*cm,
        topMargin=2*cm,  bottomMargin=2*cm,
        title=f"SENTINEL-X Report — {target}",
        author="SENTINEL-X",
    )

    styles = _build_styles()
    story: list = []

    # ── Cover ─────────────────────────────────────────────────────────────────
    story.append(Spacer(1, 3*cm))
    story.append(Paragraph("SENTINEL-X", styles["cover_title"]))
    story.append(Paragraph("AI-Powered Cybersecurity Command Center", styles["cover_sub"]))
    story.append(HRFlowable(width="100%", thickness=1, color=PURPLE, spaceAfter=18))
    story.append(Paragraph("SECURITY ENGAGEMENT REPORT", styles["cover_sub"]))
    story.append(Spacer(1, 1*cm))
    story.append(Paragraph(f"<b>Target:</b> {target}", styles["cover_meta"]))
    story.append(Paragraph(f"<b>Analyst:</b> {analyst}", styles["cover_meta"]))
    story.append(Paragraph(
        f"<b>Date:</b> {datetime.utcnow().strftime('%Y-%m-%d %H:%M UTC')}",
        styles["cover_meta"],
    ))
    story.append(Paragraph(
        f"<b>Total Findings:</b> {len(findings)}", styles["cover_meta"],
    ))
    story.append(PageBreak())

    # ── Executive Summary ─────────────────────────────────────────────────────
    story.append(Paragraph("1. Executive Summary", styles["h1"]))
    story.append(HRFlowable(width="100%", thickness=0.5, color=PURPLE, spaceAfter=6))

    sev_counts = {"critical": 0, "high": 0, "medium": 0, "low": 0, "info": 0}
    for f in findings:
        sev_counts[f.get("severity", "info").lower()] = \
            sev_counts.get(f.get("severity", "info").lower(), 0) + 1

    summary_text = (
        f"SENTINEL-X performed an automated security assessment against <b>{target}</b>. "
        f"The scan identified <b>{len(findings)}</b> security finding(s): "
        f"{sev_counts['critical']} Critical, {sev_counts['high']} High, "
        f"{sev_counts['medium']} Medium, {sev_counts['low']} Low, {sev_counts['info']} Informational."
    )
    story.append(Paragraph(summary_text, styles["body"]))
    story.append(Spacer(1, 0.4*cm))

    # Summary table
    sum_data = [["Severity", "Count"]]
    for sev in ["critical", "high", "medium", "low", "info"]:
        sum_data.append([sev.capitalize(), str(sev_counts[sev])])

    sum_table = Table(sum_data, colWidths=[8*cm, 4*cm])
    sum_table.setStyle(TableStyle([
        ("BACKGROUND",  (0, 0), (-1, 0),  DARK),
        ("TEXTCOLOR",   (0, 0), (-1, 0),  CYAN),
        ("FONTNAME",    (0, 0), (-1, 0),  "Helvetica-Bold"),
        ("FONTSIZE",    (0, 0), (-1, -1), 10),
        ("ALIGN",       (1, 1), (1, -1),  "CENTER"),
        ("ROWBACKGROUNDS", (0, 1), (-1, -1), [colors.HexColor("#1a1f2e"), colors.HexColor("#0d1117")]),
        ("TEXTCOLOR",   (0, 1), (-1, -1), WHITE),
        ("GRID",        (0, 0), (-1, -1), 0.5, PURPLE),
        ("TOPPADDING",  (0, 0), (-1, -1), 5),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 5),
    ]))
    story.append(sum_table)
    story.append(Spacer(1, 0.6*cm))

    # ── Findings Table ────────────────────────────────────────────────────────
    story.append(Paragraph("2. Findings Summary", styles["h1"]))
    story.append(HRFlowable(width="100%", thickness=0.5, color=PURPLE, spaceAfter=6))

    tbl_data = [["#", "Type", "Severity", "MITRE", "Source IP"]]
    for i, f in enumerate(findings, 1):
        ftype = f.get("type", f.get("threat_type", "unknown"))
        sev   = f.get("severity", "info").lower()
        mitre_id, _ = MITRE_MAP.get(ftype, ("—", ""))
        tbl_data.append([
            str(i),
            ftype.replace("_", " ").title(),
            _sev_cell(sev, styles),
            mitre_id,
            f.get("source_ip", "—"),
        ])

    col_w = [1*cm, 5*cm, 3*cm, 3.5*cm, 4*cm]
    tbl = Table(tbl_data, colWidths=col_w, repeatRows=1)
    tbl.setStyle(TableStyle([
        ("BACKGROUND",    (0, 0), (-1, 0),  DARK),
        ("TEXTCOLOR",     (0, 0), (-1, 0),  CYAN),
        ("FONTNAME",      (0, 0), (-1, 0),  "Helvetica-Bold"),
        ("FONTSIZE",      (0, 0), (-1, -1), 9),
        ("ROWBACKGROUNDS",(0, 1), (-1, -1), [colors.HexColor("#1a1f2e"), colors.HexColor("#0d1117")]),
        ("TEXTCOLOR",     (0, 1), (-1, -1), WHITE),
        ("ALIGN",         (0, 0), (0, -1),  "CENTER"),
        ("ALIGN",         (2, 0), (2, -1),  "CENTER"),
        ("GRID",          (0, 0), (-1, -1), 0.4, PURPLE),
        ("TOPPADDING",    (0, 0), (-1, -1), 4),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 4),
        ("VALIGN",        (0, 0), (-1, -1), "MIDDLE"),
    ]))
    story.append(tbl)
    story.append(PageBreak())

    # ── Per-Finding Detail ────────────────────────────────────────────────────
    story.append(Paragraph("3. Detailed Findings", styles["h1"]))
    story.append(HRFlowable(width="100%", thickness=0.5, color=PURPLE, spaceAfter=8))

    for i, f in enumerate(findings, 1):
        ftype = f.get("type", f.get("threat_type", "unknown"))
        sev   = f.get("severity", "info")
        desc  = f.get("description", "No description provided.")
        sev_col = SEV_COLOR.get(sev.lower(), INFO_COLOR)
        mitre_id, mitre_name = MITRE_MAP.get(ftype, ("—", "Unknown technique"))
        rem = REMEDIATION.get(ftype, "Review and remediate according to your security policy.")

        story.append(Paragraph(
            f"<font color='#{sev_col.hexval()[2:]}'>■</font>&nbsp; "
            f"Finding {i}: {ftype.replace('_', ' ').title()} [{sev.upper()}]",
            styles["h2"],
        ))
        detail_data = [
            ["Field", "Value"],
            ["Type",         ftype.replace("_", " ").title()],
            ["Severity",     sev.upper()],
            ["Source IP",    f.get("source_ip", "—")],
            ["Target IP",    f.get("target_ip", "—")],
            ["MITRE ID",     mitre_id],
            ["MITRE Name",   mitre_name],
            ["Confidence",   f"{int(f.get('confidence', 0)*100)}%"],
            ["Timestamp",    f.get("timestamp", datetime.utcnow().isoformat())],
        ]
        det_tbl = Table(detail_data, colWidths=[4*cm, 12*cm])
        det_tbl.setStyle(TableStyle([
            ("BACKGROUND",    (0, 0), (-1, 0), DARK),
            ("TEXTCOLOR",     (0, 0), (-1, 0), CYAN),
            ("FONTNAME",      (0, 0), (-1, 0), "Helvetica-Bold"),
            ("FONTSIZE",      (0, 0), (-1, -1), 9),
            ("ROWBACKGROUNDS",(0, 1), (-1, -1),
             [colors.HexColor("#1a1f2e"), colors.HexColor("#0d1117")]),
            ("TEXTCOLOR",     (0, 1), (-1, -1), WHITE),
            ("GRID",          (0, 0), (-1, -1), 0.4, PURPLE),
            ("TOPPADDING",    (0, 0), (-1, -1), 3),
            ("BOTTOMPADDING", (0, 0), (-1, -1), 3),
        ]))
        story.append(det_tbl)
        story.append(Spacer(1, 0.3*cm))
        story.append(Paragraph("<b>Description:</b>", styles["body"]))
        story.append(Paragraph(desc, styles["body"]))
        story.append(Paragraph("<b>Remediation:</b>", styles["body"]))
        story.append(Paragraph(rem, styles["body"]))
        story.append(HRFlowable(width="100%", thickness=0.3, color=PURPLE, spaceAfter=6))

    # ── Appendix ──────────────────────────────────────────────────────────────
    if scan_meta:
        story.append(PageBreak())
        story.append(Paragraph("Appendix A — Raw Scan Metadata", styles["h1"]))
        story.append(HRFlowable(width="100%", thickness=0.5, color=PURPLE, spaceAfter=6))
        import json
        raw = json.dumps(scan_meta, indent=2, default=str)
        for chunk in [raw[i:i+120] for i in range(0, min(len(raw), 3000), 120)]:
            story.append(Paragraph(chunk, styles["code"]))
        if len(raw) > 3000:
            story.append(Paragraph("… (truncated)", styles["body"]))

    # ── Footer callback ───────────────────────────────────────────────────────
    def _footer(canvas, doc):
        canvas.saveState()
        canvas.setFont("Helvetica", 8)
        canvas.setFillColor(PURPLE)
        canvas.drawString(2*cm, 1.2*cm,
                          f"SENTINEL-X Confidential — {target} — {datetime.utcnow().strftime('%Y-%m-%d')}")
        canvas.drawRightString(A4[0] - 2*cm, 1.2*cm, f"Page {doc.page}")
        canvas.restoreState()

    doc.build(story, onFirstPage=_footer, onLaterPages=_footer)
    return buf.getvalue()
