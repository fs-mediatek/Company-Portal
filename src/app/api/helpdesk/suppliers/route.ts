import { NextRequest, NextResponse } from "next/server"
import { getSessionFromRequest } from "@/lib/auth"
import { hdQuery, hdInsert } from "@/lib/helpdesk-db"

export async function GET(req: NextRequest) {
  const session = await getSessionFromRequest(req)
  if (!session) return NextResponse.json({ error: "Nicht angemeldet" }, { status: 401 })
  const suppliers = await hdQuery("SELECT * FROM suppliers WHERE active = 1 ORDER BY name ASC")
  return NextResponse.json(suppliers)
}

export async function POST(req: NextRequest) {
  const session = await getSessionFromRequest(req)
  if (!session) return NextResponse.json({ error: "Nicht angemeldet" }, { status: 401 })
  const isPrivileged = session.role.includes("admin") || session.role.includes("agent")
  if (!isPrivileged) return NextResponse.json({ error: "Keine Berechtigung" }, { status: 403 })

  const { name, contact_name, contact_email, contact_phone, address, notes } = await req.json()
  if (!name) return NextResponse.json({ error: "Name erforderlich" }, { status: 400 })

  const id = await hdInsert(
    "INSERT INTO suppliers (name, contact_name, contact_email, contact_phone, address, notes) VALUES (?, ?, ?, ?, ?, ?)",
    [name, contact_name || null, contact_email || null, contact_phone || null, address || null, notes || null]
  )
  return NextResponse.json({ id }, { status: 201 })
}
