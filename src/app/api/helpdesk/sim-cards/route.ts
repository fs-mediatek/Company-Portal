import { NextRequest, NextResponse } from "next/server"
import { getSessionFromRequest } from "@/lib/auth"
import { hdQuery, hdInsert } from "@/lib/helpdesk-db"

export async function GET(req: NextRequest) {
  const session = await getSessionFromRequest(req)
  if (!session) return NextResponse.json({ error: "Nicht angemeldet" }, { status: 401 })

  const search = req.nextUrl.searchParams.get("search") || ""
  const status = req.nextUrl.searchParams.get("status") || ""

  let where = "WHERE 1=1"
  const params: any[] = []
  if (search) { where += " AND (sim_number LIKE ? OR provider LIKE ? OR contact_name LIKE ?)"; params.push(`%${search}%`, `%${search}%`, `%${search}%`) }
  if (status) { where += " AND status = ?"; params.push(status) }

  const sims = await hdQuery(`SELECT * FROM mobile_sim_cards ${where} ORDER BY created_at DESC`, params)
  return NextResponse.json(sims)
}

export async function POST(req: NextRequest) {
  const session = await getSessionFromRequest(req)
  if (!session) return NextResponse.json({ error: "Nicht angemeldet" }, { status: 401 })
  if (!session.role.includes("admin") && !session.role.includes("agent")) {
    return NextResponse.json({ error: "Keine Berechtigung" }, { status: 403 })
  }

  const { sim_number, provider, contact_name, contact_email, notes } = await req.json()
  if (!sim_number) return NextResponse.json({ error: "SIM-Nummer erforderlich" }, { status: 400 })

  const id = await hdInsert(
    "INSERT INTO mobile_sim_cards (sim_number, provider, contact_name, contact_email, notes, added_by) VALUES (?, ?, ?, ?, ?, ?)",
    [sim_number, provider || null, contact_name || null, contact_email || null, notes || null, session.userId]
  )
  return NextResponse.json({ id }, { status: 201 })
}

export async function PUT(req: NextRequest) {
  const session = await getSessionFromRequest(req)
  if (!session) return NextResponse.json({ error: "Nicht angemeldet" }, { status: 401 })

  const { id, status, provider, contact_name, contact_email, notes } = await req.json()
  if (!id) return NextResponse.json({ error: "ID erforderlich" }, { status: 400 })

  const sets: string[] = []
  const vals: any[] = []
  if (status !== undefined) { sets.push("status = ?"); vals.push(status); if (status === "sent") sets.push("sent_at = NOW()") }
  if (provider !== undefined) { sets.push("provider = ?"); vals.push(provider) }
  if (contact_name !== undefined) { sets.push("contact_name = ?"); vals.push(contact_name) }
  if (contact_email !== undefined) { sets.push("contact_email = ?"); vals.push(contact_email) }
  if (notes !== undefined) { sets.push("notes = ?"); vals.push(notes) }

  if (sets.length === 0) return NextResponse.json({ error: "Keine Änderungen" }, { status: 400 })
  vals.push(id)
  await hdQuery(`UPDATE mobile_sim_cards SET ${sets.join(", ")} WHERE id = ?`, vals)
  return NextResponse.json({ success: true })
}

export async function DELETE(req: NextRequest) {
  const session = await getSessionFromRequest(req)
  if (!session || !session.role.includes("admin")) {
    return NextResponse.json({ error: "Keine Berechtigung" }, { status: 403 })
  }
  const { id } = await req.json()
  await hdQuery("DELETE FROM mobile_sim_cards WHERE id = ?", [id])
  return NextResponse.json({ success: true })
}
