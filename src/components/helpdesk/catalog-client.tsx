"use client"
import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Plus, Search, Loader2, ShoppingCart, Trash2, Package, Minus } from "lucide-react"

interface CatalogItem { id: number; name: string; description: string; category: string; price: number }
interface CartItem { product_name: string; quantity: number; unit_price: number }

export function HelpdeskCatalogClient() {
  const [items, setItems] = useState<CatalogItem[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState("")
  const [cart, setCart] = useState<CartItem[]>([])
  const [showCart, setShowCart] = useState(false)
  const [orderTitle, setOrderTitle] = useState("")
  const [submitting, setSubmitting] = useState(false)
  const [showAdd, setShowAdd] = useState(false)
  const [addForm, setAddForm] = useState({ name: "", description: "", category: "", price: "" })
  const [userRole, setUserRole] = useState("")
  const router = useRouter()

  async function fetchCatalog() {
    setLoading(true)
    const params = new URLSearchParams()
    if (search) params.set("search", search)
    try {
      const res = await fetch(`/api/helpdesk/catalog?${params}`)
      const data = await res.json()
      setItems(Array.isArray(data) ? data : [])
    } catch {}
    setLoading(false)
  }

  useEffect(() => { fetchCatalog() }, [search])
  useEffect(() => {
    fetch("/api/auth/me").then(r => r.json()).then(d => setUserRole(d.role || "")).catch(() => {})
  }, [])

  const isPrivileged = userRole.includes("admin") || userRole.includes("agent")

  function addToCart(item: CatalogItem) {
    setCart(prev => {
      const existing = prev.find(c => c.product_name === item.name)
      if (existing) return prev.map(c => c.product_name === item.name ? { ...c, quantity: c.quantity + 1 } : c)
      return [...prev, { product_name: item.name, quantity: 1, unit_price: item.price }]
    })
  }

  function removeFromCart(name: string) {
    setCart(prev => prev.filter(c => c.product_name !== name))
  }

  function updateQty(name: string, delta: number) {
    setCart(prev => prev.map(c => c.product_name === name ? { ...c, quantity: Math.max(1, c.quantity + delta) } : c))
  }

  async function submitOrder() {
    if (!orderTitle.trim() || cart.length === 0) return
    setSubmitting(true)
    const res = await fetch("/api/helpdesk/orders", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: orderTitle, items: cart }),
    })
    if (res.ok) {
      setCart([])
      setShowCart(false)
      setOrderTitle("")
      router.push("/helpdesk/orders")
    }
    setSubmitting(false)
  }

  async function addCatalogItem(e: React.FormEvent) {
    e.preventDefault()
    await fetch("/api/helpdesk/catalog", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...addForm, price: parseFloat(addForm.price) || 0 }),
    })
    setShowAdd(false)
    setAddForm({ name: "", description: "", category: "", price: "" })
    fetchCatalog()
  }

  const total = cart.reduce((sum, c) => sum + c.quantity * c.unit_price, 0)
  const grouped = items.reduce((acc, item) => {
    const cat = item.category || "Sonstiges"
    if (!acc[cat]) acc[cat] = []
    acc[cat].push(item)
    return acc
  }, {} as Record<string, CatalogItem[]>)

  return (
    <div className="space-y-5 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">IT-Katalog</h1>
          <p className="text-muted-foreground text-sm mt-0.5">Produkte auswählen und bestellen</p>
        </div>
        <div className="flex gap-2">
          {isPrivileged && (
            <Button variant="outline" onClick={() => setShowAdd(true)}>
              <Plus className="h-4 w-4" /> Produkt hinzufügen
            </Button>
          )}
          <Button onClick={() => setShowCart(true)} className="bg-purple-600 hover:bg-purple-700 relative">
            <ShoppingCart className="h-4 w-4" /> Warenkorb
            {cart.length > 0 && (
              <span className="absolute -top-1.5 -right-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-white text-purple-600 text-[10px] font-bold">
                {cart.reduce((s, c) => s + c.quantity, 0)}
              </span>
            )}
          </Button>
        </div>
      </div>

      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input placeholder="Produkt suchen..." className="pl-9" value={search} onChange={e => setSearch(e.target.value)} />
      </div>

      {loading ? (
        <div className="flex justify-center py-16"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
      ) : items.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
          <Package className="h-8 w-8 mb-2 opacity-40" />
          <p className="text-sm">Keine Produkte im Katalog</p>
        </div>
      ) : (
        Object.entries(grouped).map(([category, catItems]) => (
          <div key={category}>
            <h2 className="text-sm font-semibold text-muted-foreground mb-3">{category}</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {catItems.map(item => (
                <Card key={item.id} className="hover:shadow-md transition-shadow">
                  <CardContent className="p-4">
                    <h3 className="font-semibold text-sm mb-1">{item.name}</h3>
                    {item.description && <p className="text-xs text-muted-foreground mb-2 line-clamp-2">{item.description}</p>}
                    <div className="flex items-center justify-between mt-2">
                      <span className="text-sm font-bold tabular-nums">{item.price > 0 ? `${item.price.toFixed(2)} €` : "Kostenlos"}</span>
                      <Button size="sm" variant="outline" onClick={() => addToCart(item)}>
                        <Plus className="h-3 w-3 mr-1" /> Hinzufügen
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        ))
      )}

      {/* Cart Dialog */}
      <Dialog open={showCart} onOpenChange={setShowCart}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>Warenkorb ({cart.length} Positionen)</DialogTitle></DialogHeader>
          {cart.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-6">Warenkorb ist leer</p>
          ) : (
            <div className="space-y-3">
              <div className="space-y-1.5">
                <Label>Auftragstitel *</Label>
                <Input value={orderTitle} onChange={e => setOrderTitle(e.target.value)} placeholder="z.B. Laptop für Neuzugang" />
              </div>
              <div className="space-y-2 max-h-60 overflow-y-auto">
                {cart.map(c => (
                  <div key={c.product_name} className="flex items-center justify-between rounded-lg border p-2.5">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{c.product_name}</p>
                      <p className="text-xs text-muted-foreground">{c.unit_price.toFixed(2)} € × {c.quantity}</p>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <button onClick={() => updateQty(c.product_name, -1)} className="p-1 rounded hover:bg-accent"><Minus className="h-3 w-3" /></button>
                      <span className="text-sm font-medium w-6 text-center tabular-nums">{c.quantity}</span>
                      <button onClick={() => updateQty(c.product_name, 1)} className="p-1 rounded hover:bg-accent"><Plus className="h-3 w-3" /></button>
                      <button onClick={() => removeFromCart(c.product_name)} className="p-1 rounded hover:bg-accent ml-1"><Trash2 className="h-3 w-3 text-destructive" /></button>
                    </div>
                  </div>
                ))}
              </div>
              <div className="flex items-center justify-between pt-2 border-t">
                <span className="text-sm font-semibold">Gesamt:</span>
                <span className="text-lg font-bold tabular-nums">{total.toFixed(2)} €</span>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCart(false)}>Schließen</Button>
            {cart.length > 0 && (
              <Button onClick={submitOrder} disabled={submitting || !orderTitle.trim()} className="bg-purple-600 hover:bg-purple-700">
                {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : "Bestellung aufgeben"}
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add Product Dialog */}
      <Dialog open={showAdd} onOpenChange={setShowAdd}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>Produkt hinzufügen</DialogTitle></DialogHeader>
          <form onSubmit={addCatalogItem} className="space-y-3">
            <div className="space-y-1.5"><Label>Name *</Label><Input value={addForm.name} onChange={e => setAddForm({ ...addForm, name: e.target.value })} required /></div>
            <div className="space-y-1.5"><Label>Beschreibung</Label><Input value={addForm.description} onChange={e => setAddForm({ ...addForm, description: e.target.value })} /></div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5"><Label>Kategorie</Label><Input value={addForm.category} onChange={e => setAddForm({ ...addForm, category: e.target.value })} placeholder="z.B. Hardware" /></div>
              <div className="space-y-1.5"><Label>Preis (€)</Label><Input type="number" step="0.01" value={addForm.price} onChange={e => setAddForm({ ...addForm, price: e.target.value })} /></div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setShowAdd(false)}>Abbrechen</Button>
              <Button type="submit" className="bg-purple-600 hover:bg-purple-700">Erstellen</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
