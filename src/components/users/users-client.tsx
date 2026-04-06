"use client"
import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Select, SelectTrigger, SelectContent, SelectItem, SelectValue } from "@/components/ui/select"
import { Plus, Search, Loader2, Pencil, UserX, UserCheck, AlertCircle, LogIn } from "lucide-react"
import { cn } from "@/lib/utils"

interface User {
  id: number
  name: string
  email: string
  role: string
  department_id: number | null
  department_name: string | null
  phone: string | null
  active: number
  created_at: string
}

interface Role { name: string; label: string; color: string; is_builtin: number }
interface Department { id: number; name: string; display_name: string }

const roleColors: Record<string, string> = {
  admin: "bg-red-500/10 text-red-600 dark:text-red-400",
  manager: "bg-blue-500/10 text-blue-600 dark:text-blue-400",
  agent: "bg-purple-500/10 text-purple-600 dark:text-purple-400",
  techniker: "bg-teal-500/10 text-teal-600 dark:text-teal-400",
  hausmeister: "bg-amber-500/10 text-amber-600 dark:text-amber-400",
  redakteur: "bg-indigo-500/10 text-indigo-600 dark:text-indigo-400",
  user: "bg-gray-500/10 text-gray-600 dark:text-gray-400",
}

const emptyForm = { name: "", email: "", password: "", phone: "", role: "user", department_id: "" }

