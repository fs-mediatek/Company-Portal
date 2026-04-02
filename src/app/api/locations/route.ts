import { NextRequest, NextResponse } from "next/server"
import { getSession } from "@/lib/auth"
import { query, insert } from "@/lib/db"

export async function GET(req: NextRequest) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const search = searchParams.get("search") || ""
  const activeOnly = searchParams.get("active") !== "false"

  let where = "WHERE 1=1"
  const params: any[] = []

  if (activeOnly) { where += " AND active = 1" }
  if (search) {
    where += " AND (name LIKE ? OR city LIKE ? OR street LIKE ?)"
    params.push(`%${search}%`, `%${search}%`, `%${search}%`)
  }

  const locations = await query(
    `SELECT * FROM locations ${where} ORDER BY name ASC`,
    params
  )

  return NextResponse.json(locations)
}

export async function POST(req: NextRequest) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const isPrivileged = ["admin", "manager"].some(r => session.role.includes(r))
  if (!isPrivileged) return NextResponse.json({ error: "Keine Berechtigung" }, { status: 403 })

  const body = await req.json()
  if (!body.name) return NextResponse.json({ error: "Name erforderlich" }, { status: 400 })

  const id = await insert(
    `INSERT INTO locations (name, street, zip, city, contact_name, contact_phone, contact_email, notes, latitude, longitude)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      body.name,
      body.street || null,
      body.zip || null,
      body.city || null,
      body.contact_name || null,
      body.contact_phone || null,
      body.contact_email || null,
      body.notes || null,
      body.latitude || null,
      body.longitude || null,
    ]
  )

  return NextResponse.json({ id }, { status: 201 })
}
