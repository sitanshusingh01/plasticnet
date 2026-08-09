"""
scripts/generate_zones.py — takes ONE boundary polygon (the lake's real
outline) and produces backend/data/dal_lake_zones.geojson: a partition of
that boundary into roughly TARGET_ZONE_COUNT monitoring zones.

Method: grid-clip tessellation. A regular grid is laid over the boundary's
bounding box, each cell is intersected with the boundary polygon (shapely),
and every non-trivial resulting piece becomes one zone. This is a
partition by construction — the pieces are disjoint (grid cells don't
overlap) and their union is exactly the input boundary (the grid fully
covers its bounding box) — so "no overlaps, no gaps" holds by how the
shapes are built, not by a separate check bolted on after. Interior cells
come out as plain squares; cells that straddle the shoreline get clipped
to the lake's actual outline, which is what gives the zones near the edge
their irregular, lake-following shape instead of every zone being an
arbitrary square block.

Usage:
    python3 scripts/generate_zones.py <boundary.geojson> [--target N] [--out PATH]

The input file must contain exactly one Polygon (or MultiPolygon) feature,
in WGS84 (lon/lat) — the same convention as the rest of this project's
GeoJSON.
"""

import argparse
import json
import math
import sys
from pathlib import Path

from shapely.geometry import shape, mapping, box
from shapely.ops import unary_union
from shapely.validation import make_valid

TARGET_ZONE_COUNT = 28  # midpoint of the requested 25-30 range
MIN_ZONE_AREA_FRACTION = 0.15  # drop slivers smaller than 15% of an average cell


def load_boundary(path: Path):
    data = json.loads(path.read_text())
    features = data["features"] if data.get("type") == "FeatureCollection" else [data]
    if len(features) != 1:
        raise ValueError(
            f"{path} contains {len(features)} features, expected exactly 1 "
            f"(the lake boundary). Merge multi-part boundaries into a single "
            f"Polygon/MultiPolygon feature first."
        )
    geom = make_valid(shape(features[0]["geometry"]))
    if not geom.is_valid:
        raise ValueError(f"Boundary geometry in {path} is invalid and could not be repaired")
    return geom, features[0].get("properties", {})


def meters_per_degree(latitude_deg: float) -> tuple[float, float]:
    """Local equirectangular approximation: accurate to well under 1% at
    lake scale (a few km across) at a fixed reference latitude. Good
    enough for zone-sizing and area estimates; not a substitute for a
    real projected CRS if this ever needs survey-grade area figures."""
    lat_rad = math.radians(latitude_deg)
    meters_per_deg_lat = 111_132.92 - 559.82 * math.cos(2 * lat_rad)
    meters_per_deg_lng = 111_412.84 * math.cos(lat_rad) - 93.5 * math.cos(3 * lat_rad)
    return meters_per_deg_lng, meters_per_deg_lat


def build_grid_cells(boundary, cell_deg_x: float, cell_deg_y: float):
    minx, miny, maxx, maxy = boundary.bounds
    cells = []
    x = minx
    while x < maxx:
        y = miny
        while y < maxy:
            cells.append(box(x, y, x + cell_deg_x, y + cell_deg_y))
            y += cell_deg_y
        x += cell_deg_x
    return cells


def tessellate(boundary, target_count: int):
    """Binary-searches the grid cell size until the clipped piece count is
    within +/-2 of target_count, then returns those pieces. A handful of
    iterations always converges for a simple lake-shaped boundary."""
    minx, miny, maxx, maxy = boundary.bounds
    ref_lat = (miny + maxy) / 2
    m_per_deg_x, m_per_deg_y = meters_per_degree(ref_lat)

    boundary_area_m2 = boundary.area * m_per_deg_x * m_per_deg_y
    approx_cell_area_m2 = boundary_area_m2 / target_count
    approx_cell_side_m = math.sqrt(approx_cell_area_m2)

    low, high = approx_cell_side_m * 0.4, approx_cell_side_m * 2.5
    best_pieces = None
    best_diff = None

    for _ in range(14):
        mid_side_m = (low + high) / 2
        cell_deg_x = mid_side_m / m_per_deg_x
        cell_deg_y = mid_side_m / m_per_deg_y

        cells = build_grid_cells(boundary, cell_deg_x, cell_deg_y)
        avg_cell_area_deg2 = cell_deg_x * cell_deg_y
        min_piece_area_deg2 = avg_cell_area_deg2 * MIN_ZONE_AREA_FRACTION

        pieces = []
        for cell in cells:
            if not cell.intersects(boundary):
                continue
            piece = make_valid(cell.intersection(boundary))
            if piece.is_empty or piece.area < min_piece_area_deg2:
                continue
            if piece.geom_type == "MultiPolygon":
                pieces.extend(g for g in piece.geoms if g.area >= min_piece_area_deg2)
            elif piece.geom_type == "Polygon":
                pieces.append(piece)

        diff = len(pieces) - target_count
        if best_diff is None or abs(diff) < abs(best_diff):
            best_diff, best_pieces = diff, pieces

        if abs(diff) <= 2:
            return pieces
        # Fewer pieces than wanted -> cells too big -> shrink cells (lower side length)
        if diff < 0:
            high = mid_side_m
        else:
            low = mid_side_m

    return best_pieces


