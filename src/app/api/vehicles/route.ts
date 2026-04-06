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
  const company = searchParams.get("company") || ""
  const ownership = searchParams.get("ownership") || ""
  const page = parseInt(searchParams.get("page") || "1")
  const limit = parseInt(searchParams.get("limit") || "100")
  const offset = (page - 1) * limit

  let where = "WHERE v.active = 1"
  const params: any[] = []

  if (search) {
    where += " AND (v.license_plate LIKE ? OR v.make LIKE ? OR v.model LIKE ? OR v.company LIKE ?)"
    params.push(`%${search}%`, `%${search}%`, `%${search}%`, `%${search}%`)
  }
  if (status) { where += " AND v.status = ?"; params.push(status) }
  if (type) { where += " AND v.type = ?"; params.push(type) }
  if (company) { where += " AND v.company = ?"; params.push(company) }
  if (ownership) { where += " AND v.ownership_type = ?"; params.push(ownership) }

  const vehicles = await query(
    `SELECT v.*,
       u.name as assigned_to_name,
       l.name as location_name,
       DATEDIFF(v.next_tuv, CURDATE()) as days_to_tuv,
       DATEDIFF(v.lease_end_date, CURDATE()) as days_to_lease_end,
       DATEDIFF(v.insurance_until, CURDATE()) as days_to_insurance_end
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

  const companies = await query(
    `SELECT DISTINCT company FROM vehicles WHERE active = 1 AND company IS NOT NULL AND company != '' ORDER BY company`
  ) as any[]

  return NextResponse.json({
    vehicles,
    total: countResult.total,
    page,
    limit,
    companies: companies.map((c: any) => c.company),
  })
}

export async function POST(req: NextRequest) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const isPrivileged = ["admin", "manager"].some(r => session.role.includes(r))
  if (!isPrivileged) return NextResponse.json({ error: "Keine Berechtigung" }, { status: 403 })

  const body = await req.json()
  if (!body.license_plate) return NextResponse.json({ error: "Kennzeichen erforderlich" }, { status: 400 })

  const id = await insert(
    `INSERT INTO vehicles (
      license_plate, make, model, type, year, color, vin, status,
      assigned_to_user_id, location_id, mileage, fuel_type, transmission,
      tire_type, tire_size, first_registration, ownership_type,
      lease_end_date, lease_end_km, lease_amount, vehicle_tax, purchase_price,
      insurer, insurance_number, insurance_amount, payment_period,
      next_inspection, next_tuv, insurance_until,
      contact_person, contact_email, contact_phone,
      cost_center, company, notes
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
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
      body.transmission || null,
      body.tire_type || null,
      body.tire_size || null,
      body.first_registration || null,
      body.ownership_type || null,
      body.lease_end_date || null,
      body.lease_end_km || null,
      body.lease_amount || null,
      body.vehicle_tax || null,
      body.purchase_price || null,
      body.insurer || null,
      body.insurance_number || null,
      body.insurance_amount || null,
      body.payment_period || null,
      body.next_inspection || null,
      body.next_tuv || null,
      body.insurance_until || null,
      body.contact_person || null,
      body.contact_email || null,
      body.contact_phone || null,
      body.cost_center || null,
      body.company || null,
      body.notes || null,
    ]
  )

  return NextResponse.json({ id }, { status: 201 })
}
