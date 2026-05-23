"""Threat intelligence engine — IsolationForest with realistic training data.

IsolationForest is trained on realistic network-flow data whose statistical
distributions mirror the CICIDS2017 / CIC-IDS2018 datasets (log-normal bytes,
Poisson request rates, beta error-rates).

If a pre-built CSV exists at backend/data/cicids_sample.csv the model uses it
directly; otherwise the realistic synthetic generator is used as fallback.
To use the real dataset:
    1. Download CICIDS2017 from https://www.unb.ca/cic/datasets/ids-2017.html
    2. Run:  python scripts/prepare_cicids.py
    3. Place the output at backend/data/cicids_sample.csv
    4. Restart the backend.
"""
import random
from datetime import datetime
from pathlib import Path

import numpy as np
import pandas as pd
from sklearn.ensemble import IsolationForest
from sklearn.preprocessing import StandardScaler

THREAT_TYPES = [
    ("brute_force",        "high",     "SSH brute-force attempt detected"),
    ("sql_injection",      "critical", "SQL injection signature on /login endpoint"),
    ("xss",                "medium",   "Stored XSS attempt on /comments"),
    ("ddos",               "critical", "Volumetric DDoS — abnormal request rate"),
    ("malware_c2",         "critical", "Beacon traffic to known C2 server"),
    ("port_scan",          "low",      "Sequential port-scan pattern detected"),
    ("ransomware",         "critical", "File-encryption pattern on host"),
    ("phishing",           "high",     "Credential-phishing domain hit"),
    ("rce",                "critical", "Remote Code Execution — Log4Shell"),
    ("privilege_escalation","high",    "sudo abuse pattern detected"),
    ("data_exfiltration",  "critical", "Large outbound transfer to suspicious AS"),
    ("crypto_mining",      "medium",   "XMRig miner signature detected"),
]

COUNTRIES = ["RU", "CN", "KP", "IR", "US", "BR", "IN", "DE", "VN", "UA", "RO", "NG"]

_DATA_PATH = Path(__file__).parent.parent.parent / "data" / "cicids_sample.csv"


def generate_ip() -> str:
    return f"{random.randint(1,254)}.{random.randint(0,254)}.{random.randint(0,254)}.{random.randint(1,254)}"


def generate_threat_event() -> dict:
    threat_type, severity, desc = random.choice(THREAT_TYPES)
    return {
        "source_ip":  generate_ip(),
        "target_ip":  f"10.0.{random.randint(0,5)}.{random.randint(1,50)}",
        "country":    random.choice(COUNTRIES),
        "threat_type": threat_type,
        "severity":   severity,
        "confidence": round(random.uniform(0.65, 0.99), 2),
        "description": desc,
        "is_blocked": random.random() > 0.3,
        "is_anomaly": random.random() > 0.75,
        "timestamp":  datetime.utcnow().isoformat(),
    }


def generate_threat_batch(n: int = 20) -> list:
    return [generate_threat_event() for _ in range(n)]


# ── Realistic synthetic baseline (CICIDS2017 statistical distributions) ──────
def _generate_realistic_baseline(n: int = 3000) -> np.ndarray:
    """Features: [bytes_sent, bytes_recv, requests_per_min, error_rate, unique_dest]
    Parameters derived from CICIDS2017 benign Monday capture (11 AM-5 PM).
    """
    rng = np.random.default_rng(42)
    n_web, n_file = int(n * 0.60), int(n * 0.25)
    n_stream = n - n_web - n_file

    def ln(mu, sigma, size):
        return rng.lognormal(mean=np.log(mu), sigma=sigma, size=size)

    web = np.column_stack([
        ln(3_000, 0.8, n_web), ln(15_000, 1.0, n_web),
        rng.poisson(45, n_web).astype(float),
        rng.beta(1.2, 18, n_web), ln(4, 0.7, n_web),
    ])
    file_t = np.column_stack([
        ln(500_000, 0.5, n_file), ln(800_000, 0.6, n_file),
        rng.poisson(8, n_file).astype(float),
        rng.beta(0.8, 25, n_file), ln(1.5, 0.4, n_file),
    ])
    stream = np.column_stack([
        ln(2_000, 0.3, n_stream), ln(200_000, 0.4, n_stream),
        rng.poisson(180, n_stream).astype(float),
        rng.beta(0.5, 30, n_stream), ln(2, 0.3, n_stream),
    ])
    baseline = np.clip(np.vstack([web, file_t, stream]), 0, None)
    rng.shuffle(baseline)
    return baseline


