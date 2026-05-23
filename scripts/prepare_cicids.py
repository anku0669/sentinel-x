#!/usr/bin/env python3
"""Prepare CICIDS2017 dataset for SENTINEL-X anomaly detection.

Usage:
    1. Download CICIDS2017 from https://www.unb.ca/cic/datasets/ids-2017.html
    2. Place the Monday-WorkingHours.pcap_ISCX.csv file in this directory.
    3. Run: python scripts/prepare_cicids.py
    4. Output: backend/data/cicids_sample.csv (3000 benign rows, 5 features)

The script maps CICIDS2017 column names to the 5 features used by
SENTINEL-X's IsolationForest:
    bytes_sent       <- Total Fwd Packets * Avg Fwd Segment Size
    bytes_recv       <- Total Backward Packets * Avg Bwd Segment Size
    requests_per_min <- Flow Packets/s (scaled to per-minute)
    error_rate       <- Bwd PSH Flags / (Total Packets + 1)
    unique_dest      <- Destination Port (log-binned 1-50)
"""
import sys
import math
from pathlib import Path

try:
    import pandas as pd
    import numpy as np
except ImportError:
    print("Run: pip install pandas numpy")
    sys.exit(1)

SRC = Path("Monday-WorkingHours.pcap_ISCX.csv")
DST = Path(__file__).parent.parent / "backend" / "data" / "cicids_sample.csv"

if not SRC.exists():
    print(f"ERROR: {SRC} not found. Download CICIDS2017 first.")
    sys.exit(1)

print(f"Loading {SRC} ...")
df = pd.read_csv(SRC, low_memory=False)
df.columns = df.columns.str.strip()

# Keep only benign traffic
benign = df[df[" Label"] == "BENIGN"].copy()
print(f"Benign rows: {len(benign):,}")

# Feature engineering
benign["bytes_sent"] = (
    pd.to_numeric(benign["Total Fwd Packets"], errors="coerce").fillna(0)
    * pd.to_numeric(benign[" Avg Fwd Segment Size"], errors="coerce").fillna(0)
).clip(lower=0)

benign["bytes_recv"] = (
    pd.to_numeric(benign["Total Backward Packets"], errors="coerce").fillna(0)
    * pd.to_numeric(benign[" Avg Bwd Segment Size"], errors="coerce").fillna(0)
).clip(lower=0)

benign["requests_per_min"] = (
    pd.to_numeric(benign[" Flow Packets/s"], errors="coerce").fillna(0) * 60
).clip(lower=0, upper=100_000)

benign["error_rate"] = (
    pd.to_numeric(benign[" Bwd PSH Flags"], errors="coerce").fillna(0)
    / (pd.to_numeric(benign["Total Fwd Packets"], errors="coerce").fillna(1)
       + pd.to_numeric(benign["Total Backward Packets"], errors="coerce").fillna(1) + 1)
).clip(lower=0, upper=1)

benign["unique_dest"] = (
    pd.to_numeric(benign[" Destination Port"], errors="coerce")
    .fillna(0)
    .apply(lambda p: max(1, math.log1p(p) * 3))
).clip(lower=1, upper=50)

out = benign[["bytes_sent", "bytes_recv", "requests_per_min",
              "error_rate", "unique_dest"]].dropna()

# Sample 3000 rows for fast model training
sample = out.sample(n=min(3000, len(out)), random_state=42)
DST.parent.mkdir(parents=True, exist_ok=True)
sample.to_csv(DST, index=False)
print(f"Saved {len(sample):,} rows → {DST}")
