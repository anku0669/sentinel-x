"""Network scanner & recon service.

This is a SAFE simulation/light scanner using stdlib socket.
Does NOT run aggressive tooling. Designed for educational lab use.
"""
import socket
import asyncio
import ssl
import re
from typing import List, Dict
from urllib.parse import urlparse


COMMON_PORTS = {
    21: "FTP", 22: "SSH", 23: "Telnet", 25: "SMTP", 53: "DNS",
    80: "HTTP", 110: "POP3", 139: "NetBIOS", 143: "IMAP", 443: "HTTPS",
    445: "SMB", 3306: "MySQL", 3389: "RDP", 5432: "PostgreSQL",
    5900: "VNC", 6379: "Redis", 8080: "HTTP-Alt", 8443: "HTTPS-Alt",
    9200: "Elasticsearch", 27017: "MongoDB",
}

KNOWN_VULNS = {
    21: ["CVE-2015-3306 (ProFTPD)", "Anonymous login risk"],
    22: ["Weak SSH ciphers", "Brute-force exposure"],
    23: ["Cleartext protocol — deprecated"],
    25: ["Open relay risk", "STARTTLS downgrade"],
    80: ["Missing HSTS", "Clickjacking, XSS surface"],
    443: ["Heartbleed legacy hosts", "Weak TLS suites"],
    445: ["EternalBlue (MS17-010)", "SMB null sessions"],
    3306: ["Default creds risk", "CVE-2012-2122"],
    3389: ["BlueKeep (CVE-2019-0708)", "RDP brute-force"],
    6379: ["Unauth Redis RCE"],
    9200: ["Unauth Elasticsearch leaks"],
    27017: ["Unauth MongoDB exposure"],
}


async def _check_port(host: str, port: int, timeout: float = 1.0) -> Dict:
    loop = asyncio.get_event_loop()
    try:
        fut = loop.run_in_executor(None, _sync_connect, host, port, timeout)
        result = await asyncio.wait_for(fut, timeout=timeout + 0.5)
        return result
    except Exception:
        return {"port": port, "open": False, "service": COMMON_PORTS.get(port, "unknown"), "banner": None}


def _sync_connect(host: str, port: int, timeout: float) -> Dict:
    sock = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
    sock.settimeout(timeout)
    banner = None
    try:
        sock.connect((host, port))
        try:
            sock.settimeout(0.5)
            data = sock.recv(128)
            banner = data.decode(errors="ignore").strip()
        except Exception:
            pass
        return {
            "port": port, "open": True,
            "service": COMMON_PORTS.get(port, "unknown"),
            "banner": banner,
            "vulnerabilities": KNOWN_VULNS.get(port, []),
        }
    except Exception:
        return {"port": port, "open": False, "service": COMMON_PORTS.get(port, "unknown"), "banner": None}
    finally:
        try:
            sock.close()
        except Exception:
            pass


async def port_scan(target: str, ports: List[int] = None) -> Dict:
    """Scan a list of ports against target host."""
    # Resolve domain to IP
    host = target
    if target.startswith("http"):
        host = urlparse(target).hostname or target
    try:
        resolved = socket.gethostbyname(host)
    except socket.gaierror:
        return {"target": target, "error": "DNS resolution failed", "open_ports": [], "risk_score": 0}

    if ports is None:
        ports = list(COMMON_PORTS.keys())

    tasks = [_check_port(resolved, p) for p in ports]
    results = await asyncio.gather(*tasks)
    open_ports = [r for r in results if r["open"]]

    # Risk scoring
    risk = 0
    for r in open_ports:
        v = len(r.get("vulnerabilities", []))
        risk += 5 + (v * 7)
        if r["port"] in (23, 445, 3389, 6379, 9200, 27017):
            risk += 15
    risk = min(risk, 100)

    return {
        "target": target,
        "resolved_ip": resolved,
        "ports_scanned": len(ports),
        "open_ports": open_ports,
        "open_count": len(open_ports),
        "risk_score": risk,
    }


async def web_recon(url: str) -> Dict:
    """Light web reconnaissance — headers, tech detection."""
    import httpx
    if not url.startswith("http"):
        url = "http://" + url
    findings = {"url": url, "headers": {}, "technologies": [], "security_issues": [], "risk_score": 0}
    try:
        async with httpx.AsyncClient(timeout=5, follow_redirects=True, verify=False) as client:
            r = await client.get(url)
            findings["status"] = r.status_code
            findings["headers"] = dict(r.headers)
            body = r.text[:5000]

            # Tech detection
            sigs = {
                "WordPress": r"wp-content|wp-includes",
                "React": r"__reactInternalInstance|react-dom",
                "Vue.js": r"vue\.js|__vue__",
                "Angular": r"ng-version|angular\.js",
                "Next.js": r"_next/static",
                "Django": r"csrfmiddlewaretoken",
                "PHP": r"PHPSESSID",
                "Cloudflare": r"cloudflare|cf-ray",
                "nginx": r"nginx",
                "Apache": r"Apache",
            }
            for tech, pattern in sigs.items():
                if re.search(pattern, body + str(r.headers), re.I):
                    findings["technologies"].append(tech)

            # Security header analysis
            sec_headers = {
                "Strict-Transport-Security": "Missing HSTS — MITM risk",
                "Content-Security-Policy": "Missing CSP — XSS risk",
                "X-Frame-Options": "Missing X-Frame-Options — clickjacking risk",
                "X-Content-Type-Options": "Missing X-Content-Type-Options — MIME sniffing",
                "Referrer-Policy": "Missing Referrer-Policy",
            }
            for hdr, msg in sec_headers.items():
                if hdr not in r.headers:
                    findings["security_issues"].append({"type": "missing_header", "header": hdr, "message": msg})
                    findings["risk_score"] += 8

            if "Server" in r.headers:
                findings["security_issues"].append({"type": "info_disclosure", "message": f"Server header reveals: {r.headers['Server']}"})
                findings["risk_score"] += 3
    except Exception as e:
        findings["error"] = str(e)
    findings["risk_score"] = min(findings["risk_score"], 100)
    return findings