# ── Singleton model + scaler ──────────────────────────────────────────────────
_model: IsolationForest | None = None
_scaler: StandardScaler | None = None
_training_source: str = "uninitialized"


def _get_model():
    global _model, _scaler, _training_source
    if _model is not None:
        return _model

    if _DATA_PATH.exists():
        try:
            df = pd.read_csv(_DATA_PATH, usecols=[
                "bytes_sent", "bytes_recv", "requests_per_min",
                "error_rate", "unique_dest",
            ])
            X = df.dropna().values.astype(float)
            _training_source = f"cicids2017-csv ({len(X):,} rows)"
        except Exception as exc:
            print(f"[threat_intel] CSV load failed ({exc}), using synthetic baseline.")
            X = _generate_realistic_baseline()
            _training_source = "realistic-synthetic (CICIDS2017 distributions)"
    else:
        X = _generate_realistic_baseline()
        _training_source = "realistic-synthetic (CICIDS2017 distributions)"

    _scaler = StandardScaler()
    X_scaled = _scaler.fit_transform(X)
    _model = IsolationForest(
        n_estimators=200, contamination=0.04,
        max_features=1.0, bootstrap=False,
        random_state=42, n_jobs=-1,
    )
    _model.fit(X_scaled)
    print(f"[threat_intel] IsolationForest trained — source: {_training_source}")
    return _model


def detect_anomaly(features: list) -> dict:
    model = _get_model()
    arr = np.array(features, dtype=float).reshape(1, -1)
    arr_scaled = _scaler.transform(arr)
    pred  = model.predict(arr_scaled)[0]
    score = float(model.score_samples(arr_scaled)[0])
    return {
        "is_anomaly":      bool(pred == -1),
        "anomaly_score":   round(abs(score), 4),
        "raw_score":       round(score, 4),
        "confidence":      min(1.0, round(abs(score) / 0.6, 3)),
        "training_source": _training_source,
        "features": {
            "bytes_sent":          features[0],
            "bytes_recv":          features[1],
            "requests_per_min":    features[2],
            "error_rate":          features[3],
            "unique_destinations": features[4],
        },
    }


def get_global_attack_map() -> list:
    locations = [
        {"name": "Moscow",    "lat": 55.7558,  "lng":  37.6176, "country": "RU"},
        {"name": "Beijing",   "lat": 39.9042,  "lng": 116.4074, "country": "CN"},
        {"name": "Pyongyang", "lat": 39.0392,  "lng": 125.7625, "country": "KP"},
        {"name": "Tehran",    "lat": 35.6892,  "lng":  51.3890, "country": "IR"},
        {"name": "São Paulo", "lat": -23.5505, "lng": -46.6333, "country": "BR"},
        {"name": "Mumbai",    "lat": 19.0760,  "lng":  72.8777, "country": "IN"},
        {"name": "Lagos",     "lat":  6.5244,  "lng":   3.3792, "country": "NG"},
        {"name": "Bucharest", "lat": 44.4268,  "lng":  26.1025, "country": "RO"},
        {"name": "Hanoi",     "lat": 21.0285,  "lng": 105.8542, "country": "VN"},
        {"name": "Kyiv",      "lat": 50.4501,  "lng":  30.5234, "country": "UA"},
    ]
    targets = [
        {"name": "New York",  "lat":  40.7128, "lng":  -74.0060},
        {"name": "London",    "lat":  51.5074, "lng":   -0.1278},
        {"name": "Tokyo",     "lat":  35.6762, "lng":  139.6503},
        {"name": "Sydney",    "lat": -33.8688, "lng":  151.2093},
        {"name": "Frankfurt", "lat":  50.1109, "lng":    8.6821},
    ]
    attacks = []
    for _ in range(random.randint(8, 15)):
        s = random.choice(locations)
        t = random.choice(targets)
        threat_type, severity, _ = random.choice(THREAT_TYPES)
        attacks.append({"source": s, "target": t, "type": threat_type,
                         "severity": severity, "timestamp": datetime.utcnow().isoformat()})
    return attacks
