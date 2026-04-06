"use client"
import { useState, useEffect, useCallback } from "react"
import Link from "next/link"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Select, SelectTrigger, SelectContent, SelectItem, SelectValue } from "@/components/ui/select"
import { Plus, Search, Loader2, AlertCircle, Truck, ArrowRight, AlertTriangle, Building2 } from "lucide-react"
import { cn } from "@/lib/utils"

const statusConfig: Record<string, { label: string; color: string }> = {
  verfuegbar: { label: "Verfügbar", color: "bg-emerald-500/10 text-emerald-600 border-emerald-200" },
  in_nutzung: { label: "In Nutzung", color: "bg-blue-500/10 text-blue-600 border-blue-200" },
  werkstatt: { label: "Werkstatt", color: "bg-amber-500/10 text-amber-600 border-amber-200" },
  ausgemustert: { label: "Ausgemustert", color: "bg-zinc-500/10 text-zinc-500 border-zinc-200" },
}

const typeLabels: Record<string, string> = {
  pkw: "PKW", transporter: "Transporter", lkw: "LKW", anhaenger: "Anhänger", sonstige: "Sonstige",
}

const emptyForm = {
  license_plate: "", make: "", model: "", type: "pkw", year: "",
  color: "", fuel_type: "", ownership_type: "", company: "", status: "verfuegbar",
}

function AlertDots({ v }: { v: any }) {
  const alerts: { label: string; urgent: boolean }[] = []
  if (v.days_to_tuv !== null && v.days_to_tuv <= 60) {
    alerts.push({ label: `HU: ${v.days_to_tuv <= 0 ? "überfällig" : `${v.days_to_tuv}d`}`, urgent: v.days_to_tuv <= 14 })
  }
  if (v.days_to_lease_end !== null && v.days_to_lease_end <= 90) {
    alerts.push({ label: `Leasing: ${v.days_to_lease_end <= 0 ? "abgelaufen" : `${v.days_to_lease_end}d`}`, urgent: v.days_to_lease_end <= 30 })
  }
  if (v.days_to_insurance_end !== null && v.days_to_insurance_end <= 60) {
    alerts.push({ label: `Vers.: ${v.days_to_insurance_end <= 0 ? "abgelaufen" : `${v.days_to_insurance_end}d`}`, urgent: v.days_to_insurance_end <= 14 })
  }
  if (v.ownership_type === "leasing" && v.lease_end_km && v.mileage && v.mileage >= v.lease_end_km * 0.9) {
    alerts.push({ label: "KM-Limit", urgent: v.mileage >= v.lease_end_km })
  }
  if (!alerts.length) return null
  return (
    <div className="flex flex-wrap gap-1">
      {alerts.map((a, i) => (
        <span key={i} className={cn("inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-xs font-medium",
          a.urgent ? "bg-red-100 text-red-700 dark:bg-red-950/40 dark:text-red-400" : "bg-amber-100 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400"
        )}>
          <AlertTriangle className="h-3 w-3" />{a.label}
        </span>
      ))}
    </div>
  )
}

