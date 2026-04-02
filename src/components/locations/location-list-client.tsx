"use client"
import { useState, useEffect } from "react"
import Link from "next/link"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Plus, Search, Loader2, AlertCircle, MapPin, Phone, User, ArrowRight } from "lucide-react"

interface Location {
  id: number
  name: string
  street: string | null
  zip: string | null
  city: string | null
  contact_name: string | null
  contact_phone: string | null
  contact_email: string | null
  notes: string | null
  active: number
}

const emptyForm = {
  name: "", street: "", zip: "", city: "",
  contact_name: "", contact_phone: "", contact_email: "", notes: "",
}

export function LocationListClient({ userRole }: { userRole: string }) {
  const [locations, setLocations] = useState<Location[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState("")
  const [showDialog, setShowDialog] = useState(false)
  const [form, setForm] = useState(emptyForm)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState("")

  const isPrivileged = ["admin", "manager"].some(r => userRole.includes(r))

  async function fetchLocations() {
    setLoading(true)
    try {
      const res = await fetch(`/api/locations?search=${encodeURIComponent(search)}`)
      const data = await res.json()
      setLocations(Array.isArray(data) ? data : [])
    } catch {}
    setLoading(false)
  }

  useEffect(() => { fetchLocations() }, [search])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSubmitting(true)
    setError("")
    try {
      const res = await fetch("/api/locations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      })
      const data = await res.json()
      if (!res.ok) {
        setError(data.error || "Fehler")
      } else {
        setShowDialog(false)
        setForm(emptyForm)
        fetchLocations()
      }
    } catch {
      setError("Verbindungsfehler")
    }
    setSubmitting(false)
  }

  function formatAddress(loc: Location) {
    const parts = [loc.street, [loc.zip, loc.city].filter(Boolean).join(" ")].filter(Boolean)
    return parts.join(", ") || "–"
  }

  return (
    <div className="space-y-5 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Standorte</h1>
          <p className="text-muted-foreground text-sm mt-0.5">Gebäude und Standorte verwalten</p>
        </div>
        {isPrivileged && (
          <Button onClick={() => { setForm(emptyForm); setError(""); setShowDialog(true) }}>
            <Plus className="h-4 w-4" /> Neuer Standort
          </Button>
        )}
      </div>

      {/* Search */}
      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input placeholder="Suchen..." className="pl-9" value={search} onChange={e => setSearch(e.target.value)} />
      </div>

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          {loading ? (
            <div className="flex items-center justify-center py-16">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : locations.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
              <AlertCircle className="h-8 w-8 mb-2 opacity-40" />
              <p className="text-sm">Keine Standorte gefunden</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Adresse</TableHead>
                  <TableHead>Ansprechpartner</TableHead>
                  <TableHead>Telefon</TableHead>
                  <TableHead className="w-16"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {locations.map(loc => (
                  <TableRow key={loc.id} className="cursor-pointer">
                    <TableCell>
                      <Link href={`/locations/${loc.id}`} className="font-medium hover:text-primary transition-colors flex items-center gap-2">
                        <MapPin className="h-4 w-4 text-muted-foreground shrink-0" />
                        {loc.name}
                      </Link>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">{formatAddress(loc)}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {loc.contact_name || "–"}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {loc.contact_phone || "–"}
                    </TableCell>
                    <TableCell>
                      <Link href={`/locations/${loc.id}`} className="text-muted-foreground hover:text-primary transition-colors">
                        <ArrowRight className="h-4 w-4" />
                      </Link>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Create Dialog */}
      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Neuer Standort</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <Label>Name *</Label>
              <Input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="z.B. Hauptgebäude A" required />
            </div>
            <div className="space-y-1.5">
              <Label>Straße</Label>
              <Input value={form.street} onChange={e => setForm(f => ({ ...f, street: e.target.value }))} placeholder="Musterstraße 1" />
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div className="space-y-1.5">
                <Label>PLZ</Label>
                <Input value={form.zip} onChange={e => setForm(f => ({ ...f, zip: e.target.value }))} placeholder="12345" />
              </div>
              <div className="col-span-2 space-y-1.5">
                <Label>Stadt</Label>
                <Input value={form.city} onChange={e => setForm(f => ({ ...f, city: e.target.value }))} placeholder="Musterstadt" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Ansprechpartner</Label>
                <Input value={form.contact_name} onChange={e => setForm(f => ({ ...f, contact_name: e.target.value }))} />
              </div>
              <div className="space-y-1.5">
                <Label>Telefon</Label>
                <Input value={form.contact_phone} onChange={e => setForm(f => ({ ...f, contact_phone: e.target.value }))} />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>E-Mail</Label>
              <Input type="email" value={form.contact_email} onChange={e => setForm(f => ({ ...f, contact_email: e.target.value }))} />
            </div>
            <div className="space-y-1.5">
              <Label>Besonderheiten</Label>
              <Textarea value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} placeholder="z.B. Zugang nur mit Schlüsselkarte, Parkplätze vorhanden..." rows={3} />
            </div>
            {error && <p className="text-sm text-destructive bg-destructive/10 px-3 py-2 rounded-lg">{error}</p>}
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setShowDialog(false)}>Abbrechen</Button>
              <Button type="submit" disabled={submitting}>
                {submitting ? <><Loader2 className="h-4 w-4 animate-spin" />Erstellen...</> : "Standort erstellen"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
