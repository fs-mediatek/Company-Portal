import { NextRequest, NextResponse } from "next/server"
import { getSession } from "@/lib/auth"
import { query, queryOne } from "@/lib/db"

type Ctx = { params: Promise<{ id: string }> }

export async function GET(req: NextRequest, { params }: Ctx) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { id } = await params
  const vehicle = await queryOne(
    `SELECT v.*,
       u.name as assigned_to_name,
       l.name as location_name,
       DATEDIFF(v.next_tuv, CURDATE()) as days_to_tuv,
       DATEDIFF(v.lease_end_date, CURDATE()) as days_to_lease_end,
       DATEDIFF(v.insurance_until, CURDATE()) as days_to_insurance_end
     FROM vehicles v
     LEFT JOIN users u ON v.assigned_to_user_id = u.id
     LEFT JOIN locations l ON v.location_id = l.id
     WHERE v.id = ?`,
    [id]
  )

  if (!vehicle) return NextResponse.json({ error: "Nicht gefunden" }, { status: 404 })
  return NextResponse.json(vehicle)
}

export async function PUT(req: NextRequest, { params }: Ctx) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const isPrivileged = ["admin", "manager"].some(r => session.role.includes(r))
  if (!isPrivileged) return NextResponse.json({ error: "Keine Berechtigung" }, { status: 403 })

  const { id } = await params
  const body = await req.json()

  const allowed = [
    "license_plate", "make", "model", "type", "year", "color", "vin", "status",
    "assigned_to_user_id", "location_id", "mileage", "fuel_type", "transmission",
    "tire_type", "tire_size", "first_registration", "ownership_type",
    "lease_end_date", "lease_end_km", "lease_amount", "vehicle_tax", "purchase_price",
    "insurer", "insurance_number", "insurance_amount", "payment_period",
    "next_inspection", "next_tuv", "insurance_until",
    "contact_person", "contact_email", "contact_phone",
    "cost_center", "company", "notes", "active", "photo_path",
  ]
  const updates = Object.entries(body).filter(([k]) => allowed.includes(k))
  if (!updates.length) return NextResponse.json({ error: "Keine Felder" }, { status: 400 })

  const sets = updates.map(([k]) => `${k} = ?`).join(", ")
  const vals = updates.map(([, v]) => v ?? null)
  await query(`UPDATE vehicles SET ${sets} WHERE id = ?`, [...vals, id])

  return NextResponse.json({ success: true })
}

export async function DELETE(req: NextRequest, { params }: Ctx) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const isPrivileged = ["admin", "manager"].some(r => session.role.includes(r))
  if (!isPrivileged) return NextResponse.json({ error: "Keine Berechtigung" }, { status: 403 })

  const { id } = await params
  await query("UPDATE vehicles SET active = 0 WHERE id = ?", [id])
  return NextResponse.json({ success: true })
}
