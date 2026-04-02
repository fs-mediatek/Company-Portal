"use client"
import { useState, useEffect, useCallback } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { ArrowLeft, Loader2, Save, MapPin, Phone, Mail, User, Building2, FileText, ExternalLink, RefreshCw } from "lucide-react"

interface Props {
  locationId: string
  userRole: string
}

export function LocationDetailClient({ locationId, userRole }: Props) {
  const [location, setLocation] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [editing, setEditing] = useState(false)
  const [form, setForm] = useState<any>({})
  const [saving, setSaving] = useState(false)
  const [geocoding, setGeocoding] = useState(false)
  const router = useRouter()

  const isPrivileged = ["admin", "manager"].some(r => userRole.includes(r))

  async function fetchLocation() {
    try {
      const res = await fetch(`/api/locations/${locationId}`)
      if (!res.ok) { router.push("/locations"); return }
      const data = await res.json()
      setLocation(data)
      setForm(data)
    } catch {}
    setLoading(false)
  }

  useEffect(() => { fetchLocation() }, [locationId])

  async function geocodeAddress() {
    const address = [form.street, form.zip, form.city].filter(Boolean).join(", ")
    if (!address) return

    setGeocoding(true)
    try {
      const res = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(address)}&limit=1`,
        { headers: { "User-Agent": "FacilityMgmt/1.0" } }
      )
      const data = await res.json()
      if (data.length > 0) {
        const lat = parseFloat(data[0].lat)
        const lon = parseFloat(data[0].lon)
        setForm((f: any) => ({ ...f, latitude: lat, longitude: lon }))
      }
    } catch {}
    setGeocoding(false)
  }

  async function handleSave() {
    setSaving(true)
    await fetch(`/api/locations/${locationId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: form.name,
        street: form.street,
        zip: form.zip,
        city: form.city,
        contact_name: form.contact_name,
        contact_phone: form.contact_phone,
        contact_email: form.contact_email,
        notes: form.notes,
        latitude: form.latitude,
        longitude: form.longitude,
      }),
    })
    setSaving(false)
    setEditing(false)
    fetchLocation()
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (!location) return null

  const hasCoords = form.latitude && form.longitude
  const displayLat = form.latitude || location.latitude
  const displayLon = form.longitude || location.longitude
  const hasDisplayCoords = displayLat && displayLon

  // Build OSM embed URL
  const mapUrl = hasDisplayCoords
    ? `https://www.openstreetmap.org/export/embed.html?bbox=${displayLon - 0.005},${displayLat - 0.003},${displayLon + 0.005},${displayLat + 0.003}&layer=mapnik&marker=${displayLat},${displayLon}`
    : null

  const fullAddress = [location.street, [location.zip, location.city].filter(Boolean).join(" ")].filter(Boolean).join(", ")

  return (
    <div className="space-y-5 animate-fade-in max-w-5xl">
      {/* Header */}
      <div>
        <Button variant="ghost" size="sm" onClick={() => router.push("/locations")} className="mb-3">
          <ArrowLeft className="h-4 w-4" /> Zurück
        </Button>
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <MapPin className="h-5 w-5" />
            </div>
            <div>
              <h1 className="text-2xl font-bold">{location.name}</h1>
              {fullAddress && <p className="text-muted-foreground text-sm mt-0.5">{fullAddress}</p>}
            </div>
          </div>
          <div className="flex gap-2">
            {location.ticket_count > 0 && (
              <Badge variant="info">{location.ticket_count} Meldungen</Badge>
            )}
            {isPrivileged && !editing && (
              <Button variant="outline" size="sm" onClick={() => setEditing(true)}>Bearbeiten</Button>
            )}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Main: Map + Notes */}
        <div className="lg:col-span-2 space-y-5">
          {/* Map */}
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base flex items-center gap-2">
                  <MapPin className="h-4 w-4" /> Karte
                </CardTitle>
                {hasDisplayCoords && (
                  <a
                    href={`https://www.openstreetmap.org/?mlat=${displayLat}&mlon=${displayLon}#map=17/${displayLat}/${displayLon}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs text-primary hover:underline flex items-center gap-1"
                  >
                    In OpenStreetMap öffnen <ExternalLink className="h-3 w-3" />
                  </a>
                )}
              </div>
            </CardHeader>
            <CardContent>
              {mapUrl ? (
                <div className="rounded-lg overflow-hidden border">
                  <iframe
                    src={mapUrl}
                    width="100%"
                    height="350"
                    style={{ border: 0 }}
                    loading="lazy"
                    referrerPolicy="no-referrer"
                    title="Standort-Karte"
                  />
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-12 text-muted-foreground rounded-lg border border-dashed">
                  <MapPin className="h-8 w-8 mb-2 opacity-40" />
                  <p className="text-sm">Keine Koordinaten vorhanden</p>
                  <p className="text-xs mt-1">Adresse eingeben und Koordinaten ermitteln</p>
                  {isPrivileged && fullAddress && (
                    <Button variant="outline" size="sm" className="mt-3" onClick={geocodeAddress} disabled={geocoding}>
                      {geocoding ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
                      Koordinaten ermitteln
                    </Button>
                  )}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Notes */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <FileText className="h-4 w-4" /> Besonderheiten
              </CardTitle>
            </CardHeader>
            <CardContent>
              {editing ? (
                <Textarea
                  value={form.notes || ""}
                  onChange={e => setForm((f: any) => ({ ...f, notes: e.target.value }))}
                  rows={5}
                  placeholder="Besonderheiten, Zugangshinweise, Parkplätze..."
                />
              ) : location.notes ? (
                <p className="text-sm whitespace-pre-wrap">{location.notes}</p>
              ) : (
                <p className="text-sm text-muted-foreground">Keine Besonderheiten hinterlegt</p>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Sidebar */}
        <div className="space-y-4">
          {/* Address */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Adresse</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {editing ? (
                <div className="space-y-3">
                  <div className="space-y-1.5">
                    <Label>Name</Label>
                    <Input value={form.name || ""} onChange={e => setForm((f: any) => ({ ...f, name: e.target.value }))} />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Straße</Label>
                    <Input value={form.street || ""} onChange={e => setForm((f: any) => ({ ...f, street: e.target.value }))} />
                  </div>
                  <div className="grid grid-cols-3 gap-2">
                    <div className="space-y-1.5">
                      <Label>PLZ</Label>
                      <Input value={form.zip || ""} onChange={e => setForm((f: any) => ({ ...f, zip: e.target.value }))} />
                    </div>
                    <div className="col-span-2 space-y-1.5">
                      <Label>Stadt</Label>
                      <Input value={form.city || ""} onChange={e => setForm((f: any) => ({ ...f, city: e.target.value }))} />
                    </div>
                  </div>
                  <Button variant="outline" size="sm" className="w-full" onClick={geocodeAddress} disabled={geocoding}>
                    {geocoding ? <Loader2 className="h-4 w-4 animate-spin" /> : <MapPin className="h-4 w-4" />}
                    Koordinaten ermitteln
                  </Button>
                  {hasCoords && (
                    <p className="text-xs text-muted-foreground text-center">
                      {form.latitude?.toFixed(5)}, {form.longitude?.toFixed(5)}
                    </p>
                  )}
                </div>
              ) : (
                <div className="space-y-2 text-sm">
                  <div className="flex items-start gap-2 text-muted-foreground">
                    <Building2 className="h-4 w-4 shrink-0 mt-0.5" />
                    <div>
                      <p className="text-foreground font-medium">{location.name}</p>
                      {location.street && <p>{location.street}</p>}
                      {(location.zip || location.city) && (
                        <p>{[location.zip, location.city].filter(Boolean).join(" ")}</p>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Contact */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Ansprechpartner</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {editing ? (
                <div className="space-y-3">
                  <div className="space-y-1.5">
                    <Label>Name</Label>
                    <Input value={form.contact_name || ""} onChange={e => setForm((f: any) => ({ ...f, contact_name: e.target.value }))} />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Telefon</Label>
                    <Input value={form.contact_phone || ""} onChange={e => setForm((f: any) => ({ ...f, contact_phone: e.target.value }))} />
                  </div>
                  <div className="space-y-1.5">
                    <Label>E-Mail</Label>
                    <Input type="email" value={form.contact_email || ""} onChange={e => setForm((f: any) => ({ ...f, contact_email: e.target.value }))} />
                  </div>
                </div>
              ) : (
                <div className="space-y-2 text-sm">
                  {location.contact_name ? (
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <User className="h-4 w-4 shrink-0" />
                      <span className="text-foreground">{location.contact_name}</span>
                    </div>
                  ) : null}
                  {location.contact_phone ? (
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <Phone className="h-4 w-4 shrink-0" />
                      <a href={`tel:${location.contact_phone}`} className="text-foreground hover:text-primary transition-colors">
                        {location.contact_phone}
                      </a>
                    </div>
                  ) : null}
                  {location.contact_email ? (
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <Mail className="h-4 w-4 shrink-0" />
                      <a href={`mailto:${location.contact_email}`} className="text-foreground hover:text-primary transition-colors">
                        {location.contact_email}
                      </a>
                    </div>
                  ) : null}
                  {!location.contact_name && !location.contact_phone && !location.contact_email && (
                    <p className="text-muted-foreground">Kein Ansprechpartner hinterlegt</p>
                  )}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Save/Cancel buttons when editing */}
          {editing && (
            <div className="flex gap-2">
              <Button variant="outline" className="flex-1" onClick={() => { setEditing(false); setForm(location) }}>
                Abbrechen
              </Button>
              <Button className="flex-1" onClick={handleSave} disabled={saving}>
                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                Speichern
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
