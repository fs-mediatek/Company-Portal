import { NextRequest, NextResponse } from "next/server"
import { getSession } from "@/lib/auth"
import { query, insert } from "@/lib/db"

type Ctx = { params: Promise<{ id: string }> }

export async function POST(req: NextRequest, { params }: Ctx) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  const { id } = await params

  const body = await req.json()
  if (!body.article_name) return NextResponse.json({ error: "Artikelname erforderlich" }, { status: 400 })

  // Get next sort_order
  const maxResult = await query(`SELECT COALESCE(MAX(sort_order), 0) + 1 as next_sort FROM commission_items WHERE commission_id = ?`, [id])
  const nextSort = (maxResult[0] as any).next_sort

  const itemId = await insert(
    `INSERT INTO commission_items (commission_id, article_name, article_number, quantity, unit, unit_price, notes, sort_order)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    [id, body.article_name, body.article_number || null, body.quantity || 1, body.unit || "Stk.", body.unit_price || 0, body.notes || null, nextSort]
  )

  return NextResponse.json({ id: itemId }, { status: 201 })
}

export async function PUT(req: NextRequest, { params }: Ctx) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  const { id } = await params

  const body = await req.json()
  if (!body.item_id) return NextResponse.json({ error: "item_id erforderlich" }, { status: 400 })

  const allowed = ["article_name", "article_number", "quantity", "unit", "unit_price", "picked_quantity", "notes"]
  const updates = Object.entries(body).filter(([k]) => allowed.includes(k))
  if (!updates.length) return NextResponse.json({ error: "Keine Felder" }, { status: 400 })

  const sets = updates.map(([k]) => `${k} = ?`).join(", ")
  const vals = updates.map(([, v]) => v)
  await query(`UPDATE commission_items SET ${sets} WHERE id = ? AND commission_id = ?`, [...vals, body.item_id, id])

  return NextResponse.json({ success: true })
}

export async function DELETE(req: NextRequest, { params }: Ctx) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  const { id } = await params

  const { searchParams } = new URL(req.url)
  const itemId = searchParams.get("item_id")
  if (!itemId) return NextResponse.json({ error: "item_id erforderlich" }, { status: 400 })

  await query(`DELETE FROM commission_items WHERE id = ? AND commission_id = ?`, [itemId, id])
  return NextResponse.json({ success: true })
}
