import { NextRequest, NextResponse } from "next/server"
import { getSession } from "@/lib/auth"
import { query, insert } from "@/lib/db"

export async function POST(req: NextRequest) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const isPrivileged = ["admin", "manager"].some(r => session.role.includes(r))
  if (!isPrivileged) return NextResponse.json({ error: "Keine Berechtigung" }, { status: 403 })

  const body = await req.json()
  const { month, year, group_type, group_value, total_amount, total_items, total_commissions, notes } = body

  if (!month || !year) return NextResponse.json({ error: "Monat und Jahr erforderlich" }, { status: 400 })

  // Generate invoice number: ABR-YYYY-NNNN
  const invoiceYear = parseInt(year)
  await query(
    `INSERT INTO invoice_counters (year, last_number) VALUES (?, 1)
     ON DUPLICATE KEY UPDATE last_number = last_number + 1`,
    [invoiceYear]
  )
  const counter = await query(`SELECT last_number FROM invoice_counters WHERE year = ?`, [invoiceYear])
  const num = (counter[0] as any).last_number
  const invoiceNumber = `ABR-${invoiceYear}-${String(num).padStart(4, "0")}`

  const id = await insert(
    `INSERT INTO commission_invoices (invoice_number, month, year, group_type, group_value, total_amount, total_items, total_commissions, generated_by, notes)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [invoiceNumber, month, year, group_type || "gesamt", group_value || null, total_amount || 0, total_items || 0, total_commissions || 0, session.userId, notes || null]
  )

  return NextResponse.json({ id, invoice_number: invoiceNumber }, { status: 201 })
}
