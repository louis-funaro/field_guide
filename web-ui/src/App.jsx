import { useState, useCallback } from 'react'
import { fetchSpecies } from './api.js'
import './app.css'

const TAXONOMY_OPTIONS = [
  { value: 'Aves',      label: '🐦 Birds'       },
  { value: 'Mammalia',  label: '🦌 Mammals'     },
  { value: 'Insecta',   label: '🦋 Insects'     },
  { value: 'Amphibia',  label: '🐸 Amphibians'  },
  { value: 'Reptilia',  label: '🦎 Reptiles'    },
  { value: 'Plantae',   label: '🌿 Plants'      },
  { value: 'Fungi',     label: '🍄 Fungi'       },
]

const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']
const MONTH_FULL = ['January','February','March','April','May','June','July','August','September','October','November','December']

const SOURCE_INFO = {
  inat: { label: 'iNaturalist', icon: '🔬', desc: 'Citizen science, research-grade obs.' },
  gbif: { label: 'GBIF',        icon: '🏛️', desc: 'Museum & research occurrence data'   },
}

function rarity(count) {
  if (count > 500) return ['Common',    '#5ecf5e']
  if (count > 100) return ['Uncommon',  '#d4c84a']
  if (count > 20)  return ['Rare',      '#d48a4a']
  return               ['Very Rare',   '#d45a5a']
}

function RarityPip({ count }) {
  const [label, color] = rarity(count)
  return (
    <span className="rarity-pip" style={{ color }}>
      <span className="rarity-dot" style={{ background: color }} />
      {label}
    </span>
  )
}

function SpeciesCard({ s, index }) {
  const [open, setOpen] = useState(false)
  return (
    <div
      className="card"
      onClick={() => setOpen(o => !o)}
      style={{ animation: 'fadeUp 0.35s ease both', animationDelay: `${index * 55}ms` }}
    >
      <div className="card__inner">
        {s.photoUrl ? (
          <img src={s.photoUrl} alt={s.commonName} className="card__thumb" />
        ) : (
          <div className="card__rank-bubble">{String(index + 1).padStart(2, '0')}</div>
        )}

        <div className="card__body">
          <div className="card__header">
            <div>
              <div className="card__name">{s.commonName}</div>
              <div className="card__sci">{s.scientificName}</div>
            </div>
            <div className="card__actions">
              {s.observationCount != null && <RarityPip count={s.observationCount} />}
              <span className={`card__chevron${open ? ' open' : ''}`}>▾</span>
            </div>
          </div>
          {s.observationCount != null && (
            <div className="card__count">
              📊 {s.observationCount.toLocaleString()} observations
            </div>
          )}
        </div>
      </div>

      {open && (
        <div className="card__detail">
          <div className="card__attrs">
            {[['Family', s.family], ['Order', s.order], ['Kingdom', s.kingdom], ['Rank', `#${s.rank}`]]
              .filter(([, v]) => v)
              .map(([label, val]) => (
                <div key={label} className="attr-box">
                  <div className="attr-box__label">{label}</div>
                  <div className="attr-box__value">{val}</div>
                </div>
              ))}
          </div>
          <div className="card__links">
            {s.inatUrl     && <ExtLink href={s.inatUrl}     label="iNaturalist →" color="#5ecf5e" />}
            {s.gbifUrl     && <ExtLink href={s.gbifUrl}     label="GBIF →"        color="#5eaacf" />}
            {s.wikipediaUrl && <ExtLink href={s.wikipediaUrl} label="Wikipedia →" color="#aaa" />}
          </div>
        </div>
      )}
    </div>
  )
}

function ExtLink({ href, label, color }) {
  return (
    <a href={href} target="_blank" rel="noopener noreferrer"
      onClick={e => e.stopPropagation()}
      className="ext-link"
      style={{ color }}>
      {label}
    </a>
  )
}

function Select({ label, value, onChange, children }) {
  return (
    <div>
      <label className="field-label">{label}</label>
      <select value={value} onChange={onChange} className="select-input">
        {children}
      </select>
    </div>
  )
}

