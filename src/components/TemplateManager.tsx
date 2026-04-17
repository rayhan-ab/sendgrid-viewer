import Handlebars from 'handlebars'
import { Search, Copy, ExternalLink, RefreshCw, X, Check, Code, Eye, Sparkles } from 'lucide-react'
import React, { useState, useEffect, useCallback, useMemo } from 'react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Textarea } from '@/components/ui/textarea'
import { cn } from '@/lib/utils'

// Register SendGrid-specific helpers as passthroughs
const sgHelpers = ['insert', 'default', 'formatDate', 'formatNumber']
for (const name of sgHelpers) {
  Handlebars.registerHelper(name, (...args: unknown[]) => {
    // Return the first argument as-is (the value being inserted)
    return args.length > 1 ? String(args[0] ?? '') : ''
  })
}


interface Template {
  account: string
  subaccount: string
  id: string
  name: string
  htmlContent: string
}

export function TemplateManager() {
  const [templates, setTemplates] = useState<Template[]>([])
  const [loading, setLoading] = useState(false)
  const [query, setQuery] = useState('')
  const [selectedTemplate, setSelectedTemplate] = useState<Template | null>(null)
  const [stats, setStats] = useState({ loaded: 0 })
  const [copiedId, setCopiedId] = useState<string | null>(null)

  // Test Data State
  const [testData, setTestData] = useState<string>('{}')
  const [jsonError, setJsonError] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState('preview')

  // Load persistence
  useEffect(() => {
    if (selectedTemplate) {
      const key = `test-data-${selectedTemplate.account}-${selectedTemplate.id}`
      const saved = localStorage.getItem(key)
      setTestData(saved || '{}')
      setJsonError(null)
      setActiveTab('preview')
    }
  }, [selectedTemplate])

  // Save persistence
  useEffect(() => {
    if (selectedTemplate && !jsonError) {
      const key = `test-data-${selectedTemplate.account}-${selectedTemplate.id}`
      localStorage.setItem(key, testData)
    }
  }, [testData, selectedTemplate, jsonError])

  const fetchTemplates = useCallback(async (searchQuery: string, forceRefresh = false) => {
    setLoading(true)
    setTemplates([])
    setStats({ loaded: 0 })

    try {
      const url = new URL('/api/templates', window.location.origin)
      if (searchQuery) url.searchParams.set('q', searchQuery)
      if (forceRefresh) url.searchParams.set('refresh', 'true')

      const response = await fetch(url)
      if (!response.body) return

      const reader = response.body.getReader()
      const decoder = new TextDecoder()
      let buffer = ''

      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        buffer += decoder.decode(value, { stream: true })
        const lines = buffer.split('\n')
        buffer = lines.pop() || ''

        for (const line of lines) {
          if (!line.trim()) continue
          try {
            const template = JSON.parse(line) as Template
            setTemplates(prev => [...prev, template])
            setStats(prev => ({ loaded: prev.loaded + 1 }))
          } catch (e) {
            console.error('Failed to parse line:', line, e)
          }
        }
      }
    } catch (err) {
      console.error('Fetch error:', err)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchTemplates(query)
    }, 300)
    return () => clearTimeout(timer)
  }, [query, fetchTemplates])

  const copyToClipboard = (id: string, e: React.MouseEvent) => {
    e.stopPropagation()
    navigator.clipboard.writeText(id)
    setCopiedId(id)
    setTimeout(() => setCopiedId(null), 2000)
  }

  const handleJsonChange = (val: string) => {
    setTestData(val)
    try {
      if (val.trim()) JSON.parse(val)
      setJsonError(null)
    } catch (e) {
      setJsonError(e instanceof Error ? e.message : 'Invalid JSON')
    }
  }

  const generateSampleData = () => {
    if (!selectedTemplate) return
    const regex = /\{\{([^{}]+)\}\}/g
    const matches = selectedTemplate.htmlContent.matchAll(regex)
    const data: Record<string, string> = {}

    for (const match of matches) {
      const key = match[1].trim()
      if (!key.startsWith('/') && !key.startsWith('#') && !key.startsWith('^') && !key.startsWith('>')) {
        data[key] = `[${key}]`
      }
    }

    setTestData(JSON.stringify(data, null, 2))
    setJsonError(null)
  }

  const renderedHtml = useMemo(() => {
    if (!selectedTemplate) return ''

    let data: Record<string, string> = {}
    try {
      data = JSON.parse(testData)
    } catch {
      return selectedTemplate.htmlContent
    }

    // First try Handlebars for full syntax support
    try {
      const template = Handlebars.compile(selectedTemplate.htmlContent)
      return template(data)
    } catch {
      // Fallback: simple regex replacement for {{variable}} patterns
      // This handles SendGrid-specific syntax that isn't valid Handlebars
      return selectedTemplate.htmlContent.replace(
        /\{\{\s*([^#/^>!{}\s][^{}]*?)\s*\}\}/g,
        (match, key) => {
          const trimmed = key.trim()
          // Skip block helper keywords
          if (trimmed.startsWith('else')) return match
          return trimmed in data ? String(data[trimmed]) : match
        }
      )
    }
  }, [selectedTemplate, testData])

  return (
    <div className="flex flex-col min-h-screen bg-background pb-10">
      {/* Header */}
      <header className="sticky top-0 z-30 border-b bg-background/80 backdrop-blur-md px-6 py-4">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">SendGrid Templates</h1>
            <p className="text-sm text-muted-foreground">
              {loading ? `Streaming templates... (${stats.loaded} loaded)` : `${stats.loaded} templates found`}
            </p>
          </div>

          <div className="flex items-center gap-3">
            <div className="relative w-full md:w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Search name, ID, or content..."
                className="pl-9 bg-secondary/30 border-none rounded-full h-10 w-full focus-visible:ring-primary"
                value={query}
                onChange={e => setQuery(e.target.value)}
              />
            </div>
            <Button
              variant="outline"
              size="icon"
              onClick={() => fetchTemplates(query, true)}
              disabled={loading}
              className="rounded-full shadow-sm shrink-0 h-10 w-10"
              title="Refresh Cache"
            >
              <RefreshCw className={cn('w-4 h-4', loading && 'animate-spin')} />
            </Button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 max-w-7xl mx-auto w-full p-6">
        <div className="bg-card border rounded-xl shadow-sm overflow-hidden">
          <Table>
            <TableHeader className="bg-muted/30">
              <TableRow>
                <TableHead className="px-6 h-12">Template Name</TableHead>
                <TableHead className="px-6 h-12">Account</TableHead>
                <TableHead className="px-6 h-12">Template ID</TableHead>
                <TableHead className="px-6 h-12 text-right">Preview</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {templates.map(t => (
                <TableRow
                  key={`${t.account}-${t.id}`}
                  onClick={() => setSelectedTemplate(t)}
                  className="group cursor-pointer hover:bg-muted/30"
                >
                  <TableCell className="px-6 py-4">
                    <div className="font-semibold text-foreground group-hover:text-primary transition-colors">{t.name}</div>
                    {t.subaccount && <div className="text-[10px] text-muted-foreground mt-0.5">On behalf of: {t.subaccount}</div>}
                  </TableCell>
                  <TableCell className="px-6 py-4">
                    <Badge variant="secondary" className="font-medium bg-secondary text-secondary-foreground border">
                      {t.account}
                    </Badge>
                  </TableCell>
                  <TableCell className="px-6 py-4">
                    <div className="flex items-center gap-2 font-mono text-xs text-muted-foreground group/id">
                      {t.id}
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={e => copyToClipboard(t.id, e)}
                        className="h-6 w-6 rounded hover:bg-secondary text-transparent group-hover/id:text-muted-foreground transition-all"
                      >
                        {copiedId === t.id ? <Check className="w-3 h-3 text-green-500" /> : <Copy className="w-3 h-3" />}
                      </Button>
                    </div>
                  </TableCell>
                  <TableCell className="px-6 py-4 text-right">
                    <ExternalLink className="w-4 h-4 ml-auto text-muted-foreground group-hover:text-primary opacity-0 group-hover:opacity-100 transition-all" />
                  </TableCell>
                </TableRow>
              ))}
              {loading && templates.length === 0 && (
                <TableRow>
                  <TableCell colSpan={4} className="h-64 text-center">
                    <RefreshCw className="w-8 h-8 animate-spin mx-auto mb-3 opacity-20" />
                    <p className="text-muted-foreground text-sm">Searching templates...</p>
                  </TableCell>
                </TableRow>
              )}
              {!loading && templates.length === 0 && (
                <TableRow>
                  <TableCell colSpan={4} className="h-64 text-center text-muted-foreground italic">
                    No templates found matching your criteria.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </main>

      {/* Slide-over Preview (Sheet) */}
      <Sheet open={!!selectedTemplate} onOpenChange={open => !open && setSelectedTemplate(null)}>
        <SheetContent side="right" className="w-full max-w-[50vw] p-0 flex flex-col gap-0 border-l shadow-2xl">
          {selectedTemplate && (
            <>
              <SheetHeader className="p-6 border-b shrink-0 text-left">
                <div className="flex justify-between items-start">
                  <div>
                    <SheetTitle className="text-xl font-bold">{selectedTemplate.name}</SheetTitle>
                    <SheetDescription className="font-mono text-xs text-muted-foreground mt-1">{selectedTemplate.id}</SheetDescription>
                  </div>
                </div>

                <Tabs value={activeTab} onValueChange={setActiveTab} className="mt-6">
                  <TabsList className="grid w-full grid-cols-2 h-10">
                    <TabsTrigger value="preview" className="flex items-center gap-2">
                      <Eye className="w-4 h-4" />
                      Preview
                    </TabsTrigger>
                    <TabsTrigger value="data" className="flex items-center gap-2">
                      <Code className="w-4 h-4" />
                      Test Data
                    </TabsTrigger>
                  </TabsList>
                </Tabs>
              </SheetHeader>

              <div className="flex-1 overflow-hidden relative">
                <Tabs value={activeTab} className="h-full">
                  <TabsContent value="preview" className="h-full m-0 border-none outline-none">
                    <div className="w-full h-full bg-white">
                      <iframe 
                        key={`${selectedTemplate.id}-${renderedHtml.length}`} 
                        srcDoc={renderedHtml} 
                        title="Preview" 
                        className="w-full h-full border-none" 
                      />
                    </div>
                  </TabsContent>
                  <TabsContent value="data" className="h-full m-0 p-6 flex flex-col gap-4 outline-none overflow-auto bg-muted/20">
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="text-sm font-semibold">JSON Parameters</h3>
                        <p className="text-xs text-muted-foreground mt-0.5">Custom variables for Handlebars</p>
                      </div>
                      <Button variant="secondary" size="sm" onClick={generateSampleData} className="gap-2 text-xs h-8">
                        <Sparkles className="w-3.5 h-3.5 text-orange-500" />
                        Generate Sample
                      </Button>
                    </div>

                    <div className="flex-1 flex flex-col min-h-0">
                      <Textarea
                        value={testData}
                        onChange={e => handleJsonChange(e.target.value)}
                        placeholder='{ "key": "value" }'
                        className={cn(
                          'flex-1 font-mono text-sm p-4 resize-none min-h-[300px] border-2',
                          jsonError ? 'border-destructive focus-visible:ring-destructive' : 'border-muted'
                        )}
                      />
                      {jsonError && (
                        <p className="text-xs text-destructive mt-2 font-medium flex items-center gap-1">
                          <X className="w-3 h-3" />
                          {jsonError}
                        </p>
                      )}
                    </div>

                    <div className="bg-primary/5 border rounded-lg p-4 text-xs text-muted-foreground">
                      <strong>Tip:</strong> You can use standard Handlebars syntax in your templates. Changes saved automatically to your
                      browser.
                    </div>
                  </TabsContent>
                </Tabs>
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>
    </div>
  )
}
