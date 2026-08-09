"""services/zone_service.py — everything Zone Mapping needs on top of the
GeoJSON: loading it into the database, point-in-polygon zone assignment,
risk scoring, and aggregate stats maintenance.

data/dal_lake_zones.geojson is the single source of truth for geometry.
This module reads it once at startup (load_zones_from_geojson) and keeps
an in-memory shapely index for fast point-in-polygon lookups; the database
holds the live stats (report counts, average coverage, current risk) that
change over time, which the static GeoJSON file does not and should not
track.
"""

import json
import logging
import threading
from datetime import datetime, timedelta, timezone
from pathlib import Path

from shapely.geometry import shape, Point
from sqlalchemy.orm import Session

from db_models import Zone, ZoneReportLog, RiskOverride

logger = logging.getLogger("plasticnet.zone_service")

GEOJSON_PATH = Path(__file__).resolve().parent.parent / "data" / "dal_lake_zones.geojson"

_index_lock = threading.Lock()
_polygon_index: list[tuple[str, "shapely.geometry.Polygon"]] = []


def _utcnow():
    return datetime.now(timezone.utc)


def _as_aware(dt: datetime | None) -> datetime | None:
    """SQLite round-trips datetimes as naive; treat naive values as UTC
    (the only timezone anything in this service ever writes) rather than
    let a naive/aware subtraction raise."""
    if dt is None:
        return None
    return dt if dt.tzinfo else dt.replace(tzinfo=timezone.utc)


def load_zones_from_geojson(session: Session) -> int:
    """Upserts every feature in the GeoJSON into the zones table. Geometry,
    name, area and centroid are always refreshed from the file (it's the
    source of truth for those); stats and risk are left untouched for a
    zone that already exists, only initialised for a genuinely new one.
    Also rebuilds the in-memory point-in-polygon index. Returns the
    number of zones now loaded."""
    if not GEOJSON_PATH.exists():
        raise FileNotFoundError(
            f"No zones GeoJSON at {GEOJSON_PATH}. Run scripts/generate_zones.py "
            f"against a boundary file first."
        )

    data = json.loads(GEOJSON_PATH.read_text())
    features = data.get("features", [])

    new_index = []
    for feature in features:
        props = feature["properties"]
        zone_id = props["zoneId"]
        geometry_json = json.dumps(feature["geometry"])
        polygon = shape(feature["geometry"])
        new_index.append((zone_id, polygon))

        existing = session.get(Zone, zone_id)
        if existing:
            existing.name = props["name"]
            existing.geometry_geojson = geometry_json
            existing.area_sqm = props["areaSqm"]
            existing.centroid_lat = props["centroidLat"]
            existing.centroid_lng = props["centroidLng"]
        else:
            session.add(Zone(
                zone_id=zone_id,
                name=props["name"],
                geometry_geojson=geometry_json,
                area_sqm=props["areaSqm"],
                centroid_lat=props["centroidLat"],
                centroid_lng=props["centroidLng"],
                default_risk=props.get("defaultRisk", "white"),
                current_risk=props.get("defaultRisk", "white"),
            ))
    session.commit()

    with _index_lock:
        _polygon_index.clear()
        _polygon_index.extend(new_index)

    logger.info("Loaded %d zones from %s", len(new_index), GEOJSON_PATH.name)
    return len(new_index)


def find_zone_for_point(latitude: float, longitude: float) -> str | None:
    """Point-in-polygon search over the in-memory index. GeoJSON convention
    is (lng, lat), Shapely Point takes (x, y) = (lng, lat) to match."""
    point = Point(longitude, latitude)
    with _index_lock:
        candidates = list(_polygon_index)
    for zone_id, polygon in candidates:
        if polygon.contains(point) or polygon.touches(point):
            return zone_id
    return None


def compute_risk(total_reports: int, average_coverage: float, last_report_at: datetime | None) -> str:
    """Transparent, documented heuristic, not a trained model: no reports
    ever filed is white by definition, otherwise a 0-100 score blends
    report volume, average severity, and recency, and maps onto the four
    required colours. Tune the thresholds here if real-world zones cluster
    too heavily in one band once there's real report data to look at."""
    if total_reports <= 0 or last_report_at is None:
        return "white"

    aware_last_report = _as_aware(last_report_at)
    days_since = (_utcnow() - aware_last_report).days

    volume_score = min(total_reports / 5, 1.0) * 40
    coverage_score = min((average_coverage or 0) / 10, 1.0) * 40
    recency_score = 20 if days_since <= 7 else (10 if days_since <= 30 else 0)
    score = volume_score + coverage_score + recency_score

    if score >= 65:
        return "red"
    if score >= 35:
        return "orange"
    return "yellow"


def _refresh_zone_risk(zone: Zone) -> None:
    """Recomputes current_risk from live stats, unless an authority
    override is in effect, in which case the override's colour wins and
    this is a no-op."""
    if zone.risk_source == "override":
        return
    zone.current_risk = compute_risk(zone.total_reports, zone.average_coverage, zone.last_report_at)


def record_report(
    session: Session,
    zone_id: str,
    latitude: float,
    longitude: float,
    coverage_percent: float | None,
    severity: str | None,
    report_ref: str | None,
) -> Zone:
    """Logs a citizen report against a zone and recomputes that zone's
    aggregate stats and risk. Called once, right after find_zone_for_point
    assigns the zone, from the /api/zones/assign endpoint."""
    zone = session.get(Zone, zone_id)
    if zone is None:
        raise ValueError(f"Zone '{zone_id}' does not exist")

    log_entry = ZoneReportLog(
        zone_id=zone_id,
        report_ref=report_ref,
        latitude=latitude,
        longitude=longitude,
        coverage_percent=coverage_percent,
        severity=severity,
        status="pending",
    )
    session.add(log_entry)

    coverages = [r.coverage_percent for r in zone.reports if r.coverage_percent is not None]
    coverages.append(coverage_percent) if coverage_percent is not None else None

    zone.total_reports += 1
    zone.pending_reports += 1
    zone.average_coverage = (sum(coverages) / len(coverages)) if coverages else zone.average_coverage
    zone.last_report_at = _utcnow()
    _refresh_zone_risk(zone)

    session.commit()
    session.refresh(zone)
    return zone


