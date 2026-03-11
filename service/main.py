"""
Field Guide API
Wraps iNaturalist and GBIF to return ranked species for a location + season + taxonomy.
Supports both place-name lookup and lat/lon + radius_km coordinates.
"""

import asyncio
import math
from datetime import date
from typing import Literal

import httpx
from fastapi import FastAPI, Query, HTTPException
from fastapi.middleware.cors import CORSMiddleware

app = FastAPI(
    title="Field Guide API",
    description="Generative field guide powered by iNaturalist and GBIF",
    version="1.1.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["GET"],
    allow_headers=["*"],
)

INAT_BASE = "https://api.inaturalist.org/v1"
GBIF_BASE = "https://api.gbif.org/v1"

GBIF_CLASS_KEYS = {
    "Aves": 212,
    "Mammalia": 359,
    "Insecta": 216,
    "Amphibia": 131,
    "Reptilia": 358,
    "Plantae": 6,
    "Fungi": 5,
}

TAXONOMY_OPTIONS = list(GBIF_CLASS_KEYS.keys())


# ---------------------------------------------------------------------------
# Geo helpers
# ---------------------------------------------------------------------------

def radius_to_bbox(lat: float, lon: float, radius_km: float) -> tuple[float, float, float, float]:
    """Return (min_lat, min_lon, max_lat, max_lon) for a circle approximated as a bbox."""
    delta_lat = radius_km / 111.0
    delta_lon = radius_km / (111.0 * math.cos(math.radians(lat)))
    return (
        round(lat - delta_lat, 6),
        round(lon - delta_lon, 6),
        round(lat + delta_lat, 6),
        round(lon + delta_lon, 6),
    )


def bbox_to_wkt(min_lat: float, min_lon: float, max_lat: float, max_lon: float) -> str:
    """Convert bbox to WKT POLYGON for GBIF geometry param."""
    return (
        f"POLYGON(({min_lon} {min_lat},"
        f"{max_lon} {min_lat},"
        f"{max_lon} {max_lat},"
        f"{min_lon} {max_lat},"
        f"{min_lon} {min_lat}))"
    )


async def reverse_geocode_label(lat: float, lon: float, radius_km: float) -> str:
    """Best-effort human label for coordinates via Nominatim (OSM). Falls back gracefully."""
    try:
        async with httpx.AsyncClient(
            timeout=5,
            headers={"User-Agent": "FieldGuideApp/1.1"},
        ) as client:
            r = await client.get(
                "https://nominatim.openstreetmap.org/reverse",
                params={"lat": lat, "lon": lon, "format": "json"},
            )
            if r.is_success:
                addr = r.json().get("address", {})
                parts = [
                    addr.get("city") or addr.get("town") or addr.get("village") or addr.get("county"),
                    addr.get("state") or addr.get("region"),
                    addr.get("country"),
                ]
                label = ", ".join(p for p in parts if p)
                if label:
                    return f"{label} (±{radius_km:.0f} km)"
    except Exception:
        pass
    return f"{lat:.4f}, {lon:.4f} (±{radius_km:.0f} km)"


# ---------------------------------------------------------------------------
# iNaturalist helpers
# ---------------------------------------------------------------------------

async def inat_resolve_place(client: httpx.AsyncClient, location: str) -> dict:
    r = await client.get(
        f"{INAT_BASE}/places/autocomplete",
        params={"q": location, "per_page": 1},
    )
    r.raise_for_status()
    results = r.json().get("results", [])
    if not results:
        raise HTTPException(404, f"Could not find place '{location}' on iNaturalist.")
    return results[0]


def _inat_base_params(iconic_taxa: str, month_start: int, month_end: int, limit: int) -> dict:
    import datetime
    year = date.today().year - 1
    if month_end == 12:
        last_day = 31
    else:
        last_day = (date(year, month_end + 1, 1) - datetime.timedelta(days=1)).day
    return {
        "iconic_taxa": iconic_taxa,
        "quality_grade": "research",
        "per_page": limit,
        "order_by": "count",
        "d1": f"{year}-{month_start:02d}-01",
        "d2": f"{year}-{month_end:02d}-{last_day}",
    }


async def inat_species_counts_by_place(
    client: httpx.AsyncClient,
    place_id: int,
    iconic_taxa: str,
    month_start: int,
    month_end: int,
    limit: int,
) -> list[dict]:
    params = _inat_base_params(iconic_taxa, month_start, month_end, limit)
    params["place_id"] = place_id
    r = await client.get(f"{INAT_BASE}/observations/species_counts", params=params)
    r.raise_for_status()
    return r.json().get("results", [])


