"""routes/zones.py — Zone Mapping's API surface. Five endpoints, matching
exactly what the project spec asked for plus the one addition
(reports/{ref}/status) needed to keep pending/resolved counts honest when
the authority dashboard changes a report's status."""

import logging

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.orm import Session

from database import get_session
from db_models import Zone, ZoneReportLog
from services import zone_service

logger = logging.getLogger("plasticnet.routes.zones")

router = APIRouter()


class ZoneAssignRequest(BaseModel):
    latitude: float
    longitude: float
    coveragePercent: float | None = None
    severity: str | None = None
    reportRef: str | None = None


class RiskOverrideRequest(BaseModel):
    riskLevel: str  # "low" | "moderate" | "high"
    officerName: str
    reason: str


class ReportStatusRequest(BaseModel):
    status: str  # "pending" | "resolved"


@router.get("/zones")
def list_zones(session: Session = Depends(get_session)):
    return zone_service.all_zones_geojson(session)


@router.get("/zones/{zone_id}")
def zone_detail(zone_id: str, session: Session = Depends(get_session)):
    detail = zone_service.get_zone_detail(session, zone_id)
    if detail is None:
        raise HTTPException(status_code=404, detail=f"Zone '{zone_id}' not found")
    return detail


@router.get("/zones/{zone_id}/reports")
def zone_reports(zone_id: str, session: Session = Depends(get_session)):
    zone = session.get(Zone, zone_id)
    if zone is None:
        raise HTTPException(status_code=404, detail=f"Zone '{zone_id}' not found")
    logs = (
        session.query(ZoneReportLog)
        .filter_by(zone_id=zone_id)
        .order_by(ZoneReportLog.submitted_at.desc())
        .all()
    )
    return {
        "zoneId": zone_id,
        "reports": [
            {
                "reportRef": log.report_ref,
                "latitude": log.latitude,
                "longitude": log.longitude,
                "coveragePercent": log.coverage_percent,
                "severity": log.severity,
                "status": log.status,
                "submittedAt": log.submitted_at.isoformat(),
            }
            for log in logs
        ],
    }


@router.post("/zones/assign")
def assign_zone(body: ZoneAssignRequest, session: Session = Depends(get_session)):
    zone_id = zone_service.find_zone_for_point(body.latitude, body.longitude)
    if zone_id is None:
        raise HTTPException(
            status_code=422,
            detail="These coordinates fall outside every monitoring zone boundary.",
        )
    zone = zone_service.record_report(
        session, zone_id, body.latitude, body.longitude,
        body.coveragePercent, body.severity, body.reportRef,
    )
    return {"zoneId": zone.zone_id, "zoneName": zone.name, "risk": zone.current_risk}


@router.patch("/zones/{zone_id}/risk")
def override_zone_risk(zone_id: str, body: RiskOverrideRequest, session: Session = Depends(get_session)):
    try:
        zone = zone_service.apply_manual_override(session, zone_id, body.riskLevel, body.officerName, body.reason)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc))
    return zone_service.zone_to_geojson_feature(zone)


@router.patch("/zones/reports/{report_ref}/status")
def update_report_status(report_ref: str, body: ReportStatusRequest, session: Session = Depends(get_session)):
    zone = zone_service.update_report_status(session, report_ref, body.status)
    if zone is None:
        # Not an error: this report was never assigned to a zone (seed
        # data, or submitted before Zone Mapping existed). Nothing to sync.
        return {"synced": False}
    return {"synced": True, "zoneId": zone.zone_id, "risk": zone.current_risk}
