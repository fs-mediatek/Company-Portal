"use client"
import { useState, useEffect, useRef } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Separator } from "@/components/ui/separator"
import {
  Loader2, ArrowLeft, Package, Printer, CheckCircle2, Plus, Trash2,
  User, MapPin, Calendar, ClipboardList, Save, X,
} from "lucide-react"
import { formatDistanceToNow } from "date-fns"
import { de } from "date-fns/locale"

interface CommissionItem {
  id: number
  article_name: string
  article_number: string | null
  quantity: number
  unit: string
  picked_quantity: number
  unit_price: number
  notes: string | null
}

interface Commission {
  id: number
  commission_number: string
  status: string
  requester_name: string
  requester_email: string
  assigned_name: string | null
  location_name: string | null
  location_street: string | null
  location_zip: string | null
  location_city: string | null
  recipient_name: string
  recipient_street: string | null
  recipient_zip: string | null
  recipient_city: string | null
  recipient_phone: string | null
  delivery_date: string | null
  notes: string | null
  items: CommissionItem[]
  created_at: string
  completed_at: string | null
}

const statusMap: Record<string, { label: string; variant: any }> = {
  entwurf: { label: "Entwurf", variant: "secondary" },
  offen: { label: "Offen", variant: "info" },
  in_bearbeitung: { label: "In Bearbeitung", variant: "purple" },
  abgeschlossen: { label: "Abgeschlossen", variant: "success" },
  storniert: { label: "Storniert", variant: "destructive" },
}

const statusTransitions: Record<string, string[]> = {
  entwurf: ["offen", "storniert"],
  offen: ["in_bearbeitung", "storniert"],
  in_bearbeitung: ["abgeschlossen", "offen", "storniert"],
  abgeschlossen: [],
  storniert: [],
}

