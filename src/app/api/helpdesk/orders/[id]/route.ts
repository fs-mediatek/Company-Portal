import { NextRequest, NextResponse } from "next/server"
import { getSessionFromRequest } from "@/lib/auth"
import { hdQuery } from "@/lib/helpdesk-db"
import { coreQuery } from "@/lib/core-db"

type Ctx = { params: Promise<{ id: string }> }

export async function GET(req: NextRequest, { params }: Ctx) {
  const session = await getSessionFromRequest(req)
  if (!session) return NextResponse.json({ error: "Nicht angemeldet" }, { status: 401 })

  const { id } = await params
  const [order] = await hdQuery<any>("SELECT * FROM orders WHERE id = ?", [id])
  if (!order) return NextResponse.json({ error: "Auftrag nicht gefunden" }, { status: 404 })

  const items = await hdQuery("SELECT * FROM order_items WHERE order_id = ? ORDER BY id ASC", [id])

  // Resolve user names
  const userIds = [order.requested_by, order.assignee_id].filter(Boolean)
  let userMap: Record<number, string> = {}
  if (userIds.length > 0) {
    const users = await coreQuery<any>(`SELECT id, name FROM users WHERE id IN (${userIds.join(",")})`)
    userMap = Object.fromEntries(users.map((u: any) => [u.id, u.name]))
  }

  return NextResponse.json({
    ...order,
    requester_name: userMap[order.requested_by] || "Unbekannt",
    assignee_name: order.assignee_id ? userMap[order.assignee_id] || "–" : null,
    items,
  })
}

export async function PUT(req: NextRequest, { params }: Ctx) {
  const session = await getSessionFromRequest(req)
  if (!session) return NextResponse.json({ error: "Nicht angemeldet" }, { status: 401 })

  const isPrivileged = session.role.includes("admin") || session.role.includes("agent") || session.role.includes("manager")
  if (!isPrivileged) return NextResponse.json({ error: "Keine Berechtigung" }, { status: 403 })

  const { id } = await params
  const body = await req.json()
  const allowed = ["status", "assignee_id", "title", "description"]
  const sets: string[] = []
  const vals: any[] = []

  for (const key of allowed) {
    if (body[key] !== undefined) { sets.push(`${key} = ?`); vals.push(body[key]) }
  }

  if (sets.length === 0) return NextResponse.json({ error: "Keine Änderungen" }, { status: 400 })

  vals.push(id)
  await hdQuery(`UPDATE orders SET ${sets.join(", ")} WHERE id = ?`, vals)
  return NextResponse.json({ success: true })
}
