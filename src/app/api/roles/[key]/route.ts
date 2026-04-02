import { NextRequest, NextResponse } from "next/server"
import { getSession } from "@/lib/auth"
import { query, queryOne } from "@/lib/db"

type Ctx = { params: Promise<{ key: string }> }

export async function PUT(req: NextRequest, { params }: Ctx) {
  const session = await getSession()
  if (!session || !session.role.includes("admin")) {
    return NextResponse.json({ error: "Keine Berechtigung" }, { status: 403 })
  }

  const { key } = await params
  const { label, color } = await req.json()

  const updates: string[] = []
  const vals: any[] = []
  if (label !== undefined) { updates.push("label = ?"); vals.push(label) }
  if (color !== undefined) { updates.push("color = ?"); vals.push(color) }
  if (!updates.length) return NextResponse.json({ error: "Keine Felder" }, { status: 400 })

  await query(`UPDATE roles SET ${updates.join(", ")} WHERE name = ?`, [...vals, key])
  return NextResponse.json({ success: true })
}

export async function DELETE(req: NextRequest, { params }: Ctx) {
  const session = await getSession()
  if (!session || !session.role.includes("admin")) {
    return NextResponse.json({ error: "Keine Berechtigung" }, { status: 403 })
  }

  const { key } = await params
  const role = await queryOne('SELECT is_builtin FROM roles WHERE name = ?', [key])
  if (!role) return NextResponse.json({ error: "Rolle nicht gefunden" }, { status: 404 })
  if ((role as any).is_builtin) return NextResponse.json({ error: "Standard-Rollen können nicht gelöscht werden" }, { status: 400 })

  await query('DELETE FROM roles WHERE name = ?', [key])
  return NextResponse.json({ success: true })
}