export function CommissionDetailClient({ id, userRole, userName }: { id: string; userRole: string; userName: string }) {
  const [commission, setCommission] = useState<Commission | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [addingItem, setAddingItem] = useState(false)
  const [newItem, setNewItem] = useState({ article_name: "", article_number: "", quantity: 1, unit: "Stk.", unit_price: 0 })
  const printRef = useRef<HTMLDivElement>(null)
  const router = useRouter()

  const isPrivileged = ["admin", "manager", "techniker", "hausmeister"].some(r => userRole.includes(r))
  const isEditable = commission && !["abgeschlossen", "storniert"].includes(commission.status)

  async function fetchCommission() {
    setLoading(true)
    try {
      const res = await fetch(`/api/commissions/${id}`)
      if (!res.ok) { router.push("/commissions"); return }
      const data = await res.json()
      setCommission(data)
    } catch { router.push("/commissions") }
    setLoading(false)
  }

  useEffect(() => { fetchCommission() }, [id])

  async function updateStatus(newStatus: string) {
    setSaving(true)
    await fetch(`/api/commissions/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: newStatus }),
    })
    fetchCommission()
    setSaving(false)
  }

  async function updatePickedQty(itemId: number, picked: number) {
    await fetch(`/api/commissions/${id}/items`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ item_id: itemId, picked_quantity: picked }),
    })
    fetchCommission()
  }

  async function addItemToCommission() {
    if (!newItem.article_name.trim()) return
    setSaving(true)
    await fetch(`/api/commissions/${id}/items`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(newItem),
    })
    setNewItem({ article_name: "", article_number: "", quantity: 1, unit: "Stk.", unit_price: 0 })
    setAddingItem(false)
    fetchCommission()
    setSaving(false)
  }

  async function deleteItem(itemId: number) {
    await fetch(`/api/commissions/${id}/items?item_id=${itemId}`, { method: "DELETE" })
    fetchCommission()
  }

  function printDeliveryNote() {
    const el = printRef.current
    if (!el) return
    const w = window.open("", "_blank", "width=800,height=1100")
    if (!w) return
    w.document.write(`<!DOCTYPE html><html><head><title>Lieferschein ${commission?.commission_number}</title>
      <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { font-family: 'Segoe UI', Arial, sans-serif; font-size: 11pt; color: #1a1a1a; padding: 40px; }
        .header { display: flex; justify-content: space-between; margin-bottom: 30px; }
        .title { font-size: 22pt; font-weight: 700; color: #0d9488; }
        .meta { font-size: 9pt; color: #666; text-align: right; }
        .meta div { margin-bottom: 3px; }
        .addresses { display: flex; gap: 40px; margin-bottom: 30px; }
        .address-block { flex: 1; }
        .address-label { font-size: 8pt; text-transform: uppercase; letter-spacing: 1px; color: #999; margin-bottom: 6px; }
        .address-name { font-weight: 600; font-size: 12pt; margin-bottom: 2px; }
        .address-line { font-size: 10pt; color: #444; line-height: 1.5; }
        table { width: 100%; border-collapse: collapse; margin-bottom: 20px; }
        th { background: #f5f5f5; font-size: 9pt; text-transform: uppercase; letter-spacing: 0.5px; color: #666; padding: 8px 12px; text-align: left; border-bottom: 2px solid #e5e5e5; }
        td { padding: 10px 12px; border-bottom: 1px solid #eee; font-size: 10pt; }
        tr:nth-child(even) { background: #fafafa; }
        .qty { text-align: center; font-weight: 500; }
        .num { font-family: monospace; font-size: 9pt; color: #888; }
        .notes-section { margin-top: 20px; padding: 12px 16px; background: #f8f8f8; border-radius: 4px; font-size: 10pt; }
        .notes-label { font-weight: 600; margin-bottom: 4px; }
        .signatures { display: flex; gap: 60px; margin-top: 60px; }
        .sig-block { flex: 1; }
        .sig-line { border-top: 1px solid #999; padding-top: 6px; font-size: 9pt; color: #666; }
        .footer { margin-top: 40px; padding-top: 15px; border-top: 1px solid #ddd; font-size: 8pt; color: #999; text-align: center; }
        @media print { body { padding: 20px; } }
      </style></head><body>${el.innerHTML}
      <script>window.onload=function(){window.print()}<\/script>
    </body></html>`)
    w.document.close()
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (!commission) return null

  const st = statusMap[commission.status] || statusMap.entwurf
  const transitions = statusTransitions[commission.status] || []
  const allPicked = commission.items.length > 0 && commission.items.every(i => i.picked_quantity >= i.quantity)
  const pickedCount = commission.items.filter(i => i.picked_quantity >= i.quantity).length

  return (
    <div className="space-y-5 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => router.push("/commissions")}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-bold">{commission.commission_number}</h1>
              <Badge variant={st.variant}>{st.label}</Badge>
            </div>
            <p className="text-muted-foreground text-sm mt-0.5">
              Erstellt {formatDistanceToNow(new Date(commission.created_at), { locale: de, addSuffix: true })} von {commission.requester_name}
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          {commission.status !== "entwurf" && (
            <Button variant="outline" onClick={printDeliveryNote}>
              <Printer className="h-4 w-4" /> Lieferschein
            </Button>
          )}
          {isEditable && allPicked && commission.status === "in_bearbeitung" && (
            <Button onClick={() => updateStatus("abgeschlossen")} disabled={saving}>
              <CheckCircle2 className="h-4 w-4" /> Abschließen
            </Button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Main content */}
        <div className="lg:col-span-2 space-y-5">
          {/* Items */}
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base flex items-center gap-2">
                  <ClipboardList className="h-4 w-4" />
                  Positionen ({commission.items.length})
                  {commission.items.length > 0 && (
                    <span className="text-xs font-normal text-muted-foreground ml-1">
                      — {pickedCount}/{commission.items.length} kommissioniert
                    </span>
                  )}
                </CardTitle>
                {isEditable && isPrivileged && (
                  <Button variant="outline" size="sm" onClick={() => setAddingItem(true)}>
                    <Plus className="h-3.5 w-3.5" /> Position
                  </Button>
                )}
              </div>
              {/* Progress bar */}
              {commission.items.length > 0 && (
                <div className="w-full bg-muted rounded-full h-2 mt-2">
                  <div
                    className="bg-primary rounded-full h-2 transition-all"
                    style={{ width: `${(pickedCount / commission.items.length) * 100}%` }}
                  />
                </div>
              )}
            </CardHeader>
            <CardContent className="p-0">
              <table className="w-full">
                <thead>
                  <tr className="border-b text-xs text-muted-foreground uppercase">
                    <th className="px-4 py-2 text-left font-medium">Artikel</th>
                    <th className="px-4 py-2 text-left font-medium">Art.-Nr.</th>
                    <th className="px-4 py-2 text-center font-medium">Soll</th>
                    <th className="px-4 py-2 text-center font-medium">Ist</th>
                    <th className="px-4 py-2 text-center font-medium">Einheit</th>
                    <th className="px-4 py-2 text-right font-medium">E-Preis</th>
                    <th className="px-4 py-2 text-right font-medium">Gesamt</th>
                    {isEditable && isPrivileged && <th className="px-4 py-2 w-20"></th>}
                  </tr>
                </thead>
                <tbody>
                  {commission.items.map(item => {
                    const done = item.picked_quantity >= item.quantity
                    return (
                      <tr key={item.id} className={`border-b last:border-0 ${done ? "bg-emerald-50/50 dark:bg-emerald-950/20" : ""}`}>
                        <td className="px-4 py-3">
                          <span className={`text-sm font-medium ${done ? "line-through text-muted-foreground" : ""}`}>
                            {item.article_name}
                          </span>
                          {item.notes && <span className="block text-xs text-muted-foreground mt-0.5">{item.notes}</span>}
                        </td>
                        <td className="px-4 py-3 text-sm text-muted-foreground font-mono">{item.article_number || "–"}</td>
                        <td className="px-4 py-3 text-center text-sm font-semibold">{item.quantity}</td>
                        <td className="px-4 py-3 text-center">
                          {isEditable && isPrivileged && commission.status === "in_bearbeitung" ? (
                            <Input
                              type="number" min="0" max={item.quantity}
                              value={item.picked_quantity}
                              onChange={e => updatePickedQty(item.id, parseInt(e.target.value) || 0)}
                              className="w-16 h-8 text-center text-sm mx-auto"
                            />
                          ) : (
                            <span className={`text-sm font-semibold ${done ? "text-emerald-600" : "text-amber-600"}`}>
                              {item.picked_quantity}
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-center text-sm text-muted-foreground">{item.unit}</td>
                        <td className="px-4 py-3 text-right text-sm text-muted-foreground">{parseFloat(String(item.unit_price || 0)).toFixed(2)} €</td>
                        <td className="px-4 py-3 text-right text-sm font-medium">{((item.quantity || 0) * parseFloat(String(item.unit_price || 0))).toFixed(2)} €</td>
                        {isEditable && isPrivileged && (
                          <td className="px-4 py-3 text-center">
                            <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-destructive" onClick={() => deleteItem(item.id)}>
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          </td>
                        )}
                      </tr>
                    )
                  })}
                  {/* Add item row */}
                  {addingItem && (
                    <tr className="border-b bg-muted/30">
                      <td className="px-4 py-2">
                        <Input placeholder="Artikelname" value={newItem.article_name} onChange={e => setNewItem(n => ({ ...n, article_name: e.target.value }))} className="h-8 text-sm" autoFocus />
                      </td>
                      <td className="px-4 py-2">
                        <Input placeholder="Art.-Nr." value={newItem.article_number} onChange={e => setNewItem(n => ({ ...n, article_number: e.target.value }))} className="h-8 text-sm" />
                      </td>
                      <td className="px-4 py-2">
                        <Input type="number" min="1" value={newItem.quantity} onChange={e => setNewItem(n => ({ ...n, quantity: parseInt(e.target.value) || 1 }))} className="h-8 text-sm w-16 mx-auto text-center" />
                      </td>
                      <td></td>
                      <td className="px-4 py-2">
                        <Select value={newItem.unit} onValueChange={v => setNewItem(n => ({ ...n, unit: v }))}>
                          <SelectTrigger className="h-8 text-sm"><SelectValue /></SelectTrigger>
                          <SelectContent>
                            {["Stk.", "Pkg.", "Pal.", "Krt.", "m", "kg", "l"].map(u => (
                              <SelectItem key={u} value={u}>{u}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </td>
                      <td className="px-4 py-2">
                        <Input type="number" min="0" step="0.01" placeholder="€" value={newItem.unit_price || ""} onChange={e => setNewItem(n => ({ ...n, unit_price: parseFloat(e.target.value) || 0 }))} className="h-8 text-sm w-20 text-right" />
                      </td>
                      <td></td>
                      <td className="px-4 py-2">
                        <div className="flex gap-1">
                          <Button size="icon" className="h-7 w-7" onClick={addItemToCommission} disabled={saving}>
                            <Save className="h-3.5 w-3.5" />
                          </Button>
                          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setAddingItem(false)}>
                            <X className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  )}
                  {/* Summenzeile */}
                  {commission.items.length > 0 && (
                    <tr className="border-t-2 bg-muted/30">
                      <td className="px-4 py-3 text-sm font-semibold" colSpan={5}>Summe</td>
                      <td className="px-4 py-3 text-right text-sm text-muted-foreground"></td>
                      <td className="px-4 py-3 text-right text-sm font-bold">
                        {commission.items.reduce((sum, i) => sum + (i.quantity || 0) * parseFloat(String(i.unit_price || 0)), 0).toFixed(2)} €
                      </td>
                      {isEditable && isPrivileged && <td></td>}
                    </tr>
                  )}
                </tbody>
              </table>
              {commission.items.length === 0 && !addingItem && (
                <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                  <Package className="h-8 w-8 mb-2 opacity-40" />
                  <p className="text-sm">Noch keine Positionen</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Notes */}
          {commission.notes && (
            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-base">Bemerkungen</CardTitle></CardHeader>
              <CardContent><p className="text-sm text-muted-foreground whitespace-pre-wrap">{commission.notes}</p></CardContent>
            </Card>
          )}
        </div>

        {/* Sidebar */}
        <div className="space-y-5">
          {/* Status */}
          {isEditable && isPrivileged && transitions.length > 0 && (
            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-base">Status ändern</CardTitle></CardHeader>
              <CardContent className="space-y-2">
                {transitions.map(t => {
                  const s = statusMap[t]
                  return (
                    <Button key={t} variant="outline" className="w-full justify-start" onClick={() => updateStatus(t)} disabled={saving}>
                      <Badge variant={s.variant} className="mr-2">{s.label}</Badge>
                    </Button>
                  )
                })}
              </CardContent>
            </Card>
          )}

          {/* Empfänger */}
          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-base flex items-center gap-2"><User className="h-4 w-4" /> Empfänger</CardTitle></CardHeader>
            <CardContent className="space-y-1 text-sm">
              <p className="font-medium">{commission.recipient_name}</p>
              {commission.recipient_street && <p className="text-muted-foreground">{commission.recipient_street}</p>}
              {(commission.recipient_zip || commission.recipient_city) && (
                <p className="text-muted-foreground">{[commission.recipient_zip, commission.recipient_city].filter(Boolean).join(" ")}</p>
              )}
              {commission.recipient_phone && <p className="text-muted-foreground">{commission.recipient_phone}</p>}
            </CardContent>
          </Card>

          {/* Details */}
          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-base">Details</CardTitle></CardHeader>
            <CardContent className="space-y-3 text-sm">
              {commission.location_name && (
                <div className="flex items-center gap-2 text-muted-foreground">
                  <MapPin className="h-4 w-4 shrink-0" />
                  <span>{commission.location_name}</span>
                </div>
              )}
              {commission.delivery_date && (
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Calendar className="h-4 w-4 shrink-0" />
                  <span>{new Date(commission.delivery_date).toLocaleDateString("de-DE")}</span>
                </div>
              )}
              <Separator />
              <div className="text-xs text-muted-foreground space-y-1">
                <p>Erstellt: {new Date(commission.created_at).toLocaleString("de-DE")}</p>
                {commission.completed_at && <p>Abgeschlossen: {new Date(commission.completed_at).toLocaleString("de-DE")}</p>}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* ──────── Hidden: Printable Delivery Note ──────── */}
      <div className="hidden">
        <div ref={printRef}>
          <div className="header">
            <div>
              <div className="title">Lieferschein</div>
            </div>
            <div className="meta">
              <div><strong>{commission.commission_number}</strong></div>
              <div>Datum: {new Date().toLocaleDateString("de-DE")}</div>
              {commission.delivery_date && <div>Lieferdatum: {new Date(commission.delivery_date).toLocaleDateString("de-DE")}</div>}
              <div>Erstellt von: {userName}</div>
            </div>
          </div>

          <div className="addresses">
            {commission.location_name && (
              <div className="address-block">
                <div className="address-label">Absender / Lager</div>
                <div className="address-name">{commission.location_name}</div>
                {commission.location_street && <div className="address-line">{commission.location_street}</div>}
                {(commission.location_zip || commission.location_city) && (
                  <div className="address-line">{commission.location_zip} {commission.location_city}</div>
                )}
              </div>
            )}
            <div className="address-block">
              <div className="address-label">Empfänger</div>
              <div className="address-name">{commission.recipient_name}</div>
              {commission.recipient_street && <div className="address-line">{commission.recipient_street}</div>}
              {(commission.recipient_zip || commission.recipient_city) && (
                <div className="address-line">{commission.recipient_zip} {commission.recipient_city}</div>
              )}
              {commission.recipient_phone && <div className="address-line">Tel.: {commission.recipient_phone}</div>}
            </div>
          </div>

          <table>
            <thead>
              <tr>
                <th style={{ width: "40px" }}>Pos.</th>
                <th>Artikel</th>
                <th style={{ width: "100px" }}>Art.-Nr.</th>
                <th className="qty" style={{ width: "70px" }}>Menge</th>
                <th style={{ width: "60px" }}>Einheit</th>
              </tr>
            </thead>
            <tbody>
              {commission.items.map((item, idx) => (
                <tr key={item.id}>
                  <td className="qty">{idx + 1}</td>
                  <td>{item.article_name}{item.notes ? ` (${item.notes})` : ""}</td>
                  <td className="num">{item.article_number || "–"}</td>
                  <td className="qty">{item.quantity}</td>
                  <td>{item.unit}</td>
                </tr>
              ))}
            </tbody>
          </table>

          {commission.notes && (
            <div className="notes-section">
              <div className="notes-label">Bemerkungen:</div>
              <div>{commission.notes}</div>
            </div>
          )}

          <div className="signatures">
            <div className="sig-block">
              <div className="sig-line">Unterschrift Ausgang (Lager)</div>
            </div>
            <div className="sig-block">
              <div className="sig-line">Unterschrift Empfänger</div>
            </div>
          </div>

          <div className="footer">
            {commission.commission_number} | Erstellt am {new Date().toLocaleDateString("de-DE")} | Facility & Fuhrpark
          </div>
        </div>
      </div>
    </div>
  )
}
