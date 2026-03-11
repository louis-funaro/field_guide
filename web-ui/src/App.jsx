import { useState, useCallback } from 'react'
import { fetchSpecies } from './api.js'

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
    <span style={{ display:'inline-flex', alignItems:'center', gap:5, fontSize:11, color, fontFamily:'monospace' }}>
      <span style={{ width:7, height:7, borderRadius:'50%', background:color, display:'inline-block' }} />
      {label}
    </span>
  )
}

function SpeciesCard({ s, index }) {
  const [open, setOpen] = useState(false)
  return (
    <div
      onClick={() => setOpen(o => !o)}
      style={{
        background: 'rgba(255,255,255,0.025)',
        border: '1px solid rgba(255,255,255,0.07)',
        borderRadius: 10, padding: '14px 18px', cursor: 'pointer',
        transition: 'background 0.15s',
        animation: 'fadeUp 0.35s ease both',
        animationDelay: `${index * 55}ms`,
      }}
      onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.05)'}
      onMouseLeave={e => e.currentTarget.style.background = 'rgba(255,255,255,0.025)'}
    >
      <div style={{ display:'flex', gap:12, alignItems:'flex-start' }}>
        {/* Photo or rank bubble */}
        {s.photoUrl ? (
          <img src={s.photoUrl} alt={s.commonName}
            style={{ width:44, height:44, borderRadius:8, objectFit:'cover', flexShrink:0, border:'1px solid rgba(255,255,255,0.1)' }} />
        ) : (
          <div style={{
            minWidth:44, height:44, borderRadius:8,
            background:'rgba(94,207,94,0.08)', display:'flex', alignItems:'center', justifyContent:'center',
            fontSize:13, color:'#5ecf5e', fontFamily:'monospace', fontWeight:700,
            border:'1px solid rgba(94,207,94,0.18)', flexShrink:0,
          }}>
            {String(index + 1).padStart(2, '0')}
          </div>
        )}

        <div style={{ flex:1, minWidth:0 }}>
          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', gap:8, flexWrap:'wrap' }}>
            <div>
              <div style={{ fontSize:15, fontWeight:600, color:'#e4e4dc', fontFamily:"'Lora', serif" }}>
                {s.commonName}
              </div>
              <div style={{ fontSize:11, color:'#666', fontFamily:'monospace', fontStyle:'italic', marginTop:1 }}>
                {s.scientificName}
              </div>
            </div>
            <div style={{ display:'flex', gap:8, alignItems:'center', flexShrink:0 }}>
              {s.observationCount != null && <RarityPip count={s.observationCount} />}
              <span style={{ color:'#444', fontSize:11, display:'inline-block', transition:'transform 0.2s', transform: open ? 'rotate(180deg)' : 'none' }}>▾</span>
            </div>
          </div>
          {s.observationCount != null && (
            <div style={{ marginTop:4, fontSize:11, color:'#4a6644', fontFamily:'monospace' }}>
              📊 {s.observationCount.toLocaleString()} observations
            </div>
          )}
        </div>
      </div>

      {open && (
        <div style={{ marginTop:12, paddingTop:12, borderTop:'1px solid rgba(255,255,255,0.05)' }}>
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:8, marginBottom:10 }}>
            {[['Family', s.family], ['Order', s.order], ['Kingdom', s.kingdom], ['Rank', `#${s.rank}`]]
              .filter(([,v]) => v)
              .map(([label, val]) => (
                <div key={label} style={{ background:'rgba(0,0,0,0.2)', borderRadius:7, padding:'9px 11px' }}>
                  <div style={{ fontSize:9, color:'#5ecf5e', fontFamily:'monospace', letterSpacing:'0.12em', textTransform:'uppercase', marginBottom:3 }}>{label}</div>
                  <div style={{ fontSize:12, color:'#b8b6ae', fontFamily:"'Lora', serif" }}>{val}</div>
                </div>
              ))}
          </div>
          <div style={{ display:'flex', gap:12, flexWrap:'wrap' }}>
            {s.inatUrl && <ExtLink href={s.inatUrl} label="iNaturalist →" color="#5ecf5e" />}
            {s.gbifUrl  && <ExtLink href={s.gbifUrl}  label="GBIF →"        color="#5eaacf" />}
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
      style={{ fontSize:11, color, fontFamily:'monospace', textDecoration:'none', opacity:0.75 }}>
      {label}
    </a>
  )
}

