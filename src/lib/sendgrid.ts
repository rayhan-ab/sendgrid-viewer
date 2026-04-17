export interface Template {
  account: string
  subaccount: string
  id: string
  name: string
  htmlContent: string
}

const SENDGRID_BASE = 'https://api.sendgrid.com/v3'

async function sgFetch(path: string, apiKey: string, onBehalfOf?: string) {
  const headers: Record<string, string> = { Authorization: `Bearer ${apiKey}` }
  if (onBehalfOf) headers['On-Behalf-Of'] = onBehalfOf

  const res = await fetch(`${SENDGRID_BASE}${path}`, { headers })
  if (!res.ok) throw new Error(`SendGrid ${path} failed: ${res.status} ${await res.text()}`)
  return res.json()
}

function delay(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms))
}

async function fetchTemplatesForSubaccount(apiKey: string, subaccount: string): Promise<Template[]> {
  const list = await sgFetch('/templates?generations=dynamic&page_size=200', apiKey, subaccount || undefined)
  const templateSummaries: { id: string }[] = list.result ?? []

  const templates: Template[] = []

  for (const { id } of templateSummaries) {
    const detail = await sgFetch(`/templates/${id}`, apiKey, subaccount)
    const activeVersion = detail.versions?.find((v: { active: number }) => v.active === 1)
    templates.push({
      account: '',
      subaccount,
      id,
      name: detail.name ?? '',
      htmlContent: activeVersion?.html_content ?? ''
    })
    await delay(200)
  }

  return templates
}

export async function fetchTemplates(account: { name: string, apiKey: string }): Promise<Template[]> {
  const templates = await fetchTemplatesForSubaccount(account.apiKey, '')
  return templates.map(t => ({ ...t, account: account.name }))
}
