import { NextRequest, NextResponse } from "next/server"
import { getSessionFromRequest } from "@/lib/auth"
import { hdQuery, hdInsert } from "@/lib/helpdesk-db"
import { coreQuery } from "@/lib/core-db"

export async function GET(req: NextRequest) {
  const session = await getSessionFromRequest(req)
  if (!session) return NextResponse.json({ error: "Nicht angemeldet" }, { status: 401 })

  const sp = req.nextUrl.searchParams
  const status = sp.get("status") || ""
  const search = sp.get("search") || ""
  const isPrivileged = session.role.includes("admin") || session.role.includes("agent") || session.role.includes("manager")

  let where = "WHERE 1=1"
  const params: any[] = []

  if (status && status !== "all") { where += " AND o.status = ?"; params.push(status) }
  if (search) { where += " AND (o.title LIKE ? OR o.order_number LIKE ?)"; params.push(`%${search}%`, `%${search}%`) }
  if (!isPrivileged) { where += " AND o.requested_by = ?"; params.push(session.userId) }

  const orders = await hdQuery<any>(`SELECT o.* FROM orders o ${where} ORDER BY o.created_at DESC LIMIT 100`, params)

  // Resolve user names
  const userIds = [...new Set(orders.flatMap((o: any) => [o.requested_by, o.assignee_id].filter(Boolean)))]
  let userMap: Record<number, string> = {}
  if (userIds.length > 0) {
    const users = await coreQuery<any>(`SELECT id, name FROM users WHERE id IN (${userIds.join(",")})`)
    userMap = Object.fromEntries(users.map((u: any) => [u.id, u.name]))
  }

  return NextResponse.json(orders.map((o: any) => ({
    ...o,
    requester_name: userMap[o.requested_by] || "Unbekannt",
    assignee_name: o.assignee_id ? userMap[o.assignee_id] || "–" : null,
  })))
}

export async function POST(req: NextRequest) {
  const session = await getSessionFromRequest(req)
  if (!session) return NextResponse.json({ error: "Nicht angemeldet" }, { status: 401 })

  const { title, description, category_id, items } = await req.json()
  if (!title) return NextResponse.json({ error: "Titel erforderlich" }, { status: 400 })

  // Load prefix from settings
  const [prefixRow] = await coreQuery<any>("SELECT value FROM settings WHERE key_name = 'order_prefix_helpdesk'")
  const orderPrefix = prefixRow?.value || "ORD-IT"

  // Generate order number
  const year = new Date().getFullYear()
  await hdQuery("INSERT INTO order_counters (year, last_number) VALUES (?, 0) ON DUPLICATE KEY UPDATE last_number = last_number", [year])
  await hdQuery("UPDATE order_counters SET last_number = last_number + 1 WHERE year = ?", [year])
  const [counter] = await hdQuery<any>("SELECT last_number FROM order_counters WHERE year = ?", [year])
  const num = String(counter.last_number).padStart(4, "0")
  const orderNumber = `${orderPrefix}-${year}-${num}`

  const id = await hdInsert(
    "INSERT INTO orders (order_number, title, description, category_id, status, requested_by) VALUES (?, ?, ?, ?, 'requested', ?)",
    [orderNumber, title, description || "", category_id || null, session.userId]
  )

  // Insert items
  if (Array.isArray(items)) {
    for (const item of items) {
      await hdInsert(
        "INSERT INTO order_items (order_id, product_name, quantity, unit_price, notes) VALUES (?, ?, ?, ?, ?)",
        [id, item.product_name, item.quantity || 1, item.unit_price || 0, item.notes || null]
      )
    }
  }

  return NextResponse.json({ id, order_number: orderNumber }, { status: 201 })
}
