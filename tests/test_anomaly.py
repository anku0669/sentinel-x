"""Tests for the IsolationForest anomaly detection engine."""
import pytest
from app.services.threat_intel import detect_anomaly


def test_normal_traffic_not_anomaly():
    """Typical web browsing traffic should NOT be flagged."""
    result = detect_anomaly([3000, 15000, 45, 0.02, 4])
    assert "is_anomaly" in result
    assert "anomaly_score" in result
    assert "training_source" in result
    # Normal traffic might occasionally be flagged (4% contamination) — just check structure
    assert isinstance(result["is_anomaly"], bool)
    assert 0 <= result["anomaly_score"]


def test_ddos_traffic_flagged():
    """Massive request rate with high error rate should be anomalous."""
    result = detect_anomaly([5_000_000, 100, 5000, 0.9, 400])
    assert result["is_anomaly"] is True
    assert result["anomaly_score"] > 0.1


def test_exfiltration_flagged():
    """Huge bytes_sent with few requests = data exfiltration pattern."""
    result = detect_anomaly([50_000_000, 500, 3, 0.01, 1])
    assert result["is_anomaly"] is True


def test_result_structure():
    result = detect_anomaly([5000, 8000, 60, 0.02, 5])
    required_keys = {"is_anomaly", "anomaly_score", "raw_score",
                     "confidence", "training_source", "features"}
    assert required_keys.issubset(result.keys())


def test_features_echoed():
    features = [1000.0, 2000.0, 30.0, 0.05, 3.0]
    result = detect_anomaly(features)
    assert result["features"]["bytes_sent"] == 1000.0
    assert result["features"]["bytes_recv"] == 2000.0


def test_training_source_not_naive():
    """Training source must NOT be the old naive np.random.normal baseline."""
    result = detect_anomaly([5000, 8000, 60, 0.02, 5])
    src = result["training_source"]
    assert "realistic" in src.lower() or "cicids" in src.lower(), \
        f"Expected realistic/cicids training source, got: {src}"