function ApiDocs({ lastQuery }) {
  const base = window.location.origin + '/api'
  const nameExample = lastQuery && !lastQuery.isCoords
    ? `${base}/species?location=${encodeURIComponent(lastQuery.location)}&taxonomy=${lastQuery.taxonomy}&month_start=${lastQuery.monthStart}&month_end=${lastQuery.monthEnd}&source=${lastQuery.source}&limit=10`
    : `${base}/species?location=Yosemite%2C+California&taxonomy=Aves&month_start=4&month_end=6&source=inat&limit=10`
  const coordExample = lastQuery?.isCoords
    ? `${base}/species?lat=${lastQuery.lat}&lon=${lastQuery.lon}&radius_km=${lastQuery.radiusKm}&taxonomy=${lastQuery.taxonomy}&month_start=${lastQuery.monthStart}&month_end=${lastQuery.monthEnd}&source=${lastQuery.source}`
    : `${base}/species?lat=37.8651&lon=-119.5383&radius_km=30&taxonomy=Aves&month_start=4&month_end=6&source=inat`

  return (
    <div className="api-docs">
      <div className="api-section-label">API Reference</div>

      <p className="api-desc">
        The field guide is also a REST API. Full interactive docs at{' '}
        <ExtLink href={window.location.origin + '/api/docs'} label="/api/docs →" color="#5ecf5e" />.
      </p>

      <div className="api-params">
        <div className="api-params-title">GET /api/species — parameters</div>
        <div className="api-params-grid">
          {[
            ['location',    'string', 'Place name (use this OR lat+lon)'],
            ['lat',         'float',  'Latitude, -90 to 90 (use with lon)'],
            ['lon',         'float',  'Longitude, -180 to 180 (use with lat)'],
            ['radius_km',   'float',  'Search radius in km (default 50, max 500)'],
            ['taxonomy',    'string', 'Aves | Mammalia | Insecta | Amphibia | Reptilia | Plantae | Fungi'],
            ['month_start', '1–12',  'Start month'],
            ['month_end',   '1–12',  'End month'],
            ['source',      'string', 'inat | gbif'],
            ['limit',       '1–50',  'Max results (default 10)'],
            ['country',     'string', 'ISO-2 country code for GBIF (e.g. US)'],
          ].map(([p, t, d]) => [
            <span key={p + '-p'} className="api-param-name">{p}</span>,
            <span key={p + '-d'} className="api-param-desc">{d}</span>,
            <span key={p + '-t'} className="api-param-type">{t}</span>,
          ])}
        </div>
      </div>

      {[
        { label: 'Place name',           url: nameExample },
        { label: 'Coordinates + radius', url: coordExample },
      ].map(({ label, url }) => (
        <div key={label} className="api-example">
          <div className="api-example__label">{label}</div>
          <div className="api-example__url">{url}</div>
        </div>
      ))}
    </div>
  )
}

