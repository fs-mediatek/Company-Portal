"use client"
import { useState, useEffect, useRef } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table"
import {
  Loader2, Printer, Save, Receipt, TrendingUp, Package, ClipboardList,
  ChevronDown, ChevronRight,
} from "lucide-react"

interface BillingGroup {
  label: string
  commissions: any[]
  items: any[]
  total: number
  count: number
}

interface BillingData {
  month: number
  year: number
  group: string
  totalAmount: number
  totalItems: number
  totalCommissions: number
  groups: BillingGroup[]
  savedInvoices: any[]
}

const months = [
  "Januar", "Februar", "März", "April", "Mai", "Juni",
  "Juli", "August", "September", "Oktober", "November", "Dezember",
]

export function BillingClient({ userName }: { userName: string }) {
  const now = new Date()
  const [month, setMonth] = useState(now.getMonth() + 1)
  const [year, setYear] = useState(now.getFullYear())
  const [groupBy, setGroupBy] = useState<"gesamt" | "empfaenger" | "standort">("gesamt")
  const [data, setData] = useState<BillingData | null>(null)
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set())
  const printRef = useRef<HTMLDivElement>(null)

  async function fetchBilling() {
    setLoading(true)
    try {
      const res = await fetch(`/api/commissions/billing?month=${month}&year=${year}&group=${groupBy}`)
      const d = await res.json()
      setData(d)
      // Auto-expand all groups
      setExpandedGroups(new Set((d.groups || []).map((g: any) => g.label)))
    } catch {}
    setLoading(false)
  }

  useEffect(() => { fetchBilling() }, [month, year, groupBy])

  function toggleGroup(label: string) {
    setExpandedGroups(prev => {
      const next = new Set(prev)
      next.has(label) ? next.delete(label) : next.add(label)
      return next
    })
  }

  async function saveInvoice() {
    if (!data) return
    setSaving(true)
    try {
      const res = await fetch("/api/commissions/billing/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          month, year,
          group_type: groupBy,
          group_value: groupBy === "gesamt" ? null : data.groups.map(g => g.label).join(", "),
          total_amount: data.totalAmount,
          total_items: data.totalItems,
          total_commissions: data.totalCommissions,
        }),
      })
      if (res.ok) fetchBilling()
    } catch {}
    setSaving(false)
  }

  function printBilling() {
    const el = printRef.current
    if (!el) return
    const w = window.open("", "_blank", "width=800,height=1100")
    if (!w) return
    w.document.write(`<!DOCTYPE html><html><head><title>Monatsabrechnung ${months[month - 1]} ${year}</title>
      <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { font-family: 'Segoe UI', Arial, sans-serif; font-size: 10pt; color: #1a1a1a; padding: 35px; }
        .header { display: flex; justify-content: space-between; margin-bottom: 25px; border-bottom: 2px solid #0d9488; padding-bottom: 15px; }
        .title { font-size: 20pt; font-weight: 700; color: #0d9488; }
        .subtitle { font-size: 11pt; color: #666; margin-top: 3px; }
        .meta { font-size: 9pt; color: #666; text-align: right; }
        .meta div { margin-bottom: 2px; }
        .summary { display: flex; gap: 20px; margin-bottom: 25px; }
        .summary-card { flex: 1; padding: 12px 16px; background: #f8fafb; border: 1px solid #e5e7eb; border-radius: 6px; }
        .summary-value { font-size: 18pt; font-weight: 700; color: #0d9488; }
        .summary-label { font-size: 8pt; text-transform: uppercase; letter-spacing: 0.5px; color: #888; margin-top: 2px; }
        .group-header { background: #f3f4f6; padding: 8px 12px; font-weight: 600; font-size: 11pt; margin-top: 15px; border-radius: 4px; display: flex; justify-content: space-between; }
        .group-total { color: #0d9488; }
        table { width: 100%; border-collapse: collapse; margin-bottom: 10px; }
        th { background: #f9fafb; font-size: 8pt; text-transform: uppercase; letter-spacing: 0.5px; color: #666; padding: 6px 10px; text-align: left; border-bottom: 1px solid #e5e5e5; }
        td { padding: 7px 10px; border-bottom: 1px solid #f0f0f0; font-size: 9pt; }
        .right { text-align: right; }
        .bold { font-weight: 600; }
        .total-row { background: #f0fdf4; font-weight: 600; }
        .total-row td { border-top: 2px solid #0d9488; padding-top: 10px; }
        .footer { margin-top: 30px; padding-top: 12px; border-top: 1px solid #ddd; font-size: 8pt; color: #999; text-align: center; }
        .signatures { display: flex; gap: 60px; margin-top: 50px; }
        .sig-block { flex: 1; }
        .sig-line { border-top: 1px solid #999; padding-top: 5px; font-size: 8pt; color: #666; }
        @media print { body { padding: 15px; } }
      </style></head><body>${el.innerHTML}
      <script>window.onload=function(){window.print()}<\/script>
    </body></html>`)
    w.document.close()
  }

  const fmt = (n: number) => n.toLocaleString("de-DE", { minimumFractionDigits: 2, maximumFractionDigits: 2 })

  return (
    <div className="space-y-5 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Monatsabrechnung</h1>
          <p className="text-muted-foreground text-sm mt-0.5">Kommissionierungen pro Monat auswerten</p>
        </div>
        <div className="flex gap-2">
          {data && data.totalCommissions > 0 && (
            <>
              <Button variant="outline" onClick={printBilling}>
                <Printer className="h-4 w-4" /> Drucken
              </Button>
              <Button onClick={saveInvoice} disabled={saving}>
                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                Abrechnung speichern
              </Button>
            </>
          )}
        </div>
      </div>

      {/* Filters */}
      <div className="flex gap-3 flex-wrap">
        <Select value={String(month)} onValueChange={v => setMonth(parseInt(v))}>
          <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
          <SelectContent>
            {months.map((m, i) => <SelectItem key={i} value={String(i + 1)}>{m}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={String(year)} onValueChange={v => setYear(parseInt(v))}>
          <SelectTrigger className="w-28"><SelectValue /></SelectTrigger>
          <SelectContent>
            {[now.getFullYear() - 1, now.getFullYear(), now.getFullYear() + 1].map(y => (
              <SelectItem key={y} value={String(y)}>{y}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <div className="flex rounded-lg bg-muted p-0.5 gap-0.5">
          {([["gesamt", "Gesamt"], ["empfaenger", "Empfänger"], ["standort", "Standort"]] as const).map(([key, label]) => (
            <button
              key={key}
              onClick={() => setGroupBy(key)}
              className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all ${groupBy === key ? "bg-card shadow-sm text-primary" : "text-muted-foreground hover:text-foreground"}`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* Summary Cards */}
      {data && !loading && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Card>
            <CardContent className="p-4 flex items-center gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10">
                <TrendingUp className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-bold">{fmt(data.totalAmount)} €</p>
                <p className="text-xs text-muted-foreground">Gesamtbetrag</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 flex items-center gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-emerald-500/10">
                <ClipboardList className="h-5 w-5 text-emerald-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{data.totalCommissions}</p>
                <p className="text-xs text-muted-foreground">Aufträge</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 flex items-center gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-blue-500/10">
                <Package className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{data.totalItems}</p>
                <p className="text-xs text-muted-foreground">Positionen</p>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Data */}
      {loading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : data && data.totalCommissions === 0 ? (
        <Card>
          <CardContent className="py-16 text-center text-muted-foreground">
            <Receipt className="h-8 w-8 mx-auto mb-2 opacity-40" />
            <p className="text-sm">Keine abgeschlossenen Aufträge in {months[month - 1]} {year}</p>
          </CardContent>
        </Card>
      ) : data && (
        <div className="space-y-4">
          {data.groups.map((group, gi) => {
            const expanded = expandedGroups.has(group.label)
            return (
              <Card key={gi}>
                {/* Group header (clickable for non-gesamt) */}
                {groupBy !== "gesamt" ? (
                  <button
                    onClick={() => toggleGroup(group.label)}
                    className="w-full flex items-center justify-between px-4 py-3 hover:bg-muted/50 transition-colors rounded-t-lg"
                  >
                    <div className="flex items-center gap-2">
                      {expanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                      <span className="font-semibold">{group.label}</span>
                      <Badge variant="secondary">{group.count} Aufträge</Badge>
                    </div>
                    <span className="font-bold text-primary">{fmt(group.total)} €</span>
                  </button>
                ) : (
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base">Alle Aufträge</CardTitle>
                  </CardHeader>
                )}

                {(groupBy === "gesamt" || expanded) && (
                  <CardContent className="p-0">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Auftrag</TableHead>
                          <TableHead>Empfänger</TableHead>
                          <TableHead>Standort</TableHead>
                          <TableHead className="text-center">Positionen</TableHead>
                          <TableHead>Abgeschlossen</TableHead>
                          <TableHead className="text-right">Betrag</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {group.commissions.map((c: any) => (
                          <TableRow key={c.id}>
                            <TableCell className="font-mono text-xs">{c.commission_number}</TableCell>
                            <TableCell className="text-sm">{c.recipient_name || "–"}</TableCell>
                            <TableCell className="text-sm text-muted-foreground">{c.location_name || "–"}</TableCell>
                            <TableCell className="text-center text-sm">{c.item_count}</TableCell>
                            <TableCell className="text-sm text-muted-foreground">
                              {c.completed_at ? new Date(c.completed_at).toLocaleDateString("de-DE") : "–"}
                            </TableCell>
                            <TableCell className="text-right text-sm font-medium">{fmt(parseFloat(c.total_amount || 0))} €</TableCell>
                          </TableRow>
                        ))}
                        {/* Zwischensumme */}
                        <TableRow className="bg-muted/30">
                          <TableCell colSpan={5} className="text-sm font-semibold">
                            {groupBy === "gesamt" ? "Gesamtsumme" : `Summe ${group.label}`}
                          </TableCell>
                          <TableCell className="text-right text-sm font-bold text-primary">{fmt(group.total)} €</TableCell>
                        </TableRow>
                      </TableBody>
                    </Table>
                  </CardContent>
                )}
              </Card>
            )
          })}
        </div>
      )}

      {/* Saved invoices */}
      {data && data.savedInvoices && data.savedInvoices.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <Receipt className="h-4 w-4" /> Gespeicherte Abrechnungen
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {data.savedInvoices.map((inv: any) => (
                <div key={inv.id} className="flex items-center justify-between py-2 px-3 rounded-lg bg-muted/50 text-sm">
                  <div className="flex items-center gap-3">
                    <span className="font-mono text-xs">{inv.invoice_number}</span>
                    <Badge variant="secondary">{inv.group_type === "gesamt" ? "Gesamt" : inv.group_type === "empfaenger" ? "Pro Empfänger" : "Pro Standort"}</Badge>
                  </div>
                  <div className="flex items-center gap-4 text-muted-foreground">
                    <span>{inv.total_commissions} Aufträge</span>
                    <span className="font-medium text-foreground">{fmt(parseFloat(inv.total_amount))} €</span>
                    <span className="text-xs">{new Date(inv.created_at).toLocaleDateString("de-DE")} von {inv.generated_by_name}</span>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* ──────── Hidden: Printable Billing ──────── */}
      <div className="hidden">
        <div ref={printRef}>
          {data && (
            <>
              <div className="header">
                <div>
                  <div className="title">Monatsabrechnung</div>
                  <div className="subtitle">{months[month - 1]} {year} — {groupBy === "gesamt" ? "Gesamtübersicht" : groupBy === "empfaenger" ? "Gruppiert nach Empfänger" : "Gruppiert nach Standort"}</div>
                </div>
                <div className="meta">
                  <div>Erstellt am: {new Date().toLocaleDateString("de-DE")}</div>
                  <div>Erstellt von: {userName}</div>
                  <div>{data.totalCommissions} Aufträge | {data.totalItems} Positionen</div>
                </div>
              </div>

              <div className="summary">
                <div className="summary-card">
                  <div className="summary-value">{fmt(data.totalAmount)} €</div>
                  <div className="summary-label">Gesamtbetrag</div>
                </div>
                <div className="summary-card">
                  <div className="summary-value">{data.totalCommissions}</div>
                  <div className="summary-label">Aufträge</div>
                </div>
                <div className="summary-card">
                  <div className="summary-value">{data.totalItems}</div>
                  <div className="summary-label">Positionen</div>
                </div>
              </div>

              {data.groups.map((group, gi) => (
                <div key={gi}>
                  {groupBy !== "gesamt" && (
                    <div className="group-header">
                      <span>{group.label} ({group.count} Aufträge)</span>
                      <span className="group-total">{fmt(group.total)} €</span>
                    </div>
                  )}
                  <table>
                    <thead>
                      <tr>
                        <th>Auftrag</th>
                        <th>Empfänger</th>
                        <th>Standort</th>
                        <th className="right">Pos.</th>
                        <th>Abgeschlossen</th>
                        <th className="right">Betrag</th>
                      </tr>
                    </thead>
                    <tbody>
                      {group.commissions.map((c: any) => (
                        <tr key={c.id}>
                          <td>{c.commission_number}</td>
                          <td>{c.recipient_name || "–"}</td>
                          <td>{c.location_name || "–"}</td>
                          <td className="right">{c.item_count}</td>
                          <td>{c.completed_at ? new Date(c.completed_at).toLocaleDateString("de-DE") : "–"}</td>
                          <td className="right bold">{fmt(parseFloat(c.total_amount || 0))} €</td>
                        </tr>
                      ))}
                      <tr className="total-row">
                        <td colSpan={5} className="bold">{groupBy === "gesamt" ? "Gesamtsumme" : `Summe ${group.label}`}</td>
                        <td className="right bold">{fmt(group.total)} €</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              ))}

              <div className="signatures">
                <div className="sig-block">
                  <div className="sig-line">Unterschrift Ersteller</div>
                </div>
                <div className="sig-block">
                  <div className="sig-line">Unterschrift Freigabe</div>
                </div>
              </div>

              <div className="footer">
                Monatsabrechnung {months[month - 1]} {year} | Erstellt am {new Date().toLocaleDateString("de-DE")} | Facility & Fuhrpark
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
