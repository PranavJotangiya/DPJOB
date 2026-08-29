import serverless from 'serverless-http'
import { app } from '../../server/app.js'

const wrapped = serverless(app, {
  binary: ['application/pdf', 'application/octet-stream'],
})

export async function handler(event, context) {
  // Netlify may deliver the path with the function prefix; Express expects /api/*.
  if (event.path) {
    event.path = event.path.replace(/^\/\.netlify\/functions\/api/, '/api')
    if (!event.path.startsWith('/api')) {
      event.path = `/api${event.path === '/' ? '' : event.path}`
    }
  }
  return wrapped(event, context)
}
