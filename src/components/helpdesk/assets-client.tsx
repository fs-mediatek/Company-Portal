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
import { Plus, Search, Loader2, AlertCircle, Monitor, Smartphone, Tablet, Upload } from "lucide-react"
import Link from "next/link"
import { cn } from "@/lib/utils"

const statusConfig: Record<string, { label: string; variant: any }> = {
  available: { label: "Verfügbar", variant: "success" },
  assigned: { label: "Zugewiesen", variant: "info" },
  maintenance: { label: "Wartung", variant: "warning" },
  retired: { label: "Ausgemustert", variant: "secondary" },
}

const platformTabs = [
  { key: "", label: "Alle", icon: null },
  { key: "windows", label: "Windows", icon: Monitor },
  { key: "ios", label: "iOS", icon: Tablet },
  { key: "android", label: "Android", icon: Smartphone },
]

export function HelpdeskAssetsClient() {
  const [assets, setAssets] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState("")
  const [platform, setPlatform] = useState("")
  const [showCreate, setShowCreate] = useState(false)
  const [form, setForm] = useState({ name: "", type: "", platform: "other", brand: "", model: "", serial_number: "", status: "available" })
  const [saving, setSaving] = useState(false)

  async function fetchAssets() {
    setLoading(true)
    const params = new URLSearchParams()
    if (search) params.set("search", search)
    if (platform) params.set("platform", platform)
    try {
      const res = await fetch(`/api/helpdesk/assets?${params}`)
      const data = await res.json()
      setAssets(Array.isArray(data) ? data : [])
    } catch {}
    setLoading(false)
  }

  useEffect(() => { fetchAssets() }, [search, platform])

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault()
    if (!form.name.trim()) return
    setSaving(true)
    try {
      const res = await fetch("/api/helpdesk/assets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      })
      if (res.ok) {
        setForm({ name: "", type: "", platform: "other", brand: "", model: "", serial_number: "", status: "available" })
        setShowCreate(false)
        fetchAssets()
      }
    } catch {}
    setSaving(false)
  }

  return (
    <div className="space-y-5 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Geräte</h1>
          <p className="text-muted-foreground text-sm mt-0.5">IT-Geräte & Hardware verwalten</p>
        </div>
        <Button onClick={() => setShowCreate(true)} className="bg-purple-600 hover:bg-purple-700">
          <Plus className="h-4 w-4" /> Neues Gerät
        </Button>
      </div>

      {/* Platform tabs + search */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="flex rounded-lg bg-muted p-0.5">
          {platformTabs.map(tab => (
            <button
              key={tab.key}
              onClick={() => setPlatform(tab.key)}
              className={cn(
                "flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition-colors duration-150",
                platform === tab.key
                  ? "bg-card shadow-sm text-purple-600 dark:text-purple-400"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              {tab.icon && <tab.icon className="h-3.5 w-3.5" />}
              {tab.label}
            </button>
          ))}
        </div>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Suchen..." className="pl-9 w-64" value={search} onChange={e => setSearch(e.target.value)} />
        </div>
      </div>

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          {loading ? (
            <div className="flex items-center justify-center py-16"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
          ) : assets.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
              <AlertCircle className="h-8 w-8 mb-2 opacity-40" />
              <p className="text-sm">Keine Geräte gefunden</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Gerät</TableHead>
                  <TableHead>Typ</TableHead>
                  <TableHead>Plattform</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Zugewiesen</TableHead>
                  <TableHead>Seriennummer</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {assets.map(a => {
                  const sc = statusConfig[a.status] || { label: a.status, variant: "secondary" }
                  return (
                    <TableRow key={a.id} className="cursor-pointer" onClick={() => window.location.href = `/helpdesk/assets/${a.id}`}>
                      <TableCell>
                        <Link href={`/helpdesk/assets/${a.id}`} className="block hover:text-purple-500 transition-colors">
                          <span className="font-medium">{a.name}</span>
                          <span className="text-xs text-muted-foreground block">{a.asset_tag}</span>
                        </Link>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">{a.model ? `${a.manufacturer || ""} ${a.model}`.trim() : a.type || "–"}</TableCell>
                      <TableCell className="text-sm text-muted-foreground capitalize">{a.platform}</TableCell>
                      <TableCell><Badge variant={sc.variant}>{sc.label}</Badge></TableCell>
                      <TableCell className="text-sm text-muted-foreground">{a.assigned_to_name || "–"}</TableCell>
                      <TableCell className="text-sm text-muted-foreground font-mono">{a.serial_number || "–"}</TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Create dialog */}
      <Dialog open={showCreate} onOpenChange={setShowCreate}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>Neues Gerät anlegen</DialogTitle></DialogHeader>
          <form onSubmit={handleCreate} className="space-y-4">
            <div className="space-y-1.5">
              <Label>Name *</Label>
              <Input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="z.B. Lenovo ThinkPad X1" required />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Plattform</Label>
                <Select value={form.platform} onValueChange={v => setForm({ ...form, platform: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="windows">Windows</SelectItem>
                    <SelectItem value="ios">iOS</SelectItem>
                    <SelectItem value="android">Android</SelectItem>
                    <SelectItem value="other">Sonstiges</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Typ</Label>
                <Input value={form.type} onChange={e => setForm({ ...form, type: e.target.value })} placeholder="Laptop, Smartphone..." />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Hersteller</Label>
                <Input value={form.brand} onChange={e => setForm({ ...form, brand: e.target.value })} placeholder="Lenovo, Apple..." />
              </div>
              <div className="space-y-1.5">
                <Label>Modell</Label>
                <Input value={form.model} onChange={e => setForm({ ...form, model: e.target.value })} placeholder="ThinkPad X1 Carbon" />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Seriennummer</Label>
              <Input value={form.serial_number} onChange={e => setForm({ ...form, serial_number: e.target.value })} placeholder="SN-..." />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setShowCreate(false)}>Abbrechen</Button>
              <Button type="submit" disabled={saving || !form.name.trim()} className="bg-purple-600 hover:bg-purple-700">
                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : "Anlegen"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
