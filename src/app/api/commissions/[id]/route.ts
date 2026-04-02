import { NextRequest, NextResponse } from "next/server"
import { getSession } from "@/lib/auth"
import { query, queryOne } from "@/lib/db"

type Ctx = { params: Promise<{ id: string }> }

export async function GET(req: NextRequest, { params }: Ctx) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  const { id } = await params

  const commission = await queryOne(
    `SELECT c.*, u.name as requester_name, u.email as requester_email,
      a.name as assigned_name, l.name as location_name,
      l.street as location_street, l.zip as location_zip, l.city as location_city
     FROM commissions c
     LEFT JOIN users u ON c.requester_id = u.id
     LEFT JOIN users a ON c.assigned_to_user_id = a.id
     LEFT JOIN locations l ON c.location_id = l.id
     WHERE c.id = ?`,
    [id]
  )
  if (!commission) return NextResponse.json({ error: "Nicht gefunden" }, { status: 404 })

  const items = await query(
    `SELECT * FROM commission_items WHERE commission_id = ? ORDER BY sort_order, id`,
    [id]
  )

  return NextResponse.json({ ...commission, items })
}

export async function PUT(req: NextRequest, { params }: Ctx) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  const { id } = await params

  const isPrivileged = ["admin", "manager", "techniker", "hausmeister"].some(r => session.role.includes(r))

  const commission = await queryOne(`SELECT * FROM commissions WHERE id = ?`, [id])
  if (!commission) return NextResponse.json({ error: "Nicht gefunden" }, { status: 404 })

  // Only creator or privileged can edit
  if (!isPrivileged && (commission as any).requester_id !== session.userId) {
    return NextResponse.json({ error: "Keine Berechtigung" }, { status: 403 })
  }

  const body = await req.json()
  const allowed = ["status", "recipient_name", "recipient_street", "recipient_zip", "recipient_city",
    "recipient_phone", "location_id", "delivery_date", "notes", "assigned_to_user_id"]
  const updates = Object.entries(body).filter(([k]) => allowed.includes(k))

  if (!updates.length) return NextResponse.json({ error: "Keine Felder" }, { status: 400 })

  // If status changes to abgeschlossen, set completed_at
  if (body.status === "abgeschlossen") {
    updates.push(["completed_at", new Date().toISOString().slice(0, 19).replace("T", " ")])
  }

  const sets = updates.map(([k]) => `${k} = ?`).join(", ")
  const vals = updates.map(([, v]) => v)
  await query(`UPDATE commissions SET ${sets} WHERE id = ?`, [...vals, id])

  return NextResponse.json({ success: true })
}

export async function DELETE(req: NextRequest, { params }: Ctx) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  const { id } = await params

  const isAdmin = session.role.includes("admin")
  if (!isAdmin) return NextResponse.json({ error: "Keine Berechtigung" }, { status: 403 })

  await query(`DELETE FROM commission_items WHERE commission_id = ?`, [id])
  await query(`DELETE FROM commissions WHERE id = ?`, [id])

  return NextResponse.json({ success: true })
}
