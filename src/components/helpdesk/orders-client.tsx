"use client"
import { useState, useEffect } from "react"
import Link from "next/link"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table"
import { Plus, Search, Loader2, AlertCircle, ShoppingCart } from "lucide-react"
import { formatDistanceToNow } from "date-fns"
import { de } from "date-fns/locale"

const statusConfig: Record<string, { label: string; variant: any }> = {
  requested: { label: "Beantragt", variant: "info" },
  approved: { label: "Genehmigt", variant: "success" },
  ordered: { label: "Bestellt", variant: "purple" },
  shipped: { label: "Versendet", variant: "warning" },
  delivered: { label: "Geliefert", variant: "success" },
  rejected: { label: "Abgelehnt", variant: "destructive" },
  cancelled: { label: "Storniert", variant: "secondary" },
}

export function HelpdeskOrdersClient() {
  const [orders, setOrders] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState("")

  async function fetchOrders() {
    setLoading(true)
    const params = new URLSearchParams()
    if (search) params.set("search", search)
    try {
      const res = await fetch(`/api/helpdesk/orders?${params}`)
      setOrders(await res.json())
    } catch {}
    setLoading(false)
  }

  useEffect(() => { fetchOrders() }, [search])

  return (
    <div className="space-y-5 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Aufträge</h1>
          <p className="text-muted-foreground text-sm mt-0.5">IT-Bestellungen und Beschaffungsaufträge</p>
        </div>
        <Link href="/helpdesk/catalog">
          <Button className="bg-purple-600 hover:bg-purple-700">
            <ShoppingCart className="h-4 w-4" /> Katalog / Neue Bestellung
          </Button>
        </Link>
      </div>

      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input placeholder="Suchen..." className="pl-9" value={search} onChange={e => setSearch(e.target.value)} />
      </div>

      <Card>
        <CardContent className="p-0">
          {loading ? (
            <div className="flex items-center justify-center py-16"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
          ) : !Array.isArray(orders) || orders.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
              <AlertCircle className="h-8 w-8 mb-2 opacity-40" />
              <p className="text-sm">Keine Aufträge vorhanden</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Auftrag</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Auftraggeber</TableHead>
                  <TableHead>Zugewiesen</TableHead>
                  <TableHead>Erstellt</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {orders.map((o: any) => {
                  const sc = statusConfig[o.status] || { label: o.status, variant: "secondary" }
                  return (
                    <TableRow key={o.id} className="cursor-pointer" onClick={() => window.location.href = `/helpdesk/orders/${o.id}`}>
                      <TableCell>
                        <span className="text-xs font-mono text-muted-foreground block">{o.order_number}</span>
                        <span className="font-medium">{o.title}</span>
                      </TableCell>
                      <TableCell><Badge variant={sc.variant}>{sc.label}</Badge></TableCell>
                      <TableCell className="text-sm text-muted-foreground">{o.requester_name}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">{o.assignee_name || "–"}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {formatDistanceToNow(new Date(o.created_at), { locale: de, addSuffix: true })}
                      </TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
