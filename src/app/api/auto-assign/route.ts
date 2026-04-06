import { NextRequest, NextResponse } from "next/server"
import { getSessionFromRequest } from "@/lib/auth"
import { coreQuery, coreInsert } from "@/lib/core-db"

export async function GET(req: NextRequest) {
  const session = await getSessionFromRequest(req)
  if (!session || !session.role.includes("admin")) {
    return NextResponse.json({ error: "Keine Berechtigung" }, { status: 403 })
  }

  const rules = await coreQuery(
    `SELECT r.*, u.name as user_name FROM auto_assign_rules r LEFT JOIN users u ON r.assign_to_user_id = u.id ORDER BY r.priority ASC`
  )
  return NextResponse.json(rules)
}

export async function POST(req: NextRequest) {
  const session = await getSessionFromRequest(req)
  if (!session || !session.role.includes("admin")) {
    return NextResponse.json({ error: "Keine Berechtigung" }, { status: 403 })
  }

  const { area, category, assign_to_user_id, priority } = await req.json()
  if (!assign_to_user_id) return NextResponse.json({ error: "Benutzer erforderlich" }, { status: 400 })

  const id = await coreInsert(
    "INSERT INTO auto_assign_rules (area, category, assign_to_user_id, priority) VALUES (?, ?, ?, ?)",
    [area || "all", category || null, assign_to_user_id, priority || 100]
  )
  return NextResponse.json({ id }, { status: 201 })
}

export async function DELETE(req: NextRequest) {
  const session = await getSessionFromRequest(req)
  if (!session || !session.role.includes("admin")) {
    return NextResponse.json({ error: "Keine Berechtigung" }, { status: 403 })
  }
  const { id } = await req.json()
  await coreQuery("DELETE FROM auto_assign_rules WHERE id = ?", [id])
  return NextResponse.json({ success: true })
}
