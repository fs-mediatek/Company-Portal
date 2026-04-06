"use client"
import { useState, useEffect } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Textarea } from "@/components/ui/textarea"
import { Plus, Loader2, AlertCircle } from "lucide-react"

export function SuppliersClient() {
  const [suppliers, setSuppliers] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [showDialog, setShowDialog] = useState(false)
  const [form, setForm] = useState({ name: "", contact_name: "", contact_email: "", contact_phone: "", address: "", notes: "" })
  const [saving, setSaving] = useState(false)

  async function fetchSuppliers() {
    setLoading(true)
    try { setSuppliers(await (await fetch("/api/helpdesk/suppliers")).json()) } catch {}
    setLoading(false)
  }

  useEffect(() => { fetchSuppliers() }, [])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    await fetch("/api/helpdesk/suppliers", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(form) })
    setSaving(false)
    setShowDialog(false)
    setForm({ name: "", contact_name: "", contact_email: "", contact_phone: "", address: "", notes: "" })
    fetchSuppliers()
  }

  return (
    <div className="space-y-5 animate-fade-in">
      <div className="flex items-center justify-between">
        <div><h1 className="text-2xl font-bold">Lieferanten</h1><p className="text-muted-foreground text-sm mt-0.5">IT-Lieferanten und Dienstleister</p></div>
        <Button onClick={() => setShowDialog(true)} className="bg-purple-600 hover:bg-purple-700"><Plus className="h-4 w-4" /> Neuer Lieferant</Button>
      </div>

      <Card>
        <CardContent className="p-0">
          {loading ? <div className="flex justify-center py-16"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
          : !Array.isArray(suppliers) || suppliers.length === 0 ? <div className="flex flex-col items-center justify-center py-16 text-muted-foreground"><AlertCircle className="h-8 w-8 mb-2 opacity-40" /><p className="text-sm">Keine Lieferanten</p></div>
          : (
            <Table>
              <TableHeader><TableRow><TableHead>Name</TableHead><TableHead>Kontakt</TableHead><TableHead>E-Mail</TableHead><TableHead>Telefon</TableHead></TableRow></TableHeader>
              <TableBody>
                {suppliers.map((s: any) => (
                  <TableRow key={s.id}>
                    <TableCell className="font-medium">{s.name}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">{s.contact_name || "–"}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">{s.contact_email || "–"}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">{s.contact_phone || "–"}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>Neuer Lieferant</DialogTitle></DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-3">
            <div className="space-y-1.5"><Label>Name *</Label><Input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} required /></div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5"><Label>Kontaktperson</Label><Input value={form.contact_name} onChange={e => setForm({ ...form, contact_name: e.target.value })} /></div>
              <div className="space-y-1.5"><Label>E-Mail</Label><Input type="email" value={form.contact_email} onChange={e => setForm({ ...form, contact_email: e.target.value })} /></div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5"><Label>Telefon</Label><Input value={form.contact_phone} onChange={e => setForm({ ...form, contact_phone: e.target.value })} /></div>
              <div className="space-y-1.5"><Label>Adresse</Label><Input value={form.address} onChange={e => setForm({ ...form, address: e.target.value })} /></div>
            </div>
            <div className="space-y-1.5"><Label>Notizen</Label><Textarea value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} rows={2} /></div>
            <DialogFooter><Button type="button" variant="outline" onClick={() => setShowDialog(false)}>Abbrechen</Button><Button type="submit" disabled={saving} className="bg-purple-600 hover:bg-purple-700">{saving ? <Loader2 className="h-4 w-4 animate-spin" /> : "Erstellen"}</Button></DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
