"use client"
import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Textarea } from "@/components/ui/textarea"
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Plus, Search, Loader2, AlertCircle, Phone, CreditCard, Sim, Trash2, Pencil, History } from "lucide-react"
import { cn } from "@/lib/utils"
import { formatDistanceToNow } from "date-fns"
import { de } from "date-fns/locale"

type Tab = "contracts" | "sims"

const statusColors: Record<string, string> = {
  "Aktiv": "bg-emerald-500/10 text-emerald-600",
  "Gekündigt": "bg-red-500/10 text-red-600",
  "Gesperrt": "bg-amber-500/10 text-amber-600",
  "blank": "bg-gray-500/10 text-gray-600",
  "sent": "bg-blue-500/10 text-blue-600",
  "activated": "bg-emerald-500/10 text-emerald-600",
}
const simStatusLabels: Record<string, string> = { blank: "Leer", sent: "Versendet", activated: "Aktiviert" }

const emptyContract = { phone_number: "", base_price: "", total_gross: "", cost_center_1: "", active_user: "", device_id: "", pin: "", puk: "", comment: "", status: "Aktiv" }

export function MobileContractsClient() {
  const [tab, setTab] = useState<Tab>("contracts")
  const [contracts, setContracts] = useState<any[]>([])
  const [stats, setStats] = useState<any>({})
  const [sims, setSims] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState("")

  // Contract dialog
  const [showContract, setShowContract] = useState(false)
  const [editContract, setEditContract] = useState<any>(null)
  const [contractForm, setContractForm] = useState(emptyContract)
  const [saving, setSaving] = useState(false)

  // History dialog
  const [showHistory, setShowHistory] = useState(false)
  const [historyData, setHistoryData] = useState<any[]>([])
  const [historyPhone, setHistoryPhone] = useState("")

  // SIM dialog
  const [showSim, setShowSim] = useState(false)
  const [simForm, setSimForm] = useState({ sim_number: "", provider: "", contact_name: "", contact_email: "" })

  async function fetchContracts() {
    setLoading(true)
    const params = new URLSearchParams()
    if (search) params.set("search", search)
    try {
      const res = await fetch(`/api/helpdesk/mobile-contracts?${params}`)
      const data = await res.json()
      setContracts(data.data || [])
      setStats(data.stats || {})
    } catch {}
    setLoading(false)
  }

  async function fetchSims() {
    try { setSims(await (await fetch(`/api/helpdesk/sim-cards?search=${search}`)).json()) } catch {}
  }

  useEffect(() => {
    if (tab === "contracts") fetchContracts()
    else fetchSims()
  }, [search, tab])

  async function saveContract(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    const body = { ...contractForm, base_price: parseFloat(contractForm.base_price) || 0, total_gross: parseFloat(contractForm.total_gross) || 0 }
    if (editContract) {
      await fetch(`/api/helpdesk/mobile-contracts/${editContract.id}`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) })
    } else {
      await fetch("/api/helpdesk/mobile-contracts", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) })
    }
    setSaving(false)
    setShowContract(false)
    setEditContract(null)
    setContractForm(emptyContract)
    fetchContracts()
  }

  async function deleteContract(id: number) {
    if (!confirm("Vertrag wirklich löschen?")) return
    await fetch(`/api/helpdesk/mobile-contracts/${id}`, { method: "DELETE" })
    fetchContracts()
  }

  async function viewHistory(contract: any) {
    const res = await fetch(`/api/helpdesk/mobile-contracts/${contract.id}`)
    const data = await res.json()
    setHistoryData(data.history || [])
    setHistoryPhone(contract.phone_number)
    setShowHistory(true)
  }

  async function saveSim(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    await fetch("/api/helpdesk/sim-cards", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(simForm) })
    setSaving(false)
    setShowSim(false)
    setSimForm({ sim_number: "", provider: "", contact_name: "", contact_email: "" })
    fetchSims()
  }

  async function updateSimStatus(id: number, status: string) {
    await fetch("/api/helpdesk/sim-cards", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id, status }) })
    fetchSims()
  }

  async function deleteSim(id: number) {
    if (!confirm("SIM-Karte löschen?")) return
    await fetch("/api/helpdesk/sim-cards", { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id }) })
    fetchSims()
  }

  return (
    <div className="space-y-5 animate-fade-in">
      <div className="flex items-center justify-between">
        <div><h1 className="text-2xl font-bold">Mobilfunkverträge</h1><p className="text-muted-foreground text-sm mt-0.5">Verträge, SIM-Karten & Kosten</p></div>
        <Button onClick={() => tab === "contracts" ? (setEditContract(null), setContractForm(emptyContract), setShowContract(true)) : (setSimForm({ sim_number: "", provider: "", contact_name: "", contact_email: "" }), setShowSim(true))} className="bg-purple-600 hover:bg-purple-700">
          <Plus className="h-4 w-4" /> {tab === "contracts" ? "Neuer Vertrag" : "Neue SIM"}
        </Button>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="flex rounded-lg bg-muted p-0.5">
          <button onClick={() => setTab("contracts")} className={cn("flex items-center gap-1.5 rounded-md px-4 py-2 text-sm font-medium transition-colors", tab === "contracts" ? "bg-card shadow-sm text-purple-600" : "text-muted-foreground")}><Phone className="h-3.5 w-3.5" /> Verträge</button>
          <button onClick={() => setTab("sims")} className={cn("flex items-center gap-1.5 rounded-md px-4 py-2 text-sm font-medium transition-colors", tab === "sims" ? "bg-card shadow-sm text-purple-600" : "text-muted-foreground")}><CreditCard className="h-3.5 w-3.5" /> SIM-Karten</button>
        </div>
        <div className="relative"><Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" /><Input placeholder="Suchen..." className="pl-9 w-64" value={search} onChange={e => setSearch(e.target.value)} /></div>
      </div>

      {/* Stats (contracts only) */}
      {tab === "contracts" && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <Card><CardContent className="p-4"><p className="text-xs text-muted-foreground">Gesamt</p><p className="text-2xl font-bold">{stats.total || 0}</p></CardContent></Card>
          <Card><CardContent className="p-4"><p className="text-xs text-muted-foreground">Aktiv</p><p className="text-2xl font-bold text-emerald-600">{stats.active || 0}</p></CardContent></Card>
          <Card><CardContent className="p-4"><p className="text-xs text-muted-foreground">Gekündigt</p><p className="text-2xl font-bold text-red-600">{stats.cancelled || 0}</p></CardContent></Card>
          <Card><CardContent className="p-4"><p className="text-xs text-muted-foreground">Monatlich brutto</p><p className="text-2xl font-bold tabular-nums">{(stats.monthly_gross || 0).toFixed(2)} €</p></CardContent></Card>
        </div>
      )}

      {/* Contracts Table */}
      {tab === "contracts" && (
        <Card><CardContent className="p-0">
          {loading ? <div className="flex justify-center py-16"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
          : contracts.length === 0 ? <div className="flex flex-col items-center justify-center py-16 text-muted-foreground"><AlertCircle className="h-8 w-8 mb-2 opacity-40" /><p className="text-sm">Keine Verträge</p></div>
          : <Table>
              <TableHeader><TableRow><TableHead>Rufnummer</TableHead><TableHead>Nutzer</TableHead><TableHead>KST</TableHead><TableHead>Brutto</TableHead><TableHead>Status</TableHead><TableHead className="w-28">Aktionen</TableHead></TableRow></TableHeader>
              <TableBody>
                {contracts.map((c: any) => (
                  <TableRow key={c.id}>
                    <TableCell className="font-mono font-medium">{c.phone_number}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">{c.active_user || "–"}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">{c.cost_center_1 || "–"}</TableCell>
                    <TableCell className="text-sm tabular-nums">{(c.total_gross || 0).toFixed(2)} €</TableCell>
                    <TableCell><span className={cn("inline-flex items-center rounded-full px-2 py-0.5 text-xs font-semibold", statusColors[c.status] || "bg-gray-500/10 text-gray-600")}>{c.status}</span></TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        <button onClick={() => { setEditContract(c); setContractForm({ phone_number: c.phone_number, base_price: String(c.base_price || ""), total_gross: String(c.total_gross || ""), cost_center_1: c.cost_center_1 || "", active_user: c.active_user || "", device_id: c.device_id || "", pin: c.pin || "", puk: c.puk || "", comment: c.comment || "", status: c.status || "Aktiv" }); setShowContract(true) }} className="p-1.5 rounded-lg hover:bg-accent"><Pencil className="h-3.5 w-3.5 text-muted-foreground" /></button>
                        <button onClick={() => viewHistory(c)} className="p-1.5 rounded-lg hover:bg-accent"><History className="h-3.5 w-3.5 text-muted-foreground" /></button>
                        <button onClick={() => deleteContract(c.id)} className="p-1.5 rounded-lg hover:bg-accent"><Trash2 className="h-3.5 w-3.5 text-muted-foreground" /></button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>}
        </CardContent></Card>
      )}

      {/* SIM Cards Table */}
      {tab === "sims" && (
        <Card><CardContent className="p-0">
          {!Array.isArray(sims) || sims.length === 0 ? <div className="flex flex-col items-center justify-center py-16 text-muted-foreground"><AlertCircle className="h-8 w-8 mb-2 opacity-40" /><p className="text-sm">Keine SIM-Karten</p></div>
          : <Table>
              <TableHeader><TableRow><TableHead>SIM-Nummer</TableHead><TableHead>Anbieter</TableHead><TableHead>Kontakt</TableHead><TableHead>Status</TableHead><TableHead>Erstellt</TableHead><TableHead className="w-20">Aktionen</TableHead></TableRow></TableHeader>
              <TableBody>
                {sims.map((s: any) => (
                  <TableRow key={s.id}>
                    <TableCell className="font-mono font-medium text-sm">{s.sim_number}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">{s.provider || "–"}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">{s.contact_name || "–"}</TableCell>
                    <TableCell>
                      <select value={s.status} onChange={e => updateSimStatus(s.id, e.target.value)} className="h-7 rounded border border-input bg-background px-2 text-xs">
                        <option value="blank">Leer</option><option value="sent">Versendet</option><option value="activated">Aktiviert</option>
                      </select>
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">{formatDistanceToNow(new Date(s.created_at), { locale: de, addSuffix: true })}</TableCell>
                    <TableCell><button onClick={() => deleteSim(s.id)} className="p-1.5 rounded-lg hover:bg-accent"><Trash2 className="h-3.5 w-3.5 text-muted-foreground" /></button></TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>}
        </CardContent></Card>
      )}

      {/* Contract Dialog */}
      <Dialog open={showContract} onOpenChange={setShowContract}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>{editContract ? "Vertrag bearbeiten" : "Neuer Vertrag"}</DialogTitle></DialogHeader>
          <form onSubmit={saveContract} className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5"><Label>Rufnummer *</Label><Input value={contractForm.phone_number} onChange={e => setContractForm({ ...contractForm, phone_number: e.target.value })} required disabled={!!editContract} /></div>
              <div className="space-y-1.5"><Label>Status</Label><select value={contractForm.status} onChange={e => setContractForm({ ...contractForm, status: e.target.value })} className="flex h-10 w-full rounded-lg border border-input bg-background px-3 text-sm"><option value="Aktiv">Aktiv</option><option value="Gekündigt">Gekündigt</option><option value="Gesperrt">Gesperrt</option></select></div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5"><Label>Aktiver Nutzer</Label><Input value={contractForm.active_user} onChange={e => setContractForm({ ...contractForm, active_user: e.target.value })} /></div>
              <div className="space-y-1.5"><Label>Geräte-ID</Label><Input value={contractForm.device_id} onChange={e => setContractForm({ ...contractForm, device_id: e.target.value })} /></div>
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div className="space-y-1.5"><Label>Basispreis (€)</Label><Input type="number" step="0.01" value={contractForm.base_price} onChange={e => setContractForm({ ...contractForm, base_price: e.target.value })} /></div>
              <div className="space-y-1.5"><Label>Brutto (€)</Label><Input type="number" step="0.01" value={contractForm.total_gross} onChange={e => setContractForm({ ...contractForm, total_gross: e.target.value })} /></div>
              <div className="space-y-1.5"><Label>Kostenstelle</Label><Input value={contractForm.cost_center_1} onChange={e => setContractForm({ ...contractForm, cost_center_1: e.target.value })} /></div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5"><Label>PIN</Label><Input value={contractForm.pin} onChange={e => setContractForm({ ...contractForm, pin: e.target.value })} /></div>
              <div className="space-y-1.5"><Label>PUK</Label><Input value={contractForm.puk} onChange={e => setContractForm({ ...contractForm, puk: e.target.value })} /></div>
            </div>
            <div className="space-y-1.5"><Label>Kommentar</Label><Textarea value={contractForm.comment} onChange={e => setContractForm({ ...contractForm, comment: e.target.value })} rows={2} /></div>
            <DialogFooter><Button type="button" variant="outline" onClick={() => setShowContract(false)}>Abbrechen</Button><Button type="submit" disabled={saving} className="bg-purple-600 hover:bg-purple-700">{saving ? <Loader2 className="h-4 w-4 animate-spin" /> : "Speichern"}</Button></DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* History Dialog */}
      <Dialog open={showHistory} onOpenChange={setShowHistory}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>Änderungshistorie — {historyPhone}</DialogTitle></DialogHeader>
          {historyData.length === 0 ? <p className="text-sm text-muted-foreground text-center py-4">Keine Änderungen</p>
          : <div className="max-h-80 overflow-y-auto space-y-2">
              {historyData.map((h: any) => (
                <div key={h.id} className="rounded-lg border p-2.5 text-sm">
                  <div className="flex items-center justify-between">
                    <span className="font-medium">{h.field_name}</span>
                    <span className="text-xs text-muted-foreground">{formatDistanceToNow(new Date(h.changed_at), { locale: de, addSuffix: true })}</span>
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5"><span className="line-through">{h.old_value || "–"}</span> → <span className="text-foreground">{h.new_value || "–"}</span></p>
                </div>
              ))}
            </div>}
        </DialogContent>
      </Dialog>

      {/* SIM Dialog */}
      <Dialog open={showSim} onOpenChange={setShowSim}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>Neue SIM-Karte</DialogTitle></DialogHeader>
          <form onSubmit={saveSim} className="space-y-3">
            <div className="space-y-1.5"><Label>SIM-Nummer *</Label><Input value={simForm.sim_number} onChange={e => setSimForm({ ...simForm, sim_number: e.target.value })} required placeholder="z.B. 8949..." /></div>
            <div className="space-y-1.5"><Label>Anbieter</Label><Input value={simForm.provider} onChange={e => setSimForm({ ...simForm, provider: e.target.value })} placeholder="z.B. Vodafone" /></div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5"><Label>Kontakt</Label><Input value={simForm.contact_name} onChange={e => setSimForm({ ...simForm, contact_name: e.target.value })} /></div>
              <div className="space-y-1.5"><Label>E-Mail</Label><Input type="email" value={simForm.contact_email} onChange={e => setSimForm({ ...simForm, contact_email: e.target.value })} /></div>
            </div>
            <DialogFooter><Button type="button" variant="outline" onClick={() => setShowSim(false)}>Abbrechen</Button><Button type="submit" disabled={saving} className="bg-purple-600 hover:bg-purple-700">{saving ? <Loader2 className="h-4 w-4 animate-spin" /> : "Erstellen"}</Button></DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
