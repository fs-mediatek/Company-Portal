"use client"
import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { Select, SelectTrigger, SelectContent, SelectItem, SelectValue } from "@/components/ui/select"
import { ArrowLeft, Loader2, Save, Truck, Gauge, Calendar, Shield, Fuel, User, MapPin, Palette } from "lucide-react"
import { format } from "date-fns"
import { de } from "date-fns/locale"

const statusConfig: Record<string, { label: string; variant: any }> = {
  verfuegbar: { label: "Verfügbar", variant: "success" },
  in_nutzung: { label: "In Nutzung", variant: "info" },
  werkstatt: { label: "Werkstatt", variant: "warning" },
  ausgemustert: { label: "Ausgemustert", variant: "secondary" },
}

const typeLabels: Record<string, string> = {
  pkw: "PKW", transporter: "Transporter", lkw: "LKW", anhaenger: "Anhänger", sonstige: "Sonstige",
}

interface Props {
  vehicleId: string
  userRole: string
}

export function VehicleDetailClient({ vehicleId, userRole }: Props) {
  const [vehicle, setVehicle] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [editing, setEditing] = useState(false)
  const [form, setForm] = useState<any>({})
  const [saving, setSaving] = useState(false)
  const [users, setUsers] = useState<any[]>([])
  const [locations, setLocations] = useState<any[]>([])
  const router = useRouter()

  const isPrivileged = ["admin", "manager"].some(r => userRole.includes(r))

  async function fetchVehicle() {
    try {
      const res = await fetch(`/api/vehicles/${vehicleId}`)
      if (!res.ok) { router.push("/vehicles"); return }
      const data = await res.json()
      setVehicle(data)
      setForm(data)
    } catch {}
    setLoading(false)
  }

  useEffect(() => {
    fetchVehicle()
    fetch("/api/users?limit=200").then(r => r.json()).then(d => setUsers(d.users || [])).catch(() => {})
    fetch("/api/locations").then(r => r.json()).then(d => setLocations(Array.isArray(d) ? d : [])).catch(() => {})
  }, [vehicleId])

  async function handleSave() {
    setSaving(true)
    await fetch(`/api/vehicles/${vehicleId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        license_plate: form.license_plate,
        make: form.make, model: form.model, type: form.type,
        year: form.year ? parseInt(form.year) : null,
        color: form.color, vin: form.vin,
        status: form.status,
        assigned_to_user_id: form.assigned_to_user_id || null,
        location_id: form.location_id || null,
        mileage: form.mileage ? parseInt(form.mileage) : null,
        fuel_type: form.fuel_type,
        next_inspection: form.next_inspection || null,
        next_tuv: form.next_tuv || null,
        insurance_until: form.insurance_until || null,
        notes: form.notes,
      }),
    })
    setSaving(false)
    setEditing(false)
    fetchVehicle()
  }

  if (loading) return <div className="flex items-center justify-center py-16"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
  if (!vehicle) return null

  const sc = statusConfig[vehicle.status] || { label: vehicle.status, variant: "secondary" }
  const title = [vehicle.make, vehicle.model].filter(Boolean).join(" ") || vehicle.license_plate

  function formatDate(d: string | null) {
    if (!d) return "–"
    try { return format(new Date(d), "dd.MM.yyyy", { locale: de }) } catch { return "–" }
  }

  return (
    <div className="space-y-5 animate-fade-in max-w-5xl">
      <div>
        <Button variant="ghost" size="sm" onClick={() => router.push("/vehicles")} className="mb-3">
          <ArrowLeft className="h-4 w-4" /> Zurück
        </Button>
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400">
              <Truck className="h-5 w-5" />
            </div>
            <div>
              <h1 className="text-2xl font-bold">{title}</h1>
              <p className="text-muted-foreground text-sm font-mono mt-0.5">{vehicle.license_plate}</p>
            </div>
          </div>
          <div className="flex gap-2">
            <Badge variant={sc.variant}>{sc.label}</Badge>
            {isPrivileged && !editing && (
              <Button variant="outline" size="sm" onClick={() => setEditing(true)}>Bearbeiten</Button>
            )}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Main */}
        <div className="lg:col-span-2 space-y-5">
          {/* Vehicle info */}
          <Card>
            <CardHeader className="pb-3"><CardTitle className="text-base">Fahrzeugdaten</CardTitle></CardHeader>
            <CardContent>
              {editing ? (
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1.5"><Label>Kennzeichen</Label><Input value={form.license_plate || ""} onChange={e => setForm((f: any) => ({ ...f, license_plate: e.target.value.toUpperCase() }))} /></div>
                    <div className="space-y-1.5"><Label>Typ</Label>
                      <Select value={form.type || "pkw"} onValueChange={v => setForm((f: any) => ({ ...f, type: v }))}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>{Object.entries(typeLabels).map(([k, l]) => <SelectItem key={k} value={k}>{l}</SelectItem>)}</SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div className="grid grid-cols-3 gap-3">
                    <div className="space-y-1.5"><Label>Marke</Label><Input value={form.make || ""} onChange={e => setForm((f: any) => ({ ...f, make: e.target.value }))} /></div>
                    <div className="space-y-1.5"><Label>Modell</Label><Input value={form.model || ""} onChange={e => setForm((f: any) => ({ ...f, model: e.target.value }))} /></div>
                    <div className="space-y-1.5"><Label>Baujahr</Label><Input type="number" value={form.year || ""} onChange={e => setForm((f: any) => ({ ...f, year: e.target.value }))} /></div>
                  </div>
                  <div className="grid grid-cols-3 gap-3">
                    <div className="space-y-1.5"><Label>Farbe</Label><Input value={form.color || ""} onChange={e => setForm((f: any) => ({ ...f, color: e.target.value }))} /></div>
                    <div className="space-y-1.5"><Label>Kraftstoff</Label><Input value={form.fuel_type || ""} onChange={e => setForm((f: any) => ({ ...f, fuel_type: e.target.value }))} /></div>
                    <div className="space-y-1.5"><Label>km-Stand</Label><Input type="number" value={form.mileage || ""} onChange={e => setForm((f: any) => ({ ...f, mileage: e.target.value }))} /></div>
                  </div>
                  <div className="space-y-1.5"><Label>FIN (VIN)</Label><Input value={form.vin || ""} onChange={e => setForm((f: any) => ({ ...f, vin: e.target.value }))} /></div>
                  <div className="space-y-1.5"><Label>Status</Label>
                    <Select value={form.status || "verfuegbar"} onValueChange={v => setForm((f: any) => ({ ...f, status: v }))}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>{Object.entries(statusConfig).map(([k, v]) => <SelectItem key={k} value={k}>{v.label}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1.5"><Label>Zugewiesen an</Label>
                      <Select value={form.assigned_to_user_id?.toString() || "none"} onValueChange={v => setForm((f: any) => ({ ...f, assigned_to_user_id: v === "none" ? null : parseInt(v) }))}>
                        <SelectTrigger><SelectValue placeholder="Nicht zugewiesen" /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="none">Nicht zugewiesen</SelectItem>
                          {users.map(u => <SelectItem key={u.id} value={u.id.toString()}>{u.name}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-1.5"><Label>Standort</Label>
                      <Select value={form.location_id?.toString() || "none"} onValueChange={v => setForm((f: any) => ({ ...f, location_id: v === "none" ? null : parseInt(v) }))}>
                        <SelectTrigger><SelectValue placeholder="Kein Standort" /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="none">Kein Standort</SelectItem>
                          {locations.map(l => <SelectItem key={l.id} value={l.id.toString()}>{l.name}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-y-3 gap-x-8 text-sm">
                  <div className="flex items-center gap-2 text-muted-foreground"><Truck className="h-4 w-4" /> Typ: <span className="text-foreground">{typeLabels[vehicle.type] || vehicle.type}</span></div>
                  <div className="flex items-center gap-2 text-muted-foreground"><Palette className="h-4 w-4" /> Farbe: <span className="text-foreground">{vehicle.color || "–"}</span></div>
                  <div className="flex items-center gap-2 text-muted-foreground"><Fuel className="h-4 w-4" /> Kraftstoff: <span className="text-foreground">{vehicle.fuel_type || "–"}</span></div>
                  <div className="flex items-center gap-2 text-muted-foreground"><Gauge className="h-4 w-4" /> km-Stand: <span className="text-foreground">{vehicle.mileage ? `${vehicle.mileage.toLocaleString("de-DE")} km` : "–"}</span></div>
                  <div className="flex items-center gap-2 text-muted-foreground"><User className="h-4 w-4" /> Fahrer: <span className="text-foreground">{vehicle.assigned_to_name || "–"}</span></div>
                  <div className="flex items-center gap-2 text-muted-foreground"><MapPin className="h-4 w-4" /> Standort: <span className="text-foreground">{vehicle.location_name || "–"}</span></div>
                  {vehicle.vin && <div className="col-span-2 flex items-center gap-2 text-muted-foreground">FIN: <span className="text-foreground font-mono text-xs">{vehicle.vin}</span></div>}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Notes */}
          <Card>
            <CardHeader className="pb-3"><CardTitle className="text-base">Notizen</CardTitle></CardHeader>
            <CardContent>
              {editing ? (
                <Textarea value={form.notes || ""} onChange={e => setForm((f: any) => ({ ...f, notes: e.target.value }))} rows={4} placeholder="Besonderheiten, Schäden, Ausstattung..." />
              ) : vehicle.notes ? (
                <p className="text-sm whitespace-pre-wrap">{vehicle.notes}</p>
              ) : (
                <p className="text-sm text-muted-foreground">Keine Notizen</p>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Sidebar */}
        <div className="space-y-4">
          {/* Termine */}
          <Card>
            <CardHeader className="pb-3"><CardTitle className="text-base">Termine & Fristen</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              {editing ? (
                <div className="space-y-3">
                  <div className="space-y-1.5"><Label>Nächste HU/AU (TÜV)</Label><Input type="date" value={form.next_tuv || ""} onChange={e => setForm((f: any) => ({ ...f, next_tuv: e.target.value }))} /></div>
                  <div className="space-y-1.5"><Label>Nächste Inspektion</Label><Input type="date" value={form.next_inspection || ""} onChange={e => setForm((f: any) => ({ ...f, next_inspection: e.target.value }))} /></div>
                  <div className="space-y-1.5"><Label>Versicherung bis</Label><Input type="date" value={form.insurance_until || ""} onChange={e => setForm((f: any) => ({ ...f, insurance_until: e.target.value }))} /></div>
                </div>
              ) : (
                <div className="space-y-2 text-sm">
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Shield className="h-4 w-4" /> TÜV: <span className="text-foreground">{formatDate(vehicle.next_tuv)}</span>
                  </div>
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Calendar className="h-4 w-4" /> Inspektion: <span className="text-foreground">{formatDate(vehicle.next_inspection)}</span>
                  </div>
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Shield className="h-4 w-4" /> Versicherung: <span className="text-foreground">{formatDate(vehicle.insurance_until)}</span>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {editing && (
            <div className="flex gap-2">
              <Button variant="outline" className="flex-1" onClick={() => { setEditing(false); setForm(vehicle) }}>Abbrechen</Button>
              <Button className="flex-1" onClick={handleSave} disabled={saving}>
                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />} Speichern
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