def update_report_status(session: Session, report_ref: str, new_status: str) -> Zone | None:
    """Keeps a zone's pending/resolved counts in sync when the authority
    dashboard changes a report's status. Returns None (a no-op) for a
    report_ref this service never saw, e.g. one of the seed reports that
    predates Zone Mapping, or one submitted before this backend was live.
    """
    log_entry = session.query(ZoneReportLog).filter_by(report_ref=report_ref).first()
    if log_entry is None:
        return None

    was_resolved = log_entry.status == "resolved"
    is_resolved = new_status == "resolved"
    if was_resolved == is_resolved:
        return session.get(Zone, log_entry.zone_id)

    log_entry.status = new_status
    zone = session.get(Zone, log_entry.zone_id)
    if is_resolved:
        zone.pending_reports = max(0, zone.pending_reports - 1)
        zone.resolved_reports += 1
    else:
        zone.resolved_reports = max(0, zone.resolved_reports - 1)
        zone.pending_reports += 1

    session.commit()
    session.refresh(zone)
    return zone


def apply_manual_override(session: Session, zone_id: str, risk_level: str, officer_name: str, reason: str) -> Zone:
    zone = session.get(Zone, zone_id)
    if zone is None:
        raise ValueError(f"Zone '{zone_id}' does not exist")

    color_by_level = {"low": "yellow", "moderate": "orange", "high": "red"}
    if risk_level not in color_by_level:
        raise ValueError(f"risk_level must be one of {list(color_by_level)}, got '{risk_level}'")

    session.add(RiskOverride(zone_id=zone_id, risk_level=risk_level, officer_name=officer_name, reason=reason))
    zone.current_risk = color_by_level[risk_level]
    zone.risk_source = "override"
    session.commit()
    session.refresh(zone)
    return zone


def zone_to_geojson_feature(zone: Zone) -> dict:
    geometry = json.loads(zone.geometry_geojson)
    return {
        "type": "Feature",
        "properties": {
            "zoneId": zone.zone_id,
            "name": zone.name,
            "areaSqm": zone.area_sqm,
            "centroidLat": zone.centroid_lat,
            "centroidLng": zone.centroid_lng,
            "risk": zone.current_risk,
            "riskSource": zone.risk_source,
            "totalReports": zone.total_reports,
            "pendingReports": zone.pending_reports,
            "resolvedReports": zone.resolved_reports,
            "averageCoverage": round(zone.average_coverage, 2),
            "lastUpdated": zone.last_updated.isoformat() if zone.last_updated else None,
        },
        "geometry": geometry,
    }


def _compute_trend(session: Session, zone_id: str) -> str:
    """Compares average coverage of reports filed in the last 7 days
    against the 7 days before that. Needs at least one report in each
    window to say anything more specific than 'insufficient data', this
    is meant to read as a real, checkable signal, not a guess dressed up
    as one."""
    now = _utcnow()
    recent = [
        r.coverage_percent for r in session.query(ZoneReportLog)
        .filter(ZoneReportLog.zone_id == zone_id)
        .filter(ZoneReportLog.submitted_at >= now.replace(tzinfo=None) - timedelta(days=7))
        .all()
        if r.coverage_percent is not None
    ]
    prior = [
        r.coverage_percent for r in session.query(ZoneReportLog)
        .filter(ZoneReportLog.zone_id == zone_id)
        .filter(ZoneReportLog.submitted_at < now.replace(tzinfo=None) - timedelta(days=7))
        .filter(ZoneReportLog.submitted_at >= now.replace(tzinfo=None) - timedelta(days=14))
        .all()
        if r.coverage_percent is not None
    ]
    if not recent or not prior:
        return "insufficient-data"
    recent_avg = sum(recent) / len(recent)
    prior_avg = sum(prior) / len(prior)
    if recent_avg > prior_avg * 1.1:
        return "worsening"
    if recent_avg < prior_avg * 0.9:
        return "improving"
    return "stable"


def get_zone_detail(session: Session, zone_id: str) -> dict | None:
    zone = session.get(Zone, zone_id)
    if zone is None:
        return None

    latest = session.query(ZoneReportLog).filter_by(zone_id=zone_id).order_by(ZoneReportLog.submitted_at.desc()).first()
    latest_override = session.query(RiskOverride).filter_by(zone_id=zone_id).order_by(RiskOverride.created_at.desc()).first()

    feature = zone_to_geojson_feature(zone)
    feature["properties"].update({
        "trend": _compute_trend(session, zone_id),
        "latestReport": {
            "reportRef": latest.report_ref,
            "coveragePercent": latest.coverage_percent,
            "severity": latest.severity,
            "status": latest.status,
            "submittedAt": latest.submitted_at.isoformat(),
        } if latest else None,
        "authorityRemarks": latest_override.reason if latest_override else None,
        "overrideBy": latest_override.officer_name if latest_override else None,
    })
    return feature


def all_zones_geojson(session: Session) -> dict:
    zones = session.query(Zone).all()
    return {
        "type": "FeatureCollection",
        "features": [zone_to_geojson_feature(z) for z in zones],
    }
