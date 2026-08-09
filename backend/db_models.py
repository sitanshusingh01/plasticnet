"""db_models.py — Zone Mapping's persistence layer. Three tables:

Zone            one row per polygon from data/dal_lake_zones.geojson, plus
                the live aggregate stats and current risk shown on the map
ZoneReportLog   one row per citizen report assigned to a zone, this is
                what /api/zones/{zoneId}/reports reads from and what
                average coverage / total reports are computed from
RiskOverride    an audit trail of authority manual risk overrides, never
                edited or deleted, only appended to
"""

from datetime import datetime, timezone

from sqlalchemy import Column, String, Float, Integer, DateTime, ForeignKey, Text
from sqlalchemy.orm import relationship

from database import Base


def utcnow():
    return datetime.now(timezone.utc)


class Zone(Base):
    __tablename__ = "zones"

    zone_id = Column(String, primary_key=True)  # "R1".."R30"
    name = Column(String, nullable=False)
    geometry_geojson = Column(Text, nullable=False)  # the polygon, as GeoJSON text
    area_sqm = Column(Float, nullable=False)
    centroid_lat = Column(Float, nullable=False)
    centroid_lng = Column(Float, nullable=False)

    default_risk = Column(String, nullable=False, default="white")
    current_risk = Column(String, nullable=False, default="white")
    risk_source = Column(String, nullable=False, default="computed")  # "computed" | "override"

    total_reports = Column(Integer, nullable=False, default=0)
    pending_reports = Column(Integer, nullable=False, default=0)
    resolved_reports = Column(Integer, nullable=False, default=0)
    average_coverage = Column(Float, nullable=False, default=0.0)
    last_report_at = Column(DateTime, nullable=True)
    last_updated = Column(DateTime, nullable=False, default=utcnow, onupdate=utcnow)

    reports = relationship("ZoneReportLog", back_populates="zone", order_by="ZoneReportLog.submitted_at.desc()")
    overrides = relationship("RiskOverride", back_populates="zone", order_by="RiskOverride.created_at.desc()")


class ZoneReportLog(Base):
    __tablename__ = "zone_report_log"

    id = Column(Integer, primary_key=True, autoincrement=True)
    zone_id = Column(String, ForeignKey("zones.zone_id"), nullable=False)
    report_ref = Column(String, nullable=True)  # the frontend's CR-xxx id, when available
    latitude = Column(Float, nullable=False)
    longitude = Column(Float, nullable=False)
    coverage_percent = Column(Float, nullable=True)
    severity = Column(String, nullable=True)
    status = Column(String, nullable=False, default="pending")  # "pending" | "resolved"
    submitted_at = Column(DateTime, nullable=False, default=utcnow)

    zone = relationship("Zone", back_populates="reports")


class RiskOverride(Base):
    __tablename__ = "risk_overrides"

    id = Column(Integer, primary_key=True, autoincrement=True)
    zone_id = Column(String, ForeignKey("zones.zone_id"), nullable=False)
    risk_level = Column(String, nullable=False)  # "low" | "moderate" | "high"
    officer_name = Column(String, nullable=False)
    reason = Column(String, nullable=False)
    created_at = Column(DateTime, nullable=False, default=utcnow)

    zone = relationship("Zone", back_populates="overrides")
