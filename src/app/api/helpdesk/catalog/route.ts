import { NextRequest, NextResponse } from "next/server"
import { getSessionFromRequest } from "@/lib/auth"
import { hdQuery, hdInsert } from "@/lib/helpdesk-db"

export async function GET(req: NextRequest) {
  const session = await getSessionFromRequest(req)
  if (!session) return NextResponse.json({ error: "Nicht angemeldet" }, { status: 401 })

  const search = req.nextUrl.searchParams.get("search") || ""
  let where = "WHERE active = 1"
  const params: any[] = []
  if (search) { where += " AND (name LIKE ? OR description LIKE ? OR category LIKE ?)"; params.push(`%${search}%`, `%${search}%`, `%${search}%`) }

  const items = await hdQuery(`SELECT * FROM catalog ${where} ORDER BY category ASC, name ASC`, params)
  return NextResponse.json(items)
}

export async function POST(req: NextRequest) {
  const session = await getSessionFromRequest(req)
  if (!session) return NextResponse.json({ error: "Nicht angemeldet" }, { status: 401 })

  const isPrivileged = session.role.includes("admin") || session.role.includes("agent")
  if (!isPrivileged) return NextResponse.json({ error: "Keine Berechtigung" }, { status: 403 })

  const { name, description, category, price } = await req.json()
  if (!name) return NextResponse.json({ error: "Name erforderlich" }, { status: 400 })

  const id = await hdInsert(
    "INSERT INTO catalog (name, description, category, price) VALUES (?, ?, ?, ?)",
    [name, description || null, category || null, price || 0]
  )
  return NextResponse.json({ id }, { status: 201 })
}
