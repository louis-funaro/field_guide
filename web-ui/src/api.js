const BASE = import.meta.env.VITE_API_URL || '/api'

export async function fetchSpecies({ location, lat, lon, radiusKm, taxonomy, monthStart, monthEnd, source, limit = 10, country }) {
  const params = new URLSearchParams({ taxonomy, month_start: monthStart, month_end: monthEnd, source, limit })

  if (lat != null && lon != null) {
    params.set('lat', lat)
    params.set('lon', lon)
    if (radiusKm != null) params.set('radius_km', radiusKm)
  } else {
    params.set('location', location)
  }
  if (country) params.set('country', country)

  const res = await fetch(`${BASE}/species?${params}`)
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(err.detail || `API error ${res.status}`)
  }
  return res.json()
}

export async function fetchTaxonomy() {
  const res = await fetch(`${BASE}/taxonomy`)
  if (!res.ok) throw new Error('Failed to load taxonomy list')
  return res.json()
}
