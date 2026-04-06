import { NextRequest, NextResponse } from "next/server"
import { getSessionFromRequest } from "@/lib/auth"
import { coreQuery, coreQueryOne } from "@/lib/core-db"
import bcrypt from "bcryptjs"

type Ctx = { params: Promise<{ id: string }> }

export async function GET(req: NextRequest, { params }: Ctx) {
  const session = await getSessionFromRequest(req)
  if (!session) return NextResponse.json({ error: "Nicht angemeldet" }, { status: 401 })

  const { id } = await params
  const user = await coreQueryOne(
    `SELECT u.id, u.name, u.email, u.role, u.department_id, u.phone, u.active, u.created_at,
            d.display_name as department_name
     FROM users u LEFT JOIN departments d ON u.department_id = d.id
     WHERE u.id = ?`,
    [id]
  )

  if (!user) return NextResponse.json({ error: "Nicht gefunden" }, { status: 404 })
  return NextResponse.json(user)
}

export async function PUT(req: NextRequest, { params }: Ctx) {
  const session = await getSessionFromRequest(req)
  if (!session || !session.role.includes("admin")) {
    return NextResponse.json({ error: "Keine Berechtigung" }, { status: 403 })
  }

  const { id } = await params
  const body = await req.json()

  const updates: string[] = []
  const vals: any[] = []

  if (body.name !== undefined) { updates.push("name = ?"); vals.push(body.name) }
  if (body.email !== undefined) { updates.push("email = ?"); vals.push(body.email) }
  if (body.role !== undefined) { updates.push("role = ?"); vals.push(body.role) }
  if (body.department_id !== undefined) { updates.push("department_id = ?"); vals.push(body.department_id || null) }
  if (body.phone !== undefined) { updates.push("phone = ?"); vals.push(body.phone || null) }
  if (body.active !== undefined) { updates.push("active = ?"); vals.push(body.active ? 1 : 0) }
  if (body.password) {
    const hash = await bcrypt.hash(body.password, 12)
    updates.push("password_hash = ?"); vals.push(hash)
  }

  if (!updates.length) return NextResponse.json({ error: "Keine Felder" }, { status: 400 })

  await coreQuery(`UPDATE users SET ${updates.join(", ")} WHERE id = ?`, [...vals, id])
  return NextResponse.json({ success: true })
}

export async function DELETE(req: NextRequest, { params }: Ctx) {
  const session = await getSessionFromRequest(req)
  if (!session || !session.role.includes("admin")) {
    return NextResponse.json({ error: "Keine Berechtigung" }, { status: 403 })
  }

  const { id } = await params
  if (parseInt(id) === session.userId) {
    return NextResponse.json({ error: "Eigenes Konto kann nicht deaktiviert werden" }, { status: 400 })
  }

  await coreQuery("UPDATE users SET active = 0 WHERE id = ?", [id])
  return NextResponse.json({ success: true })
}
