import express from 'express'
import cors from 'cors'
import { jsPDF } from 'jspdf'
import { getDb, ready } from './db.js'

const toNumber = (value, fallback = 0) => {
  const num = Number(value)
  return Number.isFinite(num) ? num : fallback
}

const one = async (sql, args = []) => (await getDb().execute({ sql, args })).rows[0] || null
const many = async (sql, args = []) => (await getDb().execute({ sql, args })).rows

const serializeLot = (lot, sizes = [], bales = [], pattern = null) => ({
  id: lot.id,
  lotNumber: lot.lot_number,
  date: lot.lot_date,
  supplier: lot.supplier,
  shortNumber: lot.short_number,
  programDate: lot.program_date,
  cuttingDate: lot.cutting_date,
  fabricType: lot.fabric_type,
  color: lot.color,
  description: lot.description,
  pana: lot.pana,
  totalMeters: lot.total_meters,
  averageConsumption: lot.average_consumption,
  totalPieces: lot.total_pieces,
  status: lot.status,
  notes: lot.notes,
  createdBy: lot.created_by,
  createdAt: lot.created_at,
  updatedAt: lot.updated_at,
  sizeBreakdown: Object.fromEntries(sizes.map((item) => [String(item.size), item.quantity])),
  bales: bales.map((item) => ({
    id: item.id,
    baleNumber: item.bale_number,
    meters: item.meters,
    weight: item.weight,
    shade: item.shade,
    remarks: item.remarks,
  })),
  cutting: pattern
    ? {
        patternType: pattern.pattern_type,
        markerLength: pattern.marker_length,
        markerWidth: pattern.marker_width,
        layLength: pattern.lay_length,
        noOfLayers: pattern.no_of_layers,
        noOfPlies: pattern.no_of_plies,
      }
    : {
        patternType: '',
        markerLength: '',
        markerWidth: '',
        layLength: '',
        noOfLayers: '',
        noOfPlies: '',
      },
})

const loadLot = async (lotId) => {
  const lot = await one('SELECT * FROM lots WHERE id = ?', [lotId])
  if (!lot) return null
  const sizes = await many('SELECT * FROM lot_sizes WHERE lot_id = ? ORDER BY size ASC', [lotId])
  const bales = await many('SELECT * FROM bales WHERE lot_id = ? ORDER BY id ASC', [lotId])
  const pattern = await one('SELECT * FROM patterns WHERE lot_id = ? LIMIT 1', [lotId])
  return serializeLot(lot, sizes, bales, pattern)
}

const wrap = (handler) => (req, res, next) => Promise.resolve(handler(req, res, next)).catch(next)

export const app = express()

app.use(cors())
app.use(express.json({ limit: '10mb' }))
app.use(wrap(async (req, res, next) => { await ready(); next() }))

app.get('/api/health', (req, res) => {
  res.json({ ok: true, message: 'Garment cutting API is running' })
})

app.get('/api/suppliers', wrap(async (req, res) => {
  const rows = await many('SELECT name FROM suppliers ORDER BY name ASC')
  res.json(rows.map((row) => row.name))
}))

app.get('/api/lots', wrap(async (req, res) => {
  const lots = await many('SELECT * FROM lots ORDER BY created_at DESC')
  const result = []
  for (const lot of lots) {
    const sizes = await many('SELECT * FROM lot_sizes WHERE lot_id = ? ORDER BY size ASC', [lot.id])
    const bales = await many('SELECT * FROM bales WHERE lot_id = ? ORDER BY id ASC', [lot.id])
    const pattern = await one('SELECT * FROM patterns WHERE lot_id = ? LIMIT 1', [lot.id])
    result.push(serializeLot(lot, sizes, bales, pattern))
  }
  res.json(result)
}))

