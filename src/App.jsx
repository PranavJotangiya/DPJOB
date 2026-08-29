import { useEffect, useMemo, useState } from 'react'
import './App.css'

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
}

const PAGE_TITLES = {
  dashboard: 'Production Dashboard',
  lots: 'Lot Management',
  cutting: 'Cutting Board',
  bale: 'Bale / Fabric Control',
  reports: 'Reports',
  settings: 'Settings',
  newLot: 'New Lot',
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
  const [wizardStep, setWizardStep] = useState(0)
  const [lotForm, setLotForm] = useState(defaultLotForm())
  const [search, setSearch] = useState('')
  const [filter, setFilter] = useState('All')
  const [errors, setErrors] = useState([])
  const [statusMessage, setStatusMessage] = useState('')
  const [moreOpen, setMoreOpen] = useState(false)

  const fetchLots = async () => {
    try {
      const response = await fetch(`${API_BASE}/api/lots`)
      if (!response.ok) throw new Error('Failed to load lots')
      const payload = await response.json()
      if (payload.length) {
        setLots(payload)
        setSelectedLotId(payload[0].id)
      } else {
        setLots(FALLBACK_LOTS)
        setSelectedLotId(FALLBACK_LOTS[0].id)
      }
    } catch {
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

  const validateLot = () => {
    const nextErrors = []

    if (!lotForm.lotNumber.trim()) nextErrors.push('Please enter the Lot No.')
    if (!lotForm.supplier.trim()) nextErrors.push('Please select the Fabric Supplier.')
    if (!lotForm.shortNumber.trim()) nextErrors.push('Please enter the Short No.')
    if (!lotForm.cuttingDate) nextErrors.push('Please enter the Cutting Date.')
    if (!lotForm.programDate) nextErrors.push('Please enter the Program Date.')
    if (lotForm.programDate && lotForm.cuttingDate && new Date(lotForm.cuttingDate) < new Date(lotForm.programDate)) {
      nextErrors.push('Cutting Date cannot be before Program Date.')
    }
    if (Number(lotForm.totalMeters || 0) < 0) nextErrors.push('Fabric meter value cannot be negative.')
    if (baleTotal > 0 && Number(lotForm.totalMeters || 0) > 0 && Math.abs(baleTotal - Number(lotForm.totalMeters)) > 1) {
      nextErrors.push(`Fabric meter mismatch: Lot says ${Number(lotForm.totalMeters).toFixed(0)} MTR, but Bale entries total ${baleTotal.toFixed(0)} MTR.`)
    }
    if (sizeTotal > 0 && Number(lotForm.totalPieces || 0) > 0 && sizeTotal !== Number(lotForm.totalPieces)) {
      nextErrors.push(`Size quantities total ${sizeTotal} pcs, but PCS is entered as ${Number(lotForm.totalPieces)}.`)
    }
    if (!lotForm.bales.length) nextErrors.push('Please add at least one Bale or Roll entry.')
    if (Number(lotForm.totalMeters || 0) > 0 && Number(lotForm.totalPieces || 0) > 0 && Number(lotForm.totalMeters) / Number(lotForm.totalPieces) > 3) {
      nextErrors.push('Average consumption looks unusually high. Please check the values.')
    }

    return nextErrors
  }

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
    setWizardOpen(true)
    setWizardStep(0)
    setErrors([])
    setStatusMessage('')
    setLotForm(defaultLotForm())
    setActiveTab('newLot')
    setMoreOpen(false)
  }

  const goTo = (id) => {
    if (id === 'newLot') openNewLot()
    else setActiveTab(id)
    setMoreOpen(false)
  }

  const isStepValid = (stepIndex) => {
    if (stepIndex === 0) return lotForm.lotNumber && lotForm.supplier && lotForm.shortNumber && lotForm.programDate && lotForm.cuttingDate
    if (stepIndex === 1) return lotForm.fabricType && lotForm.color && lotForm.description
    if (stepIndex === 2) return sizeTotal > 0
    if (stepIndex === 3) return (lotForm.bales || []).some((bale) => bale.baleNumber && Number(bale.meters || 0) > 0)
    if (stepIndex === 4) return lotForm.cutting.patternType
    return true
  }

  const nextStep = () => {
    if (!isStepValid(wizardStep)) {
      setErrors(['Please complete the current step before continuing.'])
      return
    }
    setErrors([])
    setWizardStep((current) => Math.min(current + 1, 5))
  }

  const previousStep = () => {
    setErrors([])
    setWizardStep((current) => Math.max(current - 1, 0))
  }

  const saveLot = async () => {
    const nextErrors = validateLot()
    if (nextErrors.length > 0) {
      setErrors(nextErrors)
      return
    }

    const payload = {
      ...lotForm,
      lotNumber: lotForm.lotNumber.trim(),
      averageConsumption: Number((Number(lotForm.totalMeters || 0) / (Number(sizeTotal || 1) || 1)).toFixed(2)),
      totalPieces: sizeTotal,
      status: 'Ready',
      bales: lotForm.bales,
      cutting: { ...lotForm.cutting },
      sizeBreakdown: { ...lotForm.sizeBreakdown },
    }

    try {
      const response = await fetch(`${API_BASE}/api/lots`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })

      const result = await response.json()
      if (!response.ok) {
        setErrors([result.error || 'Unable to save lot.'])
        return
      }

      setLots((current) => [result, ...current])
      setSelectedLotId(result.id)
      setActiveTab('lots')
      setWizardOpen(false)
      setErrors([])
      setStatusMessage('Lot saved successfully.')
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
      const response = await fetch(`${API_BASE}/api/print/${lotId}`)
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

  const steps = ['Lot Details', 'Fabric Details', 'Size Matrix', 'Bale / Roll', 'Cutting Info', 'Review']

  const roleSelect = (
    <>
      <option value="Admin">Admin</option>
      <option value="Supervisor">Supervisor</option>
      <option value="Operator">Operator</option>
      <option value="Viewer">Viewer</option>
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
                <span>{item.label}</span>
              </button>
            ))}
          </nav>

          <div className="sidebar-card">
            <label className="field-label">Role</label>
            <select value={role} onChange={(event) => setRole(event.target.value)}>
              {roleSelect}
            </select>
          </div>
        </aside>

        <main className="content-panel">
          <header className="topbar">
            <div>
              <p className="eyebrow">Factory Workflow</p>
              <h1>{PAGE_TITLES[activeTab]}</h1>
            </div>

            <div className="topbar-actions">
              <button type="button" className="ghost-button" onClick={() => setActiveTab('lots')}>View Lots</button>
              <button type="button" className="primary-button" onClick={openNewLot}>+ New Lot</button>
            </div>
          </header>

        {statusMessage && <div className="success-banner">{statusMessage}</div>}

        {activeTab === 'dashboard' && (
          <section className="page-stack">
            <div className="summary-grid">
              <StatCard label="Total Active Lots" value={dashboardStats.activeLots} tone="blue" />
              <StatCard label="Today's Cutting" value={dashboardStats.todaysCutting} tone="orange" />
              <StatCard label="Pending Cutting" value={dashboardStats.pendingCutting} tone="amber" />
              <StatCard label="Completed Lots" value={dashboardStats.completedLots} tone="green" />
              <StatCard label="Total Fabric Used" value={`${dashboardStats.totalFabricUsed} MTR`} tone="slate" />
              <StatCard label="Total Pieces" value={dashboardStats.totalPieces} tone="purple" />
            </div>

            <div className="panel-card">
              <div className="panel-header">
                <h3>Today's Cutting</h3>
                <button type="button" className="ghost-button small">Export</button>
              </div>

              <div className="table-wrap">
                <table>
                  <thead>
                    <tr>
                      <th>Lot No.</th>
                      <th>Style / Short No.</th>
                      <th>Fabric</th>
                      <th>Pieces</th>
                      <th>Meter</th>
                      <th>Status</th>
                      <th>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {lots.slice(0, 5).map((lot) => (
                      <tr key={lot.id}>
                        <td data-label="Lot No.">{lot.lotNumber}</td>
                        <td data-label="Style / Short No.">{lot.shortNumber}</td>
                        <td data-label="Fabric">{lot.fabricType}</td>
                        <td data-label="Pieces">{lot.totalPieces}</td>
                        <td data-label="Meter">{lot.totalMeters}</td>
                        <td data-label="Status"><StatusBadge status={lot.status} /></td>
                        <td data-label="Action" className="cell-actions">
                          <button type="button" className="table-action" onClick={() => { setSelectedLotId(lot.id); setActiveTab('lots') }}>Open</button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </section>
        )}

        {activeTab === 'lots' && (
          <section className="page-stack">
            <div className="toolbar">
              <input type="search" value={search} placeholder="Search lot no, short no, supplier, bale" onChange={(event) => setSearch(event.target.value)} />
              <div className="chip-row">
                {['All', 'Today', 'This Week', 'This Month', 'Pending', 'Cutting', 'Completed'].map((item) => (
                  <button key={item} type="button" className={`chip ${filter === item ? 'selected' : ''}`} onClick={() => setFilter(item)}>{item}</button>
                ))}
              </div>
            </div>

            <div className="panel-card">
              <div className="table-wrap">
                <table>
                  <thead>
                    <tr>
                      <th>Lot No.</th>
                      <th>Short No.</th>
                      <th>Fabric Supplier</th>
                      <th>MTR</th>
                      <th>PCS</th>
                      <th>Cutting Date</th>
                      <th>Status</th>
                      <th>Created By</th>
                      <th>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {lotTableData.map((lot) => (
                      <tr key={lot.id}>
                        <td data-label="Lot No.">{lot.lotNumber}</td>
                        <td data-label="Short No.">{lot.shortNumber}</td>
                        <td data-label="Fabric Supplier">{lot.supplier}</td>
                        <td data-label="MTR">{lot.totalMeters}</td>
                        <td data-label="PCS">{lot.totalPieces}</td>
                        <td data-label="Cutting Date">{lot.cuttingDate}</td>
                        <td data-label="Status"><StatusBadge status={lot.status} /></td>
                        <td data-label="Created By">{lot.createdBy}</td>
                        <td data-label="Action" className="cell-actions">
                          <div className="inline-actions">
                            <button type="button" className="table-action" onClick={() => { setSelectedLotId(lot.id); setActiveTab('dashboard') }}>Detail</button>
                            <button type="button" className="table-action" onClick={() => printLot(lot.id)}>PDF</button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </section>
        )}

        {activeTab === 'cutting' && (
          <section className="page-stack">
            <div className="mini-grid">
              <MiniStat label="Waiting for Cutting" value={lots.filter((lot) => lot.status === 'Ready').length} />
              <MiniStat label="In Cutting" value={lots.filter((lot) => lot.status === 'Cutting').length} />
              <MiniStat label="Completed" value={lots.filter((lot) => lot.status === 'Completed').length} />
              <MiniStat label="Planned Pieces" value={lots.reduce((sum, lot) => sum + Number(lot.totalPieces || 0), 0)} />
            </div>

            <div className="panel-card">
              <div className="panel-header">
                <h3>Cutting Queue</h3>
              </div>
              <div className="table-wrap">
                <table>
                  <thead>
                    <tr>
                      <th>Lot</th>
                      <th>Style</th>
                      <th>Fabric</th>
                      <th>Qty</th>
                      <th>Cut Date</th>
                      <th>Status</th>
                      <th>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {lots.map((lot) => (
                      <tr key={lot.id}>
                        <td data-label="Lot">{lot.lotNumber}</td>
                        <td data-label="Style">{lot.shortNumber}</td>
                        <td data-label="Fabric">{lot.fabricType}</td>
                        <td data-label="Qty">{lot.totalPieces}</td>
                        <td data-label="Cut Date">{lot.cuttingDate}</td>
                        <td data-label="Status"><StatusBadge status={lot.status} /></td>
                        <td data-label="Action" className="cell-actions"><button type="button" className="table-action" onClick={() => updateStatus(lot.id, 'Cutting')}>Start</button></td>
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
                <h3>Bale / Fabric Reconciliation</h3>
              </div>
              <div className="kpi-inline">
                <div><span>Total Bale Count</span><strong>{selectedLot?.bales?.length || 0}</strong></div>
                <div><span>Total Meters</span><strong>{selectedLot ? selectedLot.bales.reduce((sum, bale) => sum + Number(bale.meters || 0), 0) : 0}</strong></div>
                <div><span>Lot MTR</span><strong>{selectedLot?.totalMeters || 0}</strong></div>
              </div>

              <div className="table-wrap">
                <table>
                  <thead>
                    <tr>
                      <th>Bale No.</th>
                      <th>Meter</th>
                      <th>Weight</th>
                      <th>Shade</th>
                      <th>Remarks</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(selectedLot?.bales || []).map((bale) => (
                      <tr key={bale.id}>
                        <td data-label="Bale No.">{bale.baleNumber}</td>
                        <td data-label="Meter">{bale.meters}</td>
                        <td data-label="Weight">{bale.weight || '-'}</td>
                        <td data-label="Shade">{bale.shade || '-'}</td>
                        <td data-label="Remarks">{bale.remarks || '-'}</td>
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
              <MiniStat label="Lots Waiting" value={lots.filter((lot) => ['Draft', 'Ready'].includes(lot.status)).length} />
              <MiniStat label="Fabric Mismatch" value={lots.filter((lot) => Number(lot.totalMeters) !== (lot.bales || []).reduce((sum, bale) => sum + Number(bale.meters || 0), 0)).length} />
              <MiniStat label="Today's Production" value={lots.filter((lot) => lot.cuttingDate === '2026-08-29').reduce((sum, lot) => sum + Number(lot.totalPieces || 0), 0)} />
              <MiniStat label="Highest Consumption" value="0.94 AVG" />
            </div>

            <div className="panel-card">
              <div className="panel-header">
                <h3>Operational Summary</h3>
              </div>
              <div className="report-list">
                <div className="report-item"><strong>Lots waiting for cutting</strong><span>{lots.filter((lot) => ['Draft', 'Ready'].includes(lot.status)).length}</span></div>
                <div className="report-item"><strong>Fabric mismatch alerts</strong><span>{lots.filter((lot) => Number(lot.totalMeters) !== (lot.bales || []).reduce((sum, bale) => sum + Number(bale.meters || 0), 0)).length}</span></div>
                <div className="report-item"><strong>Completed cutting</strong><span>{lots.filter((lot) => lot.status === 'Completed').length}</span></div>
                <div className="report-item"><strong>Pending cutting</strong><span>{lots.filter((lot) => lot.status === 'Ready').length}</span></div>
              </div>
            </div>
          </section>
        )}

        {activeTab === 'settings' && (
          <section className="page-stack">
            <div className="settings-grid">
              <div className="panel-card">
                <h3>Calculation Rules</h3>
                <div className="settings-row">
                  <label>Average consumption formula</label>
                  <select defaultValue="Total Fabric Meters ÷ Total Pieces">
                    <option>Total Fabric Meters ÷ Total Pieces</option>
                    <option>Total Fabric Meters ÷ Total Panels</option>
                    <option>Manual entry</option>
                  </select>
                </div>
                <div className="settings-row">
                  <label>Lot number auto-generation</label>
                  <input type="checkbox" defaultChecked />
                </div>
              </div>

              <div className="panel-card">
                <h3>Role Setup</h3>
                <ul className="role-list">
                  <li><strong>Admin</strong> — Full access</li>
                  <li><strong>Supervisor</strong> — Create, edit, complete</li>
                  <li><strong>Operator</strong> — Create and edit assigned lots</li>
                  <li><strong>Viewer</strong> — View and reports</li>
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
                  <p className="eyebrow">New lot</p>
                  <h2>Create lot</h2>
                </div>
                <button type="button" className="close-button" onClick={() => setWizardOpen(false)} aria-label="Close">×</button>
              </div>

              <div className="wizard-scroll">
              <div className="stepper">
                {steps.map((step, index) => (
                  <div key={step} className={`step ${wizardStep === index ? 'active' : ''} ${index < wizardStep ? 'done' : ''}`}>
                    <span>{index < wizardStep ? '✓' : index + 1}</span>
                    <small>{step}</small>
                  </div>
                ))}
              </div>

              {errors.length > 0 && (
                <div className="error-box">
                  {errors.map((error) => <div key={error}>⚠ {error}</div>)}
                </div>
              )}

              {wizardStep === 0 && (
                <div className="wizard-grid">
                  <div className="field-group">
                    <label className="field-label">Lot No.</label>
                    <div className="inline-field">
                      <input value={lotForm.lotNumber} onChange={(event) => updateLotField('lotNumber', event.target.value)} placeholder="LOT-30" />
                      <button type="button" className="ghost-button small" onClick={generateLotNumber}>Auto</button>
                    </div>
                  </div>
                  <div className="field-group">
                    <label className="field-label">Date</label>
                    <input type="date" value={lotForm.date} onChange={(event) => updateLotField('date', event.target.value)} />
                  </div>
                  <div className="field-group">
                    <label className="field-label">Fabric Supplier</label>
                    <input list="supplier-list" value={lotForm.supplier} onChange={(event) => updateLotField('supplier', event.target.value)} />
                    <datalist id="supplier-list">
                      {suppliers.map((supplier) => <option key={supplier} value={supplier} />)}
                    </datalist>
                  </div>
                  <div className="field-group">
                    <label className="field-label">Short No.</label>
                    <input value={lotForm.shortNumber} onChange={(event) => updateLotField('shortNumber', event.target.value)} />
                  </div>
                  <div className="field-group">
                    <label className="field-label">Program Date</label>
                    <input type="date" value={lotForm.programDate} onChange={(event) => updateLotField('programDate', event.target.value)} />
                  </div>
                  <div className="field-group">
                    <label className="field-label">Cutting Date</label>
                    <input type="date" value={lotForm.cuttingDate} onChange={(event) => updateLotField('cuttingDate', event.target.value)} />
                  </div>
                </div>
              )}

              {wizardStep === 1 && (
                <div className="wizard-grid">
                  <div className="field-group">
                    <label className="field-label">Fabric Supplier</label>
                    <input value={lotForm.supplier} onChange={(event) => updateLotField('supplier', event.target.value)} />
                  </div>
                  <div className="field-group">
                    <label className="field-label">Short No.</label>
                    <input value={lotForm.shortNumber} onChange={(event) => updateLotField('shortNumber', event.target.value)} />
                  </div>
                  <div className="field-group">
                    <label className="field-label">Fabric Type</label>
                    <input value={lotForm.fabricType} onChange={(event) => updateLotField('fabricType', event.target.value)} />
                  </div>
                  <div className="field-group">
                    <label className="field-label">Color</label>
                    <input value={lotForm.color} onChange={(event) => updateLotField('color', event.target.value)} />
                  </div>
                  <div className="field-group full-width">
                    <label className="field-label">Fabric Description</label>
                    <textarea value={lotForm.description} onChange={(event) => updateLotField('description', event.target.value)} rows="3" />
                  </div>
                  <div className="field-group"><label className="field-label">PANA</label><input type="number" value={lotForm.pana} onChange={(event) => updateLotField('pana', Number(event.target.value || 0))} /></div>
                  <div className="field-group"><label className="field-label">MTR</label><input type="number" value={lotForm.totalMeters} onChange={(event) => updateLotField('totalMeters', Number(event.target.value || 0))} /></div>
                  <div className="field-group"><label className="field-label">AVERAGE</label><input type="number" value={averageValue.toFixed(2)} readOnly /></div>
                  <div className="field-group"><label className="field-label">PCS</label><input type="number" value={sizeTotal} readOnly /></div>
                </div>
              )}

              {wizardStep === 2 && (
                <div className="wizard-grid matrix-grid">
                  <div className="matrix-toolbar">
                    <button type="button" className="ghost-button small" onClick={() => setLotForm((current) => ({ ...current, sizeBreakdown: Object.fromEntries(SIZE_OPTIONS.map((size) => [String(size), 36])) }))}>Bulk Fill 36</button>
                    <button type="button" className="ghost-button small" onClick={() => setLotForm((current) => ({ ...current, sizeBreakdown: createEmptySizeBreakdown() }))}>Clear All</button>
                  </div>

                  <div className="size-matrix">
                    {SIZE_OPTIONS.map((size) => (
                      <div className="size-row" key={size}>
                        <label>{size}</label>
                        <input type="number" min="0" value={lotForm.sizeBreakdown[String(size)] || 0} onChange={(event) => updateSize(size, event.target.value)} />
                      </div>
                    ))}
                  </div>

                  <div className="totals-box">
                    <div><span>Total PCS</span><strong>{sizeTotal}</strong></div>
                    <div><span>Average</span><strong>{averageValue.toFixed(2)}</strong></div>
                  </div>
                </div>
              )}

              {wizardStep === 3 && (
                <div className="wizard-stack">
                  <div className="inline-actions top-gap"><button type="button" className="primary-button small" onClick={addBale}>+ Add Bale / Roll</button></div>

                  {(lotForm.bales || []).map((bale, index) => (
                    <div className="bale-row" key={bale.id}>
                      <div className="field-group"><label className="field-label">Bale / Roll No.</label><input value={bale.baleNumber} onChange={(event) => updateBale(bale.id, 'baleNumber', event.target.value)} placeholder={`Bale ${index + 1}`} /></div>
                      <div className="field-group"><label className="field-label">MTR</label><input type="number" value={bale.meters} onChange={(event) => updateBale(bale.id, 'meters', event.target.value)} /></div>
                      <div className="field-group"><label className="field-label">Weight</label><input value={bale.weight || ''} onChange={(event) => updateBale(bale.id, 'weight', event.target.value)} placeholder="Optional" /></div>
                      <div className="field-group"><label className="field-label">Shade</label><input value={bale.shade || ''} onChange={(event) => updateBale(bale.id, 'shade', event.target.value)} placeholder="Optional" /></div>
                      <div className="field-group"><label className="field-label">Remarks</label><input value={bale.remarks || ''} onChange={(event) => updateBale(bale.id, 'remarks', event.target.value)} placeholder="Optional" /></div>
                      <button type="button" className="danger-button" onClick={() => removeBale(bale.id)}>Remove</button>
                    </div>
                  ))}

                  <div className="totals-box">
                    <div><span>Total Bale Count</span><strong>{(lotForm.bales || []).length}</strong></div>
                    <div><span>Total Bale MTR</span><strong>{baleTotal}</strong></div>
                    <div><span>Lot MTR</span><strong>{Number(lotForm.totalMeters || 0)}</strong></div>
                  </div>
                </div>
              )}

              {wizardStep === 4 && (
                <div className="wizard-grid">
                  <div className="field-group"><label className="field-label">Cutting Pattern</label><select value={lotForm.cutting.patternType} onChange={(event) => updateLotField('cutting', { ...lotForm.cutting, patternType: event.target.value })}><option value="Marker">Marker</option><option value="Manual">Manual</option><option value="Computerized">Computerized</option></select></div>
                  <div className="field-group"><label className="field-label">Marker Length</label><input type="number" value={lotForm.cutting.markerLength} onChange={(event) => updateLotField('cutting', { ...lotForm.cutting, markerLength: event.target.value })} /></div>
                  <div className="field-group"><label className="field-label">Marker Width</label><input type="number" value={lotForm.cutting.markerWidth} onChange={(event) => updateLotField('cutting', { ...lotForm.cutting, markerWidth: event.target.value })} /></div>
                  <div className="field-group"><label className="field-label">Lay Length</label><input type="number" value={lotForm.cutting.layLength} onChange={(event) => updateLotField('cutting', { ...lotForm.cutting, layLength: event.target.value })} /></div>
                  <div className="field-group"><label className="field-label">No. of Layers</label><input type="number" value={lotForm.cutting.noOfLayers} onChange={(event) => updateLotField('cutting', { ...lotForm.cutting, noOfLayers: event.target.value })} /></div>
                  <div className="field-group"><label className="field-label">No. of Plies</label><input type="number" value={lotForm.cutting.noOfPlies} onChange={(event) => updateLotField('cutting', { ...lotForm.cutting, noOfPlies: event.target.value })} /></div>
                  <div className="field-group full-width"><label className="field-label">Pattern image upload</label><input type="file" accept="image/*" /></div>
                </div>
              )}

              {wizardStep === 5 && (
                <div className="wizard-grid review-grid">
                  <div className="review-box">
                    <h3>{lotForm.lotNumber || 'LOT-XX'}</h3>
                    <p><strong>Fabric:</strong> {lotForm.supplier}</p>
                    <p><strong>Short No:</strong> {lotForm.shortNumber}</p>
                    <p><strong>Total Fabric:</strong> {numberOrZero(lotForm.totalMeters)} MTR</p>
                    <p><strong>Average:</strong> {averageValue.toFixed(2)}</p>
                    <p><strong>Total Pieces:</strong> {sizeTotal}</p>
                    <p><strong>Bales:</strong> {(lotForm.bales || []).length}</p>
                  </div>

                  <div className="review-box">
                    <h4>Size Breakdown</h4>
                    <div className="mini-size-list">
                      {SIZE_OPTIONS.filter((size) => Number(lotForm.sizeBreakdown[String(size)] || 0) > 0).map((size) => (
                        <div key={size} className="mini-size-row"><span>Size {size}</span><strong>{lotForm.sizeBreakdown[String(size)]}</strong></div>
                      ))}
                    </div>
                  </div>

                  <div className="review-box full-width"><p className="success-label">✓ No major errors found</p></div>
                </div>
              )}

              </div>

              <div className="wizard-actions">
                <button type="button" className="ghost-button" onClick={previousStep} disabled={wizardStep === 0}>Back</button>
                {wizardStep < steps.length - 1 ? <button type="button" className="primary-button" onClick={nextStep}>Continue</button> : <button type="button" className="primary-button" onClick={saveLot}>Save Lot</button>}
              </div>
            </div>
          </div>
        )}

        {selectedLot && activeTab !== 'dashboard' && !wizardOpen && (
          <div className="floating-detail">
            <div className="detail-header">
              <div><p className="eyebrow">Selected Lot</p><h3>{selectedLot.lotNumber}</h3></div>
              <div className="detail-actions">
                <button type="button" className="ghost-button small" onClick={() => updateStatus(selectedLot.id, 'Ready')}>Ready</button>
                <button type="button" className="ghost-button small" onClick={() => updateStatus(selectedLot.id, 'Cutting')}>Cutting</button>
                <button type="button" className="ghost-button small" onClick={() => updateStatus(selectedLot.id, 'Completed')}>Completed</button>
                <button type="button" className="primary-button small" onClick={() => printLot(selectedLot.id)}>Print</button>
              </div>
            </div>

            <div className="lot-detail-grid">
              <div className="detail-card">
                <h4>Lot Information</h4>
                <div className="key-value"><span>Lot No.</span><strong>{selectedLot.lotNumber}</strong></div>
                <div className="key-value"><span>Status</span><StatusBadge status={selectedLot.status} /></div>
                <div className="key-value"><span>Program</span><strong>{selectedLot.programDate}</strong></div>
                <div className="key-value"><span>Cut Date</span><strong>{selectedLot.cuttingDate}</strong></div>
              </div>

              <div className="detail-card">
                <h4>Fabric Information</h4>
                <div className="key-value"><span>Supplier</span><strong>{selectedLot.supplier}</strong></div>
                <div className="key-value"><span>Short No.</span><strong>{selectedLot.shortNumber}</strong></div>
                <div className="key-value"><span>Type</span><strong>{selectedLot.fabricType}</strong></div>
                <div className="key-value"><span>Color</span><strong>{selectedLot.color}</strong></div>
              </div>

              <div className="detail-card">
                <h4>Fabric Metrics</h4>
                <div className="key-value"><span>MTR</span><strong>{selectedLot.totalMeters}</strong></div>
                <div className="key-value"><span>PCS</span><strong>{selectedLot.totalPieces}</strong></div>
                <div className="key-value"><span>PANA</span><strong>{selectedLot.pana}</strong></div>
                <div className="key-value"><span>AVG</span><strong>{selectedLot.averageConsumption}</strong></div>
              </div>

              <div className="detail-card">
                <h4>Notes</h4>
                <p>{selectedLot.notes}</p>
              </div>
            </div>
          </div>
        )}
        </main>
      </div>

      <nav className="bottom-nav">
        {PRIMARY_NAV.map((id) => {
          const item = NAV_ITEMS.find((nav) => nav.id === id)
          return (
            <button
              key={id}
              type="button"
              className={`${activeTab === id ? 'active' : ''} ${id === 'newLot' ? 'cta' : ''}`}
              onClick={() => goTo(id)}
            >
              <span className="bn-icon">{BN_ICONS[id]}</span>
              <span>{item.label}</span>
            </button>
          )
        })}
        <button
          type="button"
          className={MORE_NAV.includes(activeTab) ? 'active' : ''}
          onClick={() => setMoreOpen(true)}
        >
          <span className="bn-icon">☰</span>
          <span>More</span>
        </button>
      </nav>

      {moreOpen && (
        <div className="more-sheet-backdrop" onClick={() => setMoreOpen(false)}>
          <div className="more-sheet" onClick={(event) => event.stopPropagation()}>
            <div className="more-grabber" />
            {MORE_NAV.map((id) => {
              const item = NAV_ITEMS.find((nav) => nav.id === id)
              return (
                <button
                  key={id}
                  type="button"
                  className={activeTab === id ? 'active' : ''}
                  onClick={() => goTo(id)}
                >
                  {item.label}
                </button>
              )
            })}
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

function StatusBadge({ status }) {
  const className = status ? status.toLowerCase().replace(/\s+/g, '-') : 'draft'
  return <span className={`status-badge ${className}`}>{status}</span>
}

function MiniStat({ label, value }) {
  return (
    <div className="mini-stat">
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  )
}

function numberOrZero(value) {
  return Number(value || 0)
}

export default App