async def inat_species_counts_by_coords(
    client: httpx.AsyncClient,
    lat: float,
    lon: float,
    radius_km: float,
    iconic_taxa: str,
    month_start: int,
    month_end: int,
    limit: int,
) -> list[dict]:
    params = _inat_base_params(iconic_taxa, month_start, month_end, limit)
    # iNaturalist accepts lat/lng + radius (in km)
    params["lat"] = lat
    params["lng"] = lon
    params["radius"] = radius_km
    r = await client.get(f"{INAT_BASE}/observations/species_counts", params=params)
    r.raise_for_status()
    return r.json().get("results", [])


def _format_inat_results(raw: list[dict], limit: int) -> list[dict]:
    return [
        {
            "rank": i + 1,
            "commonName": r["taxon"].get("preferred_common_name") or r["taxon"].get("name"),
            "scientificName": r["taxon"].get("name"),
            "observationCount": r["count"],
            "family": r["taxon"].get("iconic_taxon_name"),
            "order": None,
            "kingdom": None,
            "inatTaxonId": r["taxon"].get("id"),
            "inatUrl": f"https://www.inaturalist.org/taxa/{r['taxon']['id']}" if r["taxon"].get("id") else None,
            "wikipediaUrl": r["taxon"].get("wikipedia_url"),
            "photoUrl": r["taxon"].get("default_photo", {}).get("medium_url"),
            "gbifUrl": None,
        }
        for i, r in enumerate(raw[:limit])
    ]


# ---------------------------------------------------------------------------
# GBIF helpers
# ---------------------------------------------------------------------------

async def gbif_top_species(
    client: httpx.AsyncClient,
    class_key: int,
    month_start: int,
    month_end: int,
    limit: int,
    country: str | None = None,
    geometry: str | None = None,
) -> list[dict]:
    year = date.today().year - 1
    months = list(range(month_start, month_end + 1))

    params = [
        ("classKey", class_key),
        ("year", year),
        ("facet", "speciesKey"),
        ("facetLimit", limit + 5),
        ("limit", 0),
        ("hasCoordinate", "true"),
        ("hasGeospatialIssue", "false"),
    ]
    if country:
        params.append(("country", country.upper()))
    if geometry:
        params.append(("geometry", geometry))
    for m in months:
        params.append(("month", m))

    r = await client.get(f"{GBIF_BASE}/occurrence/search", params=params)
    r.raise_for_status()
    facets = r.json().get("facets", [])
    if not facets:
        return []
    species_keys = [f["name"] for f in facets[0].get("counts", [])][:limit]

    async def fetch_one(key: str) -> dict | None:
        try:
            sr = await client.get(f"{GBIF_BASE}/species/{key}")
            sr.raise_for_status()
            d = sr.json()
            cp = [("speciesKey", key), ("year", year), ("hasCoordinate", "true"), ("limit", 0)]
            if country:
                cp.append(("country", country.upper()))
            if geometry:
                cp.append(("geometry", geometry))
            for m in months:
                cp.append(("month", m))
            cr = await client.get(f"{GBIF_BASE}/occurrence/search", params=cp)
            count = cr.json().get("count", 0) if cr.is_success else 0
            return {
                "commonName": d.get("vernacularName") or d.get("canonicalName") or d.get("scientificName"),
                "scientificName": d.get("canonicalName") or d.get("scientificName"),
                "observationCount": count,
                "family": d.get("family"),
                "order": d.get("order"),
                "kingdom": d.get("kingdom"),
                "gbifKey": key,
                "gbifUrl": f"https://www.gbif.org/species/{key}",
                "inatUrl": None,
                "wikipediaUrl": None,
                "photoUrl": None,
            }
        except Exception:
            return None

    results = await asyncio.gather(*[fetch_one(k) for k in species_keys])
    return sorted(
        [r for r in results if r],
        key=lambda x: x["observationCount"] or 0,
        reverse=True,
    )[:limit]


# ---------------------------------------------------------------------------
# Routes
# ---------------------------------------------------------------------------

@app.get("/")
async def root():
    return {"service": "Field Guide API", "version": "1.1.0", "docs": "/docs"}


@app.get("/taxonomy")
async def list_taxonomy():
    """Return supported taxonomy classes."""
    return {"taxonomy": TAXONOMY_OPTIONS}


