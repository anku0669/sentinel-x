"""Threat / Incident model."""
from datetime import datetime
from sqlalchemy import Column, Integer, String, DateTime, Text, Float, Boolean
from ..database import Base


class Threat(Base):
    __tablename__ = "threats"
    id = Column(Integer, primary_key=True, index=True)
    source_ip = Column(String(64), index=True)
    target_ip = Column(String(64), index=True)
    country = Column(String(64))
    threat_type = Column(String(64))  # malware, ddos, brute_force, sql_injection, xss
    severity = Column(String(20))  # critical, high, medium, low
    confidence = Column(Float, default=0.0)
    description = Column(Text)
    is_blocked = Column(Boolean, default=False)
    is_anomaly = Column(Boolean, default=False)
    created_at = Column(DateTime, default=datetime.utcnow, index=True)
