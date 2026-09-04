import { useEffect, useMemo, useState } from 'react'
import './App.css'
import { LANGUAGES, makeT } from './i18n.js'

const API_BASE = import.meta.env.VITE_API_BASE ?? ''

const NAV_ITEMS = [
  { id: 'dashboard', label: 'Dashboard' },
  { id: 'newLot', label: 'New Lot' },
  { id: 'lots', label: 'Lots' },
  { id: 'cutting', label: 'Cutting' },
  { id: 'bale', label: 'Bale / Fabric' },
  { id: 'reports', label: 'Reports' },
  { id: 'settings', label: 'Settings' },
]

const PRIMARY_NAV = ['dashboard', 'newLot', 'lots', 'cutting']
const MORE_NAV = ['bale', 'reports', 'settings']

const BN_ICONS = {
  dashboard: '🏭',
  newLot: '＋',
  lots: '📋',
  cutting: '✂️',
  bale: '🧵',
  reports: '📊',
  settings: '⚙️',
}

const SIZE_OPTIONS = [6, 8, 10, 12, 14, 16, 18, 20, 22, 24, 26, 28, 30, 32, 34, 36, 38, 40, 42]

const DEFAULT_SUPPLIERS = ['MTLNY', 'JAYDEEP', 'SUGAM', 'RUDRA', 'AMMEF', 'KAPIL', 'MGB', 'VISHAL']

const FALLBACK_LOTS = [
  {
    id: 1,
    lotNumber: 'LOT-30',
    date: '2026-08-25',
    supplier: 'MTLNY',
    shortNumber: 'RUORA-FANCY',
    shortName: 'RUORA FANCY TOP',
    programDate: '2026-08-27',
    cuttingDate: '2026-08-29',
    fabricType: 'Cotton Poplin',
    color: 'Navy',
    description: 'Premium stretch twill',
    pana: 54,
    totalMeters: 512,
    averageConsumption: 0.92,
    totalPieces: 557,
    status: 'Ready',
    notes: '2 set cutting required',
    createdBy: 'Supervisor A',
    sizeBreakdown: Object.fromEntries(SIZE_OPTIONS.map((size, index) => [String(size), index < 4 ? 36 : 74])),
    bales: [
      { id: 1, baleNumber: '283264', meters: 86 },
      { id: 2, baleNumber: '282193', meters: 80 },
      { id: 3, baleNumber: '282214', meters: 80 },
      { id: 4, baleNumber: '282205', meters: 87 },
      { id: 5, baleNumber: '282183', meters: 98 },
      { id: 6, baleNumber: '282221', meters: 81 },
    ],
    cutting: {
      patternType: 'Marker',
      markerLength: 110,
      markerWidth: 55,
      layLength: 5,
      noOfLayers: 4,
      noOfPlies: 2,
    },
  },
]

const createEmptySizeBreakdown = () => Object.fromEntries(SIZE_OPTIONS.map((size) => [String(size), 0]))

const defaultLotForm = () => ({
  lotNumber: '',
  date: new Date().toISOString().slice(0, 10),
  supplier: 'MTLNY',
  shortNumber: 'RUORA-FANCY',
  shortName: 'RUORA FANCY TOP',
  programDate: '',
  cuttingDate: '',
  fabricType: 'Cotton Poplin',
  color: 'Navy',
  description: 'Premium stretch twill',
  pana: 54,
  totalMeters: 512,
  averageConsumption: 0,
  totalPieces: 0,
  notes: '2 set cutting required',
  status: 'Draft',
  createdBy: 'Operator 01',
  sizeBreakdown: createEmptySizeBreakdown(),
  bales: [
    { id: 1, baleNumber: '283264', meters: 86 },
    { id: 2, baleNumber: '282193', meters: 80 },
  ],
  cutting: {
    patternType: 'Marker',
    markerLength: '',
    markerWidth: '',
    layLength: '',
    noOfLayers: '',
    noOfPlies: '',
  },
})

