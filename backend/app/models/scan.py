"""Scan/Recon results model."""
from datetime import datetime
from sqlalchemy import Column, Integer, String, DateTime, Text, Float
from ..database import Base


class Scan(Base):
    __tablename__ = "scans"
    id = Column(Integer, primary_key=True, index=True)
    target = Column(String(255), nullable=False, index=True)
    scan_type = Column(String(50))  # port, vuln, recon, payload
    status = Column(String(20), default="completed")
    risk_score = Column(Float, default=0.0)
    result = Column(Text)  # JSON string
    user_id = Column(Integer)
    created_at = Column(DateTime, default=datetime.utcnow, index=True)
