"""Live URL intelligence — fetch the URL, follow redirects, inspect TLS, headers, IP."""
import asyncio
import socket
import ssl
import re
import time
from datetime import datetime
from typing import Dict, List
from urllib.parse import urlparse


async def live_check(url: str, max_redirects: int = 5, timeout: float = 8.0) -> Dict:
    """Perform a live (non-cached) check on a URL.

    Returns response chain, final URL, TLS info, IP + rDNS, headers,
    content-type, body size, response-time. Also flags common red flags
    discovered ONLY at runtime (e.g., redirect to suspicious domain).
    """
    out = {
        "input_url": url,
        "scanned_at": datetime.utcnow().isoformat(),
        "chain": [],
        "final_url": None,
        "final_status": None,
        "redirects": 0,
        "response_time_ms": None,
        "headers": {},
        "tls": None,
        "ip": None,
        "reverse_dns": None,
        "asn_hint": None,
        "content_type": None,
        "body_size": None,
        "body_preview": None,
        "runtime_findings": [],
        "error": None,
    }

    if not url:
        out["error"] = "empty url"
        return out
    if not url.startswith(("http://", "https://")):
        url = "http://" + url
        out["input_url"] = url

    start = time.perf_counter()
    try:
        import httpx
        async with httpx.AsyncClient(timeout=timeout, verify=False, follow_redirects=False, headers={"User-Agent": "SENTINEL-X/1.3 URL-Inspector"}) as client:
            current = url
            for hop in range(max_redirects + 1):
                try:
                    r = await client.get(current)
                except httpx.RequestError as e:
                    out["chain"].append({"url": current, "status": None, "error": str(e)})
                    out["error"] = f"request failed: {e}"
                    break

                hop_data = {
                    "url": current,
                    "status": r.status_code,
                    "server": r.headers.get("Server"),
                    "location": r.headers.get("Location"),
                }
                out["chain"].append(hop_data)

                if 300 <= r.status_code < 400 and r.headers.get("Location"):
                    next_url = r.headers["Location"]
                    if not next_url.startswith("http"):
                        # relative redirect
                        from urllib.parse import urljoin
                        next_url = urljoin(current, next_url)
                    # detect cross-domain redirect (red flag if domain changes drastically)
                    cur_host = urlparse(current).hostname or ""
                    next_host = urlparse(next_url).hostname or ""
                    if cur_host and next_host and cur_host != next_host:
                        out["runtime_findings"].append({
                            "severity": "medium",
                            "label": f"Cross-domain redirect: {cur_host} → {next_host}",
                        })
                    current = next_url
                    out["redirects"] += 1
                    continue

                # Final response
                out["final_url"] = current
                out["final_status"] = r.status_code
                out["headers"] = {k: v for k, v in r.headers.items() if k.lower() not in ("set-cookie",)}
                out["content_type"] = r.headers.get("Content-Type", "")
                out["body_size"] = len(r.content or b"")
                try:
                    text = r.text[:600]
                except Exception:
                    text = ""
                out["body_preview"] = text

                # Security header audit
                must_have = {
                    "Strict-Transport-Security": "Missing HSTS",
                    "Content-Security-Policy": "Missing CSP",
                    "X-Frame-Options": "Missing X-Frame-Options",
                    "X-Content-Type-Options": "Missing nosniff",
                    "Referrer-Policy": "Missing Referrer-Policy",
                }
                for h, msg in must_have.items():
                    if h not in r.headers:
                        out["runtime_findings"].append({"severity": "low", "label": msg})

                # Server header info disclosure
                if "Server" in r.headers:
                    val = r.headers["Server"]
                    if any(c.isdigit() for c in val):
                        out["runtime_findings"].append({
                            "severity": "low",
                            "label": f"Server header reveals version: {val}",
                        })

                # Heuristic phishing-page content sniff
                if r.status_code == 200 and "html" in (out["content_type"] or "").lower():
                    if re.search(r"<input[^>]+type=[\"']?password", text, re.I):
                        out["runtime_findings"].append({
                            "severity": "medium",
                            "label": "Page contains password input — verify intended login flow",
                        })
                    if re.search(r"verify your account|sign[- ]?in to continue|confirm your password", text, re.I):
                        out["runtime_findings"].append({
                            "severity": "high",
                            "label": "Phishing-style copy detected on landing page",
                        })
                break  # not a redirect, done
            else:
                out["runtime_findings"].append({"severity": "medium", "label": f"Exceeded {max_redirects} redirects"})

    except Exception as e:
        out["error"] = f"client error: {e}"

    out["response_time_ms"] = round((time.perf_counter() - start) * 1000, 1)

    # DNS resolve final host
    final = out.get("final_url") or url
    host = urlparse(final).hostname
    if host:
        try:
            ip = socket.gethostbyname(host)
            out["ip"] = ip
            try:
                rdns = socket.gethostbyaddr(ip)
                out["reverse_dns"] = rdns[0]
            except Exception:
                pass
            # Crude ASN hint based on rDNS pattern
            if out["reverse_dns"]:
                rd = out["reverse_dns"].lower()
                hints = {
                    "amazonaws.com": "Amazon AWS", "googleusercontent.com": "Google Cloud",
                    "azure.com": "Microsoft Azure", "cloudfront.net": "CloudFront CDN",
                    "akamai": "Akamai CDN", "cloudflare": "Cloudflare",
                    "fastly": "Fastly CDN", "digitalocean": "DigitalOcean",
                    "ovh.net": "OVH", "hetzner": "Hetzner",
                }
                for needle, name in hints.items():
                    if needle in rd:
                        out["asn_hint"] = name
                        break
        except socket.gaierror:
            out["error"] = "DNS resolution failed"

    # TLS inspection (only for https)
    if final.startswith("https://"):
        out["tls"] = await _tls_info(host)

    return out


async def _tls_info(hostname: str) -> Dict:
    """Pull cert SAN, issuer, validity dates."""
    try:
        loop = asyncio.get_event_loop()
        return await loop.run_in_executor(None, _tls_sync, hostname)
    except Exception as e:
        return {"error": str(e)}


def _tls_sync(hostname: str) -> Dict:
    ctx = ssl.create_default_context()
    ctx.check_hostname = False
    ctx.verify_mode = ssl.CERT_NONE
    try:
        with socket.create_connection((hostname, 443), timeout=4) as sock:
            with ctx.wrap_socket(sock, server_hostname=hostname) as ssock:
                cert = ssock.getpeercert()
                if not cert:
                    # peer cert not available without verification, fetch DER and parse
                    der = ssock.getpeercert(binary_form=True)
                    return {"raw_der_size": len(der) if der else 0, "note": "Peer did not return parseable cert dict"}
                subject = dict(x[0] for x in cert.get("subject", []))
                issuer = dict(x[0] for x in cert.get("issuer", []))
                san = [name for typ, name in cert.get("subjectAltName", []) if typ == "DNS"]
                return {
                    "subject_cn": subject.get("commonName"),
                    "issuer_cn": issuer.get("commonName"),
                    "issuer_org": issuer.get("organizationName"),
                    "valid_from": cert.get("notBefore"),
                    "valid_until": cert.get("notAfter"),
                    "san": san[:20],
                    "cipher": ssock.cipher(),
                    "tls_version": ssock.version(),
                }
    except Exception as e:
        return {"error": str(e)}
