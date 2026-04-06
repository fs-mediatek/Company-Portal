"use client"
import { useState, useEffect, useRef } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { Select, SelectTrigger, SelectContent, SelectItem, SelectValue } from "@/components/ui/select"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Table, TableBody, TableRow, TableCell, TableHead, TableHeader } from "@/components/ui/table"
import {
  ArrowLeft, Loader2, Save, Truck, Gauge, Calendar, Shield,
  User, MapPin, AlertTriangle, Plus, Trash2, FileText, Upload,
  Car, Wrench, Building2, Phone, Mail
} from "lucide-react"
import { format } from "date-fns"
import { de } from "date-fns/locale"
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

type Tab = "fahrzeug" | "finanzen" | "reifen" | "km" | "dokumente"

function formatDate(d: string | null) {
  if (!d) return "–"
  try { return format(new Date(d), "dd.MM.yyyy", { locale: de }) } catch { return "–" }
}
function formatCurrency(v: any) {
  if (v === null || v === undefined || v === "") return "–"
  const n = Number(v)
  if (isNaN(n)) return String(v)
  return n.toLocaleString("de-DE", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + " €"
}

interface AlertItem { label: string; detail: string; urgent: boolean }
function getAlerts(v: any): AlertItem[] {
  const alerts: AlertItem[] = []
  if (v.days_to_tuv !== null) {
    const d = Number(v.days_to_tuv)
    if (d <= 60) alerts.push({ label: "HU/TÜV fällig", detail: d <= 0 ? "Überfällig!" : `in ${d} Tagen (${formatDate(v.next_tuv)})`, urgent: d <= 14 })
  }
  if (v.days_to_lease_end !== null) {
    const d = Number(v.days_to_lease_end)
    if (d <= 90) alerts.push({ label: "Leasing-Ende", detail: d <= 0 ? "Abgelaufen!" : `in ${d} Tagen (${formatDate(v.lease_end_date)})`, urgent: d <= 30 })
  }
  if (v.days_to_insurance_end !== null) {
    const d = Number(v.days_to_insurance_end)
    if (d <= 60) alerts.push({ label: "Versicherung fällig", detail: d <= 0 ? "Abgelaufen!" : `in ${d} Tagen (${formatDate(v.insurance_until)})`, urgent: d <= 14 })
  }
  if (v.ownership_type === "leasing" && v.lease_end_km && v.mileage) {
    const pct = (v.mileage / v.lease_end_km) * 100
    if (pct >= 90) alerts.push({ label: "KM-Limit Leasing", detail: `${v.mileage.toLocaleString("de-DE")} von ${v.lease_end_km.toLocaleString("de-DE")} km (${pct.toFixed(0)}%)`, urgent: pct >= 100 })
  }
  return alerts
}

function Prop({ label, value, mono }: { label: string; value?: React.ReactNode; mono?: boolean }) {
  if (!value && value !== 0) return null
  return (
    <div className="flex flex-col gap-0.5">
      <span className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground/70">{label}</span>
      <span className={cn("text-sm text-foreground", mono && "font-mono")}>{value}</span>
    </div>
  )
}

interface Props { vehicleId: string; userRole: string }

export function VehicleDetailClient({ vehicleId, userRole }: Props) {
  const [vehicle, setVehicle] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [editing, setEditing] = useState(false)
  const [form, setForm] = useState<any>({})
  const [saving, setSaving] = useState(false)
  const [activeTab, setActiveTab] = useState<Tab>("fahrzeug")
  const [users, setUsers] = useState<any[]>([])
  const [locations, setLocations] = useState<any[]>([])
  const [mileageLog, setMileageLog] = useState<any[]>([])
  const [documents, setDocuments] = useState<any[]>([])
  const [showMileageDialog, setShowMileageDialog] = useState(false)
  const [mileageForm, setMileageForm] = useState({ mileage: "", recorded_at: new Date().toISOString().split("T")[0], notes: "" })
  const [addingMileage, setAddingMileage] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [uploadLabel, setUploadLabel] = useState("")
  const fileInputRef = useRef<HTMLInputElement>(null)
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

  async function fetchMileage() {
    const res = await fetch(`/api/vehicles/${vehicleId}/mileage`)
    const data = await res.json()
    setMileageLog(Array.isArray(data) ? data : [])
  }

  async function fetchDocuments() {
    const res = await fetch(`/api/vehicles/${vehicleId}/documents`)
    const data = await res.json()
    setDocuments(Array.isArray(data) ? data : [])
  }

  useEffect(() => {
    fetchVehicle()
    fetch("/api/users?limit=200").then(r => r.json()).then(d => setUsers(d.users || [])).catch(() => {})
    fetch("/api/locations").then(r => r.json()).then(d => setLocations(Array.isArray(d) ? d : [])).catch(() => {})
    fetchMileage()
    fetchDocuments()
  }, [vehicleId])

  async function handleSave() {
    setSaving(true)
    const payload: any = { ...form }
    delete payload.assigned_to_name
    delete payload.location_name
    delete payload.days_to_tuv
    delete payload.days_to_lease_end
    delete payload.days_to_insurance_end
    await fetch(`/api/vehicles/${vehicleId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    })
    setSaving(false)
    setEditing(false)
    fetchVehicle()
  }

  async function handleAddMileage(e: React.FormEvent) {
    e.preventDefault()
    setAddingMileage(true)
    await fetch(`/api/vehicles/${vehicleId}/mileage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(mileageForm),
    })
    setAddingMileage(false)
    setShowMileageDialog(false)
    setMileageForm({ mileage: "", recorded_at: new Date().toISOString().split("T")[0], notes: "" })
    fetchMileage()
    fetchVehicle()
  }

  async function deleteMileageEntry(entryId: number) {
    await fetch(`/api/vehicles/${vehicleId}/mileage?entryId=${entryId}`, { method: "DELETE" })
    fetchMileage()
  }

  async function handleUpload(file: File) {
    setUploading(true)
    const fd = new FormData()
    fd.append("file", file)
    if (uploadLabel) fd.append("label", uploadLabel)
    await fetch(`/api/vehicles/${vehicleId}/documents`, { method: "POST", body: fd })
    setUploading(false)
    setUploadLabel("")
    fetchDocuments()
  }

  async function deleteDocument(docId: number) {
    await fetch(`/api/vehicles/${vehicleId}/documents?docId=${docId}`, { method: "DELETE" })
    fetchDocuments()
  }

  if (loading) return <div className="flex items-center justify-center py-16"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
  if (!vehicle) return null

  const sc = statusConfig[vehicle.status] || { label: vehicle.status, color: "bg-zinc-100 text-zinc-600 border-zinc-200" }
  const title = [vehicle.make, vehicle.model].filter(Boolean).join(" ") || vehicle.license_plate
  const alerts = getAlerts(vehicle)

  const tabs: { id: Tab; label: string; icon: any }[] = [
    { id: "fahrzeug", label: "Fahrzeug", icon: Car },
    { id: "finanzen", label: "Finanzen", icon: Shield },
    { id: "reifen", label: "Reifen & Fristen", icon: Wrench },
    { id: "km", label: "KM-Protokoll", icon: Gauge },
    { id: "dokumente", label: "Dokumente", icon: FileText },
  ]

  function F(key: string) { return form[key] ?? "" }
  function setF(key: string, val: any) { setForm((f: any) => ({ ...f, [key]: val })) }

  return (
    <div className="space-y-5 animate-fade-in max-w-6xl">
      {/* Header */}
      <div>
        <Button variant="ghost" size="sm" onClick={() => router.push("/vehicles")} className="mb-3">
          <ArrowLeft className="h-4 w-4 mr-1" /> Zurück
        </Button>
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-blue-500/10">
              <Truck className="h-5 w-5 text-blue-600 dark:text-blue-400" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-2xl font-bold">{title}</h1>
                <Badge variant="outline" className={cn("text-xs", sc.color)}>{sc.label}</Badge>
                {alerts.length > 0 && (
                  <Badge variant="outline" className="text-xs bg-amber-100 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-400 dark:border-amber-800">
                    <AlertTriangle className="h-3 w-3 mr-1" />{alerts.length} Hinweis{alerts.length > 1 ? "e" : ""}
                  </Badge>
                )}
              </div>
              <p className="text-muted-foreground text-sm font-mono">{vehicle.license_plate}{vehicle.company ? ` · ${vehicle.company}` : ""}</p>
            </div>
          </div>
          {isPrivileged && (
            <div className="flex gap-2">
              {editing ? (
                <>
                  <Button variant="outline" size="sm" onClick={() => { setEditing(false); setForm(vehicle) }}>Abbrechen</Button>
                  <Button size="sm" onClick={handleSave} disabled={saving}>
                    {saving ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <Save className="h-4 w-4 mr-1" />}Speichern
                  </Button>
                </>
              ) : (
                <Button variant="outline" size="sm" onClick={() => setEditing(true)}>Bearbeiten</Button>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Tabs — full width, above the grid */}
      <div className="flex gap-1 border-b">
        {tabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={cn(
              "flex items-center gap-1.5 px-3 py-2 text-sm font-medium border-b-2 -mb-px transition-colors",
              activeTab === tab.id
                ? "border-foreground text-foreground"
                : "border-transparent text-muted-foreground hover:text-foreground"
            )}
          >
            <tab.icon className="h-3.5 w-3.5" />
            {tab.label}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-5 items-stretch">
        {/* Main content */}
        <div className="lg:col-span-3 flex flex-col">

          {/* Tab: Fahrzeug */}
          {activeTab === "fahrzeug" && (
            <Card className="flex-1">
              <CardContent className="p-5">
                {editing ? (
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1.5"><Label>Kennzeichen</Label><Input value={F("license_plate")} onChange={e => setF("license_plate", e.target.value.toUpperCase())} /></div>
                      <div className="space-y-1.5"><Label>Fahrzeugart</Label>
                        <Select value={F("type") || "pkw"} onValueChange={v => setF("type", v)}>
                          <SelectTrigger><SelectValue /></SelectTrigger>
                          <SelectContent>{Object.entries(typeLabels).map(([k, l]) => <SelectItem key={k} value={k}>{l}</SelectItem>)}</SelectContent>
                        </Select>
                      </div>
                    </div>
                    <div className="grid grid-cols-3 gap-3">
                      <div className="space-y-1.5"><Label>Marke</Label><Input value={F("make")} onChange={e => setF("make", e.target.value)} /></div>
                      <div className="space-y-1.5"><Label>Modell</Label><Input value={F("model")} onChange={e => setF("model", e.target.value)} /></div>
                      <div className="space-y-1.5"><Label>Baujahr</Label><Input type="number" value={F("year")} onChange={e => setF("year", e.target.value)} /></div>
                    </div>
                    <div className="grid grid-cols-3 gap-3">
                      <div className="space-y-1.5"><Label>Farbe</Label><Input value={F("color")} onChange={e => setF("color", e.target.value)} /></div>
                      <div className="space-y-1.5"><Label>Motor</Label>
                        <Select value={F("fuel_type") || "none"} onValueChange={v => setF("fuel_type", v === "none" ? "" : v)}>
                          <SelectTrigger><SelectValue placeholder="–" /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="none">–</SelectItem>
                            <SelectItem value="Verbrenner">Verbrenner</SelectItem>
                            <SelectItem value="Elektro">Elektro</SelectItem>
                            <SelectItem value="Hybrid">Hybrid</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-1.5"><Label>Getriebe</Label>
                        <Select value={F("transmission") || "none"} onValueChange={v => setF("transmission", v === "none" ? "" : v)}>
                          <SelectTrigger><SelectValue placeholder="–" /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="none">–</SelectItem>
                            <SelectItem value="Automatik">Automatik</SelectItem>
                            <SelectItem value="Schalter">Schalter</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1.5"><Label>Erstzulassung</Label><Input type="date" value={F("first_registration")} onChange={e => setF("first_registration", e.target.value)} /></div>
                      <div className="space-y-1.5"><Label>FIN (VIN)</Label><Input value={F("vin")} onChange={e => setF("vin", e.target.value)} placeholder="WBA..." /></div>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1.5"><Label>Status</Label>
                        <Select value={F("status") || "verfuegbar"} onValueChange={v => setF("status", v)}>
                          <SelectTrigger><SelectValue /></SelectTrigger>
                          <SelectContent>{Object.entries(statusConfig).map(([k, v]) => <SelectItem key={k} value={k}>{v.label}</SelectItem>)}</SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-1.5"><Label>km-Stand</Label><Input type="number" value={F("mileage")} onChange={e => setF("mileage", e.target.value)} /></div>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1.5"><Label>Zugewiesen an</Label>
                        <Select value={F("assigned_to_user_id")?.toString() || "none"} onValueChange={v => setF("assigned_to_user_id", v === "none" ? null : parseInt(v))}>
                          <SelectTrigger><SelectValue placeholder="Nicht zugewiesen" /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="none">Nicht zugewiesen</SelectItem>
                            {users.map(u => <SelectItem key={u.id} value={u.id.toString()}>{u.name}</SelectItem>)}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-1.5"><Label>Standort</Label>
                        <Select value={F("location_id")?.toString() || "none"} onValueChange={v => setF("location_id", v === "none" ? null : parseInt(v))}>
                          <SelectTrigger><SelectValue placeholder="Kein Standort" /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="none">Kein Standort</SelectItem>
                            {locations.map(l => <SelectItem key={l.id} value={l.id.toString()}>{l.name}</SelectItem>)}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1.5"><Label>Unternehmen</Label><Input value={F("company")} onChange={e => setF("company", e.target.value)} /></div>
                      <div className="space-y-1.5"><Label>Kostenstelle</Label><Input value={F("cost_center")} onChange={e => setF("cost_center", e.target.value)} /></div>
                    </div>
                    <div className="grid grid-cols-3 gap-3">
                      <div className="space-y-1.5"><Label>Ansprechpartner</Label><Input value={F("contact_person")} onChange={e => setF("contact_person", e.target.value)} /></div>
                      <div className="space-y-1.5"><Label>E-Mail</Label><Input type="email" value={F("contact_email")} onChange={e => setF("contact_email", e.target.value)} /></div>
                      <div className="space-y-1.5"><Label>Telefon</Label><Input value={F("contact_phone")} onChange={e => setF("contact_phone", e.target.value)} /></div>
                    </div>
                    <div className="space-y-1.5"><Label>Notizen</Label><Textarea value={F("notes")} onChange={e => setF("notes", e.target.value)} rows={3} /></div>
                  </div>
                ) : (
                  <div className="divide-y divide-border/50">
                    {/* Fahrzeug */}
                    <div className="pb-5 grid grid-cols-2 sm:grid-cols-3 gap-x-6 gap-y-4">
                      <Prop label="Fahrzeugart" value={typeLabels[vehicle.type] || vehicle.type} />
                      <Prop label="Motor" value={vehicle.fuel_type} />
                      <Prop label="Getriebe" value={vehicle.transmission} />
                      <Prop label="Farbe" value={vehicle.color} />
                      <Prop label="Erstzulassung" value={formatDate(vehicle.first_registration)} />
                      <Prop label="Baujahr" value={vehicle.year || undefined} />
                      {vehicle.vin && <Prop label="FIN" value={vehicle.vin} mono />}
                    </div>

                    {/* Zuweisung */}
                    <div className="py-5 grid grid-cols-2 sm:grid-cols-3 gap-x-6 gap-y-4">
                      <Prop label="km-Stand" value={vehicle.mileage ? `${Number(vehicle.mileage).toLocaleString("de-DE")} km` : undefined} />
                      <Prop label="Fahrer" value={vehicle.assigned_to_name} />
                      <Prop label="Standort" value={vehicle.location_name} />
                      <Prop label="Unternehmen" value={vehicle.company} />
                      <Prop label="Kostenstelle" value={vehicle.cost_center} />
                    </div>

                    {/* Ansprechpartner */}
                    {(vehicle.contact_person || vehicle.contact_email || vehicle.contact_phone) && (
                      <div className="pt-5 grid grid-cols-2 sm:grid-cols-3 gap-x-6 gap-y-4">
                        <Prop label="Ansprechpartner" value={vehicle.contact_person} />
                        <Prop label="E-Mail" value={vehicle.contact_email
                          ? <a href={`mailto:${vehicle.contact_email}`} className="text-blue-500 hover:underline">{vehicle.contact_email}</a>
                          : undefined} />
                        <Prop label="Telefon" value={vehicle.contact_phone} />
                      </div>
                    )}

                    {/* Notizen */}
                    {vehicle.notes && (
                      <div className="pt-5">
                        <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground/70 mb-1.5">Notizen</p>
                        <p className="text-sm whitespace-pre-wrap text-foreground">{vehicle.notes}</p>
                      </div>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Tab: Finanzen */}
          {activeTab === "finanzen" && (
            <Card className="flex-1">
              <CardContent className="p-5 space-y-5">
                {editing ? (
                  <div className="space-y-4">
                    <div className="space-y-1.5"><Label>Besitzart</Label>
                      <Select value={F("ownership_type") || "none"} onValueChange={v => setF("ownership_type", v === "none" ? null : v)}>
                        <SelectTrigger className="w-48"><SelectValue placeholder="–" /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="none">–</SelectItem>
                          <SelectItem value="leasing">Leasing</SelectItem>
                          <SelectItem value="kauf">Kauf</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    {(F("ownership_type") === "leasing" || !F("ownership_type")) && (
                      <div className="space-y-3 border rounded-lg p-4 bg-muted/30">
                        <p className="text-sm font-medium">Leasing</p>
                        <div className="grid grid-cols-2 gap-3">
                          <div className="space-y-1.5"><Label>Leasingbetrag</Label><Input value={F("lease_amount")} onChange={e => setF("lease_amount", e.target.value)} placeholder="z.B. 535,50" /></div>
                          <div className="space-y-1.5"><Label>Zahlungsperiode</Label>
                            <Select value={F("payment_period") || "none"} onValueChange={v => setF("payment_period", v === "none" ? "" : v)}>
                              <SelectTrigger><SelectValue placeholder="–" /></SelectTrigger>
                              <SelectContent>
                                <SelectItem value="none">–</SelectItem>
                                <SelectItem value="Monatlich">Monatlich</SelectItem>
                                <SelectItem value="Vierteljährlich">Vierteljährlich</SelectItem>
                                <SelectItem value="Jährlich">Jährlich</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                          <div className="space-y-1.5"><Label>Leasingende</Label><Input type="date" value={F("lease_end_date")} onChange={e => setF("lease_end_date", e.target.value)} /></div>
                          <div className="space-y-1.5"><Label>KM-Limit Leasing</Label><Input type="number" value={F("lease_end_km")} onChange={e => setF("lease_end_km", e.target.value)} placeholder="80000" /></div>
                        </div>
                      </div>
                    )}
                    {F("ownership_type") === "kauf" && (
                      <div className="space-y-3 border rounded-lg p-4 bg-muted/30">
                        <p className="text-sm font-medium">Kauf</p>
                        <div className="space-y-1.5"><Label>Kaufbetrag</Label><Input type="number" step="0.01" value={F("purchase_price")} onChange={e => setF("purchase_price", e.target.value)} placeholder="13900.00" /></div>
                      </div>
                    )}
                    <div className="space-y-1.5"><Label>KFZ-Steuer (€ / Jahr)</Label><Input type="number" step="0.01" value={F("vehicle_tax")} onChange={e => setF("vehicle_tax", e.target.value)} /></div>
                    <div className="space-y-3 border rounded-lg p-4 bg-muted/30">
                      <p className="text-sm font-medium">Versicherung</p>
                      <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-1.5"><Label>Versicherer</Label><Input value={F("insurer")} onChange={e => setF("insurer", e.target.value)} placeholder="Allianz" /></div>
                        <div className="space-y-1.5"><Label>Versicherungsnummer</Label><Input value={F("insurance_number")} onChange={e => setF("insurance_number", e.target.value)} /></div>
                      </div>
                      <div className="grid grid-cols-3 gap-3">
                        <div className="space-y-1.5"><Label>Versicherungsbetrag</Label><Input type="number" step="0.01" value={F("insurance_amount")} onChange={e => setF("insurance_amount", e.target.value)} /></div>
                        <div className="space-y-1.5"><Label>Zahlungsperiode</Label>
                          <Select value={F("payment_period") || "none"} onValueChange={v => setF("payment_period", v === "none" ? "" : v)}>
                            <SelectTrigger><SelectValue placeholder="–" /></SelectTrigger>
                            <SelectContent>
                              <SelectItem value="none">–</SelectItem>
                              <SelectItem value="Monatlich">Monatlich</SelectItem>
                              <SelectItem value="Vierteljährlich">Vierteljährlich</SelectItem>
                              <SelectItem value="Jährlich">Jährlich</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-1.5"><Label>Versicherung bis</Label><Input type="date" value={F("insurance_until")} onChange={e => setF("insurance_until", e.target.value)} /></div>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-5">
                    <div>
                      <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-3">Besitz</p>
                      <div className="space-y-2">
                        <Prop label="Besitzart" value={vehicle.ownership_type === "leasing" ? "Leasing" : vehicle.ownership_type === "kauf" ? "Kauf" : null} />
                        {vehicle.ownership_type === "leasing" && <>
                          <Prop label="Leasingbetrag" value={vehicle.lease_amount ? `${vehicle.lease_amount} €` : null} />
                          <Prop label="Leasingende" value={formatDate(vehicle.lease_end_date)} />
                          <Prop label="KM-Limit" value={vehicle.lease_end_km ? `${Number(vehicle.lease_end_km).toLocaleString("de-DE")} km` : null} />
                          {vehicle.mileage && vehicle.lease_end_km && (
                            <div className="mt-2">
                              <div className="flex justify-between text-xs text-muted-foreground mb-1">
                                <span>KM-Auslastung</span>
                                <span>{((vehicle.mileage / vehicle.lease_end_km) * 100).toFixed(0)}%</span>
                              </div>
                              <div className="h-2 bg-muted rounded-full overflow-hidden">
                                <div
                                  className={cn("h-full rounded-full", vehicle.mileage >= vehicle.lease_end_km ? "bg-red-500" : vehicle.mileage >= vehicle.lease_end_km * 0.9 ? "bg-amber-500" : "bg-emerald-500")}
                                  style={{ width: `${Math.min((vehicle.mileage / vehicle.lease_end_km) * 100, 100)}%` }}
                                />
                              </div>
                            </div>
                          )}
                        </>}
                        {vehicle.ownership_type === "kauf" && <Prop label="Kaufbetrag" value={formatCurrency(vehicle.purchase_price)} />}
                        <Prop label="KFZ-Steuer" value={formatCurrency(vehicle.vehicle_tax)} />
                      </div>
                    </div>
                    {(vehicle.insurer || vehicle.insurance_number || vehicle.insurance_amount) && (
                      <div className="border-t pt-4">
                        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-3">Versicherung</p>
                        <div className="space-y-2">
                          <Prop label="Versicherer" value={vehicle.insurer} />
                          <Prop label="Policennummer" value={vehicle.insurance_number} />
                          <Prop label="Beitrag" value={vehicle.insurance_amount ? `${Number(vehicle.insurance_amount).toLocaleString("de-DE", { minimumFractionDigits: 2 })} €` : null} />
                          <Prop label="Zahlungsperiode" value={vehicle.payment_period} />
                          <Prop label="Gültig bis" value={formatDate(vehicle.insurance_until)} />
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Tab: Reifen & Fristen */}
          {activeTab === "reifen" && (
            <Card className="flex-1">
              <CardContent className="p-5 space-y-5">
                {editing ? (
                  <div className="space-y-4">
                    <div className="space-y-3 border rounded-lg p-4 bg-muted/30">
                      <p className="text-sm font-medium">Reifen</p>
                      <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-1.5"><Label>Reifenart</Label>
                          <Select value={F("tire_type") || "none"} onValueChange={v => setF("tire_type", v === "none" ? "" : v)}>
                            <SelectTrigger><SelectValue placeholder="–" /></SelectTrigger>
                            <SelectContent>
                              <SelectItem value="none">–</SelectItem>
                              <SelectItem value="Sommer & Winter">Sommer & Winter</SelectItem>
                              <SelectItem value="Ganzjahresreifen">Ganzjahresreifen</SelectItem>
                              <SelectItem value="Winter">Winter</SelectItem>
                              <SelectItem value="Sommer">Sommer</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-1.5"><Label>Reifengröße</Label><Input value={F("tire_size")} onChange={e => setF("tire_size", e.target.value)} placeholder="z.B. 215/60 R16 95V" /></div>
                      </div>
                    </div>
                    <div className="space-y-3 border rounded-lg p-4 bg-muted/30">
                      <p className="text-sm font-medium">Fristen</p>
                      <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-1.5"><Label>Nächste HU/TÜV</Label><Input type="date" value={F("next_tuv")} onChange={e => setF("next_tuv", e.target.value)} /></div>
                        <div className="space-y-1.5"><Label>Nächste Inspektion</Label><Input type="date" value={F("next_inspection")} onChange={e => setF("next_inspection", e.target.value)} /></div>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-5">
                    <div>
                      <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-3">Reifen</p>
                      <div className="space-y-2">
                        <Prop label="Reifenart" value={vehicle.tire_type} />
                        <Prop label="Reifengröße" value={vehicle.tire_size} />
                      </div>
                      {!vehicle.tire_type && !vehicle.tire_size && <p className="text-sm text-muted-foreground">Keine Reifendaten hinterlegt.</p>}
                    </div>
                    <div className="border-t pt-4">
                      <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-3">Fristen</p>
                      <div className="space-y-3">
                        {vehicle.next_tuv && (
                          <div className="flex items-center justify-between p-3 rounded-lg border bg-card">
                            <div className="flex items-center gap-2">
                              <Shield className="h-4 w-4 text-muted-foreground" />
                              <div>
                                <p className="text-sm font-medium">HU/TÜV</p>
                                <p className="text-xs text-muted-foreground">{formatDate(vehicle.next_tuv)}</p>
                              </div>
                            </div>
                            {vehicle.days_to_tuv !== null && (
                              <Badge variant="outline" className={cn("text-xs",
                                Number(vehicle.days_to_tuv) <= 0 ? "bg-red-100 text-red-700 border-red-200" :
                                Number(vehicle.days_to_tuv) <= 14 ? "bg-red-100 text-red-700 border-red-200" :
                                Number(vehicle.days_to_tuv) <= 60 ? "bg-amber-100 text-amber-700 border-amber-200" :
                                "bg-emerald-100 text-emerald-700 border-emerald-200"
                              )}>
                                {Number(vehicle.days_to_tuv) <= 0 ? "Überfällig" : `${vehicle.days_to_tuv} Tage`}
                              </Badge>
                            )}
                          </div>
                        )}
                        {vehicle.next_inspection && (
                          <div className="flex items-center justify-between p-3 rounded-lg border bg-card">
                            <div className="flex items-center gap-2">
                              <Wrench className="h-4 w-4 text-muted-foreground" />
                              <div>
                                <p className="text-sm font-medium">Inspektion</p>
                                <p className="text-xs text-muted-foreground">{formatDate(vehicle.next_inspection)}</p>
                              </div>
                            </div>
                          </div>
                        )}
                        {!vehicle.next_tuv && !vehicle.next_inspection && <p className="text-sm text-muted-foreground">Keine Fristdaten hinterlegt.</p>}
                      </div>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Tab: KM-Protokoll */}
          {activeTab === "km" && (
            <Card>
              <CardHeader className="pb-3 flex flex-row items-center justify-between">
                <CardTitle className="text-base">KM-Protokoll</CardTitle>
                <Button size="sm" variant="outline" onClick={() => setShowMileageDialog(true)}>
                  <Plus className="h-4 w-4 mr-1" />Eintrag
                </Button>
              </CardHeader>
              <CardContent className="p-0">
                {mileageLog.length === 0 ? (
                  <p className="text-sm text-muted-foreground px-5 pb-5">Noch keine Einträge.</p>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Datum</TableHead>
                        <TableHead>km-Stand</TableHead>
                        <TableHead>Erfasst von</TableHead>
                        <TableHead>Notiz</TableHead>
                        {isPrivileged && <TableHead className="w-10"></TableHead>}
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {mileageLog.map((m: any) => (
                        <TableRow key={m.id}>
                          <TableCell className="text-sm">{formatDate(m.recorded_at)}</TableCell>
                          <TableCell className="text-sm font-medium tabular-nums">{Number(m.mileage).toLocaleString("de-DE")} km</TableCell>
                          <TableCell className="text-sm text-muted-foreground">{m.created_by_name || "–"}</TableCell>
                          <TableCell className="text-sm text-muted-foreground">{m.notes || "–"}</TableCell>
                          {isPrivileged && (
                            <TableCell>
                              <Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-muted-foreground hover:text-destructive" onClick={() => deleteMileageEntry(m.id)}>
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </TableCell>
                          )}
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          )}

          {/* Tab: Dokumente */}
          {activeTab === "dokumente" && (
            <Card>
              <CardHeader className="pb-3 flex flex-row items-center justify-between">
                <CardTitle className="text-base">Dokumente & Fotos</CardTitle>
                {isPrivileged && (
                  <Button size="sm" variant="outline" onClick={() => fileInputRef.current?.click()} disabled={uploading}>
                    {uploading ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <Upload className="h-4 w-4 mr-1" />}Hochladen
                  </Button>
                )}
              </CardHeader>
              <CardContent className="p-5 pt-0 space-y-4">
                {isPrivileged && (
                  <div className="flex items-center gap-2">
                    <Input
                      placeholder="Bezeichnung (optional, z.B. Fahrzeugschein)"
                      value={uploadLabel}
                      onChange={e => setUploadLabel(e.target.value)}
                      className="flex-1"
                    />
                    <input
                      ref={fileInputRef}
                      type="file"
                      className="hidden"
                      accept="image/*,.pdf,.doc,.docx"
                      onChange={e => { if (e.target.files?.[0]) { handleUpload(e.target.files[0]); e.target.value = "" } }}
                    />
                  </div>
                )}
                {documents.length === 0 ? (
                  <p className="text-sm text-muted-foreground">Noch keine Dokumente hochgeladen.</p>
                ) : (
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                    {documents.map((d: any) => {
                      const isImage = (d.mime_type || "").startsWith("image/")
                      return (
                        <div key={d.id} className="group relative border rounded-lg overflow-hidden bg-card hover:shadow-sm transition-shadow">
                          {isImage ? (
                            <a href={`/api/vehicles/${vehicleId}/documents/${d.id}`} target="_blank" rel="noreferrer">
                              <img
                                src={`/api/vehicles/${vehicleId}/documents/${d.id}`}
                                alt={d.original_name}
                                className="w-full h-32 object-cover"
                              />
                            </a>
                          ) : (
                            <a href={`/api/vehicles/${vehicleId}/documents/${d.id}`} target="_blank" rel="noreferrer" className="flex items-center justify-center h-32 bg-muted/50 hover:bg-muted/80 transition-colors">
                              <FileText className="h-10 w-10 text-muted-foreground" />
                            </a>
                          )}
                          <div className="p-2">
                            <p className="text-xs font-medium truncate">{d.doc_label || d.original_name}</p>
                            <p className="text-xs text-muted-foreground">{d.uploaded_by_name} · {formatDate(d.uploaded_at)}</p>
                          </div>
                          {isPrivileged && (
                            <button
                              onClick={() => deleteDocument(d.id)}
                              className="absolute top-1 right-1 hidden group-hover:flex h-6 w-6 items-center justify-center rounded bg-red-600 text-white"
                            >
                              <Trash2 className="h-3 w-3" />
                            </button>
                          )}
                        </div>
                      )
                    })}
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </div>

        {/* Sidebar */}
        <div className="flex flex-col gap-4">
          {/* Key metrics */}
          <Card>
            <CardContent className="p-4 space-y-3">
              <div className="flex items-center gap-2 text-sm">
                <Gauge className="h-4 w-4 text-muted-foreground" />
                <span className="text-muted-foreground">km-Stand</span>
                <span className="ml-auto font-medium tabular-nums">
                  {vehicle.mileage ? `${Number(vehicle.mileage).toLocaleString("de-DE")} km` : "–"}
                </span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <User className="h-4 w-4 text-muted-foreground" />
                <span className="text-muted-foreground">Fahrer</span>
                <span className="ml-auto text-right">{vehicle.assigned_to_name || "–"}</span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <MapPin className="h-4 w-4 text-muted-foreground" />
                <span className="text-muted-foreground">Standort</span>
                <span className="ml-auto">{vehicle.location_name || "–"}</span>
              </div>
              {vehicle.ownership_type && (
                <div className="flex items-center gap-2 text-sm">
                  <span className="text-muted-foreground">Besitzart</span>
                  <span className="ml-auto">{vehicle.ownership_type === "leasing" ? "Leasing" : "Kauf"}</span>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Alerts */}
          {alerts.length > 0 && (
            <Card className="border-amber-200 dark:border-amber-800">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm text-amber-700 dark:text-amber-400 flex items-center gap-1.5">
                  <AlertTriangle className="h-4 w-4" />Handlungsbedarf
                </CardTitle>
              </CardHeader>
              <CardContent className="p-4 pt-0 space-y-2">
                {alerts.map((a, i) => (
                  <div key={i} className={cn("rounded-lg p-2.5 text-xs", a.urgent ? "bg-red-50 dark:bg-red-950/30" : "bg-amber-50 dark:bg-amber-950/30")}>
                    <p className={cn("font-medium", a.urgent ? "text-red-700 dark:text-red-400" : "text-amber-700 dark:text-amber-400")}>{a.label}</p>
                    <p className="text-muted-foreground mt-0.5">{a.detail}</p>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}

          {/* Dates overview */}
          <Card className="flex-1">
            <CardHeader className="pb-2"><CardTitle className="text-sm">Fristen-Übersicht</CardTitle></CardHeader>
            <CardContent className="p-4 pt-0 space-y-2 text-xs">
              {[
                { label: "HU/TÜV", date: vehicle.next_tuv, days: vehicle.days_to_tuv },
                { label: "Inspektion", date: vehicle.next_inspection, days: null },
                { label: "Versicherung", date: vehicle.insurance_until, days: vehicle.days_to_insurance_end },
                { label: "Leasingende", date: vehicle.lease_end_date, days: vehicle.days_to_lease_end },
              ].filter(i => i.date).map((item, i) => (
                <div key={i} className="flex items-center justify-between">
                  <span className="text-muted-foreground">{item.label}</span>
                  <div className="text-right">
                    <span>{formatDate(item.date)}</span>
                    {item.days !== null && (
                      <span className={cn("ml-1.5", Number(item.days) <= 0 ? "text-red-600" : Number(item.days) <= 30 ? "text-amber-600" : "text-emerald-600")}>
                        ({Number(item.days) <= 0 ? "überfällig" : `${item.days}d`})
                      </span>
                    )}
                  </div>
                </div>
              ))}
              {!vehicle.next_tuv && !vehicle.next_inspection && !vehicle.insurance_until && !vehicle.lease_end_date && (
                <p className="text-muted-foreground">Keine Fristdaten.</p>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Mileage Dialog */}
      <Dialog open={showMileageDialog} onOpenChange={setShowMileageDialog}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader><DialogTitle>KM-Stand eintragen</DialogTitle></DialogHeader>
          <form onSubmit={handleAddMileage} className="space-y-4 px-6 py-4">
            <div className="space-y-2">
              <Label>km-Stand *</Label>
              <Input type="number" value={mileageForm.mileage} onChange={e => setMileageForm(f => ({ ...f, mileage: e.target.value }))} placeholder={vehicle.mileage ? String(vehicle.mileage) : "45000"} required />
            </div>
            <div className="space-y-2">
              <Label>Datum *</Label>
              <Input type="date" value={mileageForm.recorded_at} onChange={e => setMileageForm(f => ({ ...f, recorded_at: e.target.value }))} required />
            </div>
            <div className="space-y-2">
              <Label>Notiz</Label>
              <Input value={mileageForm.notes} onChange={e => setMileageForm(f => ({ ...f, notes: e.target.value }))} placeholder="z.B. Routenkontrolle" />
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" variant="outline" onClick={() => setShowMileageDialog(false)}>Abbrechen</Button>
              <Button type="submit" disabled={addingMileage}>
                {addingMileage ? <Loader2 className="h-4 w-4 animate-spin" /> : "Speichern"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
