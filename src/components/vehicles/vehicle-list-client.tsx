"use client"
import { useState, useEffect } from "react"
import Link from "next/link"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Select, SelectTrigger, SelectContent, SelectItem, SelectValue } from "@/components/ui/select"
import { Plus, Search, Loader2, AlertCircle, Truck, ArrowRight } from "lucide-react"

const statusConfig: Record<string, { label: string; variant: any }> = {
  verfuegbar: { label: "Verfügbar", variant: "success" },
  in_nutzung: { label: "In Nutzung", variant: "info" },
  werkstatt: { label: "Werkstatt", variant: "warning" },
  ausgemustert: { label: "Ausgemustert", variant: "secondary" },
}

const typeLabels: Record<string, string> = {
  pkw: "PKW", transporter: "Transporter", lkw: "LKW", anhaenger: "Anhänger", sonstige: "Sonstige",
}

const emptyForm = {
  license_plate: "", make: "", model: "", type: "pkw", year: "", color: "",
  fuel_type: "", mileage: "", status: "verfuegbar",
}

export function VehicleListClient({ userRole }: { userRole: string }) {
  const [vehicles, setVehicles] = useState<any[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState("")
  const [statusFilter, setStatusFilter] = useState("")
  const [showDialog, setShowDialog] = useState(false)
  const [form, setForm] = useState(emptyForm)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState("")

  const isPrivileged = ["admin", "manager"].some(r => userRole.includes(r))

  async function fetchVehicles() {
    setLoading(true)
    const params = new URLSearchParams()
    if (search) params.set("search", search)
    if (statusFilter) params.set("status", statusFilter)
    try {
      const res = await fetch(`/api/vehicles?${params}`)
      const data = await res.json()
      setVehicles(data.vehicles || [])
      setTotal(data.total || 0)
    } catch {}
    setLoading(false)
  }

  useEffect(() => { fetchVehicles() }, [search, statusFilter])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSubmitting(true)
    setError("")
    try {
      const res = await fetch("/api/vehicles", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          year: form.year ? parseInt(form.year) : null,
          mileage: form.mileage ? parseInt(form.mileage) : null,
        }),
      })
      const data = await res.json()
      if (!res.ok) {
        setError(data.error || "Fehler")
      } else {
        setShowDialog(false)
        setForm(emptyForm)
        fetchVehicles()
      }
    } catch {
      setError("Verbindungsfehler")
    }
    setSubmitting(false)
  }

  return (
    <div className="space-y-5 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Fahrzeuge</h1>
          <p className="text-muted-foreground text-sm mt-0.5">Fuhrpark verwalten</p>
        </div>
        {isPrivileged && (
          <Button onClick={() => { setForm(emptyForm); setError(""); setShowDialog(true) }}>
            <Plus className="h-4 w-4" /> Neues Fahrzeug
          </Button>
        )}
      </div>

      {/* Filters */}
      <div className="flex gap-2 flex-wrap">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Kennzeichen, Marke..." className="pl-9 w-64" value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <Select value={statusFilter} onValueChange={v => setStatusFilter(v === "all" ? "" : v)}>
          <SelectTrigger className="w-40"><SelectValue placeholder="Alle Status" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Alle Status</SelectItem>
            {Object.entries(statusConfig).map(([k, v]) => (
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
          ) : vehicles.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
              <AlertCircle className="h-8 w-8 mb-2 opacity-40" />
              <p className="text-sm">Keine Fahrzeuge gefunden</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Kennzeichen</TableHead>
                  <TableHead>Fahrzeug</TableHead>
                  <TableHead>Typ</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Fahrer</TableHead>
                  <TableHead>km-Stand</TableHead>
                  <TableHead className="w-12"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {vehicles.map((v: any) => {
                  const sc = statusConfig[v.status] || { label: v.status, variant: "secondary" }
                  return (
                    <TableRow key={v.id} className="cursor-pointer">
                      <TableCell>
                        <Link href={`/vehicles/${v.id}`} className="font-mono font-medium hover:text-blue-600 dark:hover:text-blue-400 transition-colors">
                          {v.license_plate}
                        </Link>
                      </TableCell>
                      <TableCell className="text-sm">
                        {[v.make, v.model].filter(Boolean).join(" ") || "–"}
                        {v.year ? <span className="text-muted-foreground ml-1">({v.year})</span> : null}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">{typeLabels[v.type] || v.type}</TableCell>
                      <TableCell><Badge variant={sc.variant}>{sc.label}</Badge></TableCell>
                      <TableCell className="text-sm text-muted-foreground">{v.assigned_to_name || "–"}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {v.mileage ? `${v.mileage.toLocaleString("de-DE")} km` : "–"}
                      </TableCell>
                      <TableCell>
                        <Link href={`/vehicles/${v.id}`} className="text-muted-foreground hover:text-foreground">
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
        <DialogContent className="sm:max-w-lg">
          <DialogHeader><DialogTitle>Neues Fahrzeug</DialogTitle></DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Kennzeichen *</Label>
                <Input value={form.license_plate} onChange={e => setForm(f => ({ ...f, license_plate: e.target.value.toUpperCase() }))} placeholder="B-AB 1234" required />
              </div>
              <div className="space-y-1.5">
                <Label>Typ</Label>
                <Select value={form.type} onValueChange={v => setForm(f => ({ ...f, type: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {Object.entries(typeLabels).map(([k, l]) => (
                      <SelectItem key={k} value={k}>{l}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Marke</Label>
                <Input value={form.make} onChange={e => setForm(f => ({ ...f, make: e.target.value }))} placeholder="z.B. VW" />
              </div>
              <div className="space-y-1.5">
                <Label>Modell</Label>
                <Input value={form.model} onChange={e => setForm(f => ({ ...f, model: e.target.value }))} placeholder="z.B. Caddy" />
              </div>
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div className="space-y-1.5">
                <Label>Baujahr</Label>
                <Input value={form.year} onChange={e => setForm(f => ({ ...f, year: e.target.value }))} placeholder="2024" type="number" />
              </div>
              <div className="space-y-1.5">
                <Label>Farbe</Label>
                <Input value={form.color} onChange={e => setForm(f => ({ ...f, color: e.target.value }))} placeholder="Weiß" />
              </div>
              <div className="space-y-1.5">
                <Label>Kraftstoff</Label>
                <Input value={form.fuel_type} onChange={e => setForm(f => ({ ...f, fuel_type: e.target.value }))} placeholder="Diesel" />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>km-Stand</Label>
              <Input value={form.mileage} onChange={e => setForm(f => ({ ...f, mileage: e.target.value }))} placeholder="45000" type="number" />
            </div>
            {error && <p className="text-sm text-destructive bg-destructive/10 px-3 py-2 rounded-lg">{error}</p>}
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setShowDialog(false)}>Abbrechen</Button>
              <Button type="submit" disabled={submitting}>
                {submitting ? <><Loader2 className="h-4 w-4 animate-spin" />Erstellen...</> : "Fahrzeug anlegen"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
