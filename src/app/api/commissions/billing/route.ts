import { NextRequest, NextResponse } from "next/server"
import { getSession } from "@/lib/auth"
import { query } from "@/lib/db"

export async function GET(req: NextRequest) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const isPrivileged = ["admin", "manager"].some(r => session.role.includes(r))
  if (!isPrivileged) return NextResponse.json({ error: "Keine Berechtigung" }, { status: 403 })

  const { searchParams } = new URL(req.url)
  const month = parseInt(searchParams.get("month") || String(new Date().getMonth() + 1))
  const year = parseInt(searchParams.get("year") || String(new Date().getFullYear()))
  const group = searchParams.get("group") || "gesamt" // gesamt | empfaenger | standort

  // Fetch all completed commissions in the given month
  const commissions = await query(
    `SELECT c.*, u.name as requester_name,
      l.name as location_name,
      (SELECT SUM(ci.quantity * ci.unit_price) FROM commission_items ci WHERE ci.commission_id = c.id) as total_amount,
      (SELECT COUNT(*) FROM commission_items ci WHERE ci.commission_id = c.id) as item_count
     FROM commissions c
     LEFT JOIN users u ON c.requester_id = u.id
     LEFT JOIN locations l ON c.location_id = l.id
     WHERE c.status = 'abgeschlossen'
       AND MONTH(c.completed_at) = ?
       AND YEAR(c.completed_at) = ?
     ORDER BY c.completed_at ASC`,
    [month, year]
  )

  // Fetch all items for these commissions
  const commissionIds = (commissions as any[]).map(c => c.id)
  let items: any[] = []
  if (commissionIds.length > 0) {
    items = await query(
      `SELECT ci.*, c.commission_number, c.recipient_name, c.completed_at, l.name as location_name
       FROM commission_items ci
       JOIN commissions c ON ci.commission_id = c.id
       LEFT JOIN locations l ON c.location_id = l.id
       WHERE ci.commission_id IN (${commissionIds.join(",")})
       ORDER BY c.completed_at, ci.sort_order`,
      []
    )
  }

  // Calculate totals
  const totalAmount = (commissions as any[]).reduce((sum, c) => sum + parseFloat(c.total_amount || 0), 0)
  const totalItems = (commissions as any[]).reduce((sum, c) => sum + (c.item_count || 0), 0)
  const totalCommissions = commissions.length

  // Group data
  let groups: any[] = []
  if (group === "empfaenger") {
    const byRecipient = new Map<string, { commissions: any[]; items: any[]; total: number }>()
    for (const c of commissions as any[]) {
      const key = c.recipient_name || "Unbekannt"
      if (!byRecipient.has(key)) byRecipient.set(key, { commissions: [], items: [], total: 0 })
      const g = byRecipient.get(key)!
      g.commissions.push(c)
      g.total += parseFloat(c.total_amount || 0)
    }
    for (const item of items) {
      const key = item.recipient_name || "Unbekannt"
      byRecipient.get(key)?.items.push(item)
    }
    groups = Array.from(byRecipient.entries()).map(([name, data]) => ({
      label: name,
      commissions: data.commissions,
      items: data.items,
      total: data.total,
      count: data.commissions.length,
    }))
  } else if (group === "standort") {
    const byLocation = new Map<string, { commissions: any[]; items: any[]; total: number }>()
    for (const c of commissions as any[]) {
      const key = c.location_name || "Kein Standort"
      if (!byLocation.has(key)) byLocation.set(key, { commissions: [], items: [], total: 0 })
      const g = byLocation.get(key)!
      g.commissions.push(c)
      g.total += parseFloat(c.total_amount || 0)
    }
    for (const item of items) {
      const key = item.location_name || "Kein Standort"
      byLocation.get(key)?.items.push(item)
    }
    groups = Array.from(byLocation.entries()).map(([name, data]) => ({
      label: name,
      commissions: data.commissions,
      items: data.items,
      total: data.total,
      count: data.commissions.length,
    }))
  } else {
    groups = [{
      label: "Gesamt",
      commissions,
      items,
      total: totalAmount,
      count: totalCommissions,
    }]
  }

  // Fetch saved invoices for this month
  const savedInvoices = await query(
    `SELECT ci.*, u.name as generated_by_name
     FROM commission_invoices ci
     LEFT JOIN users u ON ci.generated_by = u.id
     WHERE ci.month = ? AND ci.year = ?
     ORDER BY ci.created_at DESC`,
    [month, year]
  )

  return NextResponse.json({
    month, year, group,
    totalAmount, totalItems, totalCommissions,
    groups,
    savedInvoices,
  })
}
