import { NextRequest, NextResponse } from "next/server"
import { getSession } from "@/lib/auth"
import { coreQuery, coreQueryOne } from "@/lib/core-db"
import bcrypt from "bcryptjs"

export async function GET() {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const user = await coreQueryOne(
    `SELECT u.id, u.name, u.email, u.role, u.phone, u.department_id, d.display_name as department_name, u.created_at
     FROM users u LEFT JOIN departments d ON u.department_id = d.id
     WHERE u.id = ?`,
    [session.userId]
  )

  return NextResponse.json(user)
}

export async function PUT(req: NextRequest) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const body = await req.json()
  const updates: string[] = []
  const vals: any[] = []

  if (body.name) { updates.push("name = ?"); vals.push(body.name) }
  if (body.phone !== undefined) { updates.push("phone = ?"); vals.push(body.phone || null) }
  if (body.password) {
    if (body.password.length < 6) {
      return NextResponse.json({ error: "Passwort muss mindestens 6 Zeichen lang sein" }, { status: 400 })
    }
    const hash = await bcrypt.hash(body.password, 12)
    updates.push("password_hash = ?"); vals.push(hash)
  }

  if (!updates.length) return NextResponse.json({ error: "Keine Änderungen" }, { status: 400 })

  await coreQuery(`UPDATE users SET ${updates.join(", ")} WHERE id = ?`, [...vals, session.userId])
  return NextResponse.json({ success: true })
}
