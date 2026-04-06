"use client"
import { useState, useEffect } from "react"
import Link from "next/link"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table"
import { Select, SelectTrigger, SelectContent, SelectItem, SelectValue } from "@/components/ui/select"
import { Plus, Search, Loader2, AlertCircle, ChevronLeft, ChevronRight } from "lucide-react"
import { formatDistanceToNow } from "date-fns"
import { de } from "date-fns/locale"
import { HelpdeskTicketCreateDialog } from "./ticket-create-dialog"

const statusConfig: Record<string, { label: string; variant: any }> = {
  open: { label: "Offen", variant: "info" },
  pending: { label: "Wartend", variant: "warning" },
  in_progress: { label: "In Bearbeitung", variant: "purple" },
  resolved: { label: "Gelöst", variant: "success" },
  closed: { label: "Geschlossen", variant: "secondary" },
}

const priorityConfig: Record<string, { label: string; variant: any }> = {
  low: { label: "Niedrig", variant: "secondary" },
  medium: { label: "Mittel", variant: "default" },
  high: { label: "Hoch", variant: "warning" },
  critical: { label: "Kritisch", variant: "destructive" },
}

export function HelpdeskTicketListClient() {
  const [tickets, setTickets] = useState<any[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState("")
  const [statusFilter, setStatusFilter] = useState("")
  const [priorityFilter, setPriorityFilter] = useState("")
  const [showCreate, setShowCreate] = useState(false)
  const limit = 25

  async function fetchTickets() {
    setLoading(true)
    const params = new URLSearchParams({ page: String(page), limit: String(limit) })
    if (search) params.set("search", search)
    if (statusFilter) params.set("status", statusFilter)
    if (priorityFilter) params.set("priority", priorityFilter)
    try {
      const res = await fetch(`/api/helpdesk/tickets?${params}`)
      const data = await res.json()
      setTickets(data.tickets || [])
      setTotal(data.total || 0)
    } catch {}
    setLoading(false)
  }

  useEffect(() => { fetchTickets() }, [page, search, statusFilter, priorityFilter])
  const totalPages = Math.ceil(total / limit)

  return (
    <div className="space-y-5 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">IT-Tickets</h1>
          <p className="text-muted-foreground text-sm mt-0.5">Support-Anfragen erstellen und verfolgen</p>
        </div>
        <Button onClick={() => setShowCreate(true)} className="bg-purple-600 hover:bg-purple-700">
          <Plus className="h-4 w-4" /> Neues Ticket
        </Button>
      </div>

      <div className="flex gap-2 flex-wrap">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Suchen..." className="pl-9 w-64" value={search} onChange={e => { setSearch(e.target.value); setPage(1) }} />
        </div>
        <Select value={statusFilter} onValueChange={v => { setStatusFilter(v === "all" ? "" : v); setPage(1) }}>
          <SelectTrigger className="w-44"><SelectValue placeholder="Alle Status" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Alle Status</SelectItem>
            {Object.entries(statusConfig).map(([k, v]) => (
              <SelectItem key={k} value={k}>{v.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={priorityFilter} onValueChange={v => { setPriorityFilter(v === "all" ? "" : v); setPage(1) }}>
          <SelectTrigger className="w-40"><SelectValue placeholder="Alle Prioritäten" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Alle Prioritäten</SelectItem>
            {Object.entries(priorityConfig).map(([k, v]) => (
              <SelectItem key={k} value={k}>{v.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <Card>
        <CardContent className="p-0">
          {loading ? (
            <div className="flex items-center justify-center py-16">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : tickets.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
              <AlertCircle className="h-8 w-8 mb-2 opacity-40" />
              <p className="text-sm">Keine Tickets gefunden</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Ticket</TableHead>
                  <TableHead>Kategorie</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Priorität</TableHead>
                  <TableHead>Ersteller</TableHead>
                  <TableHead>Zugewiesen</TableHead>
                  <TableHead>Erstellt</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {tickets.map((t: any) => {
                  const sc = statusConfig[t.status] || { label: t.status, variant: "secondary" }
                  const pc = priorityConfig[t.priority] || { label: t.priority, variant: "secondary" }
                  return (
                    <TableRow key={t.id} className="cursor-pointer">
                      <TableCell>
                        <Link href={`/helpdesk/tickets/${t.id}`} className="block hover:text-purple-500 transition-colors">
                          <span className="text-xs font-mono text-muted-foreground block">{t.ticket_number}</span>
                          <span className="font-medium">{t.title}</span>
                        </Link>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">{t.category}</TableCell>
                      <TableCell><Badge variant={sc.variant}>{sc.label}</Badge></TableCell>
                      <TableCell><Badge variant={pc.variant}>{pc.label}</Badge></TableCell>
                      <TableCell className="text-sm text-muted-foreground">{t.requester_name}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">{t.assignee_name || "–"}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {formatDistanceToNow(new Date(t.created_at), { locale: de, addSuffix: true })}
                      </TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">{total} Tickets gesamt</p>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <span className="text-sm">Seite {page} von {totalPages}</span>
            <Button variant="outline" size="sm" onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page >= totalPages}>
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}

      <HelpdeskTicketCreateDialog open={showCreate} onOpenChange={setShowCreate} onCreated={fetchTickets} />
    </div>
  )
}
