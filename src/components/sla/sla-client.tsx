"use client"
import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Select, SelectTrigger, SelectContent, SelectItem, SelectValue } from "@/components/ui/select"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Plus, Trash2, Loader2, Clock, UserPlus } from "lucide-react"
import { cn } from "@/lib/utils"

type Tab = "sla" | "auto-assign"

const areaLabels: Record<string, string> = { all: "Alle Bereiche", facility: "Facility", helpdesk: "IT-Helpdesk", fleet: "Fuhrpark" }
const areaColors: Record<string, string> = { all: "bg-gray-500/10 text-gray-600", facility: "bg-teal-500/10 text-teal-600", helpdesk: "bg-purple-500/10 text-purple-600", fleet: "bg-blue-500/10 text-blue-600" }

export function SlaClient() {
  const [tab, setTab] = useState<Tab>("sla")
  const [slaRules, setSlaRules] = useState<any[]>([])
  const [assignRules, setAssignRules] = useState<any[]>([])
  const [allUsers, setAllUsers] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  const [showSlaDialog, setShowSlaDialog] = useState(false)
  const [slaForm, setSlaForm] = useState({ name: "", area: "all", match_category: "", match_priority: "", response_hours: "", resolution_hours: "" })

  const [showAssignDialog, setShowAssignDialog] = useState(false)
  const [assignForm, setAssignForm] = useState({ area: "all", category: "", assign_to_user_id: "", priority: "100" })

  async function fetchData() {
    setLoading(true)
    try {
      const [sla, assign, users] = await Promise.all([
        fetch("/api/sla").then(r => r.json()),
        fetch("/api/auto-assign").then(r => r.json()),
        fetch("/api/users?limit=500").then(r => r.json()),
      ])
      setSlaRules(Array.isArray(sla) ? sla : [])
      setAssignRules(Array.isArray(assign) ? assign : [])
      setAllUsers(users.users || [])
    } catch {}
    setLoading(false)
  }

  useEffect(() => { fetchData() }, [])

  async function createSla(e: React.FormEvent) {
    e.preventDefault()
    await fetch("/api/sla", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...slaForm,
        match_category: slaForm.match_category || null,
        match_priority: slaForm.match_priority || null,
        response_hours: slaForm.response_hours ? parseFloat(slaForm.response_hours) : null,
        resolution_hours: slaForm.resolution_hours ? parseFloat(slaForm.resolution_hours) : null,
      }),
    })
    setShowSlaDialog(false)
    setSlaForm({ name: "", area: "all", match_category: "", match_priority: "", response_hours: "", resolution_hours: "" })
    fetchData()
  }

  async function deleteSla(id: number) {
    if (!confirm("SLA-Regel löschen?")) return
    await fetch("/api/sla", { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id }) })
    fetchData()
  }

  async function createAssign(e: React.FormEvent) {
    e.preventDefault()
    await fetch("/api/auto-assign", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...assignForm,
        category: assignForm.category || null,
        assign_to_user_id: parseInt(assignForm.assign_to_user_id),
        priority: parseInt(assignForm.priority) || 100,
      }),
    })
    setShowAssignDialog(false)
    setAssignForm({ area: "all", category: "", assign_to_user_id: "", priority: "100" })
    fetchData()
  }

  async function deleteAssign(id: number) {
    if (!confirm("Zuweisungs-Regel löschen?")) return
    await fetch("/api/auto-assign", { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id }) })
    fetchData()
  }

  if (loading) return <div className="flex justify-center py-16"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>

  return (
    <div className="space-y-5 animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold">SLA & Auto-Zuweisung</h1>
        <p className="text-muted-foreground text-sm mt-0.5">Reaktionszeiten und automatische Ticket-Zuweisung verwalten</p>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 rounded-lg bg-muted p-0.5 w-fit">
        <button onClick={() => setTab("sla")} className={cn("flex items-center gap-1.5 rounded-md px-4 py-2 text-sm font-medium transition-colors", tab === "sla" ? "bg-card shadow-sm" : "text-muted-foreground hover:text-foreground")}>
          <Clock className="h-3.5 w-3.5" /> SLA-Regeln
        </button>
        <button onClick={() => setTab("auto-assign")} className={cn("flex items-center gap-1.5 rounded-md px-4 py-2 text-sm font-medium transition-colors", tab === "auto-assign" ? "bg-card shadow-sm" : "text-muted-foreground hover:text-foreground")}>
          <UserPlus className="h-3.5 w-3.5" /> Auto-Zuweisung
        </button>
      </div>

      {/* SLA Rules */}
      {tab === "sla" && (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-base">SLA-Regeln</CardTitle>
            <Button size="sm" onClick={() => setShowSlaDialog(true)}><Plus className="h-4 w-4" /> Neue Regel</Button>
          </CardHeader>
          <CardContent>
            {slaRules.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-6">Keine SLA-Regeln definiert</p>
            ) : (
              <div className="space-y-2">
                {slaRules.map((r: any) => (
                  <div key={r.id} className="flex items-center justify-between rounded-lg border p-3">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-sm">{r.name}</span>
                        <Badge className={cn("text-[10px]", areaColors[r.area] || areaColors.all)}>{areaLabels[r.area] || r.area}</Badge>
                        {!r.active && <Badge variant="secondary" className="text-[10px]">Inaktiv</Badge>}
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {r.match_category && `Kategorie: ${r.match_category}`}
                        {r.match_category && r.match_priority && " · "}
                        {r.match_priority && `Priorität: ${r.match_priority}`}
                        {!r.match_category && !r.match_priority && "Alle Tickets (Catch-All)"}
                        {" · "}
                        {r.response_hours && `Reaktion: ${r.response_hours}h`}
                        {r.response_hours && r.resolution_hours && " · "}
                        {r.resolution_hours && `Lösung: ${r.resolution_hours}h`}
                      </p>
                    </div>
                    <button onClick={() => deleteSla(r.id)} className="p-1.5 rounded-lg hover:bg-accent"><Trash2 className="h-4 w-4 text-muted-foreground" /></button>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Auto-Assign */}
      {tab === "auto-assign" && (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-base">Auto-Zuweisungs-Regeln</CardTitle>
            <Button size="sm" onClick={() => setShowAssignDialog(true)}><Plus className="h-4 w-4" /> Neue Regel</Button>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-muted-foreground mb-4">Aktivieren unter Einstellungen → <code className="bg-muted px-1 py-0.5 rounded">auto_assign_enabled = true</code></p>
            {assignRules.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-6">Keine Zuweisungs-Regeln definiert</p>
            ) : (
              <div className="space-y-2">
                {assignRules.map((r: any) => (
                  <div key={r.id} className="flex items-center justify-between rounded-lg border p-3">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <Badge className={cn("text-[10px]", areaColors[r.area] || areaColors.all)}>{areaLabels[r.area] || r.area}</Badge>
                        <span className="text-sm">{r.category || "Alle Kategorien"}</span>
                        <span className="text-xs text-muted-foreground">→</span>
                        <span className="font-medium text-sm">{r.user_name || `User #${r.assign_to_user_id}`}</span>
                      </div>
                      <p className="text-xs text-muted-foreground">Priorität: {r.priority}</p>
                    </div>
                    <button onClick={() => deleteAssign(r.id)} className="p-1.5 rounded-lg hover:bg-accent"><Trash2 className="h-4 w-4 text-muted-foreground" /></button>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* SLA Dialog */}
      <Dialog open={showSlaDialog} onOpenChange={setShowSlaDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>Neue SLA-Regel</DialogTitle></DialogHeader>
          <form onSubmit={createSla} className="space-y-3">
            <div className="space-y-1.5"><Label>Name *</Label><Input value={slaForm.name} onChange={e => setSlaForm({ ...slaForm, name: e.target.value })} required placeholder="z.B. Kritisch - 2h Reaktion" /></div>
            <div className="space-y-1.5">
              <Label>Bereich</Label>
              <Select value={slaForm.area} onValueChange={v => setSlaForm({ ...slaForm, area: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Alle Bereiche</SelectItem>
                  <SelectItem value="facility">Facility</SelectItem>
                  <SelectItem value="helpdesk">IT-Helpdesk</SelectItem>
                  <SelectItem value="fleet">Fuhrpark</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5"><Label>Kategorie (optional)</Label><Input value={slaForm.match_category} onChange={e => setSlaForm({ ...slaForm, match_category: e.target.value })} placeholder="z.B. Hardware" /></div>
              <div className="space-y-1.5">
                <Label>Priorität (optional)</Label>
                <Select value={slaForm.match_priority || "any"} onValueChange={v => setSlaForm({ ...slaForm, match_priority: v === "any" ? "" : v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="any">Alle</SelectItem>
                    <SelectItem value="critical">Kritisch</SelectItem>
                    <SelectItem value="high">Hoch</SelectItem>
                    <SelectItem value="medium">Mittel</SelectItem>
                    <SelectItem value="low">Niedrig</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5"><Label>Reaktionszeit (Stunden)</Label><Input type="number" step="0.5" value={slaForm.response_hours} onChange={e => setSlaForm({ ...slaForm, response_hours: e.target.value })} placeholder="z.B. 1" /></div>
              <div className="space-y-1.5"><Label>Lösungszeit (Stunden)</Label><Input type="number" step="0.5" value={slaForm.resolution_hours} onChange={e => setSlaForm({ ...slaForm, resolution_hours: e.target.value })} placeholder="z.B. 8" /></div>
            </div>
            <DialogFooter><Button type="button" variant="outline" onClick={() => setShowSlaDialog(false)}>Abbrechen</Button><Button type="submit">Erstellen</Button></DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Auto-Assign Dialog */}
      <Dialog open={showAssignDialog} onOpenChange={setShowAssignDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>Neue Zuweisungs-Regel</DialogTitle></DialogHeader>
          <form onSubmit={createAssign} className="space-y-3">
            <div className="space-y-1.5">
              <Label>Bereich</Label>
              <Select value={assignForm.area} onValueChange={v => setAssignForm({ ...assignForm, area: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Alle Bereiche</SelectItem>
                  <SelectItem value="facility">Facility</SelectItem>
                  <SelectItem value="helpdesk">IT-Helpdesk</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5"><Label>Kategorie (optional, leer = alle)</Label><Input value={assignForm.category} onChange={e => setAssignForm({ ...assignForm, category: e.target.value })} placeholder="z.B. Hardware" /></div>
            <div className="space-y-1.5">
              <Label>Zuweisen an *</Label>
              <Select value={assignForm.assign_to_user_id} onValueChange={v => setAssignForm({ ...assignForm, assign_to_user_id: v })}>
                <SelectTrigger><SelectValue placeholder="Benutzer wählen" /></SelectTrigger>
                <SelectContent>
                  {allUsers.filter((u: any) => u.active).map((u: any) => <SelectItem key={u.id} value={String(u.id)}>{u.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5"><Label>Priorität (niedriger = höher)</Label><Input type="number" value={assignForm.priority} onChange={e => setAssignForm({ ...assignForm, priority: e.target.value })} /></div>
            <DialogFooter><Button type="button" variant="outline" onClick={() => setShowAssignDialog(false)}>Abbrechen</Button><Button type="submit">Erstellen</Button></DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
