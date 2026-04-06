import { NextRequest, NextResponse } from "next/server"
import { getSessionFromRequest } from "@/lib/auth"
import { coreQuery, coreInsert } from "@/lib/core-db"

export async function GET(req: NextRequest) {
  const session = await getSessionFromRequest(req)
  if (!session) return NextResponse.json({ error: "Nicht angemeldet" }, { status: 401 })

  const templates = await coreQuery("SELECT * FROM templates ORDER BY name ASC")
  return NextResponse.json(templates)
}

export async function POST(req: NextRequest) {
  const session = await getSessionFromRequest(req)
  if (!session || !session.role.includes("admin")) {
    return NextResponse.json({ error: "Keine Berechtigung" }, { status: 403 })
  }

  const { name, category, content, trigger_event, trigger_enabled, trigger_recipient } = await req.json()
  if (!name || !content) return NextResponse.json({ error: "Name und Inhalt erforderlich" }, { status: 400 })

  const id = await coreInsert(
    "INSERT INTO templates (name, category, content, trigger_event, trigger_enabled, trigger_recipient) VALUES (?, ?, ?, ?, ?, ?)",
    [name, category || null, content, trigger_event || null, trigger_enabled ? 1 : 0, trigger_recipient || null]
  )

  return NextResponse.json({ id }, { status: 201 })
}

export async function PUT(req: NextRequest) {
  const session = await getSessionFromRequest(req)
  if (!session || !session.role.includes("admin")) {
    return NextResponse.json({ error: "Keine Berechtigung" }, { status: 403 })
  }

  const { id, name, category, content, trigger_event, trigger_enabled, trigger_recipient } = await req.json()
  if (!id) return NextResponse.json({ error: "ID erforderlich" }, { status: 400 })

  await coreQuery(
    "UPDATE templates SET name = ?, category = ?, content = ?, trigger_event = ?, trigger_enabled = ?, trigger_recipient = ? WHERE id = ?",
    [name, category || null, content, trigger_event || null, trigger_enabled ? 1 : 0, trigger_recipient || null, id]
  )

  return NextResponse.json({ success: true })
}

export async function DELETE(req: NextRequest) {
  const session = await getSessionFromRequest(req)
  if (!session || !session.role.includes("admin")) {
    return NextResponse.json({ error: "Keine Berechtigung" }, { status: 403 })
  }

  const { id } = await req.json()
  if (!id) return NextResponse.json({ error: "ID erforderlich" }, { status: 400 })

  await coreQuery("DELETE FROM templates WHERE id = ?", [id])
  return NextResponse.json({ success: true })
}
