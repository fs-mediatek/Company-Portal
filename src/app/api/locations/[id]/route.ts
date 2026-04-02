import { NextRequest, NextResponse } from "next/server"
import { getSession } from "@/lib/auth"
import { query, queryOne } from "@/lib/db"

type Ctx = { params: Promise<{ id: string }> }

export async function GET(req: NextRequest, { params }: Ctx) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { id } = await params
  const location = await queryOne('SELECT * FROM locations WHERE id = ?', [id])
  if (!location) return NextResponse.json({ error: "Nicht gefunden" }, { status: 404 })

  // Count tickets at this location
  const [ticketCount] = await query<any>(
    'SELECT COUNT(*) as count FROM tickets WHERE location_id = ?', [id]
  )

  return NextResponse.json({ ...(location as any), ticket_count: ticketCount.count })
}

export async function PUT(req: NextRequest, { params }: Ctx) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const isPrivileged = ["admin", "manager"].some(r => session.role.includes(r))
  if (!isPrivileged) return NextResponse.json({ error: "Keine Berechtigung" }, { status: 403 })

  const { id } = await params
  const body = await req.json()

  const allowed = ["name", "street", "zip", "city", "contact_name", "contact_phone", "contact_email", "notes", "latitude", "longitude", "active"]
  const updates = Object.entries(body).filter(([k]) => allowed.includes(k))
  if (!updates.length) return NextResponse.json({ error: "Keine Felder" }, { status: 400 })

  const sets = updates.map(([k]) => `${k} = ?`).join(", ")
  const vals = updates.map(([, v]) => v ?? null)
  await query(`UPDATE locations SET ${sets} WHERE id = ?`, [...vals, id])

  return NextResponse.json({ success: true })
}

export async function DELETE(req: NextRequest, { params }: Ctx) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const isPrivileged = ["admin", "manager"].some(r => session.role.includes(r))
  if (!isPrivileged) return NextResponse.json({ error: "Keine Berechtigung" }, { status: 403 })

  const { id } = await params
  await query('UPDATE locations SET active = 0 WHERE id = ?', [id])
  return NextResponse.json({ success: true })
}
