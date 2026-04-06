import { NextRequest, NextResponse } from "next/server"
import { getSession } from "@/lib/auth"
import { query, insert } from "@/lib/db"

type Ctx = { params: Promise<{ id: string }> }

export async function GET(req: NextRequest, { params }: Ctx) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { id } = await params
  const entries = await query(
    `SELECT m.*, u.name as created_by_name
     FROM vehicle_mileage_log m
     LEFT JOIN users u ON m.created_by = u.id
     WHERE m.vehicle_id = ?
     ORDER BY m.recorded_at DESC, m.created_at DESC`,
    [id]
  )
  return NextResponse.json(entries)
}

export async function POST(req: NextRequest, { params }: Ctx) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { id } = await params
  const body = await req.json()
  if (!body.mileage || !body.recorded_at) {
    return NextResponse.json({ error: "km-Stand und Datum erforderlich" }, { status: 400 })
  }

  const entryId = await insert(
    `INSERT INTO vehicle_mileage_log (vehicle_id, mileage, recorded_at, notes, created_by) VALUES (?, ?, ?, ?, ?)`,
    [id, Number(body.mileage), body.recorded_at, body.notes || null, session.userId]
  )

  // Update the vehicle's current mileage if this entry is the latest
  await query(
    `UPDATE vehicles SET mileage = ? WHERE id = ? AND (mileage IS NULL OR mileage < ?)`,
    [Number(body.mileage), id, Number(body.mileage)]
  )

  return NextResponse.json({ id: entryId }, { status: 201 })
}

export async function DELETE(req: NextRequest, { params }: Ctx) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const isPrivileged = ["admin", "manager"].some(r => session.role.includes(r))
  if (!isPrivileged) return NextResponse.json({ error: "Keine Berechtigung" }, { status: 403 })

  const { id } = await params
  const { searchParams } = new URL(req.url)
  const entryId = searchParams.get("entryId")
  if (!entryId) return NextResponse.json({ error: "entryId fehlt" }, { status: 400 })

  await query(`DELETE FROM vehicle_mileage_log WHERE id = ? AND vehicle_id = ?`, [entryId, id])
  return NextResponse.json({ success: true })
}