function Select({ label, value, onChange, children }) {
  return (
    <div>
      <label style={{ display:'block', fontSize:10, fontFamily:'monospace', letterSpacing:'0.15em', color:'#5ecf5e', textTransform:'uppercase', marginBottom:8 }}>{label}</label>
      <select value={value} onChange={onChange} style={{
        width:'100%', background:'rgba(0,0,0,0.4)', border:'1px solid rgba(255,255,255,0.09)',
        borderRadius:8, padding:'11px 14px', color:'#e4e4dc', fontSize:13, fontFamily:'monospace', outline:'none', cursor:'pointer',
      }}>
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
    <div style={{ marginTop:32, padding:24, background:'rgba(0,0,0,0.3)', borderRadius:14, border:'1px solid rgba(255,255,255,0.06)' }}>
      <div style={{ fontSize:10, fontFamily:'monospace', letterSpacing:'0.2em', color:'#5ecf5e', textTransform:'uppercase', marginBottom:12 }}>API Reference</div>

      <p style={{ color:'#888', fontSize:13, fontFamily:"'Lora', serif", lineHeight:1.7, marginBottom:16 }}>
        The field guide is also a REST API. Full interactive docs at{' '}
        <ExtLink href={window.location.origin + '/api/docs'} label="/api/docs →" color="#5ecf5e" />.
      </p>

      <div style={{ marginBottom:16 }}>
        <div style={{ fontSize:10, fontFamily:'monospace', color:'#5ecf5e', letterSpacing:'0.1em', marginBottom:8 }}>GET /api/species — parameters</div>
        <div style={{ display:'grid', gridTemplateColumns:'auto 1fr auto', gap:'4px 12px', fontSize:12, fontFamily:'monospace' }}>
          {[
            ['location', 'string', 'Place name (use this OR lat+lon)'],
            ['lat',       'float',  'Latitude, -90 to 90 (use with lon)'],
            ['lon',       'float',  'Longitude, -180 to 180 (use with lat)'],
            ['radius_km', 'float',  'Search radius in km (default 50, max 500)'],
            ['taxonomy',  'string', 'Aves | Mammalia | Insecta | Amphibia | Reptilia | Plantae | Fungi'],
            ['month_start','1–12', 'Start month'],
            ['month_end',  '1–12', 'End month'],
            ['source',    'string', 'inat | gbif'],
            ['limit',     '1–50',  'Max results (default 10)'],
            ['country',   'string', 'ISO-2 country code for GBIF (e.g. US)'],
          ].map(([p, t, d]) => (
            [
              <span key={p+'-p'} style={{ color:'#d4c84a' }}>{p}</span>,
              <span key={p+'-d'} style={{ color:'#888' }}>{d}</span>,
              <span key={p+'-t'} style={{ color:'#5eaacf' }}>{t}</span>,
            ]
          ))}
        </div>
      </div>

      {[
        { label: 'Place name', url: nameExample },
        { label: 'Coordinates + radius', url: coordExample },
      ].map(({ label, url }) => (
        <div key={label} style={{ marginBottom:12 }}>
          <div style={{ fontSize:10, fontFamily:'monospace', color:'#888', letterSpacing:'0.1em', marginBottom:5 }}>{label}</div>
          <div style={{ background:'rgba(0,0,0,0.4)', borderRadius:8, padding:'10px 14px', fontSize:11, fontFamily:'monospace', color:'#b0e0b0', wordBreak:'break-all', lineHeight:1.7, border:'1px solid rgba(255,255,255,0.05)' }}>
            {url}
          </div>
        </div>
      ))}
    </div>
  )
}

