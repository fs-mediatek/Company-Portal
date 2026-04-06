import { NextRequest, NextResponse } from "next/server"
import { getSessionFromRequest } from "@/lib/auth"
import { coreQuery, coreInsert } from "@/lib/core-db"

export async function GET(req: NextRequest) {
  const session = await getSessionFromRequest(req)
  if (!session) return NextResponse.json({ error: "Nicht angemeldet" }, { status: 401 })

  const departments = await coreQuery(
    "SELECT * FROM departments WHERE active = 1 ORDER BY sort_order ASC, name ASC"
  )
  return NextResponse.json(departments)
}

export async function POST(req: NextRequest) {
  const session = await getSessionFromRequest(req)
  if (!session || !session.role.includes("admin")) {
    return NextResponse.json({ error: "Keine Berechtigung" }, { status: 403 })
  }

  const { name, display_name, parent_id } = await req.json()
  if (!name) return NextResponse.json({ error: "Name erforderlich" }, { status: 400 })

  const id = await coreInsert(
    "INSERT INTO departments (name, display_name, parent_id) VALUES (?, ?, ?)",
    [name, display_name || name, parent_id || null]
  )
  return NextResponse.json({ id }, { status: 201 })
}
