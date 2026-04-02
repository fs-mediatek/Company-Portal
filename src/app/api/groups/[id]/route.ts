import { NextRequest, NextResponse } from "next/server"
import { getSession } from "@/lib/auth"
import { query, queryOne } from "@/lib/db"

type Ctx = { params: Promise<{ id: string }> }

export async function PUT(req: NextRequest, { params }: Ctx) {
  const session = await getSession()
  if (!session || !session.role.includes("admin")) {
    return NextResponse.json({ error: "Keine Berechtigung" }, { status: 403 })
  }

  const { id } = await params
  const body = await req.json()
  const allowed = ["name", "description", "parent_id", "default_roles"]
  const updates = Object.entries(body).filter(([k]) => allowed.includes(k))
  if (!updates.length) return NextResponse.json({ error: "Keine Felder" }, { status: 400 })

  const sets = updates.map(([k]) => `\`${k}\` = ?`).join(", ")
  const vals = updates.map(([, v]) => v ?? null)
  await query(`UPDATE \`groups\` SET ${sets} WHERE id = ?`, [...vals, id])

  return NextResponse.json({ success: true })
}

export async function DELETE(req: NextRequest, { params }: Ctx) {
  const session = await getSession()
  if (!session || !session.role.includes("admin")) {
    return NextResponse.json({ error: "Keine Berechtigung" }, { status: 403 })
  }

  const { id } = await params

  // Check if group has users
  const users = await query('SELECT COUNT(*) as count FROM users WHERE group_id = ?', [id])
  if ((users[0] as any).count > 0) {
    return NextResponse.json({ error: "Gruppe hat noch Benutzer zugewiesen" }, { status: 400 })
  }

  // Check if group has children
  const children = await query('SELECT COUNT(*) as count FROM `groups` WHERE parent_id = ?', [id])
  if ((children[0] as any).count > 0) {
    return NextResponse.json({ error: "Gruppe hat Untergruppen" }, { status: 400 })
  }

  await query('DELETE FROM `groups` WHERE id = ?', [id])
  return NextResponse.json({ success: true })
}