app.post('/api/lots', wrap(async (req, res) => {
  const payload = req.body || {}

  // "Just save" mode: no required-field blocking. Fill defaults and make the
  // lot number unique so a save never fails.
  let lotNumber = (payload.lotNumber || '').trim().toUpperCase()
  if (!lotNumber) {
    const rows = await many('SELECT lot_number FROM lots')
    const maxN = rows.reduce((max, row) => {
      const match = String(row.lot_number || '').match(/(\d+)/)
      const num = match ? Number(match[1]) : NaN
      return Number.isFinite(num) ? Math.max(max, num) : max
    }, 0)
    lotNumber = `LOT-${maxN + 1}`
  }
  const base = lotNumber
  let suffix = 2
  // eslint-disable-next-line no-await-in-loop
  while (await one('SELECT id FROM lots WHERE lot_number = ?', [lotNumber])) {
    lotNumber = `${base}-${suffix}`
    suffix += 1
  }

  const sizeEntries = Object.entries(payload.sizeBreakdown || {})
  const totalPieces = sizeEntries.reduce((sum, [, quantity]) => sum + toNumber(quantity, 0), 0)
  const totalMeters = toNumber(payload.totalMeters, 0)
  const average = totalPieces > 0 && totalMeters > 0 ? Number((totalMeters / totalPieces).toFixed(2)) : 0

  const tx = await getDb().transaction('write')
  let lotId
  try {
    const inserted = await tx.execute({
      sql: `INSERT INTO lots (
        lot_number, lot_date, supplier, short_number, program_date, cutting_date,
        fabric_type, color, description, pana, total_meters, average_consumption,
        total_pieces, status, notes, created_by
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      args: [
        lotNumber,
        payload.date || new Date().toISOString().slice(0, 10),
        payload.supplier || '',
        payload.shortNumber || '',
        payload.programDate || '',
        payload.cuttingDate || '',
        payload.fabricType || '',
        payload.color || '',
        payload.description || '',
        toNumber(payload.pana, 0),
        totalMeters,
        average,
        totalPieces,
        payload.status || 'Draft',
        payload.notes || '',
        payload.createdBy || 'Operator 01',
      ],
    })
    lotId = Number(inserted.lastInsertRowid)

    for (const [size, quantity] of sizeEntries) {
      await tx.execute({
        sql: 'INSERT INTO lot_sizes (lot_id, size, quantity) VALUES (?, ?, ?)',
        args: [lotId, toNumber(size, 0), toNumber(quantity, 0)],
      })
    }

    for (const bale of payload.bales || []) {
      if (!bale.baleNumber && !Number(bale.meters || 0)) continue
      await tx.execute({
        sql: 'INSERT INTO bales (lot_id, bale_number, meters, weight, shade, remarks) VALUES (?, ?, ?, ?, ?, ?)',
        args: [lotId, bale.baleNumber || '', toNumber(bale.meters, 0), toNumber(bale.weight, 0), bale.shade || '', bale.remarks || ''],
      })
    }

    if (payload.cutting) {
      await tx.execute({
        sql: `INSERT INTO patterns (lot_id, pattern_type, marker_length, marker_width, lay_length, no_of_layers, no_of_plies)
              VALUES (?, ?, ?, ?, ?, ?, ?)`,
        args: [
          lotId,
          payload.cutting.patternType || '',
          toNumber(payload.cutting.markerLength, 0),
          toNumber(payload.cutting.markerWidth, 0),
          toNumber(payload.cutting.layLength, 0),
          toNumber(payload.cutting.noOfLayers, 0),
          toNumber(payload.cutting.noOfPlies, 0),
        ],
      })
    }

    await tx.commit()
  } catch (error) {
    await tx.rollback()
    throw error
  }

  res.status(201).json(await loadLot(lotId))
}))

app.put('/api/lots/:id/status', wrap(async (req, res) => {
  const { status } = req.body || {}
  const result = await getDb().execute({
    sql: 'UPDATE lots SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
    args: [status, req.params.id],
  })
  if (!result.rowsAffected) return res.status(404).json({ error: 'Lot not found' })
  res.json({ ok: true })
}))

app.get('/api/reports/summary', wrap(async (req, res) => {
  const summary = await one(`
    SELECT
      COUNT(*) AS totalLots,
      SUM(CASE WHEN status != 'Completed' THEN 1 ELSE 0 END) AS activeLots,
      SUM(CASE WHEN status = 'Completed' THEN 1 ELSE 0 END) AS completedLots,
      SUM(CASE WHEN cutting_date = date('now') THEN 1 ELSE 0 END) AS todaysCutting,
      SUM(CASE WHEN status IN ('Draft', 'Ready') THEN 1 ELSE 0 END) AS pendingCutting,
      SUM(total_meters) AS totalFabricUsed,
      SUM(total_pieces) AS totalPieces
    FROM lots
  `)
  res.json(summary)
}))

app.get('/api/print/:id', wrap(async (req, res) => {
  const data = await loadLot(req.params.id)
  if (!data) return res.status(404).json({ error: 'Lot not found' })

  const doc = new jsPDF({ unit: 'mm', format: 'a4' })
  const pageWidth = doc.internal.pageSize.getWidth()

  doc.setFillColor(240, 245, 250)
  doc.rect(0, 0, pageWidth, 30, 'F')
  doc.setFontSize(20)
  doc.setTextColor(15, 23, 42)
  doc.text('Garment Cutting / Fabric Lot Management', 14, 20)
  doc.setFontSize(10)
  doc.text(`Lot No.: ${data.lotNumber}  |  Supplier: ${data.supplier}  |  Short No.: ${data.shortNumber}`, 14, 28)

  doc.setDrawColor(203, 213, 225)
  doc.line(14, 35, 196, 35)

  let y = 44
  doc.setFontSize(11)
  const rows = [
    ['Date', data.date],
    ['Program Date', data.programDate],
    ['Cutting Date', data.cuttingDate],
    ['Fabric Type', data.fabricType],
    ['Color', data.color],
    ['PANA', data.pana],
    ['MTR', data.totalMeters],
    ['AVERAGE', data.averageConsumption],
    ['PCS', data.totalPieces],
    ['Status', data.status],
    ['Notes', data.notes || ''],
  ]

  rows.forEach(([label, value]) => {
    doc.setFont(undefined, 'bold')
    doc.text(String(label), 14, y)
    doc.setFont(undefined, 'normal')
    doc.text(String(value ?? '-'), 70, y)
    y += 7
  })

  y += 4
  doc.setFont(undefined, 'bold')
  doc.text('Size Breakdown', 14, y)
  y += 8

  doc.setFont(undefined, 'normal')
  let x = 14
  const sizeEntries = Object.entries(data.sizeBreakdown || {})
  for (let i = 0; i < sizeEntries.length; i += 1) {
    const [size, qty] = sizeEntries[i]
    doc.text(`${size} : ${qty || 0}`, x, y)
    x += 22
    if (x > 180) {
      x = 14
      y += 8
    }
  }

  y += 16
  doc.setFont(undefined, 'bold')
  doc.text('Bale / Roll Details', 14, y)
  y += 8

  doc.setFont(undefined, 'normal')
  if (data.bales.length) {
    data.bales.forEach((bale) => {
      doc.text(`${bale.baleNumber || '-'}  |  ${bale.meters || 0} MTR`, 14, y)
      y += 7
    })
  }

  y += 8
  doc.setFont(undefined, 'bold')
  doc.text('Cutting Pattern', 14, y)
  y += 8
  doc.setFont(undefined, 'normal')
  doc.text(`Type: ${data.cutting.patternType || '-'} | Marker Length: ${data.cutting.markerLength || '-'} | Marker Width: ${data.cutting.markerWidth || '-'}`, 14, y)

  doc.setFontSize(9)
  doc.text(data.lotNumber, 160, 255)
  doc.rect(150, 178, 35, 35)

  res.setHeader('Content-Type', 'application/pdf')
  res.setHeader('Content-Disposition', `attachment; filename=${data.lotNumber}.pdf`)
  res.send(Buffer.from(doc.output('arraybuffer')))
}))

// eslint-disable-next-line no-unused-vars
app.use((err, req, res, next) => {
  console.error(err)
  res.status(500).json({ error: err?.message || 'Something went wrong. Please try again.' })
})