@app.get("/species")
async def get_species(
    # Location — name OR coordinates
    location: str | None = Query(None, description="Place name, e.g. 'Yosemite, California'"),
    lat: float | None = Query(None, ge=-90, le=90, description="Latitude (-90 to 90)"),
    lon: float | None = Query(None, ge=-180, le=180, description="Longitude (-180 to 180)"),
    radius_km: float | None = Query(None, gt=0, le=500, description="Search radius in km (default 50 when using lat/lon)"),
    # Filters
    taxonomy: str = Query("Aves", description=f"One of: {', '.join(TAXONOMY_OPTIONS)}"),
    month_start: int = Query(1, ge=1, le=12, description="Start month (1-12)"),
    month_end: int = Query(12, ge=1, le=12, description="End month (1-12)"),
    source: Literal["inat", "gbif"] = Query("inat", description="Data source"),
    limit: int = Query(10, ge=1, le=50, description="Max results"),
    country: str | None = Query(None, description="ISO-2 country code for GBIF (e.g. US, GB)"),
):
    """
    Return ranked species for a location, season, and taxonomy class.

    **Location** — provide one of:
    - `location` — free-text place name
    - `lat` + `lon` (+ optional `radius_km`, default 50 km)

    **Sources:**
    - `inat` — research-grade citizen science observations (iNaturalist)
    - `gbif` — global museum & research occurrence data (GBIF)
    """
    if taxonomy not in TAXONOMY_OPTIONS:
        raise HTTPException(400, f"taxonomy must be one of: {', '.join(TAXONOMY_OPTIONS)}")
    if month_start > month_end:
        raise HTTPException(400, "month_start must be <= month_end")

    coord_mode = lat is not None and lon is not None
    if lat is not None and lon is None:
        raise HTTPException(400, "lon is required when lat is provided.")
    if lon is not None and lat is None:
        raise HTTPException(400, "lat is required when lon is provided.")
    if not coord_mode and not location:
        raise HTTPException(400, "Provide either 'location' (place name) or both 'lat' and 'lon'.")

    if coord_mode and radius_km is None:
        radius_km = 50.0

    async with httpx.AsyncClient(timeout=25) as client:

        # ── iNaturalist ──────────────────────────────────────────────────────
        if source == "inat":
            if coord_mode:
                raw = await inat_species_counts_by_coords(
                    client, lat, lon, radius_km, taxonomy, month_start, month_end, limit
                )
                resolved = await reverse_geocode_label(lat, lon, radius_km)
            else:
                place = await inat_resolve_place(client, location)
                raw = await inat_species_counts_by_place(
                    client, place["id"], taxonomy, month_start, month_end, limit
                )
                resolved = place.get("display_name", location)

            if not raw:
                raise HTTPException(
                    404,
                    f"No research-grade {taxonomy} observations found. "
                    "Try a larger radius, different months, or a broader area.",
                )

            return {
                "source": "inat",
                "resolvedPlace": resolved,
                "locationMode": "coordinates" if coord_mode else "name",
                **({"lat": lat, "lon": lon, "radiusKm": radius_km} if coord_mode else {"location": location}),
                "taxonomy": taxonomy,
                "monthStart": month_start,
                "monthEnd": month_end,
                "count": len(raw),
                "species": _format_inat_results(raw, limit),
            }

        # ── GBIF ─────────────────────────────────────────────────────────────
        else:
            class_key = GBIF_CLASS_KEYS[taxonomy]
            geometry = None

            if coord_mode:
                bbox = radius_to_bbox(lat, lon, radius_km)
                geometry = bbox_to_wkt(*bbox)
                resolved = await reverse_geocode_label(lat, lon, radius_km)
            else:
                resolved = location + (f" ({country.upper()})" if country else "")

            raw = await gbif_top_species(
                client, class_key, month_start, month_end, limit,
                country=country, geometry=geometry,
            )

            if not raw:
                raise HTTPException(
                    404,
                    "No GBIF records found. "
                    + ("Try a larger radius. " if coord_mode else "Try adding a country code (e.g. country=US). "),
                )

            return {
                "source": "gbif",
                "resolvedPlace": resolved,
                "locationMode": "coordinates" if coord_mode else "name",
                **({"lat": lat, "lon": lon, "radiusKm": radius_km} if coord_mode else {"location": location}),
                "taxonomy": taxonomy,
                "monthStart": month_start,
                "monthEnd": month_end,
                "count": len(raw),
                "species": [{**s, "rank": i + 1} for i, s in enumerate(raw)],
            }
