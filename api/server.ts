import type { IncomingMessage, ServerResponse } from 'node:http'
import { fileURLToPath } from 'node:url'
import { join, dirname } from 'node:path'

type ServerEntry = { fetch: (req: Request) => Promise<Response> }

// Use new Function to prevent esbuild from statically bundling the dynamic import.
// At runtime Vercel includes the dist/server/** files via vercel.json includeFiles.
const dynamicImport = new Function('p', 'return import(p)') as (
  path: string,
) => Promise<{ default: ServerEntry }>

let entry: ServerEntry | undefined

async function getEntry(): Promise<ServerEntry> {
  if (!entry) {
    const dir = dirname(fileURLToPath(import.meta.url))
    const serverPath = join(dir, '..', 'dist', 'server', 'index.js')
    const mod = await dynamicImport(serverPath)
    entry = mod.default
  }
  return entry
}

export default async function handler(req: IncomingMessage, res: ServerResponse) {
  const srv = await getEntry()

  const chunks: Buffer[] = []
  for await (const chunk of req) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk))
  }
  const rawBody = Buffer.concat(chunks)

  const proto = (req.headers['x-forwarded-proto'] as string) ?? 'https'
  const host = (req.headers['x-forwarded-host'] as string) ?? req.headers.host ?? 'localhost'
  const url = `${proto}://${host}${req.url}`

  const headers = new Headers()
  for (const [key, val] of Object.entries(req.headers)) {
    if (val == null) continue
    if (Array.isArray(val)) {
      for (const v of val) headers.append(key, v)
    } else {
      headers.set(key, val)
    }
  }

  const method = req.method ?? 'GET'
  const body =
    rawBody.length > 0 && !['GET', 'HEAD'].includes(method) ? rawBody : undefined

  const webReq = new Request(url, { method, headers, body })
  const webRes = await srv.fetch(webReq)

  const outHeaders: Record<string, string> = {}
  webRes.headers.forEach((v, k) => {
    outHeaders[k] = v
  })
  res.writeHead(webRes.status, outHeaders)

  if (webRes.body) {
    const reader = webRes.body.getReader()
    try {
      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        res.write(value)
      }
    } finally {
      reader.releaseLock()
    }
  }

  res.end()
}
