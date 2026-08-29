import path from 'path'
import { fileURLToPath } from 'url'
import { app } from './app.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const PORT = process.env.PORT || 3001

// Serve the built frontend when running as a single Node service (local prod
// preview, or a host like Render). On Netlify the frontend is served by the CDN
// and this file is not used.
const express = (await import('express')).default
const clientDir = path.join(__dirname, '..', 'dist')
app.use(express.static(clientDir))
app.use((req, res, next) => {
  if (req.method !== 'GET' || req.path.startsWith('/api')) return next()
  res.sendFile(path.join(clientDir, 'index.html'), (err) => {
    if (err) next()
  })
})

app.listen(PORT, () => {
  console.log(`DP Creation running on http://localhost:${PORT}`)
})
