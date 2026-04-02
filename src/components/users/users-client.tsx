"use client"
import { useState, useEffect } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Select, SelectTrigger, SelectContent, SelectItem, SelectValue } from "@/components/ui/select"
import { Plus, Search, Loader2, Pencil, UserX, UserCheck, AlertCircle } from "lucide-react"

interface User {
  id: number
  name: string
  email: string
  role: string
  group_id: number | null
  group_name: string | null
  phone: string | null
  active: number
  created_at: string
}

interface Role {
  name: string
  label: string
  color: string
}

interface Group {
  id: number
  name: string
}

const emptyForm = { name: "", email: "", password: "", phone: "", role: "melder", group_id: "" }

export function UsersClient() {
  const [users, setUsers] = useState<User[]>([])
  const [roles, setRoles] = useState<Role[]>([])
  const [groups, setGroups] = useState<Group[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState("")
  const [showDialog, setShowDialog] = useState(false)
  const [editId, setEditId] = useState<number | null>(null)
  const [form, setForm] = useState(emptyForm)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState("")

  async function fetchUsers() {
    setLoading(true)
    try {
      const res = await fetch(`/api/users?search=${encodeURIComponent(search)}`)
      const data = await res.json()
      setUsers(data.users || [])
    } catch { }
    setLoading(false)
  }

  useEffect(() => { fetchUsers() }, [search])

  useEffect(() => {
    fetch("/api/roles").then(r => r.json()).then(setRoles).catch(() => {})
    fetch("/api/groups").then(r => r.json()).then(setGroups).catch(() => {})
  }, [])

  function openNew() {
    setEditId(null)
    setForm(emptyForm)
    setError("")
    setShowDialog(true)
  }

  function openEdit(u: User) {
    setEditId(u.id)
    setForm({
      name: u.name,
      email: u.email,
      password: "",
      phone: u.phone || "",
      role: u.role,
      group_id: u.group_id?.toString() || "",
    })
    setError("")
    setShowDialog(true)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSubmitting(true)
    setError("")

    const body: any = {
      name: form.name,
      email: form.email,
      role: form.role,
      group_id: form.group_id ? parseInt(form.group_id) : null,
      phone: form.phone || null,
    }

    if (form.password) body.password = form.password
    if (!editId && !form.password) {
      setError("Passwort erforderlich")
      setSubmitting(false)
      return
    }

    try {
      const res = await fetch(editId ? `/api/users/${editId}` : "/api/users", {
        method: editId ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      })
      const data = await res.json()
      if (!res.ok) {
        setError(data.error || "Fehler")
      } else {
        setShowDialog(false)
        fetchUsers()
      }
    } catch {
      setError("Verbindungsfehler")
    }
    setSubmitting(false)
  }

  async function toggleActive(u: User) {
    await fetch(`/api/users/${u.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ active: !u.active }),
    })
    fetchUsers()
  }

  function roleChips(roleStr: string) {
    return roleStr.split(",").map(r => r.trim()).filter(Boolean).map(r => {
      const def = roles.find(rl => rl.name === r)
      return (
        <span key={r} className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${def?.color || "bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400"}`}>
          {def?.label || r}
        </span>
      )
    })
  }

  // Role toggle for form
  function toggleRole(roleName: string) {
    const current = form.role.split(",").map(r => r.trim()).filter(Boolean)
    if (current.includes(roleName)) {
      setForm(f => ({ ...f, role: current.filter(r => r !== roleName).join(",") || "melder" }))
    } else {
      setForm(f => ({ ...f, role: [...current, roleName].join(",") }))
    }
  }

  const selectedRoles = form.role.split(",").map(r => r.trim()).filter(Boolean)

  return (
    <div className="space-y-5 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Benutzer</h1>
          <p className="text-muted-foreground text-sm mt-0.5">Benutzer verwalten und Rollen zuweisen</p>
        </div>
        <Button onClick={openNew}>
          <Plus className="h-4 w-4" /> Neuer Benutzer
        </Button>
      </div>

      {/* Search */}
      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Suchen..."
          className="pl-9"
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
      </div>

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          {loading ? (
            <div className="flex items-center justify-center py-16">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : users.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
              <AlertCircle className="h-8 w-8 mb-2 opacity-40" />
              <p className="text-sm">Keine Benutzer gefunden</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>E-Mail</TableHead>
                  <TableHead>Rollen</TableHead>
                  <TableHead>Gruppe</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="w-24">Aktionen</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {users.map(u => (
                  <TableRow key={u.id}>
                    <TableCell className="font-medium">{u.name}</TableCell>
                    <TableCell className="text-muted-foreground">{u.email}</TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-1">{roleChips(u.role)}</div>
                    </TableCell>
                    <TableCell className="text-muted-foreground">{u.group_name || "–"}</TableCell>
                    <TableCell>
                      <Badge variant={u.active ? "success" : "secondary"}>
                        {u.active ? "Aktiv" : "Inaktiv"}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        <button onClick={() => openEdit(u)} className="p-1.5 rounded-lg hover:bg-accent transition-colors" title="Bearbeiten">
                          <Pencil className="h-4 w-4 text-muted-foreground" />
                        </button>
                        <button onClick={() => toggleActive(u)} className="p-1.5 rounded-lg hover:bg-accent transition-colors" title={u.active ? "Deaktivieren" : "Aktivieren"}>
                          {u.active ? <UserX className="h-4 w-4 text-muted-foreground" /> : <UserCheck className="h-4 w-4 text-muted-foreground" />}
                        </button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Dialog */}
      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{editId ? "Benutzer bearbeiten" : "Neuer Benutzer"}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Name</Label>
                <Input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} required />
              </div>
              <div className="space-y-1.5">
                <Label>E-Mail</Label>
                <Input type="email" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} required />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>{editId ? "Neues Passwort (optional)" : "Passwort"}</Label>
                <Input type="password" value={form.password} onChange={e => setForm(f => ({ ...f, password: e.target.value }))} {...(!editId ? { required: true, minLength: 6 } : {})} />
              </div>
              <div className="space-y-1.5">
                <Label>Telefon</Label>
                <Input value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Gruppe</Label>
              <Select value={form.group_id} onValueChange={v => setForm(f => ({ ...f, group_id: v === "none" ? "" : v }))}>
                <SelectTrigger><SelectValue placeholder="Keine Gruppe" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Keine Gruppe</SelectItem>
                  {groups.map(g => (
                    <SelectItem key={g.id} value={g.id.toString()}>{g.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Rollen</Label>
              <div className="flex flex-wrap gap-2">
                {roles.map(r => (
                  <button
                    key={r.name}
                    type="button"
                    onClick={() => toggleRole(r.name)}
                    className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-medium border transition-all ${
                      selectedRoles.includes(r.name)
                        ? r.color + " ring-2 ring-primary/30"
                        : "bg-muted text-muted-foreground opacity-50 hover:opacity-75"
                    }`}
                  >
                    {r.label}
                  </button>
                ))}
              </div>
            </div>
            {error && <p className="text-sm text-destructive bg-destructive/10 px-3 py-2 rounded-lg">{error}</p>}
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setShowDialog(false)}>Abbrechen</Button>
              <Button type="submit" disabled={submitting}>
                {submitting ? <><Loader2 className="h-4 w-4 animate-spin" />Speichern...</> : "Speichern"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
