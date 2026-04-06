import { NextRequest, NextResponse } from "next/server"
import { getSessionFromRequest } from "@/lib/auth"
import { coreQuery, coreInsert } from "@/lib/core-db"

export async function GET(req: NextRequest) {
  const session = await getSessionFromRequest(req)
  if (!session) return NextResponse.json({ error: "Nicht angemeldet" }, { status: 401 })

  const roles = await coreQuery("SELECT * FROM roles ORDER BY sort_order ASC, name ASC")
  return NextResponse.json(roles)
}

export async function POST(req: NextRequest) {
  const session = await getSessionFromRequest(req)
  if (!session || !session.role.includes("admin")) {
    return NextResponse.json({ error: "Keine Berechtigung" }, { status: 403 })
  }

  const { name, label, color } = await req.json()
  if (!name || !label) return NextResponse.json({ error: "Name und Label erforderlich" }, { status: 400 })

  const existing = await coreQuery("SELECT id FROM roles WHERE name = ?", [name])
  if (existing.length) return NextResponse.json({ error: "Rolle existiert bereits" }, { status: 400 })

  const id = await coreInsert(
    "INSERT INTO roles (name, label, color, is_builtin, sort_order) VALUES (?, ?, ?, 0, 100)",
    [name.toLowerCase().replace(/\s+/g, "_"), label, color || "gray"]
  )
  return NextResponse.json({ id }, { status: 201 })
}