export function UsersClient() {
  const [users, setUsers] = useState<User[]>([])
  const [roles, setRoles] = useState<Role[]>([])
  const [departments, setDepartments] = useState<Department[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState("")
  const [showDialog, setShowDialog] = useState(false)
  const [editId, setEditId] = useState<number | null>(null)
  const [form, setForm] = useState(emptyForm)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState("")
  const [currentUserId, setCurrentUserId] = useState<number | null>(null)
  const [impersonateTarget, setImpersonateTarget] = useState<User | null>(null)
  const [impersonating, setImpersonating] = useState(false)
  const router = useRouter()

  async function fetchUsers() {
    setLoading(true)
    try {
      const res = await fetch(`/api/users?search=${encodeURIComponent(search)}`)
      const data = await res.json()
      setUsers(data.users || [])
    } catch {}
    setLoading(false)
  }

  useEffect(() => { fetchUsers() }, [search])

  useEffect(() => {
    fetch("/api/roles").then(r => r.json()).then(d => setRoles(Array.isArray(d) ? d : [])).catch(() => {})
    fetch("/api/departments").then(r => r.json()).then(d => setDepartments(Array.isArray(d) ? d : [])).catch(() => {})
    fetch("/api/auth/me").then(r => r.json()).then(d => setCurrentUserId(d.id || null)).catch(() => {})
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
      department_id: u.department_id?.toString() || "",
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
      department_id: form.department_id ? parseInt(form.department_id) : null,
      phone: form.phone || null,
    }
    if (form.password) body.password = form.password
    if (!editId && !form.password) { setError("Passwort erforderlich"); setSubmitting(false); return }

    try {
      const res = await fetch(editId ? `/api/users/${editId}` : "/api/users", {
        method: editId ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      })
      const data = await res.json()
      if (!res.ok) { setError(data.error || "Fehler") } else { setShowDialog(false); fetchUsers() }
    } catch { setError("Verbindungsfehler") }
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

  async function doImpersonate() {
    if (!impersonateTarget) return
    setImpersonating(true)
    const res = await fetch(`/api/users/${impersonateTarget.id}/impersonate`, { method: "POST" })
    if (res.ok) {
      router.push("/select")
      router.refresh()
    }
    setImpersonating(false)
    setImpersonateTarget(null)
  }

  function toggleRole(roleName: string) {
    const current = form.role.split(",").map(r => r.trim()).filter(Boolean)
    if (current.includes(roleName)) {
      setForm(f => ({ ...f, role: current.filter(r => r !== roleName).join(",") || "user" }))
    } else {
      setForm(f => ({ ...f, role: [...current, roleName].join(",") }))
    }
  }

  const selectedRoles = form.role.split(",").map(r => r.trim()).filter(Boolean)

  function roleChips(roleStr: string) {
    return roleStr.split(",").map(r => r.trim()).filter(Boolean).map(r => {
      const def = roles.find(rl => rl.name === r)
      return (
        <span key={r} className={cn("inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-medium", roleColors[r] || "bg-gray-500/10 text-gray-600")}>
          {def?.label || r}
        </span>
      )
    })
  }

  return (
    <div className="space-y-5 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Benutzer</h1>
          <p className="text-muted-foreground text-sm mt-0.5">Zentrale Benutzerverwaltung für alle Bereiche</p>
        </div>
        <Button onClick={openNew}><Plus className="h-4 w-4" /> Neuer Benutzer</Button>
      </div>

      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input placeholder="Name oder E-Mail suchen..." className="pl-9" value={search} onChange={e => setSearch(e.target.value)} />
      </div>

      <Card>
        <CardContent className="p-0">
          {loading ? (
            <div className="flex items-center justify-center py-16"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
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
                  <TableHead>Abteilung</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="w-32">Aktionen</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {users.map(u => (
                  <TableRow key={u.id}>
                    <TableCell className="font-medium">{u.name}</TableCell>
                    <TableCell className="text-muted-foreground text-sm">{u.email}</TableCell>
                    <TableCell><div className="flex flex-wrap gap-1">{roleChips(u.role)}</div></TableCell>
                    <TableCell className="text-muted-foreground text-sm">{u.department_name || "–"}</TableCell>
                    <TableCell>
                      <Badge variant={u.active ? "success" : "secondary"}>{u.active ? "Aktiv" : "Inaktiv"}</Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        <button onClick={() => openEdit(u)} className="p-1.5 rounded-lg hover:bg-accent transition-colors" title="Bearbeiten">
                          <Pencil className="h-4 w-4 text-muted-foreground" />
                        </button>
                        <button onClick={() => toggleActive(u)} className="p-1.5 rounded-lg hover:bg-accent transition-colors" title={u.active ? "Deaktivieren" : "Aktivieren"}>
                          {u.active ? <UserX className="h-4 w-4 text-muted-foreground" /> : <UserCheck className="h-4 w-4 text-muted-foreground" />}
                        </button>
                        {u.id !== currentUserId && u.active === 1 && (
                          <button onClick={() => setImpersonateTarget(u)} className="p-1.5 rounded-lg hover:bg-amber-500/10 transition-colors" title="Einloggen als...">
                            <LogIn className="h-4 w-4 text-amber-600" />
                          </button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Create/Edit Dialog */}
      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader><DialogTitle>{editId ? "Benutzer bearbeiten" : "Neuer Benutzer"}</DialogTitle></DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5"><Label>Name *</Label><Input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} required /></div>
              <div className="space-y-1.5"><Label>E-Mail *</Label><Input type="email" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} required /></div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5"><Label>{editId ? "Neues Passwort (optional)" : "Passwort *"}</Label><Input type="password" value={form.password} onChange={e => setForm(f => ({ ...f, password: e.target.value }))} {...(!editId ? { required: true, minLength: 6 } : {})} /></div>
              <div className="space-y-1.5"><Label>Telefon</Label><Input value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} /></div>
            </div>
            <div className="space-y-1.5">
              <Label>Abteilung</Label>
              <Select value={form.department_id || "none"} onValueChange={v => setForm(f => ({ ...f, department_id: v === "none" ? "" : v }))}>
                <SelectTrigger><SelectValue placeholder="Keine Abteilung" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Keine Abteilung</SelectItem>
                  {departments.map(d => <SelectItem key={d.id} value={String(d.id)}>{d.display_name || d.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Rollen</Label>
              <div className="flex flex-wrap gap-2">
                {roles.map(r => (
                  <button key={r.name} type="button" onClick={() => toggleRole(r.name)}
                    className={cn(
                      "inline-flex items-center rounded-full px-3 py-1 text-xs font-medium border transition-all",
                      selectedRoles.includes(r.name)
                        ? cn(roleColors[r.name] || "bg-gray-500/10 text-gray-600", "ring-2 ring-primary/30 border-primary/20")
                        : "bg-muted text-muted-foreground opacity-50 hover:opacity-75 border-transparent"
                    )}
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
                {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : "Speichern"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Impersonation Confirm Dialog */}
      <Dialog open={!!impersonateTarget} onOpenChange={() => setImpersonateTarget(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <LogIn className="h-5 w-5 text-amber-500" /> Als Benutzer einloggen
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <p className="text-sm text-muted-foreground">
              Sie werden als <strong className="text-foreground">{impersonateTarget?.name}</strong> eingeloggt und sehen das Portal aus dessen Perspektive.
            </p>
            <div className="rounded-lg bg-amber-500/10 border border-amber-500/20 p-3 text-sm text-amber-700 dark:text-amber-400">
              Sie können jederzeit über den Banner oben zu Ihrem eigenen Konto zurückkehren.
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setImpersonateTarget(null)}>Abbrechen</Button>
            <Button onClick={doImpersonate} disabled={impersonating} className="bg-amber-600 hover:bg-amber-700">
              {impersonating ? <Loader2 className="h-4 w-4 animate-spin" /> : <><LogIn className="h-4 w-4 mr-1" /> Einloggen als {impersonateTarget?.name?.split(" ")[0]}</>}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