// ── Main App ────────────────────────────────────────────────────────────────
export default function App() {
  const [tab,        setTab]        = useState('search')
  const [locMode,    setLocMode]    = useState('name')   // 'name' | 'coords'
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
    <div style={{ minHeight:'100vh', background:'#0c1108', fontFamily:"'Lora', serif", paddingBottom:60 }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Lora:ital,wght@0,400;0,600;1,400&family=Playfair+Display:wght@700;900&display=swap');
        @keyframes fadeUp { from { opacity:0; transform:translateY(10px) } to { opacity:1; transform:none } }
        * { box-sizing:border-box; margin:0; padding:0; }
        select option { background:#1a2a10; }
        input::placeholder { color:#3a4a38; }
        ::-webkit-scrollbar { width:3px; }
        ::-webkit-scrollbar-thumb { background:#2a4a1a; border-radius:2px; }
        a { color:inherit; }
      `}</style>

      {/* Header */}
      <div style={{ textAlign:'center', padding:'48px 20px 32px' }}>
        <div style={{ fontSize:10, fontFamily:'monospace', letterSpacing:'0.3em', color:'#4a7a3a', marginBottom:14, textTransform:'uppercase' }}>
          Generative Field Guide
        </div>
        <h1 style={{ fontFamily:"'Playfair Display', serif", fontSize:'clamp(32px,6vw,58px)', color:'#e4e4dc', fontWeight:900, lineHeight:1.1 }}>
          Naturalist's<br /><em style={{ color:'#5ecf5e' }}>Field Companion</em>
        </h1>
        <p style={{ color:'#4a6044', marginTop:14, fontSize:14, fontStyle:'italic' }}>
          Real biodiversity data from iNaturalist &amp; GBIF
        </p>

        {/* Tabs */}
        <div style={{ display:'inline-flex', gap:4, marginTop:24, background:'rgba(0,0,0,0.3)', borderRadius:10, padding:4, border:'1px solid rgba(255,255,255,0.06)' }}>
          {[['search','🗺 Field Guide'], ['api','⚡ API']].map(([t, label]) => (
            <button key={t} onClick={() => setTab(t)} style={{
              padding:'7px 20px', borderRadius:7, cursor:'pointer', fontFamily:'monospace', fontSize:12,
              background: tab === t ? 'rgba(94,207,94,0.15)' : 'transparent',
              border: tab === t ? '1px solid rgba(94,207,94,0.35)' : '1px solid transparent',
              color: tab === t ? '#5ecf5e' : '#666', transition:'all 0.15s',
            }}>{label}</button>
          ))}
        </div>
      </div>

      <div style={{ maxWidth:660, margin:'0 auto', padding:'0 16px' }}>
        {tab === 'search' && (
          <>
            {/* Source toggle */}
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10, marginBottom:20 }}>
              {Object.entries(SOURCE_INFO).map(([key, src]) => (
                <button key={key} onClick={() => setSource(key)} style={{
                  padding:'12px 16px', borderRadius:10, cursor:'pointer', textAlign:'left',
                  background: source===key ? 'rgba(94,207,94,0.08)' : 'rgba(0,0,0,0.3)',
                  border: source===key ? '1px solid rgba(94,207,94,0.35)' : '1px solid rgba(255,255,255,0.07)',
                  transition:'all 0.15s',
                }}>
                  <div style={{ fontSize:20, marginBottom:5 }}>{src.icon}</div>
                  <div style={{ fontSize:13, fontFamily:'monospace', color: source===key ? '#5ecf5e' : '#999', fontWeight:600 }}>{src.label}</div>
                  <div style={{ fontSize:11, color:'#555', marginTop:2 }}>{src.desc}</div>
                </button>
              ))}
            </div>

            {/* Form */}
            <div style={{ background:'rgba(255,255,255,0.02)', border:'1px solid rgba(255,255,255,0.06)', borderRadius:16, padding:24 }}>

              {/* Location mode toggle */}
              <div style={{ marginBottom:16 }}>
                <label style={{ display:'block', fontSize:10, fontFamily:'monospace', letterSpacing:'0.15em', color:'#5ecf5e', textTransform:'uppercase', marginBottom:8 }}>Location</label>
                <div style={{ display:'inline-flex', gap:3, background:'rgba(0,0,0,0.3)', borderRadius:7, padding:3, marginBottom:12, border:'1px solid rgba(255,255,255,0.06)' }}>
                  {[['name','📍 Place name'],['coords','🌐 Lat / Lon']].map(([m, label]) => (
                    <button key={m} onClick={() => setLocMode(m)} style={{
                      padding:'5px 14px', borderRadius:5, cursor:'pointer', fontFamily:'monospace', fontSize:11,
                      background: locMode===m ? 'rgba(94,207,94,0.15)' : 'transparent',
                      border: locMode===m ? '1px solid rgba(94,207,94,0.35)' : '1px solid transparent',
                      color: locMode===m ? '#5ecf5e' : '#666', transition:'all 0.12s',
                    }}>{label}</button>
                  ))}
                </div>

                {locMode === 'name' ? (
                  <input
                    value={location} onChange={e => setLocation(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && search()}
                    placeholder={source === 'inat' ? 'e.g. Yosemite, California  ·  Scottish Highlands' : 'Include country for best GBIF results'}
                    style={{ width:'100%', background:'rgba(0,0,0,0.3)', border:'1px solid rgba(255,255,255,0.09)', borderRadius:8, padding:'11px 14px', color:'#e4e4dc', fontSize:14, fontFamily:"'Lora', serif", outline:'none' }}
                    onFocus={e => e.target.style.borderColor='rgba(94,207,94,0.35)'}
                    onBlur={e => e.target.style.borderColor='rgba(255,255,255,0.09)'}
                  />
                ) : (
                  <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:8 }}>
                    {[
                      { label:'Latitude',  value:lat,      set:setLat,      placeholder:'37.8651',  note:'-90 to 90'   },
                      { label:'Longitude', value:lon,      set:setLon,      placeholder:'-119.5383',note:'-180 to 180' },
                      { label:'Radius km', value:radiusKm, set:setRadiusKm, placeholder:'50',       note:'default 50'  },
                    ].map(({ label, value, set, placeholder, note }) => (
                      <div key={label}>
                        <div style={{ fontSize:9, color:'#5ecf5e', fontFamily:'monospace', letterSpacing:'0.1em', textTransform:'uppercase', marginBottom:4 }}>
                          {label} <span style={{ color:'#3a5a38', textTransform:'none', letterSpacing:0 }}>({note})</span>
                        </div>
                        <input
                          type="number" value={value} onChange={e => set(e.target.value)}
                          onKeyDown={e => e.key === 'Enter' && search()}
                          placeholder={placeholder}
                          style={{ width:'100%', background:'rgba(0,0,0,0.3)', border:'1px solid rgba(255,255,255,0.09)', borderRadius:7, padding:'9px 10px', color:'#e4e4dc', fontSize:13, fontFamily:'monospace', outline:'none' }}
                          onFocus={e => e.target.style.borderColor='rgba(94,207,94,0.35)'}
                          onBlur={e => e.target.style.borderColor='rgba(255,255,255,0.09)'}
                        />
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Country (GBIF only) */}
              {source === 'gbif' && (
                <div style={{ marginBottom:16 }}>
                  <label style={{ display:'block', fontSize:10, fontFamily:'monospace', letterSpacing:'0.15em', color:'#5ecf5e', textTransform:'uppercase', marginBottom:8 }}>
                    Country Code <span style={{ color:'#4a6040', textTransform:'none', letterSpacing:0 }}>(ISO-2, optional — e.g. US, GB, AU)</span>
                  </label>
                  <input value={country} onChange={e => setCountry(e.target.value.toUpperCase().slice(0,2))}
                    placeholder="US"
                    style={{ width:80, background:'rgba(0,0,0,0.3)', border:'1px solid rgba(255,255,255,0.09)', borderRadius:8, padding:'11px 14px', color:'#e4e4dc', fontSize:14, fontFamily:'monospace', outline:'none', textTransform:'uppercase' }}
                    onFocus={e => e.target.style.borderColor='rgba(94,207,94,0.35)'}
                    onBlur={e => e.target.style.borderColor='rgba(255,255,255,0.09)'}
                  />
                </div>
              )}

              {/* Month range */}
              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12, marginBottom:16 }}>
                <Select label="From Month" value={monthStart} onChange={e => setMonthStart(Number(e.target.value))}>
                  {MONTHS.map((m,i) => <option key={m} value={i+1}>{m}</option>)}
                </Select>
                <Select label="To Month" value={monthEnd} onChange={e => setMonthEnd(Number(e.target.value))}>
                  {MONTHS.map((m,i) => <option key={m} value={i+1}>{m}</option>)}
                </Select>
              </div>

              {/* Taxonomy */}
              <div style={{ marginBottom:20 }}>
                <label style={{ display:'block', fontSize:10, fontFamily:'monospace', letterSpacing:'0.15em', color:'#5ecf5e', textTransform:'uppercase', marginBottom:8 }}>Taxonomy Class</label>
                <div style={{ display:'flex', flexWrap:'wrap', gap:7 }}>
                  {TAXONOMY_OPTIONS.map(opt => (
                    <button key={opt.value} onClick={() => setTaxonomy(opt.value)} style={{
                      padding:'7px 12px', borderRadius:7, cursor:'pointer', fontFamily:'monospace', fontSize:11,
                      background: taxonomy===opt.value ? 'rgba(94,207,94,0.12)' : 'rgba(0,0,0,0.3)',
                      border: taxonomy===opt.value ? '1px solid rgba(94,207,94,0.4)' : '1px solid rgba(255,255,255,0.07)',
                      color: taxonomy===opt.value ? '#5ecf5e' : '#777', transition:'all 0.12s',
                    }}>{opt.label}</button>
                  ))}
                </div>
              </div>

              <button onClick={search} disabled={loading || !canSearch} style={{
                width:'100%', padding:'13px 20px',
                background: loading||!canSearch ? 'rgba(94,207,94,0.05)' : 'rgba(94,207,94,0.13)',
                border:'1px solid rgba(94,207,94,0.25)', borderRadius:10,
                color: loading||!canSearch ? '#3a5a3a' : '#5ecf5e',
                fontSize:13, fontFamily:'monospace', letterSpacing:'0.1em', textTransform:'uppercase',
                cursor: loading||!canSearch ? 'not-allowed' : 'pointer', transition:'all 0.15s',
              }}>
                {loading ? loadMsg || 'Loading…' : `Search ${SOURCE_INFO[source].label} →`}
              </button>
            </div>

            {error && (
              <div style={{ marginTop:14, background:'rgba(180,60,60,0.08)', border:'1px solid rgba(180,60,60,0.22)', borderRadius:8, padding:'11px 14px', color:'#cf7070', fontSize:13, fontFamily:'monospace' }}>
                ⚠️ {error}
              </div>
            )}

            {results && (
              <div style={{ marginTop:28 }}>
                <div style={{ marginBottom:18, paddingBottom:16, borderBottom:'1px solid rgba(255,255,255,0.05)' }}>
                  <div style={{ fontSize:10, fontFamily:'monospace', color:'#4a7a3a', letterSpacing:'0.2em', textTransform:'uppercase', marginBottom:6 }}>
                    {SOURCE_INFO[results.source].icon} {SOURCE_INFO[results.source].label} · Field Guide
                  </div>
                  <h2 style={{ fontFamily:"'Playfair Display', serif", fontSize:26, color:'#e4e4dc', fontWeight:700 }}>
                    {results.resolvedPlace}
                  </h2>
                  <div style={{ marginTop:5, color:'#4a6044', fontFamily:'monospace', fontSize:11 }}>
                    {MONTH_FULL[results.monthStart-1]}–{MONTH_FULL[results.monthEnd-1]} · {results.taxonomy} · {results.count} species
                  </div>
                </div>
                <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
                  {results.species.map((s, i) => <SpeciesCard key={i} s={s} index={i} />)}
                </div>
                <div style={{ marginTop:20, textAlign:'center', color:'#3a5a30', fontSize:11, fontFamily:'monospace' }}>
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
