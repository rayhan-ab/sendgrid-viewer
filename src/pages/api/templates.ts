export const prerender = false

import { SENDGRID_ACCOUNTS } from 'astro:env/server'
import { fetchTemplatesStream, type Template } from '../../lib/sendgrid'
import * as cache from '../../lib/cache'

export async function GET({ request }: { request: Request }) {
  const url = new URL(request.url)
  const refresh = url.searchParams.get('refresh') === 'true'
  const accountFilter = url.searchParams.get('account')
  const query = url.searchParams.get('q')?.toLowerCase()

  const accounts: { name: string; apiKey: string }[] = JSON.parse(SENDGRID_ACCOUNTS)

  const encoder = new TextEncoder()

  const stream = new ReadableStream({
    async start(controller) {
      try {
        for (const account of accounts) {
          if (accountFilter && account.name !== accountFilter) continue

          const cacheKey = `account-${account.name}`
          let templates: Template[] | null = null

          if (!refresh) {
            templates = await cache.get<Template[]>(cacheKey)
          }

          if (templates) {
            // Stream from cache
            for (const t of templates) {
              if (matches(t, query)) {
                controller.enqueue(encoder.encode(JSON.stringify(t) + '\n'))
              }
            }
          } else {
            // Stream from API and build cache buffer
            const buffer: Template[] = []
            for await (const t of fetchTemplatesStream(account)) {
              buffer.push(t)
              if (matches(t, query)) {
                controller.enqueue(encoder.encode(JSON.stringify(t) + '\n'))
              }
            }
            await cache.set(cacheKey, buffer)
          }
        }
        controller.close()
      } catch (err) {
        console.error('Streaming error:', err)
        controller.error(err)
      }
    }
  })

  return new Response(stream, {
    headers: {
      'Content-Type': 'application/x-ndjson',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive'
    }
  })
}

function matches(t: Template, query?: string): boolean {
  if (!query) return true
  return (
    t.id.toLowerCase().includes(query) ||
    t.name.toLowerCase().includes(query) ||
    t.htmlContent.toLowerCase().includes(query)
  )
}
