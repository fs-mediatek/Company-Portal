"use client"
import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { Select, SelectTrigger, SelectContent, SelectItem, SelectValue } from "@/components/ui/select"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Loader2, Plus, Pencil, Trash2, Save, Building2, Users, Shield, Tag, Hash } from "lucide-react"

type Tab = "company" | "groups" | "roles" | "categories" | "numbering"

export function SettingsClient({ initialSettings }: { initialSettings: Record<string, string> }) {
  const [tab, setTab] = useState<Tab>("company")
  const [settings, setSettings] = useState(initialSettings)
  const [saving, setSaving] = useState(false)
  const [groups, setGroups] = useState<any[]>([])
  const [roles, setRoles] = useState<any[]>([])
  const [categories, setCategories] = useState<any[]>([])

  // Dialogs
  const [showGroupDialog, setShowGroupDialog] = useState(false)
  const [editGroup, setEditGroup] = useState<any>(null)
  const [groupForm, setGroupForm] = useState({ name: "", description: "", parent_id: "", default_roles: "" })

  const [showRoleDialog, setShowRoleDialog] = useState(false)
  const [roleForm, setRoleForm] = useState({ name: "", label: "", color: "" })

  const [showCatDialog, setShowCatDialog] = useState(false)
  const [catForm, setCatForm] = useState({ name: "", icon: "" })

  useEffect(() => {
    fetch("/api/groups").then(r => r.json()).then(d => setGroups(Array.isArray(d) ? d : [])).catch(() => {})
    fetch("/api/roles").then(r => r.json()).then(d => setRoles(Array.isArray(d) ? d : [])).catch(() => {})
    fetch("/api/categories").then(r => r.json()).then(d => setCategories(Array.isArray(d) ? d : [])).catch(() => {})
  }, [])

  async function saveSettings(updates: Record<string, string>) {
    setSaving(true)
    await fetch("/api/settings", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(updates),
    })
    setSettings(s => ({ ...s, ...updates }))
    setSaving(false)
  }

  // Group CRUD
  async function saveGroup(e: React.FormEvent) {
    e.preventDefault()
    const method = editGroup ? "PUT" : "POST"
    const url = editGroup ? `/api/groups/${editGroup.id}` : "/api/groups"
    await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: groupForm.name,
        description: groupForm.description || null,
        parent_id: groupForm.parent_id ? parseInt(groupForm.parent_id) : null,
        default_roles: groupForm.default_roles || null,
      }),
    })
    setShowGroupDialog(false)
    const res = await fetch("/api/groups")
    setGroups(await res.json())
  }

  async function deleteGroup(id: number) {
    if (!confirm("Gruppe wirklich löschen?")) return
    await fetch(`/api/groups/${id}`, { method: "DELETE" })
    const res = await fetch("/api/groups")
    setGroups(await res.json())
  }

  // Role CRUD
  async function saveRole(e: React.FormEvent) {
    e.preventDefault()
    await fetch("/api/roles", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(roleForm),
    })
    setShowRoleDialog(false)
    const res = await fetch("/api/roles")
    setRoles(await res.json())
  }

  async function deleteRole(name: string) {
    if (!confirm("Rolle wirklich löschen?")) return
    await fetch(`/api/roles/${name}`, { method: "DELETE" })
    const res = await fetch("/api/roles")
    setRoles(await res.json())
  }

  // Category CRUD
  async function saveCategory(e: React.FormEvent) {
    e.preventDefault()
    await fetch("/api/categories", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(catForm),
    })
    setShowCatDialog(false)
    const res = await fetch("/api/categories")
    setCategories(await res.json())
  }

  const tabs: { key: Tab; label: string; icon: any }[] = [
    { key: "company", label: "Unternehmen", icon: Building2 },
    { key: "groups", label: "Gruppen", icon: Users },
    { key: "roles", label: "Rollen", icon: Shield },
    { key: "categories", label: "Kategorien", icon: Tag },
    { key: "numbering", label: "Nummerierung", icon: Hash },
  ]

  return (
    <div className="space-y-5 animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold">Einstellungen</h1>
        <p className="text-muted-foreground text-sm mt-0.5">System konfigurieren</p>
      </div>

      <div className="flex gap-6">
        {/* Tab navigation */}
        <nav className="w-48 space-y-0.5 shrink-0">
          {tabs.map(t => {
            const Icon = t.icon
            return (
              <button
                key={t.key}
                onClick={() => setTab(t.key)}
                className={`flex items-center gap-2 w-full rounded-lg px-3 py-2 text-sm transition-colors ${
                  tab === t.key ? "bg-primary/10 text-primary font-medium" : "text-muted-foreground hover:bg-accent"
                }`}
              >
                <Icon className="h-4 w-4" /> {t.label}
              </button>
            )
          })}
        </nav>

        {/* Tab content */}
        <div className="flex-1 min-w-0">
          {/* Company */}
          {tab === "company" && (
            <Card>
              <CardHeader><CardTitle>Unternehmen</CardTitle></CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-1.5 max-w-sm">
                  <Label>Unternehmensname</Label>
                  <Input
                    value={settings.company_name || ""}
                    onChange={e => setSettings(s => ({ ...s, company_name: e.target.value }))}
                  />
                </div>
                <Button onClick={() => saveSettings({ company_name: settings.company_name || "" })} disabled={saving}>
                  {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                  Speichern
                </Button>
              </CardContent>
            </Card>
          )}

          {/* Groups */}
          {tab === "groups" && (
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle>Gruppen</CardTitle>
                <Button size="sm" onClick={() => {
                  setEditGroup(null)
                  setGroupForm({ name: "", description: "", parent_id: "", default_roles: "" })
                  setShowGroupDialog(true)
                }}>
                  <Plus className="h-4 w-4" /> Neue Gruppe
                </Button>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {groups.map((g: any) => (
                    <div key={g.id} className="flex items-center justify-between rounded-lg border p-3">
                      <div>
                        <p className="font-medium text-sm">{g.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {g.parent_name ? `Übergruppe: ${g.parent_name}` : "Hauptgruppe"}
                          {g.default_roles && ` · Rollen: ${g.default_roles}`}
                        </p>
                      </div>
                      <div className="flex gap-1">
                        <button onClick={() => {
                          setEditGroup(g)
                          setGroupForm({ name: g.name, description: g.description || "", parent_id: g.parent_id?.toString() || "", default_roles: g.default_roles || "" })
                          setShowGroupDialog(true)
                        }} className="p-1.5 rounded-lg hover:bg-accent"><Pencil className="h-4 w-4 text-muted-foreground" /></button>
                        <button onClick={() => deleteGroup(g.id)} className="p-1.5 rounded-lg hover:bg-accent"><Trash2 className="h-4 w-4 text-muted-foreground" /></button>
                      </div>
                    </div>
                  ))}
                  {groups.length === 0 && <p className="text-sm text-muted-foreground text-center py-4">Keine Gruppen vorhanden</p>}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Roles */}
          {tab === "roles" && (
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle>Rollen</CardTitle>
                <Button size="sm" onClick={() => {
                  setRoleForm({ name: "", label: "", color: "bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400" })
                  setShowRoleDialog(true)
                }}>
                  <Plus className="h-4 w-4" /> Neue Rolle
                </Button>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {roles.map((r: any) => (
                    <div key={r.name} className="flex items-center justify-between rounded-lg border p-3">
                      <div className="flex items-center gap-3">
                        <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${r.color}`}>{r.label}</span>
                        <span className="text-xs font-mono text-muted-foreground">{r.name}</span>
                        {r.is_builtin ? <Badge variant="secondary" className="text-[10px]">Standard</Badge> : null}
                      </div>
                      {!r.is_builtin && (
                        <button onClick={() => deleteRole(r.name)} className="p-1.5 rounded-lg hover:bg-accent">
                          <Trash2 className="h-4 w-4 text-muted-foreground" />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Categories */}
          {tab === "categories" && (
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle>Störungs-Kategorien</CardTitle>
                <Button size="sm" onClick={() => {
                  setCatForm({ name: "", icon: "" })
                  setShowCatDialog(true)
                }}>
                  <Plus className="h-4 w-4" /> Neue Kategorie
                </Button>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {categories.map((c: any) => (
                    <div key={c.id} className="flex items-center justify-between rounded-lg border p-3">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-sm">{c.name}</span>
                        {c.icon && <span className="text-xs text-muted-foreground">({c.icon})</span>}
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Numbering */}
          {tab === "numbering" && (
            <Card>
              <CardHeader><CardTitle>Ticket-Nummerierung</CardTitle></CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-1.5 max-w-xs">
                  <Label>Prefix</Label>
                  <Input
                    value={settings.ticket_number_prefix || "FM"}
                    onChange={e => setSettings(s => ({ ...s, ticket_number_prefix: e.target.value }))}
                    placeholder="FM"
                  />
                  <p className="text-xs text-muted-foreground">Ergebnis: {settings.ticket_number_prefix || "FM"}-2026-0001</p>
                </div>
                <Button onClick={() => saveSettings({ ticket_number_prefix: settings.ticket_number_prefix || "FM" })} disabled={saving}>
                  {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                  Speichern
                </Button>
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      {/* Group Dialog */}
      <Dialog open={showGroupDialog} onOpenChange={setShowGroupDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader><DialogTitle>{editGroup ? "Gruppe bearbeiten" : "Neue Gruppe"}</DialogTitle></DialogHeader>
          <form onSubmit={saveGroup} className="space-y-4">
            <div className="space-y-1.5">
              <Label>Name</Label>
              <Input value={groupForm.name} onChange={e => setGroupForm(f => ({ ...f, name: e.target.value }))} required />
            </div>
            <div className="space-y-1.5">
              <Label>Beschreibung</Label>
              <Input value={groupForm.description} onChange={e => setGroupForm(f => ({ ...f, description: e.target.value }))} />
            </div>
            <div className="space-y-1.5">
              <Label>Übergruppe</Label>
              <Select value={groupForm.parent_id || "none"} onValueChange={v => setGroupForm(f => ({ ...f, parent_id: v === "none" ? "" : v }))}>
                <SelectTrigger><SelectValue placeholder="Keine" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Keine (Hauptgruppe)</SelectItem>
                  {groups.filter(g => g.id !== editGroup?.id).map(g => (
                    <SelectItem key={g.id} value={g.id.toString()}>{g.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Standard-Rollen (komma-separiert)</Label>
              <Input value={groupForm.default_roles} onChange={e => setGroupForm(f => ({ ...f, default_roles: e.target.value }))} placeholder="z.B. melder,techniker" />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setShowGroupDialog(false)}>Abbrechen</Button>
              <Button type="submit">Speichern</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Role Dialog */}
      <Dialog open={showRoleDialog} onOpenChange={setShowRoleDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader><DialogTitle>Neue Rolle</DialogTitle></DialogHeader>
          <form onSubmit={saveRole} className="space-y-4">
            <div className="space-y-1.5">
              <Label>Schlüssel (englisch, keine Leerzeichen)</Label>
              <Input value={roleForm.name} onChange={e => setRoleForm(f => ({ ...f, name: e.target.value }))} required placeholder="z.B. elektriker" />
            </div>
            <div className="space-y-1.5">
              <Label>Anzeigename</Label>
              <Input value={roleForm.label} onChange={e => setRoleForm(f => ({ ...f, label: e.target.value }))} required placeholder="z.B. Elektriker" />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setShowRoleDialog(false)}>Abbrechen</Button>
              <Button type="submit">Erstellen</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Category Dialog */}
      <Dialog open={showCatDialog} onOpenChange={setShowCatDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader><DialogTitle>Neue Kategorie</DialogTitle></DialogHeader>
          <form onSubmit={saveCategory} className="space-y-4">
            <div className="space-y-1.5">
              <Label>Name</Label>
              <Input value={catForm.name} onChange={e => setCatForm(f => ({ ...f, name: e.target.value }))} required placeholder="z.B. Fenster/Türen" />
            </div>
            <div className="space-y-1.5">
              <Label>Icon (Lucide-Name, optional)</Label>
              <Input value={catForm.icon} onChange={e => setCatForm(f => ({ ...f, icon: e.target.value }))} placeholder="z.B. DoorOpen" />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setShowCatDialog(false)}>Abbrechen</Button>
              <Button type="submit">Erstellen</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