// ── Main App ─────────────────────────────────────────────────────────────────
export default function App() {
  const [tab,        setTab]        = useState('search')
  const [locMode,    setLocMode]    = useState('name')
  const [location,   setLocation]   = useState('')
  const [lat,        setLat]        = useState('')
  const [lon,        setLon]        = useState('')
  const [radiusKm,   setRadiusKm]   = useState('50')
  const [taxonomy,   setTaxonomy]   = useState('Aves')
  const [monthStart, setMonthStart] = useState(4)
  const [monthEnd,   setMonthEnd]   = useState(6)
  const [source,     setSource]     = useState('inat')
  const [country,    setCountry]    = useState('')
  const [results,    setResults]    = useState(null)
  const [loading,    setLoading]    = useState(false)
  const [loadMsg,    setLoadMsg]    = useState('')
  const [error,      setError]      = useState(null)
  const [lastQuery,  setLastQuery]  = useState(null)

  const isCoords = locMode === 'coords'
  const canSearch = isCoords
    ? (lat !== '' && lon !== '')
    : location.trim() !== ''

  const search = useCallback(async () => {
    if (!canSearch) return
    setLoading(true); setError(null); setResults(null)
    setLoadMsg(source === 'inat' ? '🔍 Querying iNaturalist…' : '🏛️ Querying GBIF…')

    try {
      const data = await fetchSpecies({
        ...(isCoords
          ? { lat: parseFloat(lat), lon: parseFloat(lon), radiusKm: radiusKm ? parseFloat(radiusKm) : 50 }
          : { location }),
        taxonomy, monthStart, monthEnd, source, limit: 10,
        country: country.trim() || undefined,
      })
      setResults(data)
      setLastQuery({ location: isCoords ? `${lat},${lon}` : location, taxonomy, monthStart, monthEnd, source, isCoords, lat, lon, radiusKm })
    } catch (e) {
      setError(e.message)
    } finally {
      setLoading(false); setLoadMsg('')
    }
  }, [location, lat, lon, radiusKm, locMode, taxonomy, monthStart, monthEnd, source, country, canSearch, isCoords])

  return (
    <div className="app">
      {/* Header */}
      <div className="header">
        <div className="header-eyebrow">Generative Field Guide</div>
        <h1 className="header-title">
          Naturalist's<br /><em>Field Companion</em>
        </h1>
        <p className="header-subtitle">
          Real biodiversity data from iNaturalist &amp; GBIF
        </p>

        <div className="tab-bar">
          {[['search', '🗺 Field Guide'], ['api', '⚡ API']].map(([t, label]) => (
            <button key={t} onClick={() => setTab(t)} className={`tab-btn${tab === t ? ' active' : ''}`}>
              {label}
            </button>
          ))}
        </div>
      </div>

      <div className="app-content">
        {tab === 'search' && (
          <>
            {/* Source toggle */}
            <div className="source-grid">
              {Object.entries(SOURCE_INFO).map(([key, src]) => (
                <button key={key} onClick={() => setSource(key)} className={`source-btn${source === key ? ' active' : ''}`}>
                  <div className="source-btn__icon">{src.icon}</div>
                  <div className="source-btn__label">{src.label}</div>
                  <div className="source-btn__desc">{src.desc}</div>
                </button>
              ))}
            </div>

            {/* Form */}
            <div className="form-card">

              {/* Location */}
              <div className="loc-section">
                <label className="field-label">Location</label>
                <div className="loc-mode-toggle">
                  {[['name', '📍 Place name'], ['coords', '🌐 Lat / Lon']].map(([m, label]) => (
                    <button key={m} onClick={() => setLocMode(m)} className={`loc-mode-btn${locMode === m ? ' active' : ''}`}>
                      {label}
                    </button>
                  ))}
                </div>

                {locMode === 'name' ? (
                  <input
                    value={location} onChange={e => setLocation(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && search()}
                    placeholder={source === 'inat' ? 'e.g. Yosemite, California  ·  Scottish Highlands' : 'Include country for best GBIF results'}
                    className="text-input"
                  />
                ) : (
                  <div className="coord-grid">
                    {[
                      { label: 'Latitude',  value: lat,      set: setLat,      placeholder: '37.8651',   note: '-90 to 90'   },
                      { label: 'Longitude', value: lon,      set: setLon,      placeholder: '-119.5383', note: '-180 to 180' },
                      { label: 'Radius km', value: radiusKm, set: setRadiusKm, placeholder: '50',        note: 'default 50'  },
                    ].map(({ label, value, set, placeholder, note }) => (
                      <div key={label}>
                        <div className="coord-label">
                          {label} <span>({note})</span>
                        </div>
                        <input
                          type="number" value={value} onChange={e => set(e.target.value)}
                          onKeyDown={e => e.key === 'Enter' && search()}
                          placeholder={placeholder}
                          className="coord-input"
                        />
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Country (GBIF only) */}
              {source === 'gbif' && (
                <div className="country-section">
                  <label className="field-label">
                    Country Code <span className="label-note">(ISO-2, optional — e.g. US, GB, AU)</span>
                  </label>
                  <input
                    value={country} onChange={e => setCountry(e.target.value.toUpperCase().slice(0, 2))}
                    placeholder="US"
                    className="country-input"
                  />
                </div>
              )}

              {/* Month range */}
              <div className="month-grid">
                <Select label="From Month" value={monthStart} onChange={e => setMonthStart(Number(e.target.value))}>
                  {MONTHS.map((m, i) => <option key={m} value={i + 1}>{m}</option>)}
                </Select>
                <Select label="To Month" value={monthEnd} onChange={e => setMonthEnd(Number(e.target.value))}>
                  {MONTHS.map((m, i) => <option key={m} value={i + 1}>{m}</option>)}
                </Select>
              </div>

              {/* Taxonomy */}
              <div className="taxonomy-section">
                <label className="field-label">Taxonomy Class</label>
                <div className="taxonomy-pills">
                  {TAXONOMY_OPTIONS.map(opt => (
                    <button key={opt.value} onClick={() => setTaxonomy(opt.value)} className={`taxonomy-pill${taxonomy === opt.value ? ' active' : ''}`}>
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>

              <button onClick={search} disabled={loading || !canSearch} className="search-btn">
                {loading ? loadMsg || 'Loading…' : `Search ${SOURCE_INFO[source].label} →`}
              </button>
            </div>

            {error && (
              <div className="error-banner">⚠️ {error}</div>
            )}

            {results && (
              <div className="results">
                <div className="results-header">
                  <div className="results-source-label">
                    {SOURCE_INFO[results.source].icon} {SOURCE_INFO[results.source].label} · Field Guide
                  </div>
                  <h2 className="results-title">{results.resolvedPlace}</h2>
                  <div className="results-meta">
                    {MONTH_FULL[results.monthStart - 1]}–{MONTH_FULL[results.monthEnd - 1]} · {results.taxonomy} · {results.count} species
                  </div>
                </div>
                <div className="species-list">
                  {results.species.map((s, i) => <SpeciesCard key={i} s={s} index={i} />)}
                </div>
                <div className="results-hint">
                  Tap any entry to expand · Data from {SOURCE_INFO[results.source].label}
                </div>
              </div>
            )}
          </>
        )}

        {tab === 'api' && <ApiDocs lastQuery={lastQuery} />}
      </div>
    </div>
  )
}
