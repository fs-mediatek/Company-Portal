"use client"
import { useState, useEffect } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import {
  Plus, Search, Loader2, AlertCircle, PackageCheck, ArrowRight,
  Trash2, Package,
} from "lucide-react"
import { formatDistanceToNow } from "date-fns"
import { de } from "date-fns/locale"

interface Commission {
  id: number
  commission_number: string
  status: string
  requester_name: string
  assigned_name: string | null
  location_name: string | null
  recipient_name: string | null
  delivery_date: string | null
  item_count: number
  created_at: string
}

interface FormItem {
  article_name: string
  article_number: string
  quantity: number
  unit: string
  unit_price: number
}

const statusMap: Record<string, { label: string; variant: any }> = {
  entwurf: { label: "Entwurf", variant: "secondary" },
  offen: { label: "Offen", variant: "info" },
  in_bearbeitung: { label: "In Bearbeitung", variant: "purple" },
  abgeschlossen: { label: "Abgeschlossen", variant: "success" },
  storniert: { label: "Storniert", variant: "destructive" },
}

const emptyItem: FormItem = { article_name: "", article_number: "", quantity: 1, unit: "Stk.", unit_price: 0 }

export function CommissionListClient({ userRole }: { userRole: string }) {
  const [commissions, setCommissions] = useState<Commission[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState("")
  const [statusFilter, setStatusFilter] = useState("")
  const [showDialog, setShowDialog] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState("")
  const [locations, setLocations] = useState<{ id: number; name: string }[]>([])
  const router = useRouter()

  const [form, setForm] = useState({
    recipient_name: "", recipient_street: "", recipient_zip: "", recipient_city: "",
    recipient_phone: "", location_id: "", delivery_date: "", notes: "",
  })
  const [formItems, setFormItems] = useState<FormItem[]>([{ ...emptyItem }])

  async function fetchData() {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      if (search) params.set("search", search)
      if (statusFilter) params.set("status", statusFilter)
      const res = await fetch(`/api/commissions?${params}`)
      const data = await res.json()
      setCommissions(data.commissions || [])
    } catch {}
    setLoading(false)
  }

  useEffect(() => { fetchData() }, [search, statusFilter])

  useEffect(() => {
    fetch("/api/locations").then(r => r.json()).then(d => setLocations(Array.isArray(d) ? d : [])).catch(() => {})
  }, [])

  function addItem() {
    setFormItems(prev => [...prev, { ...emptyItem }])
  }

  function removeItem(idx: number) {
    setFormItems(prev => prev.filter((_, i) => i !== idx))
  }

  function updateItem(idx: number, field: keyof FormItem, value: any) {
    setFormItems(prev => prev.map((item, i) => i === idx ? { ...item, [field]: value } : item))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSubmitting(true)
    setError("")

    const validItems = formItems.filter(i => i.article_name.trim())
    if (validItems.length === 0) {
      setError("Mindestens eine Position erforderlich")
      setSubmitting(false)
      return
    }

    try {
      const res = await fetch("/api/commissions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          location_id: form.location_id || null,
          items: validItems,
          status: "offen",
        }),
      })
      const data = await res.json()
      if (!res.ok) {
        setError(data.error || "Fehler")
      } else {
        setShowDialog(false)
        router.push(`/commissions/${data.id}`)
      }
    } catch {
      setError("Verbindungsfehler")
    }
    setSubmitting(false)
  }

  function openDialog() {
    setForm({ recipient_name: "", recipient_street: "", recipient_zip: "", recipient_city: "", recipient_phone: "", location_id: "", delivery_date: "", notes: "" })
    setFormItems([{ ...emptyItem }])
    setError("")
    setShowDialog(true)
  }

  return (
    <div className="space-y-5 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Kommissionierung</h1>
          <p className="text-muted-foreground text-sm mt-0.5">Warenkommissionierung und Lieferscheine</p>
        </div>
        <Button onClick={openDialog}>
          <Plus className="h-4 w-4" /> Neuer Auftrag
        </Button>
      </div>

      {/* Filter */}
      <div className="flex gap-2 flex-wrap">
        <div className="relative max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Suchen..." className="pl-9" value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <Select value={statusFilter} onValueChange={v => setStatusFilter(v === "all" ? "" : v)}>
          <SelectTrigger className="w-44">
            <SelectValue placeholder="Alle Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Alle Status</SelectItem>
            {Object.entries(statusMap).map(([k, v]) => (
              <SelectItem key={k} value={k}>{v.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          {loading ? (
            <div className="flex items-center justify-center py-16">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : commissions.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
              <AlertCircle className="h-8 w-8 mb-2 opacity-40" />
              <p className="text-sm">Keine Aufträge gefunden</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nummer</TableHead>
                  <TableHead>Empfänger</TableHead>
                  <TableHead>Positionen</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Lieferdatum</TableHead>
                  <TableHead>Erstellt</TableHead>
                  <TableHead className="w-12"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {commissions.map(c => {
                  const st = statusMap[c.status] || statusMap.entwurf
                  return (
                    <TableRow key={c.id} className="cursor-pointer">
                      <TableCell>
                        <Link href={`/commissions/${c.id}`} className="hover:text-primary transition-colors">
                          <span className="font-mono text-xs text-muted-foreground">{c.commission_number}</span>
                        </Link>
                      </TableCell>
                      <TableCell>
                        <Link href={`/commissions/${c.id}`} className="font-medium hover:text-primary transition-colors">
                          {c.recipient_name || "–"}
                        </Link>
                      </TableCell>
                      <TableCell>
                        <span className="flex items-center gap-1 text-sm text-muted-foreground">
                          <Package className="h-3.5 w-3.5" /> {c.item_count}
                        </span>
                      </TableCell>
                      <TableCell><Badge variant={st.variant}>{st.label}</Badge></TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {c.delivery_date ? new Date(c.delivery_date).toLocaleDateString("de-DE") : "–"}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {formatDistanceToNow(new Date(c.created_at), { locale: de, addSuffix: true })}
                      </TableCell>
                      <TableCell>
                        <Link href={`/commissions/${c.id}`} className="text-muted-foreground hover:text-primary transition-colors">
                          <ArrowRight className="h-4 w-4" />
                        </Link>
                      </TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Create Dialog */}
      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="sm:max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Neuer Kommissionierungsauftrag</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Empfänger */}
            <div className="space-y-3">
              <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Empfänger</h3>
              <div className="grid grid-cols-2 gap-3">
                <div className="col-span-2 space-y-1.5">
                  <Label>Name / Firma *</Label>
                  <Input value={form.recipient_name} onChange={e => setForm(f => ({ ...f, recipient_name: e.target.value }))} required />
                </div>
                <div className="col-span-2 space-y-1.5">
                  <Label>Straße</Label>
                  <Input value={form.recipient_street} onChange={e => setForm(f => ({ ...f, recipient_street: e.target.value }))} />
                </div>
                <div className="space-y-1.5">
                  <Label>PLZ</Label>
                  <Input value={form.recipient_zip} onChange={e => setForm(f => ({ ...f, recipient_zip: e.target.value }))} />
                </div>
                <div className="space-y-1.5">
                  <Label>Stadt</Label>
                  <Input value={form.recipient_city} onChange={e => setForm(f => ({ ...f, recipient_city: e.target.value }))} />
                </div>
                <div className="space-y-1.5">
                  <Label>Telefon</Label>
                  <Input value={form.recipient_phone} onChange={e => setForm(f => ({ ...f, recipient_phone: e.target.value }))} />
                </div>
                <div className="space-y-1.5">
                  <Label>Lieferdatum</Label>
                  <Input type="date" value={form.delivery_date} onChange={e => setForm(f => ({ ...f, delivery_date: e.target.value }))} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label>Quellstandort</Label>
                  <Select value={form.location_id} onValueChange={v => setForm(f => ({ ...f, location_id: v }))}>
                    <SelectTrigger><SelectValue placeholder="– Standort wählen –" /></SelectTrigger>
                    <SelectContent>
                      {locations.map(l => <SelectItem key={l.id} value={String(l.id)}>{l.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="space-y-1.5">
                <Label>Bemerkungen</Label>
                <Textarea value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} rows={2} />
              </div>
            </div>

            {/* Positionen */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Positionen</h3>
                <Button type="button" variant="outline" size="sm" onClick={addItem}>
                  <Plus className="h-3.5 w-3.5" /> Position
                </Button>
              </div>
              <div className="space-y-2">
                {formItems.map((item, idx) => (
                  <div key={idx} className="flex gap-2 items-start p-3 rounded-lg bg-muted/50 border">
                    <div className="flex-1 grid grid-cols-7 gap-2">
                      <div className="col-span-2">
                        <Input placeholder="Artikelname *" value={item.article_name} onChange={e => updateItem(idx, "article_name", e.target.value)} className="text-sm" />
                      </div>
                      <div>
                        <Input placeholder="Art.-Nr." value={item.article_number} onChange={e => updateItem(idx, "article_number", e.target.value)} className="text-sm" />
                      </div>
                      <div>
                        <Input type="number" min="1" placeholder="Menge" value={item.quantity} onChange={e => updateItem(idx, "quantity", parseInt(e.target.value) || 1)} className="text-sm" />
                      </div>
                      <div>
                        <Select value={item.unit} onValueChange={v => updateItem(idx, "unit", v)}>
                          <SelectTrigger className="text-sm"><SelectValue /></SelectTrigger>
                          <SelectContent>
                            {["Stk.", "Pkg.", "Pal.", "Krt.", "m", "kg", "l"].map(u => (
                              <SelectItem key={u} value={u}>{u}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <Input type="number" min="0" step="0.01" placeholder="Preis €" value={item.unit_price || ""} onChange={e => updateItem(idx, "unit_price", parseFloat(e.target.value) || 0)} className="text-sm" />
                      </div>
                      <div className="flex items-center text-xs text-muted-foreground font-medium">
                        {((item.quantity || 0) * (item.unit_price || 0)).toFixed(2)} €
                      </div>
                    </div>
                    {formItems.length > 1 && (
                      <Button type="button" variant="ghost" size="icon" className="shrink-0 text-muted-foreground hover:text-destructive" onClick={() => removeItem(idx)}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {error && <p className="text-sm text-destructive bg-destructive/10 px-3 py-2 rounded-lg">{error}</p>}
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setShowDialog(false)}>Abbrechen</Button>
              <Button type="submit" disabled={submitting}>
                {submitting ? <><Loader2 className="h-4 w-4 animate-spin" />Erstellen...</> : "Auftrag erstellen"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
