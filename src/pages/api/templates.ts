export const prerender = false

import { SENDGRID_ACCOUNTS } from 'astro:env/server'
import { fetchTemplates } from '../../lib/sendgrid'

export async function GET() {
  try {
    const accounts: { name: string; apiKey: string }[] = JSON.parse(SENDGRID_ACCOUNTS)
    const results = await Promise.all(accounts.map(fetchTemplates))
    return Response.json({ templates: results.flat() })
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    return Response.json({ error: message }, { status: 502 })
  }
}