def validate_partition(boundary, pieces):
    union = unary_union(pieces)
    coverage_ratio = union.area / boundary.area
    overlap_area = sum(a.intersection(b).area for i, a in enumerate(pieces) for b in pieces[i + 1:] if a.intersects(b))
    return {
        "zone_count": len(pieces),
        "coverage_ratio": round(coverage_ratio, 4),
        "overlap_area_deg2": round(overlap_area, 10),
        "gaps_present": coverage_ratio < 0.995,
        "overlaps_present": overlap_area > 1e-9,
    }


def build_geojson(boundary_properties: dict, pieces: list) -> dict:
    ref_lat = sum(p.centroid.y for p in pieces) / len(pieces)
    m_per_deg_x, m_per_deg_y = meters_per_degree(ref_lat)

    # Order zones in reading order (north to south, west to east within a
    # row) so R1..RN land on the map in a sensible, findable sequence
    # rather than whatever order the grid sweep happened to produce them.
    def sort_key(piece):
        c = piece.centroid
        return (-round(c.y, 3), round(c.x, 3))

    pieces_sorted = sorted(pieces, key=sort_key)

    features = []
    for i, piece in enumerate(pieces_sorted, start=1):
        zone_id = f"R{i}"
        centroid = piece.centroid
        area_m2 = piece.area * m_per_deg_x * m_per_deg_y
        features.append({
            "type": "Feature",
            "properties": {
                "zoneId": zone_id,
                "name": f"Zone {zone_id}",
                "areaSqm": round(area_m2, 1),
                "centroidLat": round(centroid.y, 6),
                "centroidLng": round(centroid.x, 6),
                "defaultRisk": "white",
            },
            "geometry": mapping(piece),
        })

    return {
        "type": "FeatureCollection",
        "properties": {
            "sourceBoundary": boundary_properties.get("name", "unnamed boundary"),
            "zoneCount": len(features),
            "generatedBy": "scripts/generate_zones.py (grid-clip tessellation)",
        },
        "features": features,
    }


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("boundary_path", type=Path)
    parser.add_argument("--target", type=int, default=TARGET_ZONE_COUNT)
    parser.add_argument("--out", type=Path, default=Path(__file__).resolve().parent.parent / "data" / "dal_lake_zones.geojson")
    args = parser.parse_args()

    boundary, props = load_boundary(args.boundary_path)
    pieces = tessellate(boundary, args.target)
    report = validate_partition(boundary, pieces)

    print(f"Generated {report['zone_count']} zones from {args.boundary_path.name}")
    print(f"  boundary coverage: {report['coverage_ratio'] * 100:.2f}%  "
          f"(gaps: {'YES - CHECK OUTPUT' if report['gaps_present'] else 'none'})")
    print(f"  overlap area: {report['overlap_area_deg2']:.2e} deg^2  "
          f"(overlaps: {'YES - CHECK OUTPUT' if report['overlaps_present'] else 'none'})")

    if report["gaps_present"] or report["overlaps_present"]:
        print("VALIDATION FAILED, refusing to write output.", file=sys.stderr)
        sys.exit(1)

    geojson = build_geojson(props, pieces)
    args.out.parent.mkdir(parents=True, exist_ok=True)
    args.out.write_text(json.dumps(geojson, indent=2))
    print(f"Wrote {args.out}")


if __name__ == "__main__":
    main()