export function VehicleListClient({ userRole }: { userRole: string }) {
  const [vehicles, setVehicles] = useState<any[]>([])
  const [total, setTotal] = useState(0)
  const [companies, setCompanies] = useState<string[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState("")
  const [statusFilter, setStatusFilter] = useState("")
  const [typeFilter, setTypeFilter] = useState("")
  const [companyFilter, setCompanyFilter] = useState("")
  const [alertsOnly, setAlertsOnly] = useState(false)
  const [showDialog, setShowDialog] = useState(false)
  const [form, setForm] = useState(emptyForm)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState("")

  const isPrivileged = ["admin", "manager"].some(r => userRole.includes(r))

  const fetchVehicles = useCallback(async () => {
    setLoading(true)
    const params = new URLSearchParams()
    if (search) params.set("search", search)
    if (statusFilter) params.set("status", statusFilter)
    if (typeFilter) params.set("type", typeFilter)
    if (companyFilter) params.set("company", companyFilter)
    try {
      const res = await fetch(`/api/vehicles?${params}`)
      const data = await res.json()
      setVehicles(data.vehicles || [])
      setTotal(data.total || 0)
      if (data.companies) setCompanies(data.companies)
    } catch {}
    setLoading(false)
  }, [search, statusFilter, typeFilter, companyFilter])

  useEffect(() => { fetchVehicles() }, [fetchVehicles])

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

  function hasAlert(v: any) {
    return (
      (v.days_to_tuv !== null && v.days_to_tuv <= 60) ||
      (v.days_to_lease_end !== null && v.days_to_lease_end <= 90) ||
      (v.days_to_insurance_end !== null && v.days_to_insurance_end <= 60) ||
      (v.ownership_type === "leasing" && v.lease_end_km && v.mileage && v.mileage >= v.lease_end_km * 0.9)
    )
  }

  const alertCount = vehicles.filter(hasAlert).length
  const displayedVehicles = alertsOnly ? vehicles.filter(hasAlert) : vehicles

  return (
    <div className="space-y-5 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Fuhrpark</h1>
          <p className="text-muted-foreground text-sm mt-0.5">
            {alertsOnly ? `${alertCount} von ${total}` : total} Fahrzeuge
            {alertCount > 0 && (
              <button
                onClick={() => setAlertsOnly(v => !v)}
                className={cn(
                  "ml-2 font-medium transition-colors",
                  alertsOnly
                    ? "text-amber-600 underline underline-offset-2"
                    : "text-amber-600 hover:underline hover:underline-offset-2"
                )}
              >
                · {alertCount} mit Handlungsbedarf{alertsOnly ? " ×" : ""}
              </button>
            )}
          </p>
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
          <Input placeholder="Kennzeichen, Marke, Unternehmen..." className="pl-9 w-72" value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <Select value={statusFilter || "all"} onValueChange={v => setStatusFilter(v === "all" ? "" : v)}>
          <SelectTrigger className="w-40"><SelectValue placeholder="Alle Status" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Alle Status</SelectItem>
            {Object.entries(statusConfig).map(([k, v]) => (
              <SelectItem key={k} value={k}>{v.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={typeFilter || "all"} onValueChange={v => setTypeFilter(v === "all" ? "" : v)}>
          <SelectTrigger className="w-36"><SelectValue placeholder="Alle Typen" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Alle Typen</SelectItem>
            {Object.entries(typeLabels).map(([k, l]) => (
              <SelectItem key={k} value={k}>{l}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        {companies.length > 0 && (
          <Select value={companyFilter || "all"} onValueChange={v => setCompanyFilter(v === "all" ? "" : v)}>
            <SelectTrigger className="w-44"><SelectValue placeholder="Alle Unternehmen" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Alle Unternehmen</SelectItem>
              {companies.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
            </SelectContent>
          </Select>
        )}
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
                  <TableHead>Besitz</TableHead>
                  <TableHead>Fahrer</TableHead>
                  <TableHead>km-Stand</TableHead>
                  <TableHead>Fristen</TableHead>
                  <TableHead className="w-12"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {displayedVehicles.map((v: any) => {
                  const sc = statusConfig[v.status] || { label: v.status, color: "bg-zinc-100 text-zinc-600" }
                  return (
                    <TableRow key={v.id}>
                      <TableCell>
                        <div>
                          <Link href={`/vehicles/${v.id}`} className="font-mono font-semibold hover:text-blue-600 dark:hover:text-blue-400 transition-colors">
                            {v.license_plate}
                          </Link>
                          {v.company && (
                            <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                              <Building2 className="h-3 w-3" />{v.company}
                            </p>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="text-sm">
                        {[v.make, v.model].filter(Boolean).join(" ") || "–"}
                        {v.year ? <span className="text-muted-foreground ml-1">({v.year})</span> : null}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">{typeLabels[v.type] || v.type}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className={cn("text-xs", sc.color)}>{sc.label}</Badge>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {v.ownership_type === "leasing" ? (
                          <span className="inline-flex items-center rounded px-1.5 py-0.5 text-xs bg-purple-100 text-purple-700 dark:bg-purple-950/40 dark:text-purple-400">Leasing</span>
                        ) : v.ownership_type === "kauf" ? (
                          <span className="inline-flex items-center rounded px-1.5 py-0.5 text-xs bg-sky-100 text-sky-700 dark:bg-sky-950/40 dark:text-sky-400">Kauf</span>
                        ) : "–"}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">{v.assigned_to_name || "–"}</TableCell>
                      <TableCell className="text-sm text-muted-foreground tabular-nums">
                        {v.mileage ? `${v.mileage.toLocaleString("de-DE")} km` : "–"}
                      </TableCell>
                      <TableCell><AlertDots v={v} /></TableCell>
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
          <DialogHeader><DialogTitle>Neues Fahrzeug anlegen</DialogTitle></DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4 px-6 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Kennzeichen *</Label>
                <Input value={form.license_plate} onChange={e => setForm(f => ({ ...f, license_plate: e.target.value.toUpperCase() }))} placeholder="B-AB 1234" required />
              </div>
              <div className="space-y-2">
                <Label>Fahrzeugart</Label>
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
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Marke</Label>
                <Input value={form.make} onChange={e => setForm(f => ({ ...f, make: e.target.value }))} placeholder="z.B. VW" />
              </div>
              <div className="space-y-2">
                <Label>Modell</Label>
                <Input value={form.model} onChange={e => setForm(f => ({ ...f, model: e.target.value }))} placeholder="z.B. Caddy" />
              </div>
            </div>
            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label>Baujahr</Label>
                <Input value={form.year} onChange={e => setForm(f => ({ ...f, year: e.target.value }))} placeholder="2024" type="number" />
              </div>
              <div className="space-y-2">
                <Label>Farbe</Label>
                <Input value={form.color} onChange={e => setForm(f => ({ ...f, color: e.target.value }))} placeholder="Weiß" />
              </div>
              <div className="space-y-2">
                <Label>Motor</Label>
                <Select value={form.fuel_type || "none"} onValueChange={v => setForm(f => ({ ...f, fuel_type: v === "none" ? "" : v }))}>
                  <SelectTrigger><SelectValue placeholder="–" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">–</SelectItem>
                    <SelectItem value="Verbrenner">Verbrenner</SelectItem>
                    <SelectItem value="Elektro">Elektro</SelectItem>
                    <SelectItem value="Hybrid">Hybrid</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Besitzart</Label>
                <Select value={form.ownership_type || "none"} onValueChange={v => setForm(f => ({ ...f, ownership_type: v === "none" ? "" : v }))}>
                  <SelectTrigger><SelectValue placeholder="–" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">–</SelectItem>
                    <SelectItem value="leasing">Leasing</SelectItem>
                    <SelectItem value="kauf">Kauf</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Unternehmen</Label>
                <Input value={form.company} onChange={e => setForm(f => ({ ...f, company: e.target.value }))} placeholder="z.B. ÜAG gGmbH" />
              </div>
            </div>
            {error && <p className="text-sm text-destructive bg-destructive/10 px-3 py-2 rounded-lg">{error}</p>}
            <div className="flex justify-end gap-3 pt-2">
              <Button type="button" variant="outline" onClick={() => setShowDialog(false)}>Abbrechen</Button>
              <Button type="submit" disabled={submitting}>
                {submitting ? <><Loader2 className="h-4 w-4 animate-spin mr-1" />Anlegen...</> : "Fahrzeug anlegen"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
