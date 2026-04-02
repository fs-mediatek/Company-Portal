import { NextRequest, NextResponse } from "next/server"
import { getSession } from "@/lib/auth"
import { query, insert } from "@/lib/db"

export async function GET(req: NextRequest) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const search = searchParams.get("search") || ""
  const status = searchParams.get("status") || ""
  const type = searchParams.get("type") || ""
  const page = parseInt(searchParams.get("page") || "1")
  const limit = parseInt(searchParams.get("limit") || "50")
  const offset = (page - 1) * limit

  let where = "WHERE v.active = 1"
  const params: any[] = []

  if (search) {
    where += " AND (v.license_plate LIKE ? OR v.make LIKE ? OR v.model LIKE ?)"
    params.push(`%${search}%`, `%${search}%`, `%${search}%`)
  }
  if (status) { where += " AND v.status = ?"; params.push(status) }
  if (type) { where += " AND v.type = ?"; params.push(type) }

  const vehicles = await query(
    `SELECT v.*, u.name as assigned_to_name, l.name as location_name
     FROM vehicles v
     LEFT JOIN users u ON v.assigned_to_user_id = u.id
     LEFT JOIN locations l ON v.location_id = l.id
     ${where}
     ORDER BY v.license_plate ASC
     LIMIT ${limit} OFFSET ${offset}`,
    params
  )

  const [countResult] = await query(
    `SELECT COUNT(*) as total FROM vehicles v ${where}`, params
  ) as any[]

  return NextResponse.json({ vehicles, total: countResult.total, page, limit })
}

export async function POST(req: NextRequest) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const isPrivileged = ["admin", "manager"].some(r => session.role.includes(r))
  if (!isPrivileged) return NextResponse.json({ error: "Keine Berechtigung" }, { status: 403 })

  const body = await req.json()
  if (!body.license_plate) return NextResponse.json({ error: "Kennzeichen erforderlich" }, { status: 400 })

  const id = await insert(
    `INSERT INTO vehicles (license_plate, make, model, type, year, color, vin, status, assigned_to_user_id, location_id, mileage, fuel_type, next_inspection, next_tuv, insurance_until, notes)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      body.license_plate,
      body.make || null,
      body.model || null,
      body.type || "pkw",
      body.year || null,
      body.color || null,
      body.vin || null,
      body.status || "verfuegbar",
      body.assigned_to_user_id || null,
      body.location_id || null,
      body.mileage || null,
      body.fuel_type || null,
      body.next_inspection || null,
      body.next_tuv || null,
      body.insurance_until || null,
      body.notes || null,
    ]
  )

  return NextResponse.json({ id }, { status: 201 })
}
