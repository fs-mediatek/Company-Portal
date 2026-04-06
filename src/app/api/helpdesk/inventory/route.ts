import { NextRequest, NextResponse } from "next/server"
import { getSessionFromRequest } from "@/lib/auth"
import { hdQuery, hdInsert } from "@/lib/helpdesk-db"

export async function GET(req: NextRequest) {
  const session = await getSessionFromRequest(req)
  if (!session) return NextResponse.json({ error: "Nicht angemeldet" }, { status: 401 })

  const lowStock = req.nextUrl.searchParams.get("low_stock")
  const search = req.nextUrl.searchParams.get("search") || ""

  let where = "WHERE i.active = 1"
  const params: any[] = []
  if (lowStock === "true") where += " AND i.quantity <= i.min_quantity"
  if (search) { where += " AND (i.name LIKE ? OR i.sku LIKE ?)"; params.push(`%${search}%`, `%${search}%`) }

  const items = await hdQuery(
    `SELECT i.*, s.name as supplier_name FROM inventory i LEFT JOIN suppliers s ON i.supplier_id = s.id ${where} ORDER BY i.category ASC, i.name ASC`,
    params
  )
  return NextResponse.json(items)
}

export async function POST(req: NextRequest) {
  const session = await getSessionFromRequest(req)
  if (!session) return NextResponse.json({ error: "Nicht angemeldet" }, { status: 401 })
  const isPrivileged = session.role.includes("admin") || session.role.includes("agent")
  if (!isPrivileged) return NextResponse.json({ error: "Keine Berechtigung" }, { status: 403 })

  const { name, sku, category, quantity, min_quantity, location, supplier_id, unit_price, notes } = await req.json()
  if (!name) return NextResponse.json({ error: "Name erforderlich" }, { status: 400 })

  const id = await hdInsert(
    "INSERT INTO inventory (name, sku, category, quantity, min_quantity, location, supplier_id, unit_price, notes) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)",
    [name, sku || null, category || null, quantity || 0, min_quantity || 0, location || null, supplier_id || null, unit_price || 0, notes || null]
  )
  return NextResponse.json({ id }, { status: 201 })
}

export async function PUT(req: NextRequest) {
  const session = await getSessionFromRequest(req)
  if (!session) return NextResponse.json({ error: "Nicht angemeldet" }, { status: 401 })
  const isPrivileged = session.role.includes("admin") || session.role.includes("agent")
  if (!isPrivileged) return NextResponse.json({ error: "Keine Berechtigung" }, { status: 403 })

  const { id, quantity } = await req.json()
  if (!id || quantity === undefined) return NextResponse.json({ error: "ID und Menge erforderlich" }, { status: 400 })
  await hdQuery("UPDATE inventory SET quantity = ? WHERE id = ?", [quantity, id])
  return NextResponse.json({ success: true })
}
