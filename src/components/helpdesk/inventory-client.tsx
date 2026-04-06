"use client"
import { useState, useEffect } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Plus, Search, Loader2, AlertCircle, AlertTriangle } from "lucide-react"
import { cn } from "@/lib/utils"

export function InventoryClient() {
  const [items, setItems] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState("")
  const [lowStock, setLowStock] = useState(false)
  const [showDialog, setShowDialog] = useState(false)
  const [form, setForm] = useState({ name: "", sku: "", category: "", quantity: "0", min_quantity: "0", location: "", unit_price: "0" })
  const [saving, setSaving] = useState(false)

  async function fetchItems() {
    setLoading(true)
    const params = new URLSearchParams()
    if (search) params.set("search", search)
    if (lowStock) params.set("low_stock", "true")
    try { setItems(await (await fetch(`/api/helpdesk/inventory?${params}`)).json()) } catch {}
    setLoading(false)
  }

  useEffect(() => { fetchItems() }, [search, lowStock])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    await fetch("/api/helpdesk/inventory", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...form, quantity: parseInt(form.quantity), min_quantity: parseInt(form.min_quantity), unit_price: parseFloat(form.unit_price) }),
    })
    setSaving(false)
    setShowDialog(false)
    setForm({ name: "", sku: "", category: "", quantity: "0", min_quantity: "0", location: "", unit_price: "0" })
    fetchItems()
  }

  async function updateQty(id: number, qty: number) {
    await fetch("/api/helpdesk/inventory", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id, quantity: qty }) })
    fetchItems()
  }

  return (
    <div className="space-y-5 animate-fade-in">
      <div className="flex items-center justify-between">
        <div><h1 className="text-2xl font-bold">Inventar</h1><p className="text-muted-foreground text-sm mt-0.5">IT-Bestandsführung und Lagerverwaltung</p></div>
        <Button onClick={() => setShowDialog(true)} className="bg-purple-600 hover:bg-purple-700"><Plus className="h-4 w-4" /> Neuer Artikel</Button>
      </div>

      <div className="flex gap-3 flex-wrap">
        <div className="relative"><Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" /><Input placeholder="Suchen..." className="pl-9 w-64" value={search} onChange={e => setSearch(e.target.value)} /></div>
        <Button variant={lowStock ? "default" : "outline"} size="sm" onClick={() => setLowStock(!lowStock)} className={lowStock ? "bg-amber-600 hover:bg-amber-700" : ""}>
          <AlertTriangle className="h-3.5 w-3.5 mr-1" /> Niedriger Bestand
        </Button>
      </div>

      <Card>
        <CardContent className="p-0">
          {loading ? <div className="flex justify-center py-16"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
          : !Array.isArray(items) || items.length === 0 ? <div className="flex flex-col items-center justify-center py-16 text-muted-foreground"><AlertCircle className="h-8 w-8 mb-2 opacity-40" /><p className="text-sm">Keine Artikel</p></div>
          : (
            <Table>
              <TableHeader><TableRow><TableHead>Artikel</TableHead><TableHead>SKU</TableHead><TableHead>Kategorie</TableHead><TableHead>Bestand</TableHead><TableHead>Min.</TableHead><TableHead>Standort</TableHead><TableHead>Lieferant</TableHead></TableRow></TableHeader>
              <TableBody>
                {items.map((item: any) => {
                  const isLow = item.quantity <= item.min_quantity && item.min_quantity > 0
                  return (
                    <TableRow key={item.id}>
                      <TableCell className="font-medium">{item.name}</TableCell>
                      <TableCell className="text-sm text-muted-foreground font-mono">{item.sku || "–"}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">{item.category || "–"}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <input type="number" value={item.quantity} onChange={e => updateQty(item.id, parseInt(e.target.value) || 0)}
                            className="w-16 h-7 rounded border border-input bg-background px-2 text-sm tabular-nums text-center" />
                          {isLow && <Badge variant="warning" className="text-[10px]">Niedrig</Badge>}
                        </div>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground tabular-nums">{item.min_quantity}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">{item.location || "–"}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">{item.supplier_name || "–"}</TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>Neuer Inventar-Artikel</DialogTitle></DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5"><Label>Name *</Label><Input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} required /></div>
              <div className="space-y-1.5"><Label>SKU</Label><Input value={form.sku} onChange={e => setForm({ ...form, sku: e.target.value })} /></div>
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div className="space-y-1.5"><Label>Kategorie</Label><Input value={form.category} onChange={e => setForm({ ...form, category: e.target.value })} /></div>
              <div className="space-y-1.5"><Label>Menge</Label><Input type="number" value={form.quantity} onChange={e => setForm({ ...form, quantity: e.target.value })} /></div>
              <div className="space-y-1.5"><Label>Min. Menge</Label><Input type="number" value={form.min_quantity} onChange={e => setForm({ ...form, min_quantity: e.target.value })} /></div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5"><Label>Standort</Label><Input value={form.location} onChange={e => setForm({ ...form, location: e.target.value })} /></div>
              <div className="space-y-1.5"><Label>Stückpreis (€)</Label><Input type="number" step="0.01" value={form.unit_price} onChange={e => setForm({ ...form, unit_price: e.target.value })} /></div>
            </div>
            <DialogFooter><Button type="button" variant="outline" onClick={() => setShowDialog(false)}>Abbrechen</Button><Button type="submit" disabled={saving} className="bg-purple-600 hover:bg-purple-700">{saving ? <Loader2 className="h-4 w-4 animate-spin" /> : "Erstellen"}</Button></DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
