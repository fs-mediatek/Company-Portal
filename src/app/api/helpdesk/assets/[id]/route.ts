import { NextRequest, NextResponse } from "next/server"
import { getSessionFromRequest } from "@/lib/auth"
import { hdQuery } from "@/lib/helpdesk-db"

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSessionFromRequest(req)
  if (!session) return NextResponse.json({ error: "Nicht angemeldet" }, { status: 401 })
  const { id } = await params
  const [asset] = await hdQuery("SELECT * FROM assets WHERE id = ? AND active = 1", [id])
  if (!asset) return NextResponse.json({ error: "Gerät nicht gefunden" }, { status: 404 })
  return NextResponse.json(asset)
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSessionFromRequest(req)
  if (!session) return NextResponse.json({ error: "Nicht angemeldet" }, { status: 401 })
  if (!session.role.includes("admin") && !session.role.includes("agent")) {
    return NextResponse.json({ error: "Nicht berechtigt" }, { status: 403 })
  }

  const { id } = await params
  const body = await req.json()
  const allowed = ["name", "asset_tag", "type", "platform", "brand", "model", "manufacturer", "serial_number", "status", "assigned_to_user_id", "purchase_date", "purchase_price", "warranty_until", "os_version", "notes"]
  const sets: string[] = []
  const vals: any[] = []

  for (const key of allowed) {
    if (body[key] !== undefined) {
      sets.push(`${key} = ?`)
      vals.push(body[key])
    }
  }

  if (sets.length === 0) return NextResponse.json({ error: "Keine Änderungen" }, { status: 400 })
  vals.push(id)
  await hdQuery(`UPDATE assets SET ${sets.join(", ")} WHERE id = ?`, vals)
  return NextResponse.json({ success: true })
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSessionFromRequest(req)
  if (!session || !session.role.includes("admin")) {
    return NextResponse.json({ error: "Nicht berechtigt" }, { status: 403 })
  }
  const { id } = await params
  await hdQuery("UPDATE assets SET active = 0 WHERE id = ?", [id])
  return NextResponse.json({ success: true })
}
