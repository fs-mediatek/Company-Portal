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

  const categories = await coreQuery(`SELECT * FROM order_categories ${where} ORDER BY sort_order ASC, name ASC`, params)
  return NextResponse.json(categories)
}

export async function POST(req: NextRequest) {
  const session = await getSessionFromRequest(req)
  if (!session || !session.role.includes("admin")) {
    return NextResponse.json({ error: "Keine Berechtigung" }, { status: 403 })
  }

  const { name, area, description, workflow_steps } = await req.json()
  if (!name) return NextResponse.json({ error: "Name erforderlich" }, { status: 400 })

  const id = await coreInsert(
    "INSERT INTO order_categories (name, area, description, workflow_steps) VALUES (?, ?, ?, ?)",
    [name, area || "all", description || null, workflow_steps ? JSON.stringify(workflow_steps) : "[]"]
  )
  return NextResponse.json({ id }, { status: 201 })
}
