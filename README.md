# Field Guide

A full-stack field guide app powered by **iNaturalist** and **GBIF**.  
Give it a location, a season, and a taxonomy class — get back a ranked list of species you're likely to encounter.

---

## Project Structure

```
field-guide/
├── service/          # FastAPI — wraps iNaturalist & GBIF
│   ├── main.py
│   └── requirements.txt
└── we-ui/         # React + Vite UI
    ├── index.html
    ├── vite.config.js
    └── src/
        ├── main.jsx
        ├── App.jsx
        └── api.js
```

---

## Quick Start

### 1. service

```bash
cd service
pip install -r requirements.txt
uvicorn main:app --reload
```

API runs at **http://localhost:8000**  
Interactive docs at **http://localhost:8000/docs**

### 2. we-ui

```bash
cd web-ui
npm install
npm run dev
```

UI runs at **http://localhost:5173**  
Vite proxies `/api/*` → `http://localhost:8000` automatically.

---

## API Reference

### `GET /species`

| Parameter    | Type   | Default | Description                                      |
|--------------|--------|---------|--------------------------------------------------|
| `location`   | string | —       | Place name, e.g. `Yosemite, California` (required)|
| `taxonomy`   | string | `Aves`  | `Aves`, `Mammalia`, `Insecta`, `Amphibia`, `Reptilia`, `Plantae`, `Fungi` |
| `month_start`| 1–12   | `1`     | Start month                                      |
| `month_end`  | 1–12   | `12`    | End month                                        |
| `source`     | string | `inat`  | `inat` or `gbif`                                 |
| `limit`      | 1–50   | `10`    | Max results                                      |
| `country`    | string | —       | ISO-2 country code for GBIF (e.g. `US`, `GB`)   |

### `GET /taxonomy`
Returns the list of supported taxonomy classes.

### `GET /field-guide/pdf`

Generates a downloadable PDF field guide covering **all taxonomy classes** for a location and season. Each species entry includes a photo and a brief description sourced from Wikipedia.

| Parameter    | Type   | Default | Description                                      |
|--------------|--------|---------|--------------------------------------------------|
| `location`   | string | —       | Place name (use this or `lat`+`lon`)             |
| `lat`        | float  | —       | Latitude (-90 to 90)                             |
| `lon`        | float  | —       | Longitude (-180 to 180)                          |
| `radius_km`  | float  | `50`    | Search radius in km (when using lat/lon)         |
| `month_start`| 1–12   | `1`     | Start month                                      |
| `month_end`  | 1–12   | `12`    | End month                                        |
| `source`     | string | `inat`  | `inat` or `gbif`                                 |
| `limit`      | 1–20   | `5`     | Species per taxonomy class                       |
| `country`    | string | —       | ISO-2 country code for GBIF (e.g. `US`, `GB`)   |

Returns a `application/pdf` file download. The PDF includes a cover page followed by a section for each taxonomy class (Birds, Mammals, Insects, Amphibians, Reptiles, Plants, Fungi).

### Example Requests

```bash
# Top 10 birds in Yosemite, April–June (iNaturalist)
curl "http://localhost:8000/species?location=Yosemite%2C+California&taxonomy=Aves&month_start=4&month_end=6&source=inat"

# Top mammals in UK, autumn (GBIF)
curl "http://localhost:8000/species?location=Scotland&taxonomy=Mammalia&month_start=9&month_end=11&source=gbif&country=GB"

# Fungi in Costa Rica, rainy season
curl "http://localhost:8000/species?location=Costa+Rica&taxonomy=Fungi&month_start=6&month_end=10&source=inat"

# Full PDF field guide for Costa Rica, rainy season
curl -o field-guide.pdf "http://localhost:8000/field-guide/pdf?location=Costa+Rica&month_start=6&month_end=10&source=inat"

# PDF for a specific area by coordinates (Yellowstone, summer)
curl -o field-guide.pdf "http://localhost:8000/field-guide/pdf?lat=44.4280&lon=-110.5885&radius_km=50&month_start=6&month_end=8&source=inat"
```

### Example Response

```json
{
  "source": "inat",
  "resolvedPlace": "Yosemite National Park",
  "location": "Yosemite, California",
  "taxonomy": "Aves",
  "monthStart": 4,
  "monthEnd": 6,
  "count": 10,
  "species": [
    {
      "rank": 1,
      "commonName": "Steller's Jay",
      "scientificName": "Cyanocitta stelleri",
      "observationCount": 1423,
      "family": "Aves",
      "order": null,
      "kingdom": null,
      "inatTaxonId": 9743,
      "inatUrl": "https://www.inaturalist.org/taxa/9743",
      "wikipediaUrl": "...",
      "photoUrl": "https://...",
      "gbifUrl": null
    },
    ...
  ]
}
```

---

## Deployment

For production, set the web-ui env variable to point to your deployed API:

```bash
# web-ui/.env.production
VITE_API_URL=https://your-api-domain.com
```

For the service, restrict CORS in `main.py`:
```python
allow_origins=["https://your-web-ui-domain.com"]
```

No API keys required — iNaturalist and GBIF are both free and open.
