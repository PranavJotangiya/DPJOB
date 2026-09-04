import express from 'express'
import cors from 'cors'
import { jsPDF } from 'jspdf'
import { getDb, ready } from './db.js'
import { pdfLabels, fixIndic, baleCountLabel } from './pdf-i18n.js'

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
  shortName: lot.short_name,
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
        lot_number, lot_date, supplier, short_number, short_name, program_date, cutting_date,
        fabric_type, color, description, pana, total_meters, average_consumption,
        total_pieces, status, notes, created_by
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      args: [
        lotNumber,
        payload.date || new Date().toISOString().slice(0, 10),
        payload.supplier || '',
        payload.shortNumber || '',
        payload.shortName || '',
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

app.put('/api/lots/:id', wrap(async (req, res) => {
  const id = req.params.id
  const payload = req.body || {}
  const existing = await one('SELECT * FROM lots WHERE id = ?', [id])
  if (!existing) return res.status(404).json({ error: 'Lot not found' })

  let lotNumber = (payload.lotNumber || existing.lot_number || '').trim().toUpperCase()
  if (!lotNumber) lotNumber = existing.lot_number
  const clash = await one('SELECT id FROM lots WHERE lot_number = ? AND id != ?', [lotNumber, id])
  if (clash) {
    const base = lotNumber
    let suffix = 2
    // eslint-disable-next-line no-await-in-loop
    while (await one('SELECT id FROM lots WHERE lot_number = ? AND id != ?', [lotNumber, id])) {
      lotNumber = `${base}-${suffix}`
      suffix += 1
    }
  }

  const sizeEntries = Object.entries(payload.sizeBreakdown || {})
  const totalPieces = sizeEntries.reduce((sum, [, qty]) => sum + toNumber(qty, 0), 0)
  const totalMeters = toNumber(payload.totalMeters, 0)
  const average = totalPieces > 0 && totalMeters > 0 ? Number((totalMeters / totalPieces).toFixed(2)) : 0

  const tx = await getDb().transaction('write')
  try {
    await tx.execute({
      sql: `UPDATE lots SET
        lot_number = ?, lot_date = ?, supplier = ?, short_number = ?, short_name = ?, program_date = ?, cutting_date = ?,
        fabric_type = ?, color = ?, description = ?, pana = ?, total_meters = ?, average_consumption = ?,
        total_pieces = ?, status = ?, notes = ?, updated_at = CURRENT_TIMESTAMP
        WHERE id = ?`,
      args: [
        lotNumber,
        payload.date || existing.lot_date || '',
        payload.supplier || '',
        payload.shortNumber || '',
        payload.shortName || '',
        payload.programDate || '',
        payload.cuttingDate || '',
        payload.fabricType || '',
        payload.color || '',
        payload.description || '',
        toNumber(payload.pana, 0),
        totalMeters,
        average,
        totalPieces,
        payload.status || existing.status || 'Draft',
        payload.notes || '',
        id,
      ],
    })

    await tx.execute({ sql: 'DELETE FROM lot_sizes WHERE lot_id = ?', args: [id] })
    await tx.execute({ sql: 'DELETE FROM bales WHERE lot_id = ?', args: [id] })
    await tx.execute({ sql: 'DELETE FROM patterns WHERE lot_id = ?', args: [id] })

    for (const [size, qty] of sizeEntries) {
      await tx.execute({
        sql: 'INSERT INTO lot_sizes (lot_id, size, quantity) VALUES (?, ?, ?)',
        args: [id, toNumber(size, 0), toNumber(qty, 0)],
      })
    }
    for (const bale of payload.bales || []) {
      if (!bale.baleNumber && !Number(bale.meters || 0)) continue
      await tx.execute({
        sql: 'INSERT INTO bales (lot_id, bale_number, meters, weight, shade, remarks) VALUES (?, ?, ?, ?, ?, ?)',
        args: [id, bale.baleNumber || '', toNumber(bale.meters, 0), toNumber(bale.weight, 0), bale.shade || '', bale.remarks || ''],
      })
    }
    if (payload.cutting) {
      await tx.execute({
        sql: `INSERT INTO patterns (lot_id, pattern_type, marker_length, marker_width, lay_length, no_of_layers, no_of_plies)
              VALUES (?, ?, ?, ?, ?, ?, ?)`,
        args: [
          id,
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

  res.json(await loadLot(id))
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

  // Language for the printed labels — English by default; ?lang=hi|gu embeds a
  // Noto font so Devanagari / Gujarati render.
  const lang = ['hi', 'gu'].includes(String(req.query.lang)) ? String(req.query.lang) : 'en'

  const doc = new jsPDF({ unit: 'mm', format: 'a4' })

  let FAM = 'helvetica'
  if (lang === 'hi') {
    const { default: b64 } = await import('./fonts/noto-devanagari.js')
    doc.addFileToVFS('NotoHi.ttf', b64)
    doc.addFont('NotoHi.ttf', 'NotoHi', 'normal')
    FAM = 'NotoHi'
  } else if (lang === 'gu') {
    const { default: b64 } = await import('./fonts/noto-gujarati.js')
    doc.addFileToVFS('NotoGu.ttf', b64)
    doc.addFont('NotoGu.ttf', 'NotoGu', 'normal')
    FAM = 'NotoGu'
  }

  const L = pdfLabels(lang)
  const fx = lang === 'en' ? (s) => s : fixIndic

  const PW = doc.internal.pageSize.getWidth()
  const PH = doc.internal.pageSize.getHeight()
  const M = 14
  const RIGHT = PW - M
  const CW = RIGHT - M

  const INK = [17, 24, 39]
  const MUTED = [107, 114, 128]
  const LINE = [214, 219, 227]
  const BRAND = [47, 91, 234]
  const SOFT = [244, 246, 251]

  const val = (v) => (v === 0 || v ? fx(String(v)) : '—')
  const font = (style = 'normal', size) => {
    // The embedded Noto subsets are regular-only; keep real bold for Latin.
    doc.setFont(FAM, FAM === 'helvetica' ? style : 'normal')
    if (size) doc.setFontSize(size)
  }
  const fill = (c) => doc.setFillColor(c[0], c[1], c[2])
  const stroke = (c) => doc.setDrawColor(c[0], c[1], c[2])
  const ink = (c) => doc.setTextColor(c[0], c[1], c[2])

  // palette extras
  const OKBG = [235, 250, 241]
  const OKFG = [21, 128, 61]
  const WARNBG = [255, 243, 227]
  const WARNFG = [180, 83, 9]
  const ZEBRA = [247, 249, 252]
  const TILE = [[37, 99, 235], [22, 163, 74], [217, 119, 6], [139, 92, 246]]
  const upper = (s) => (lang === 'en' ? String(s).toUpperCase() : String(s))

  // ---- Header ------------------------------------------------------
  fill(INK)
  doc.rect(0, 0, PW, 27, 'F')
  fill(BRAND)
  doc.rect(0, 27, PW, 1.4, 'F')
  fill(BRAND)
  doc.roundedRect(M, 7.5, 11, 11, 2.5, 2.5, 'F')
  font('bold', 8.5)
  ink([255, 255, 255])
  doc.text('DP', M + 5.5, 14.6, { align: 'center' })
  font('bold', 14)
  doc.text('DP CREATION', M + 15, 12.8)
  font('normal', 7.5)
  ink([170, 190, 216])
  doc.text(L('subtitle'), M + 15, 18)

  font('normal', 6.4)
  ink([150, 172, 200])
  doc.text(L('jobCard'), RIGHT, 8, { align: 'right' })
  font('bold', 16)
  ink([255, 255, 255])
  doc.text(data.lotNumber || 'LOT', RIGHT, 15.5, { align: 'right' })
  const statusText = L(`st.${data.status || 'Draft'}`)
  font('bold', 6.8)
  const sw = doc.getTextWidth(statusText) + 9
  fill(BRAND)
  doc.roundedRect(RIGHT - sw, 19, sw, 5.6, 2.8, 2.8, 'F')
  ink([255, 255, 255])
  doc.text(statusText, RIGHT - sw / 2, 22.7, { align: 'center' })

  let y = 36

  const gap = () => { y += 4 }
  const ensure = (need) => {
    if (y + need > PH - 14) { doc.addPage(); y = 20 }
  }

  const sectionHead = (text) => {
    ensure(16)
    const label = upper(text)
    font('bold', 8)
    const w = doc.getTextWidth(label) + 10
    fill(BRAND)
    doc.roundedRect(M, y, w, 6.8, 1.6, 1.6, 'F')
    ink([255, 255, 255])
    doc.text(label, M + 5, y + 4.7)
    stroke(LINE)
    doc.line(M + w + 3, y + 3.4, RIGHT, y + 3.4)
    y += 11
  }

  // ---- Lot + Fabric info cards -----------------------------------
  const infoCard = (x, w, title, pairs) => {
    const rowH = 5.1
    const h = 9 + pairs.length * rowH + 2
    stroke(LINE)
    fill([255, 255, 255])
    doc.roundedRect(x, y, w, h, 2, 2, 'S')
    fill(SOFT)
    doc.roundedRect(x, y, w, 8, 2, 2, 'F')
    doc.rect(x, y + 4, w, 4, 'F')
    stroke(LINE)
    doc.line(x, y + 8, x + w, y + 8)
    font('bold', 7)
    ink(MUTED)
    doc.text(upper(title), x + 4, y + 5.4)
    let ry = y + 14
    pairs.forEach(([k, v]) => {
      font('normal', 8.2)
      ink(MUTED)
      doc.text(String(k), x + 4, ry)
      font('bold', 8.2)
      ink(INK)
      doc.text(doc.splitTextToSize(val(v), w - 36)[0] || '—', x + w - 4, ry, { align: 'right' })
      ry += rowH
    })
    return h
  }
  const colW = (CW - 6) / 2
  const h1 = infoCard(M, colW, L('lotInfo'), [
    [L('date'), data.date],
    [L('programDate'), data.programDate],
    [L('cuttingDate'), data.cuttingDate],
    [L('createdBy'), data.createdBy],
  ])
  const h2 = infoCard(M + colW + 6, colW, L('fabricInfo'), [
    [L('supplier'), data.supplier],
    [`${L('shortNo')} / ${L('shortName')}`, [data.shortNumber, data.shortName].filter(Boolean).join(' — ')],
    [L('fabricType'), data.fabricType],
    [L('color'), data.color],
  ])
  y += Math.max(h1, h2)

  // ---- Metric tiles (colour-coded) -----------------------------
  gap()
  const tiles = [
    ['MTR', data.totalMeters],
    ['PCS', data.totalPieces],
    ['PANA', data.pana],
    ['AVG', data.averageConsumption],
  ]
  const tGap = 4
  const tw = (CW - tGap * 3) / 4
  tiles.forEach(([label, value], i) => {
    const x = M + i * (tw + tGap)
    fill([255, 255, 255])
    stroke(LINE)
    doc.roundedRect(x, y, tw, 15, 2, 2, 'FD')
    fill(TILE[i])
    doc.roundedRect(x, y, tw, 1.6, 1.6, 1.6, 'F')
    doc.rect(x, y + 0.8, tw, 0.8, 'F')
    font('bold', 6.4)
    ink(MUTED)
    doc.text(label, x + 4, y + 6)
    font('bold', 13)
    ink(TILE[i])
    doc.text(val(value), x + 4, y + 12.2)
  })
  y += 15

  // ---- Size breakdown ------------------------------------------
  gap()
  sectionHead(L('sizeBreakdown'))
  const sizePairs = Object.entries(data.sizeBreakdown || {})
    .map(([s, q]) => [s, Number(q) || 0])
    .filter(([, q]) => q > 0)

  if (sizePairs.length) {
    const perRow = 13
    for (let i = 0; i < sizePairs.length; i += perRow) {
      const chunk = sizePairs.slice(i, i + perRow)
      const cw = CW / perRow
      const bw = cw * chunk.length
      ensure(17)
      fill(BRAND)
      doc.rect(M, y, bw, 7, 'F')
      font('bold', 8)
      ink([255, 255, 255])
      chunk.forEach(([s], col) => doc.text(String(s), M + cw * col + cw / 2, y + 4.9, { align: 'center' }))
      stroke(LINE)
      fill([255, 255, 255])
      doc.rect(M, y + 7, bw, 9, 'FD')
      font('bold', 10)
      ink(INK)
      chunk.forEach(([, q], col) => doc.text(String(q), M + cw * col + cw / 2, y + 13, { align: 'center' }))
      stroke(LINE)
      for (let col = 1; col < chunk.length; col += 1) doc.line(M + cw * col, y + 7, M + cw * col, y + 16)
      y += 16
    }
  } else {
    font('normal', 8.5)
    ink(MUTED)
    doc.text(L('noSizes'), M, y + 2)
    y += 6
  }
  fill(INK)
  doc.roundedRect(M, y + 1.5, CW, 8.5, 2, 2, 'F')
  font('bold', 8.5)
  ink([255, 255, 255])
  doc.text(L('totalPieces'), M + 4, y + 7)
  font('bold', 11)
  doc.text(String(data.totalPieces || 0), RIGHT - 4, y + 7.2, { align: 'right' })
  y += 12

  // ---- Bale / Roll table (two entries per line) --------------
  gap()
  sectionHead(L('baleDetails'))
  const bales = data.bales || []
  const baleMeters = bales.reduce((s, b) => s + (Number(b.meters) || 0), 0)
  const halfW = (CW - 6) / 2
  const rowH = 6

  const baleHeader = (x) => {
    fill(SOFT)
    stroke(LINE)
    doc.rect(x, y, halfW, 7, 'FD')
    font('bold', 6.6)
    ink(MUTED)
    doc.text(upper(L('baleNo')), x + 3, y + 4.7)
    doc.text(upper(L('meter')), x + halfW - 3, y + 4.7, { align: 'right' })
  }
  const baleRows = (x, list, startY) => {
    let yy = startY
    font('normal', 8.5)
    list.forEach((b, ri) => {
      if (ri % 2) { fill(ZEBRA); doc.rect(x, yy, halfW, rowH, 'F') }
      ink(INK)
      doc.text(val(b.baleNumber), x + 3, yy + 4.2)
      doc.text(val(b.meters), x + halfW - 3, yy + 4.2, { align: 'right' })
      stroke(LINE)
      doc.line(x, yy + rowH, x + halfW, yy + rowH)
      yy += rowH
    })
    return yy
  }

  if (bales.length) {
    const mid = Math.ceil(bales.length / 2)
    ensure(14 + mid * rowH + 8)
    const yTop = y
    baleHeader(M)
    baleHeader(M + halfW + 6)
    const yL = baleRows(M, bales.slice(0, mid), yTop + 7)
    const yR = baleRows(M + halfW + 6, bales.slice(mid), yTop + 7)
    stroke(LINE)
    doc.rect(M, yTop, halfW, yL - yTop, 'S')
    doc.rect(M + halfW + 6, yTop, halfW, Math.max(yR, yTop + 7) - yTop, 'S')
    y = Math.max(yL, yR) + 3
  } else {
    fill(SOFT)
    stroke(LINE)
    doc.rect(M, y, CW, 7, 'FD')
    font('bold', 7)
    ink(MUTED)
    doc.text(upper(L('baleNo')), M + 3, y + 4.7)
    doc.text(upper(L('meter')), RIGHT - 3, y + 4.7, { align: 'right' })
    y += 7
    font('normal', 8.5)
    ink(MUTED)
    doc.text(L('noBales'), M + 3, y + 5)
    y += 8
  }

  fill([232, 238, 253])
  doc.rect(M, y, CW, 8, 'F')
  stroke(LINE)
  doc.rect(M, y, CW, 8, 'S')
  font('bold', 8.5)
  ink(BRAND)
  doc.text(`${upper(L('total'))}   ·   ${baleCountLabel(lang, bales.length)}`, M + 3, y + 5.4)
  doc.text(String(baleMeters), RIGHT - 3, y + 5.4, { align: 'right' })
  y += 8

  // reconciliation callout
  const diff = baleMeters - (Number(data.totalMeters) || 0)
  if (data.totalMeters) {
    const ok = diff === 0
    y += 2.5
    fill(ok ? OKBG : WARNBG)
    doc.roundedRect(M, y, CW, 9, 2, 2, 'F')
    fill(ok ? OKFG : WARNFG)
    doc.roundedRect(M, y, 1.8, 9, 1.6, 1.6, 'F')
    doc.rect(M, y, 1.4, 9, 'F')
    font('bold', 8)
    ink(ok ? OKFG : WARNFG)
    doc.text(ok ? L('reconOk') : L('reconBad'), M + 5, y + 5.8)
    font('normal', 8)
    ink(INK)
    const detail = ok
      ? `Lot ${data.totalMeters} = Bale ${baleMeters} MTR`
      : `Lot ${data.totalMeters}  /  Bale ${baleMeters}  /  ${diff > 0 ? '+' : ''}${diff} MTR`
    doc.text(detail, RIGHT - 5, y + 5.8, { align: 'right' })
    y += 9
  }

  // ---- Cutting information --------------------------------
  gap()
  sectionHead(L('cuttingInfo'))
  const c = data.cutting || {}
  const cutPairs = [
    [L('pattern'), c.patternType], [L('markerLength'), c.markerLength], [L('markerWidth'), c.markerWidth],
    [L('layLength'), c.layLength], [L('layers'), c.noOfLayers], [L('plies'), c.noOfPlies],
  ]
  const ccw = CW / 3
  const cutH = 8 + 2 * 9
  stroke(LINE)
  fill([255, 255, 255])
  doc.roundedRect(M, y, CW, cutH, 2, 2, 'S')
  cutPairs.forEach(([k, v], i) => {
    const col = i % 3
    const row = Math.floor(i / 3)
    const x = M + col * ccw + 5
    const ry = y + 7.5 + row * 9
    if (col) { stroke(LINE); doc.line(M + col * ccw, y + 3, M + col * ccw, y + cutH - 3) }
    font('normal', 7)
    ink(MUTED)
    doc.text(String(k), x, ry)
    font('bold', 9.5)
    ink(INK)
    doc.text(val(v), x, ry + 4.6)
  })
  y += cutH

  // ---- Notes ---------------------------------------------
  gap()
  sectionHead(L('notes'))
  const noteLines = doc.splitTextToSize(fx(data.notes || '—'), CW - 12)
  const nh = Math.max(13, noteLines.length * 4.7 + 8)
  stroke(LINE)
  fill([255, 255, 255])
  doc.roundedRect(M, y, CW, nh, 2, 2, 'S')
  fill(BRAND)
  doc.roundedRect(M, y, 1.8, nh, 1.6, 1.6, 'F')
  doc.rect(M, y, 1.4, nh, 'F')
  font('normal', 9)
  ink(INK)
  doc.text(noteLines, M + 6, y + 6.5)
  y += nh + 4

  // ---- Footer ------------------------------------------------
  ensure(19)
  const fy = Math.max(y + 3, PH - 22)
  fill(BRAND)
  doc.rect(M, fy, CW, 0.8, 'F')
  font('normal', 7.5)
  ink(MUTED)
  doc.text(`${L('operator')}: ${val(data.createdBy)}`, M, fy + 6)
  doc.text(`${L('generated')}: ${new Date().toISOString().slice(0, 10)}`, M, fy + 10.5)
  stroke(LINE)
  doc.line(M + 64, fy + 12, M + 116, fy + 12)
  doc.text(L('opSignature'), M + 64, fy + 15.5)

  stroke(LINE)
  fill([255, 255, 255])
  doc.roundedRect(RIGHT - 17, fy + 1, 17, 16, 2, 2, 'FD')
  font('bold', 5.2)
  ink(MUTED)
  doc.text(L('scan'), RIGHT - 8.5, fy + 6, { align: 'center' })
  font('bold', 6.6)
  ink(INK)
  doc.text(data.lotNumber || '', RIGHT - 8.5, fy + 11.5, { align: 'center', maxWidth: 15 })

  res.setHeader('Content-Type', 'application/pdf')
  res.setHeader('Content-Disposition', `attachment; filename=${data.lotNumber}.pdf`)
  res.send(Buffer.from(doc.output('arraybuffer')))
}))

// eslint-disable-next-line no-unused-vars
app.use((err, req, res, next) => {
  console.error(err)
  res.status(500).json({ error: err?.message || 'Something went wrong. Please try again.' })
})
