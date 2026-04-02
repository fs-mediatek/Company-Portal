import { NextRequest, NextResponse } from "next/server"
import { getSession } from "@/lib/auth"
import { query, insert } from "@/lib/db"

export async function GET(req: NextRequest) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const search = searchParams.get("search") || ""
  const status = searchParams.get("status") || ""
  const page = parseInt(searchParams.get("page") || "1")
  const limit = parseInt(searchParams.get("limit") || "25")
  const offset = (page - 1) * limit

  let where = "WHERE 1=1"
  const params: any[] = []

  if (search) {
    where += " AND (c.commission_number LIKE ? OR c.recipient_name LIKE ? OR c.notes LIKE ?)"
    params.push(`%${search}%`, `%${search}%`, `%${search}%`)
  }
  if (status) {
    where += " AND c.status = ?"
    params.push(status)
  }

  // Non-privileged users see only their own
  const isPrivileged = ["admin", "manager", "techniker", "hausmeister"].some(r => session.role.includes(r))
  if (!isPrivileged) {
    where += " AND c.requester_id = ?"
    params.push(session.userId)
  }

  const items = await query(
    `SELECT c.*, u.name as requester_name, a.name as assigned_name, l.name as location_name,
      (SELECT COUNT(*) FROM commission_items ci WHERE ci.commission_id = c.id) as item_count
     FROM commissions c
     LEFT JOIN users u ON c.requester_id = u.id
     LEFT JOIN users a ON c.assigned_to_user_id = a.id
     LEFT JOIN locations l ON c.location_id = l.id
     ${where}
     ORDER BY c.created_at DESC
     LIMIT ${limit} OFFSET ${offset}`,
    params
  )

  const countResult = await query(`SELECT COUNT(*) as total FROM commissions c ${where}`, params)

  return NextResponse.json({ commissions: items, total: (countResult[0] as any).total, page, limit })
}

export async function POST(req: NextRequest) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const body = await req.json()
  if (!body.recipient_name) return NextResponse.json({ error: "Empfänger erforderlich" }, { status: 400 })

  // Generate commission number: KOM-YYYY-NNNN
  const year = new Date().getFullYear()
  await query(
    `INSERT INTO commission_counters (year, last_number) VALUES (?, 1)
     ON DUPLICATE KEY UPDATE last_number = last_number + 1`,
    [year]
  )
  const counter = await query(`SELECT last_number FROM commission_counters WHERE year = ?`, [year])
  const num = (counter[0] as any).last_number
  const commissionNumber = `KOM-${year}-${String(num).padStart(4, "0")}`

  const commissionId = await insert(
    `INSERT INTO commissions (commission_number, requester_id, recipient_name, recipient_street, recipient_zip, recipient_city, recipient_phone, location_id, delivery_date, notes, status)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      commissionNumber,
      session.userId,
      body.recipient_name,
      body.recipient_street || null,
      body.recipient_zip || null,
      body.recipient_city || null,
      body.recipient_phone || null,
      body.location_id || null,
      body.delivery_date || null,
      body.notes || null,
      body.status || "entwurf",
    ]
  )

  // Insert items if provided
  if (Array.isArray(body.items) && body.items.length > 0) {
    for (let i = 0; i < body.items.length; i++) {
      const item = body.items[i]
      if (!item.article_name) continue
      await insert(
        `INSERT INTO commission_items (commission_id, article_name, article_number, quantity, unit, unit_price, notes, sort_order)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [commissionId, item.article_name, item.article_number || null, item.quantity || 1, item.unit || "Stk.", item.unit_price || 0, item.notes || null, i]
      )
    }
  }

  return NextResponse.json({ id: commissionId, commission_number: commissionNumber }, { status: 201 })
}