function App() {
  const [activeTab, setActiveTab] = useState('dashboard')
  const [lots, setLots] = useState(FALLBACK_LOTS)
  const [suppliers, setSuppliers] = useState(DEFAULT_SUPPLIERS)
  const [selectedLotId, setSelectedLotId] = useState(FALLBACK_LOTS[0].id)
  const [role, setRole] = useState('Supervisor')
  const [wizardOpen, setWizardOpen] = useState(false)
  const [editingId, setEditingId] = useState(null)
  const [lotForm, setLotForm] = useState(defaultLotForm())
  const [search, setSearch] = useState('')
  const [filter, setFilter] = useState('All')
  const [errors, setErrors] = useState([])
  const [statusMessage, setStatusMessage] = useState('')
  const [moreOpen, setMoreOpen] = useState(false)
  const [lang, setLang] = useState(() => {
    try { return localStorage.getItem('dpc-lang') || 'en' } catch { return 'en' }
  })

  const t = useMemo(() => makeT(lang), [lang])

  useEffect(() => {
    try { localStorage.setItem('dpc-lang', lang) } catch { /* ignore */ }
    document.documentElement.lang = lang
  }, [lang])

  const fetchLots = async () => {
    try {
      const response = await fetch(`${API_BASE}/api/lots`)
      if (!response.ok) throw new Error('Failed to load lots')
      const payload = await response.json()
      // Server reachable: trust it — an empty list means "no lots yet".
      setLots(payload)
      if (payload.length) setSelectedLotId(payload[0].id)
    } catch {
      // Server unreachable: show demo data so the screen is not blank.
      setLots(FALLBACK_LOTS)
      setSelectedLotId(FALLBACK_LOTS[0].id)
    }
  }

  const fetchSuppliers = async () => {
    try {
      const response = await fetch(`${API_BASE}/api/suppliers`)
      if (!response.ok) throw new Error('Failed to load suppliers')
      const payload = await response.json()
      if (payload.length) setSuppliers(payload)
    } catch {
      setSuppliers(DEFAULT_SUPPLIERS)
    }
  }

  useEffect(() => {
    fetchLots()
    fetchSuppliers()
  }, [])

  const dashboardStats = useMemo(() => {
    const activeLots = lots.filter((item) => item.status !== 'Completed').length
    const todaysCutting = lots.filter((item) => item.cuttingDate === '2026-08-29').length
    const pendingCutting = lots.filter((item) => ['Draft', 'Ready', 'Pending'].includes(item.status)).length
    const completedLots = lots.filter((item) => item.status === 'Completed').length
    const totalFabricUsed = lots.reduce((sum, item) => sum + Number(item.totalMeters || 0), 0)
    const totalPieces = lots.reduce((sum, item) => sum + Number(item.totalPieces || 0), 0)

    return {
      activeLots,
      todaysCutting,
      pendingCutting,
      completedLots,
      totalFabricUsed,
      totalPieces,
    }
  }, [lots])

  const selectedLot = useMemo(
    () => lots.find((lot) => String(lot.id) === String(selectedLotId)) || lots[0],
    [lots, selectedLotId],
  )

  const lotTableData = useMemo(() => {
    const lowerTerm = search.toLowerCase()

    return lots.filter((item) => {
      const textMatch =
        !lowerTerm ||
        item.lotNumber.toLowerCase().includes(lowerTerm) ||
        item.shortNumber.toLowerCase().includes(lowerTerm) ||
        (item.shortName || '').toLowerCase().includes(lowerTerm) ||
        item.supplier.toLowerCase().includes(lowerTerm) ||
        (item.bales || []).some((bale) => (bale.baleNumber || '').toLowerCase().includes(lowerTerm))

      const statusMatch =
        filter === 'All' ||
        (filter === 'Pending' && ['Draft', 'Ready'].includes(item.status)) ||
        (filter === 'Cutting' && item.status === 'Cutting') ||
        (filter === 'Completed' && item.status === 'Completed') ||
        (filter === 'Today' && item.cuttingDate === '2026-08-29') ||
        (filter === 'This Week' && Boolean(item.programDate)) ||
        (filter === 'This Month' && Boolean(item.date))

      return textMatch && statusMatch
    })
  }, [filter, lots, search])

  const sizeTotal = useMemo(
    () => Object.values(lotForm.sizeBreakdown || {}).reduce((sum, value) => sum + Number(value || 0), 0),
    [lotForm.sizeBreakdown],
  )

  const baleTotal = useMemo(
    () => (lotForm.bales || []).reduce((sum, bale) => sum + Number(bale.meters || 0), 0),
    [lotForm.bales],
  )

  const averageValue = useMemo(() => {
    if (Number(lotForm.totalMeters || 0) > 0 && Number(sizeTotal || 0) > 0) {
      return Number(lotForm.totalMeters) / Number(sizeTotal)
    }
    return 0
  }, [lotForm.totalMeters, sizeTotal])


  const generateLotNumber = () => {
    const max = lots.reduce((highest, item) => {
      const match = String(item.lotNumber || '').match(/(\d+)/)
      return match ? Math.max(highest, Number(match[0])) : highest
    }, 0)

    setLotForm((current) => ({
      ...current,
      lotNumber: `LOT-${max + 1}`,
    }))
  }

  const updateLotField = (field, value) => {
    setLotForm((current) => ({
      ...current,
      [field]: value,
    }))
  }

  const updateSize = (size, value) => {
    setLotForm((current) => ({
      ...current,
      sizeBreakdown: {
        ...current.sizeBreakdown,
        [String(size)]: Number(value || 0),
      },
    }))
  }

  const addBale = () => {
    setLotForm((current) => ({
      ...current,
      bales: [...(current.bales || []), { id: Date.now(), baleNumber: '', meters: 0 }],
    }))
  }

  const updateBale = (id, field, value) => {
    setLotForm((current) => ({
      ...current,
      bales: (current.bales || []).map((bale) =>
        bale.id === id ? { ...bale, [field]: field === 'meters' ? Number(value || 0) : value } : bale,
      ),
    }))
  }

  const removeBale = (id) => {
    setLotForm((current) => ({
      ...current,
      bales: (current.bales || []).filter((bale) => bale.id !== id),
    }))
  }

  const openNewLot = () => {
    setEditingId(null)
    setWizardOpen(true)
    setErrors([])
    setStatusMessage('')
    setLotForm(defaultLotForm())
    setActiveTab('newLot')
    setMoreOpen(false)
  }

  const openEditLot = (lot) => {
    if (!lot) return
    setEditingId(lot.id)
    setLotForm({
      lotNumber: lot.lotNumber || '',
      date: lot.date || new Date().toISOString().slice(0, 10),
      supplier: lot.supplier || '',
      shortNumber: lot.shortNumber || '',
      shortName: lot.shortName || '',
      programDate: lot.programDate || '',
      cuttingDate: lot.cuttingDate || '',
      fabricType: lot.fabricType || '',
      color: lot.color || '',
      description: lot.description || '',
      pana: lot.pana || 0,
      totalMeters: lot.totalMeters || 0,
      averageConsumption: lot.averageConsumption || 0,
      totalPieces: lot.totalPieces || 0,
      notes: lot.notes || '',
      status: lot.status || 'Draft',
      createdBy: lot.createdBy || 'Operator 01',
      sizeBreakdown: {
        ...createEmptySizeBreakdown(),
        ...Object.fromEntries(Object.entries(lot.sizeBreakdown || {}).map(([key, value]) => [String(key), Number(value) || 0])),
      },
      bales: (lot.bales || []).map((bale, index) => ({
        id: bale.id || Date.now() + index,
        baleNumber: bale.baleNumber || '',
        meters: Number(bale.meters) || 0,
        weight: bale.weight || '',
        shade: bale.shade || '',
        remarks: bale.remarks || '',
      })),
      cutting: {
        patternType: lot.cutting?.patternType || 'Marker',
        markerLength: lot.cutting?.markerLength ?? '',
        markerWidth: lot.cutting?.markerWidth ?? '',
        layLength: lot.cutting?.layLength ?? '',
        noOfLayers: lot.cutting?.noOfLayers ?? '',
        noOfPlies: lot.cutting?.noOfPlies ?? '',
      },
    })
    setErrors([])
    setStatusMessage('')
    setWizardOpen(true)
    setActiveTab('newLot')
    setMoreOpen(false)
  }

  const closeWizard = () => {
    setWizardOpen(false)
    setEditingId(null)
    setErrors([])
  }

  const goTo = (id) => {
    if (id === 'newLot') openNewLot()
    else setActiveTab(id)
    setMoreOpen(false)
  }

  const saveLot = async () => {
    const payload = {
      ...lotForm,
      lotNumber: (lotForm.lotNumber || '').trim(),
      averageConsumption: Number((Number(lotForm.totalMeters || 0) / (Number(sizeTotal || 1) || 1)).toFixed(2)),
      totalPieces: sizeTotal,
      bales: lotForm.bales,
      cutting: { ...lotForm.cutting },
      sizeBreakdown: { ...lotForm.sizeBreakdown },
    }
    if (!editingId) payload.status = 'Ready'

    try {
      const response = await fetch(
        editingId ? `${API_BASE}/api/lots/${editingId}` : `${API_BASE}/api/lots`,
        {
          method: editingId ? 'PUT' : 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        },
      )

      const result = await response.json()
      if (!response.ok) {
        setErrors([result.error || 'Unable to save lot.'])
        return
      }

      const wasEditing = editingId
      setLots((current) => (wasEditing
        ? current.map((lot) => (Number(lot.id) === Number(wasEditing) ? result : lot))
        : [result, ...current]))
      setSelectedLotId(result.id)
      setActiveTab('lots')
      setWizardOpen(false)
      setEditingId(null)
      setErrors([])
      setStatusMessage(wasEditing ? t('msg.updated') : t('msg.saved'))
    } catch {
      setErrors(['Unable to connect to the server. Please start the backend.'])
    }
  }

  const updateStatus = async (lotId, nextStatus) => {
    try {
      await fetch(`${API_BASE}/api/lots/${lotId}/status`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: nextStatus }),
      })
      setLots((current) => current.map((lot) => (Number(lot.id) === Number(lotId) ? { ...lot, status: nextStatus } : lot)))
    } catch {
      setErrors(['Status update failed.'])
    }
  }

  const printLot = async (lotId) => {
    try {
      const response = await fetch(`${API_BASE}/api/print/${lotId}?lang=${lang}`)
      if (!response.ok) throw new Error('PDF export failed')
      const blob = await response.blob()
      const objectUrl = URL.createObjectURL(blob)
      const pdfWindow = window.open(objectUrl, '_blank')
      if (!pdfWindow) {
        window.location.href = objectUrl
      }
    } catch {
      setErrors(['PDF export failed.'])
    }
  }

  const roleSelect = (
    <>
      <option value="Admin">{t('role.Admin')}</option>
      <option value="Supervisor">{t('role.Supervisor')}</option>
      <option value="Operator">{t('role.Operator')}</option>
      <option value="Viewer">{t('role.Viewer')}</option>
    </>
  )

  return (
    <div className="app-shell">
      <header className="mobile-header">
        <div className="brand-block">
          <div className="brand-mark">DP</div>
          <div>
            <h2>DP Creation</h2>
            <small>Garment Cutting</small>
          </div>
        </div>
        <select className="mobile-role" value={role} onChange={(event) => setRole(event.target.value)} aria-label="Active role">
          {roleSelect}
        </select>
      </header>

      <div className="app-body">
        <aside className="sidebar">
          <div className="brand-block">
            <div className="brand-mark">DP</div>
            <div>
              <h2>DP Creation</h2>
              <small>Garment Cutting</small>
            </div>
          </div>

          <nav className="sidebar-nav">
            {NAV_ITEMS.map((item) => (
              <button
                key={item.id}
                type="button"
                className={`nav-button ${activeTab === item.id ? 'active' : ''}`}
                onClick={() => goTo(item.id)}
              >
                <span className="nav-ico" aria-hidden="true">{BN_ICONS[item.id]}</span>
                <span>{t(`nav.${item.id}`)}</span>
              </button>
            ))}
          </nav>

          <div className="sidebar-card">
            <label className="field-label">{t('role.label')}</label>
            <select value={role} onChange={(event) => setRole(event.target.value)}>
              {roleSelect}
            </select>
          </div>
        </aside>

        <main className="content-panel">
          <header className="topbar">
            <div>
              <p className="eyebrow">{t('page.eyebrow')}</p>
              <h1>{t(`page.${activeTab}`)}</h1>
            </div>

            <div className="topbar-actions">
              <button type="button" className="ghost-button" onClick={() => setActiveTab('lots')}>{t('btn.viewLots')}</button>
              <button type="button" className="primary-button" onClick={openNewLot}>{t('btn.newLot')}</button>
            </div>
          </header>

        {statusMessage && <div className="success-banner">{statusMessage}</div>}

        {activeTab === 'dashboard' && (
          <section className="page-stack">
            <div className="summary-grid">
              <StatCard label={t('stat.activeLots')} value={dashboardStats.activeLots} tone="blue" />
              <StatCard label={t('stat.todaysCutting')} value={dashboardStats.todaysCutting} tone="orange" />
              <StatCard label={t('stat.pendingCutting')} value={dashboardStats.pendingCutting} tone="amber" />
              <StatCard label={t('stat.completedLots')} value={dashboardStats.completedLots} tone="green" />
              <StatCard label={t('stat.totalFabric')} value={`${dashboardStats.totalFabricUsed} MTR`} tone="slate" />
              <StatCard label={t('stat.totalPieces')} value={dashboardStats.totalPieces} tone="purple" />
            </div>

            <div className="panel-card">
              <div className="panel-header">
                <h3>{t('tbl.todaysCutting')}</h3>
                <button type="button" className="ghost-button small">{t('btn.export')}</button>
              </div>

              {lots.length === 0 ? (
                <EmptyState
                  title={t('empty.noLotsTitle')}
                  message={t('empty.noLotsDash')}
                  action={<button type="button" className="primary-button" onClick={openNewLot}>{t('btn.newLot')}</button>}
                />
              ) : (
                <div className="table-wrap">
                  <table>
                    <thead>
                      <tr>
                        <th>{t('col.lotNo')}</th>
                        <th>{t('col.style')}</th>
                        <th>{t('col.fabric')}</th>
                        <th>{t('col.pieces')}</th>
                        <th>{t('col.meter')}</th>
                        <th>{t('col.status')}</th>
                        <th>{t('col.action')}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {lots.slice(0, 5).map((lot) => (
                        <tr key={lot.id}>
                          <td data-label={t('col.lotNo')}>{lot.lotNumber}</td>
                          <td data-label={t('col.style')}>{lot.shortNumber}</td>
                          <td data-label={t('col.fabric')}>{lot.fabricType}</td>
                          <td data-label={t('col.pieces')}>{lot.totalPieces}</td>
                          <td data-label={t('col.meter')}>{lot.totalMeters}</td>
                          <td data-label={t('col.status')}><StatusBadge status={lot.status} label={t(`status.${lot.status}`)} /></td>
                          <td data-label={t('col.action')} className="cell-actions">
                            <button type="button" className="table-action" onClick={() => { setSelectedLotId(lot.id); setActiveTab('lots') }}>{t('btn.open')}</button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </section>
        )}

        {activeTab === 'lots' && (
          <section className="page-stack">
            <div className="toolbar">
              <input type="search" value={search} placeholder={t('search.placeholder')} onChange={(event) => setSearch(event.target.value)} />
              <div className="chip-row">
                {[['All', 'filter.All'], ['Today', 'filter.Today'], ['This Week', 'filter.ThisWeek'], ['This Month', 'filter.ThisMonth'], ['Pending', 'filter.Pending'], ['Cutting', 'filter.Cutting'], ['Completed', 'filter.Completed']].map(([value, key]) => (
                  <button key={value} type="button" className={`chip ${filter === value ? 'selected' : ''}`} onClick={() => setFilter(value)}>{t(key)}</button>
                ))}
              </div>
            </div>

            <div className="panel-card">
              {lotTableData.length === 0 ? (
                <EmptyState
                  title={lots.length === 0 ? t('empty.noLotsTitle') : t('empty.noMatchTitle')}
                  message={lots.length === 0 ? t('empty.noLotsList') : t('empty.noMatchMsg')}
                  action={lots.length === 0
                    ? <button type="button" className="primary-button" onClick={openNewLot}>{t('btn.newLot')}</button>
                    : <button type="button" className="ghost-button" onClick={() => { setSearch(''); setFilter('All') }}>{t('btn.clearSearch')}</button>}
                />
              ) : (
              <div className="table-wrap">
                <table>
                  <thead>
                    <tr>
                      <th>{t('col.lotNo')}</th>
                      <th>{t('col.shortNo')}</th>
                      <th>{t('col.supplier')}</th>
                      <th>{t('col.mtr')}</th>
                      <th>{t('col.pcs')}</th>
                      <th>{t('col.cuttingDate')}</th>
                      <th>{t('col.status')}</th>
                      <th>{t('col.createdBy')}</th>
                      <th>{t('col.action')}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {lotTableData.map((lot) => (
                      <tr key={lot.id}>
                        <td data-label={t('col.lotNo')}>{lot.lotNumber}</td>
                        <td data-label={t('col.shortNo')}>{lot.shortNumber}</td>
                        <td data-label={t('col.supplier')}>{lot.supplier}</td>
                        <td data-label={t('col.mtr')}>{lot.totalMeters}</td>
                        <td data-label={t('col.pcs')}>{lot.totalPieces}</td>
                        <td data-label={t('col.cuttingDate')}>{lot.cuttingDate}</td>
                        <td data-label={t('col.status')}><StatusBadge status={lot.status} label={t(`status.${lot.status}`)} /></td>
                        <td data-label={t('col.createdBy')}>{lot.createdBy}</td>
                        <td data-label={t('col.action')} className="cell-actions">
                          <div className="inline-actions">
                            <button type="button" className="table-action" onClick={() => { setSelectedLotId(lot.id); setActiveTab('lots') }}>{t('btn.detail')}</button>
                            <button type="button" className="table-action" onClick={() => printLot(lot.id)}>{t('btn.pdf')}</button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              )}
            </div>
          </section>
        )}

        {activeTab === 'cutting' && (
          <section className="page-stack">
            <div className="mini-grid">
              <MiniStat label={t('mini.waitingCutting')} value={lots.filter((lot) => lot.status === 'Ready').length} />
              <MiniStat label={t('mini.inCutting')} value={lots.filter((lot) => lot.status === 'Cutting').length} />
              <MiniStat label={t('mini.completed')} value={lots.filter((lot) => lot.status === 'Completed').length} />
              <MiniStat label={t('mini.plannedPieces')} value={lots.reduce((sum, lot) => sum + Number(lot.totalPieces || 0), 0)} />
            </div>

            <div className="panel-card">
              <div className="panel-header">
                <h3>{t('tbl.cuttingQueue')}</h3>
              </div>
              <div className="table-wrap">
                <table>
                  <thead>
                    <tr>
                      <th>{t('col.lot')}</th>
                      <th>{t('col.shortNo')}</th>
                      <th>{t('col.fabric')}</th>
                      <th>{t('col.qty')}</th>
                      <th>{t('col.cutDate')}</th>
                      <th>{t('col.status')}</th>
                      <th>{t('col.action')}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {lots.map((lot) => (
                      <tr key={lot.id}>
                        <td data-label={t('col.lot')}>{lot.lotNumber}</td>
                        <td data-label={t('col.shortNo')}>{lot.shortNumber}</td>
                        <td data-label={t('col.fabric')}>{lot.fabricType}</td>
                        <td data-label={t('col.qty')}>{lot.totalPieces}</td>
                        <td data-label={t('col.cutDate')}>{lot.cuttingDate}</td>
                        <td data-label={t('col.status')}><StatusBadge status={lot.status} label={t(`status.${lot.status}`)} /></td>
                        <td data-label={t('col.action')} className="cell-actions"><button type="button" className="table-action" onClick={() => updateStatus(lot.id, 'Cutting')}>{t('btn.start')}</button></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </section>
        )}

        {activeTab === 'bale' && (
          <section className="page-stack">
            <div className="panel-card">
              <div className="panel-header">
                <h3>{t('tbl.baleRecon')}</h3>
              </div>
              <div className="kpi-inline">
                <div><span>{t('bale.totalCount')}</span><strong>{selectedLot?.bales?.length || 0}</strong></div>
                <div><span>{t('bale.totalMeters')}</span><strong>{selectedLot ? selectedLot.bales.reduce((sum, bale) => sum + Number(bale.meters || 0), 0) : 0}</strong></div>
                <div><span>{t('bale.lotMtr')}</span><strong>{selectedLot?.totalMeters || 0}</strong></div>
              </div>

              <div className="table-wrap">
                <table>
                  <thead>
                    <tr>
                      <th>{t('f.baleNo')}</th>
                      <th>{t('col.meter')}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(selectedLot?.bales || []).map((bale, index) => (
                      <tr key={bale.id ?? `b${index}`}>
                        <td data-label={t('f.baleNo')}>{bale.baleNumber}</td>
                        <td data-label={t('col.meter')}>{bale.meters}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </section>
        )}

        {activeTab === 'reports' && (
          <section className="page-stack">
            <div className="mini-grid">
              <MiniStat label={t('mini.lotsWaiting')} value={lots.filter((lot) => ['Draft', 'Ready'].includes(lot.status)).length} />
              <MiniStat label={t('mini.fabricMismatch')} value={lots.filter((lot) => Number(lot.totalMeters) !== (lot.bales || []).reduce((sum, bale) => sum + Number(bale.meters || 0), 0)).length} />
              <MiniStat label={t('mini.todaysProduction')} value={lots.filter((lot) => lot.cuttingDate === '2026-08-29').reduce((sum, lot) => sum + Number(lot.totalPieces || 0), 0)} />
              <MiniStat label={t('mini.highestConsumption')} value="0.94 AVG" />
            </div>

            <div className="panel-card">
              <div className="panel-header">
                <h3>{t('tbl.opSummary')}</h3>
              </div>
              <div className="report-list">
                <div className="report-item"><strong>{t('rep.lotsWaiting')}</strong><span>{lots.filter((lot) => ['Draft', 'Ready'].includes(lot.status)).length}</span></div>
                <div className="report-item"><strong>{t('rep.mismatchAlerts')}</strong><span>{lots.filter((lot) => Number(lot.totalMeters) !== (lot.bales || []).reduce((sum, bale) => sum + Number(bale.meters || 0), 0)).length}</span></div>
                <div className="report-item"><strong>{t('rep.completedCutting')}</strong><span>{lots.filter((lot) => lot.status === 'Completed').length}</span></div>
                <div className="report-item"><strong>{t('rep.pendingCutting')}</strong><span>{lots.filter((lot) => lot.status === 'Ready').length}</span></div>
              </div>
            </div>
          </section>
        )}

        {activeTab === 'settings' && (
          <section className="page-stack">
            <div className="settings-grid">
              <div className="panel-card">
                <h3>{t('set.language')}</h3>
                <div className="settings-row">
                  <label>{t('set.language')}</label>
                  <select value={lang} onChange={(event) => setLang(event.target.value)}>
                    {LANGUAGES.map((option) => (
                      <option key={option.code} value={option.code}>{option.label}</option>
                    ))}
                  </select>
                  <small className="field-hint">{t('set.languageHint')}</small>
                </div>
              </div>

              <div className="panel-card">
                <h3>{t('set.calcRules')}</h3>
                <div className="settings-row">
                  <label>{t('set.avgFormula')}</label>
                  <select defaultValue="Total Fabric Meters ÷ Total Pieces">
                    <option>Total Fabric Meters ÷ Total Pieces</option>
                    <option>Total Fabric Meters ÷ Total Panels</option>
                    <option>Manual entry</option>
                  </select>
                </div>
                <div className="settings-row">
                  <label>{t('set.autoNumber')}</label>
                  <input type="checkbox" defaultChecked />
                </div>
              </div>

              <div className="panel-card">
                <h3>{t('set.roleSetup')}</h3>
                <ul className="role-list">
                  <li>{t('set.roleAdmin')}</li>
                  <li>{t('set.roleSupervisor')}</li>
                  <li>{t('set.roleOperator')}</li>
                  <li>{t('set.roleViewer')}</li>
                </ul>
              </div>
            </div>
          </section>
        )}

        {wizardOpen && (
          <div className="modal-backdrop">
            <div className="wizard-panel">
              <div className="wizard-header">
                <div>
                  <p className="eyebrow">{editingId ? t('wiz.editLotEyebrow') : t('wiz.newLotEyebrow')}</p>
                  <h2>{editingId ? (lotForm.lotNumber || t('wiz.editLot')) : t('wiz.createLot')}</h2>
                </div>
                <button type="button" className="close-button" onClick={closeWizard} aria-label="Close">×</button>
              </div>

              <div className="wizard-scroll">
                {errors.length > 0 && (
                  <div className="error-box">
                    {errors.map((error, i) => <div key={i}>⚠ {error}</div>)}
                  </div>
                )}

                <section className="form-section">
                  <h3>{t('sec.lot')}</h3>
                  <p className="section-hint">{t('hint.lot')}</p>
                  <div className="wizard-grid">
                    <div className="field-group">
                      <label className="field-label">{t('f.lotNo')}</label>
                      <div className="inline-field">
                        <input value={lotForm.lotNumber} onChange={(event) => updateLotField('lotNumber', event.target.value)} placeholder="LOT-30" />
                        <button type="button" className="ghost-button small" onClick={generateLotNumber}>{t('btn.auto')}</button>
                      </div>
                    </div>
                    <div className="field-group">
                      <label className="field-label">{t('f.date')}</label>
                      <input type="date" value={lotForm.date} onChange={(event) => updateLotField('date', event.target.value)} />
                    </div>
                    <div className="field-group">
                      <label className="field-label">{t('f.supplier')}</label>
                      <input list="supplier-list" value={lotForm.supplier} onChange={(event) => updateLotField('supplier', event.target.value)} />
                      <datalist id="supplier-list">
                        {suppliers.map((supplier) => <option key={supplier} value={supplier} />)}
                      </datalist>
                    </div>
                    <div className="field-group">
                      <label className="field-label">{t('f.shortNo')}</label>
                      <input value={lotForm.shortNumber} onChange={(event) => updateLotField('shortNumber', event.target.value)} />
                    </div>
                    <div className="field-group">
                      <label className="field-label">{t('f.shortName')}</label>
                      <input value={lotForm.shortName} onChange={(event) => updateLotField('shortName', event.target.value)} />
                    </div>
                    <div className="field-group">
                      <label className="field-label">{t('f.programDate')}</label>
                      <input type="date" value={lotForm.programDate} onChange={(event) => updateLotField('programDate', event.target.value)} />
                    </div>
                    <div className="field-group">
                      <label className="field-label">{t('f.cuttingDate')}</label>
                      <input type="date" value={lotForm.cuttingDate} onChange={(event) => updateLotField('cuttingDate', event.target.value)} />
                    </div>
                  </div>
                </section>

                <section className="form-section">
                  <h3>{t('sec.fabric')}</h3>
                  <p className="section-hint">{t('hint.fabric')}</p>
                  <div className="wizard-grid">
                    <div className="field-group">
                      <label className="field-label">{t('f.fabricType')}</label>
                      <input value={lotForm.fabricType} onChange={(event) => updateLotField('fabricType', event.target.value)} />
                    </div>
                    <div className="field-group">
                      <label className="field-label">{t('f.color')}</label>
                      <input value={lotForm.color} onChange={(event) => updateLotField('color', event.target.value)} />
                    </div>
                    <div className="field-group full-width">
                      <label className="field-label">{t('f.fabricDesc')}</label>
                      <textarea value={lotForm.description} onChange={(event) => updateLotField('description', event.target.value)} rows="3" />
                    </div>
                    <div className="field-group"><label className="field-label">{t('f.pana')}</label><input type="number" inputMode="numeric" value={lotForm.pana} onChange={(event) => updateLotField('pana', Number(event.target.value || 0))} /><small className="field-hint">{t('fh.pana')}</small></div>
                    <div className="field-group"><label className="field-label">{t('f.mtr')}</label><input type="number" inputMode="decimal" value={lotForm.totalMeters} onChange={(event) => updateLotField('totalMeters', Number(event.target.value || 0))} /><small className="field-hint">{t('fh.mtr')}</small></div>
                    <div className="field-group"><label className="field-label">{t('f.average')}</label><input type="number" value={averageValue.toFixed(2)} readOnly /><small className="field-hint">{t('fh.avg')}</small></div>
                    <div className="field-group"><label className="field-label">{t('f.pcs')}</label><input type="number" value={sizeTotal} readOnly /><small className="field-hint">{t('fh.pcs')}</small></div>
                  </div>
                </section>

                <section className="form-section">
                  <h3>{t('sec.sizes')}</h3>
                  <p className="section-hint">{t('hint.sizes')}</p>
                  <div className="matrix-toolbar">
                    <button type="button" className="ghost-button small" onClick={() => setLotForm((current) => ({ ...current, sizeBreakdown: Object.fromEntries(SIZE_OPTIONS.map((size) => [String(size), 36])) }))}>{t('btn.bulkFill')}</button>
                    <button type="button" className="ghost-button small" onClick={() => setLotForm((current) => ({ ...current, sizeBreakdown: createEmptySizeBreakdown() }))}>{t('btn.clearAll')}</button>
                  </div>
                  <div className="size-matrix">
                    {SIZE_OPTIONS.map((size) => (
                      <div className="size-row" key={size}>
                        <label>{size}</label>
                        <input type="number" inputMode="numeric" min="0" value={lotForm.sizeBreakdown[String(size)] || 0} onChange={(event) => updateSize(size, event.target.value)} />
                      </div>
                    ))}
                  </div>
                  <div className="totals-box">
                    <div><span>{t('tot.totalPcs')}</span><strong>{sizeTotal}</strong></div>
                    <div><span>{t('tot.average')}</span><strong>{averageValue.toFixed(2)}</strong></div>
                  </div>
                </section>

                <section className="form-section">
                  <h3>{t('sec.bale')}</h3>
                  <p className="section-hint">{t('hint.bale')}</p>
                  <div className="inline-actions top-gap"><button type="button" className="primary-button small" onClick={addBale}>{t('btn.addBale')}</button></div>
                  <div className="bale-list">
                    {(lotForm.bales || []).map((bale, index) => (
                      <div className="bale-row" key={bale.id ?? `b${index}`}>
                        <div className="field-group"><label className="field-label">{t('f.baleNo')}</label><input value={bale.baleNumber} onChange={(event) => updateBale(bale.id, 'baleNumber', event.target.value)} placeholder={`${index + 1}`} /></div>
                        <div className="field-group"><label className="field-label">{t('f.mtr')}</label><input type="number" inputMode="numeric" value={bale.meters} onChange={(event) => updateBale(bale.id, 'meters', event.target.value)} /></div>
                        <button type="button" className="bale-remove" onClick={() => removeBale(bale.id)} aria-label={t('btn.remove')} title={t('btn.remove')}>×</button>
                      </div>
                    ))}
                  </div>
                  <div className="totals-box">
                    <div><span>{t('tot.baleCount')}</span><strong>{(lotForm.bales || []).length}</strong></div>
                    <div><span>{t('tot.baleMtr')}</span><strong>{baleTotal}</strong></div>
                    <div><span>{t('tot.lotMtr')}</span><strong>{Number(lotForm.totalMeters || 0)}</strong></div>
                  </div>
                </section>

                <section className="form-section">
                  <h3>{t('sec.cutting')}</h3>
                  <p className="section-hint">{t('hint.cutting')}</p>
                  <div className="wizard-grid">
                    <div className="field-group"><label className="field-label">{t('f.cuttingPattern')}</label><select value={lotForm.cutting.patternType} onChange={(event) => updateLotField('cutting', { ...lotForm.cutting, patternType: event.target.value })}><option value="Marker">Marker</option><option value="Manual">Manual</option><option value="Computerized">Computerized</option></select></div>
                    <div className="field-group"><label className="field-label">{t('f.markerLength')}</label><input type="number" value={lotForm.cutting.markerLength} onChange={(event) => updateLotField('cutting', { ...lotForm.cutting, markerLength: event.target.value })} /></div>
                    <div className="field-group"><label className="field-label">{t('f.markerWidth')}</label><input type="number" value={lotForm.cutting.markerWidth} onChange={(event) => updateLotField('cutting', { ...lotForm.cutting, markerWidth: event.target.value })} /></div>
                    <div className="field-group"><label className="field-label">{t('f.layLength')}</label><input type="number" value={lotForm.cutting.layLength} onChange={(event) => updateLotField('cutting', { ...lotForm.cutting, layLength: event.target.value })} /></div>
                    <div className="field-group"><label className="field-label">{t('f.layers')}</label><input type="number" value={lotForm.cutting.noOfLayers} onChange={(event) => updateLotField('cutting', { ...lotForm.cutting, noOfLayers: event.target.value })} /></div>
                    <div className="field-group"><label className="field-label">{t('f.plies')}</label><input type="number" value={lotForm.cutting.noOfPlies} onChange={(event) => updateLotField('cutting', { ...lotForm.cutting, noOfPlies: event.target.value })} /></div>
                    <div className="field-group full-width"><label className="field-label">{t('f.patternImage')}</label><input type="file" accept="image/*" /></div>
                  </div>
                </section>

                <section className="form-section">
                  <h3>{t('sec.notes')}</h3>
                  <p className="section-hint">{t('hint.notes')}</p>
                  <div className="field-group full-width">
                    <textarea value={lotForm.notes} onChange={(event) => updateLotField('notes', event.target.value)} rows="3" placeholder="e.g. 2 set cutting required" />
                  </div>
                </section>
              </div>

              <div className="wizard-actions">
                <button type="button" className="ghost-button" onClick={closeWizard}>{t('btn.cancel')}</button>
                <button type="button" className="primary-button" onClick={saveLot}>{editingId ? t('btn.updateLot') : t('btn.saveLot')}</button>
              </div>
            </div>
          </div>
        )}

        {selectedLot && activeTab !== 'dashboard' && !wizardOpen && (
          <div className="floating-detail">
            <div className="detail-header">
              <div><p className="eyebrow">{t('detail.selectedLot')}</p><h3>{selectedLot.lotNumber}</h3></div>
              <div className="detail-actions">
                <button type="button" className="ghost-button small" onClick={() => openEditLot(selectedLot)}>{t('btn.edit')}</button>
                <button type="button" className="ghost-button small" onClick={() => updateStatus(selectedLot.id, 'Ready')}>{t('status.Ready')}</button>
                <button type="button" className="ghost-button small" onClick={() => updateStatus(selectedLot.id, 'Cutting')}>{t('status.Cutting')}</button>
                <button type="button" className="ghost-button small" onClick={() => updateStatus(selectedLot.id, 'Completed')}>{t('status.Completed')}</button>
                <button type="button" className="primary-button small" onClick={() => printLot(selectedLot.id)}>{t('btn.print')}</button>
              </div>
            </div>

            <div className="lot-detail-grid">
              <div className="detail-card">
                <h4>{t('detail.lotInfo')}</h4>
                <div className="key-value"><span>{t('detail.lotNo')}</span><strong>{selectedLot.lotNumber}</strong></div>
                <div className="key-value"><span>{t('detail.status')}</span><StatusBadge status={selectedLot.status} label={t(`status.${selectedLot.status}`)} /></div>
                <div className="key-value"><span>{t('detail.program')}</span><strong>{selectedLot.programDate}</strong></div>
                <div className="key-value"><span>{t('detail.cutDate')}</span><strong>{selectedLot.cuttingDate}</strong></div>
              </div>

              <div className="detail-card">
                <h4>{t('detail.fabricInfo')}</h4>
                <div className="key-value"><span>{t('detail.supplier')}</span><strong>{selectedLot.supplier}</strong></div>
                <div className="key-value"><span>{t('f.shortNo')}</span><strong>{selectedLot.shortNumber}</strong></div>
                <div className="key-value"><span>{t('f.shortName')}</span><strong>{selectedLot.shortName || '—'}</strong></div>
                <div className="key-value"><span>{t('detail.type')}</span><strong>{selectedLot.fabricType}</strong></div>
                <div className="key-value"><span>{t('detail.color')}</span><strong>{selectedLot.color}</strong></div>
              </div>

              <div className="detail-card">
                <h4>{t('detail.fabricMetrics')}</h4>
                <div className="key-value"><span>MTR</span><strong>{selectedLot.totalMeters}</strong></div>
                <div className="key-value"><span>PCS</span><strong>{selectedLot.totalPieces}</strong></div>
                <div className="key-value"><span>PANA</span><strong>{selectedLot.pana}</strong></div>
                <div className="key-value"><span>AVG</span><strong>{selectedLot.averageConsumption}</strong></div>
              </div>

              <div className="detail-card">
                <h4>{t('detail.notes')}</h4>
                <p>{selectedLot.notes}</p>
              </div>
            </div>
          </div>
        )}
        </main>
      </div>

      <nav className="bottom-nav">
        {PRIMARY_NAV.map((id) => {
          return (
            <button
              key={id}
              type="button"
              className={`${activeTab === id ? 'active' : ''} ${id === 'newLot' ? 'cta' : ''}`}
              onClick={() => goTo(id)}
            >
              <span className="bn-icon">{BN_ICONS[id]}</span>
              <span>{t(`nav.${id}`)}</span>
            </button>
          )
        })}
        <button
          type="button"
          className={MORE_NAV.includes(activeTab) ? 'active' : ''}
          onClick={() => setMoreOpen(true)}
        >
          <span className="bn-icon">☰</span>
          <span>{t('nav.more')}</span>
        </button>
      </nav>

      {moreOpen && (
        <div className="more-sheet-backdrop" onClick={() => setMoreOpen(false)}>
          <div className="more-sheet" onClick={(event) => event.stopPropagation()}>
            <div className="more-grabber" />
            {MORE_NAV.map((id) => (
              <button
                key={id}
                type="button"
                className={activeTab === id ? 'active' : ''}
                onClick={() => goTo(id)}
              >
                {t(`nav.${id}`)}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

function StatCard({ label, value, tone }) {
  return (
    <div className={`stat-card ${tone}`}>
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  )
}

function StatusBadge({ status, label }) {
  const className = status ? status.toLowerCase().replace(/\s+/g, '-') : 'draft'
  return <span className={`status-badge ${className}`}>{label || status}</span>
}

function MiniStat({ label, value }) {
  return (
    <div className="mini-stat">
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  )
}

function EmptyState({ title, message, action }) {
  return (
    <div className="empty-state">
      <div className="empty-icon" aria-hidden="true">📋</div>
      <h4>{title}</h4>
      <p>{message}</p>
      {action}
    </div>
  )
}

export default App
