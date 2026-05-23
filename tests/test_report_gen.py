"""Tests for the PDF report generator."""
import pytest
from app.services.report_gen import generate_report


SAMPLE_FINDINGS = [
    {
        "type": "sql_injection",
        "severity": "critical",
        "description": "SQL injection on /login endpoint.",
        "source_ip": "192.168.1.100",
        "target_ip": "10.0.0.5",
        "confidence": 0.95,
        "timestamp": "2026-05-13T10:00:00",
    },
    {
        "type": "brute_force",
        "severity": "high",
        "description": "SSH brute force from external IP.",
        "source_ip": "203.0.113.42",
        "target_ip": "10.0.0.1",
        "confidence": 0.87,
        "timestamp": "2026-05-13T10:05:00",
    },
]


def test_generate_report_returns_bytes():
    pdf = generate_report("example.com", "testanalyst", SAMPLE_FINDINGS)
    assert isinstance(pdf, bytes)
    assert len(pdf) > 1000


def test_pdf_magic_bytes():
    """PDF files must start with %PDF."""
    pdf = generate_report("192.168.1.0/24", "analyst", SAMPLE_FINDINGS)
    assert pdf[:4] == b"%PDF"


def test_empty_findings():
    pdf = generate_report("target.com", "analyst", [])
    assert pdf[:4] == b"%PDF"
    assert len(pdf) > 500


def test_scan_meta_included():
    meta = {"ports": [80, 443, 8080], "os": "Linux"}
    pdf = generate_report("target.com", "analyst", SAMPLE_FINDINGS, scan_meta=meta)
    assert pdf[:4] == b"%PDF"
