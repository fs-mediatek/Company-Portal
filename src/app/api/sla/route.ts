import { NextRequest, NextResponse } from "next/server"
import { getSessionFromRequest } from "@/lib/auth"
import { coreQuery, coreInsert } from "@/lib/core-db"

export async function GET(req: NextRequest) {
  const session = await getSessionFromRequest(req)
  if (!session) return NextResponse.json({ error: "Nicht angemeldet" }, { status: 401 })

  const area = req.nextUrl.searchParams.get("area") || ""
  let where = "WHERE 1=1"
  const params: any[] = []
  if (area) { where += " AND (area = ? OR area = 'all')"; params.push(area) }

  const rules = await coreQuery(`SELECT * FROM sla_rules ${where} ORDER BY sort_order ASC, name ASC`, params)
  return NextResponse.json(rules)
}

export async function POST(req: NextRequest) {
  const session = await getSessionFromRequest(req)
  if (!session || !session.role.includes("admin")) {
    return NextResponse.json({ error: "Keine Berechtigung" }, { status: 403 })
  }

  const { name, area, match_category, match_priority, response_hours, resolution_hours } = await req.json()
  if (!name) return NextResponse.json({ error: "Name erforderlich" }, { status: 400 })

  const id = await coreInsert(
    "INSERT INTO sla_rules (name, area, match_category, match_priority, response_hours, resolution_hours) VALUES (?, ?, ?, ?, ?, ?)",
    [name, area || "all", match_category || null, match_priority || null, response_hours || null, resolution_hours || null]
  )
  return NextResponse.json({ id }, { status: 201 })
}

export async function PUT(req: NextRequest) {
  const session = await getSessionFromRequest(req)
  if (!session || !session.role.includes("admin")) {
    return NextResponse.json({ error: "Keine Berechtigung" }, { status: 403 })
  }

  const { id, name, area, match_category, match_priority, response_hours, resolution_hours, active } = await req.json()
  if (!id) return NextResponse.json({ error: "ID erforderlich" }, { status: 400 })

  await coreQuery(
    "UPDATE sla_rules SET name = ?, area = ?, match_category = ?, match_priority = ?, response_hours = ?, resolution_hours = ?, active = ? WHERE id = ?",
    [name, area || "all", match_category || null, match_priority || null, response_hours || null, resolution_hours || null, active !== undefined ? (active ? 1 : 0) : 1, id]
  )
  return NextResponse.json({ success: true })
}

export async function DELETE(req: NextRequest) {
  const session = await getSessionFromRequest(req)
  if (!session || !session.role.includes("admin")) {
    return NextResponse.json({ error: "Keine Berechtigung" }, { status: 403 })
  }
  const { id } = await req.json()
  await coreQuery("DELETE FROM sla_rules WHERE id = ?", [id])
  return NextResponse.json({ success: true })
}
