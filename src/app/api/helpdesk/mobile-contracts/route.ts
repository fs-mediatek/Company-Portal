import { NextRequest, NextResponse } from "next/server"
import { getSessionFromRequest } from "@/lib/auth"
import { hdQuery, hdInsert } from "@/lib/helpdesk-db"

export async function GET(req: NextRequest) {
  const session = await getSessionFromRequest(req)
  if (!session) return NextResponse.json({ error: "Nicht angemeldet" }, { status: 401 })

  const sp = req.nextUrl.searchParams
  const search = sp.get("search") || ""
  const status = sp.get("status") || ""
  const costCenter = sp.get("cost_center") || ""
  const page = parseInt(sp.get("page") || "1")
  const limit = 50
  const offset = (page - 1) * limit

  let where = "WHERE 1=1"
  const params: any[] = []
  if (search) { where += " AND (phone_number LIKE ? OR active_user LIKE ?)"; params.push(`%${search}%`, `%${search}%`) }
  if (status) { where += " AND status = ?"; params.push(status) }
  if (costCenter) { where += " AND (cost_center_1 = ? OR cost_center_2 = ?)"; params.push(costCenter, costCenter) }

  const [countRow] = await hdQuery<any>(`SELECT COUNT(*) as c FROM mobile_contracts ${where}`, params)
  const contracts = await hdQuery(`SELECT * FROM mobile_contracts ${where} ORDER BY phone_number ASC LIMIT ${limit} OFFSET ${offset}`, params)

  // Stats
  const [stats] = await hdQuery<any>(
    "SELECT COUNT(*) as total, SUM(CASE WHEN status='Aktiv' THEN 1 ELSE 0 END) as active, SUM(CASE WHEN status='Gekündigt' THEN 1 ELSE 0 END) as cancelled, SUM(total_gross) as monthly_gross FROM mobile_contracts"
  )
  const costCenters = await hdQuery<any>("SELECT DISTINCT cost_center_1 as cc FROM mobile_contracts WHERE cost_center_1 IS NOT NULL AND cost_center_1 != '' UNION SELECT DISTINCT cost_center_2 FROM mobile_contracts WHERE cost_center_2 IS NOT NULL AND cost_center_2 != '' ORDER BY cc")

  return NextResponse.json({
    data: contracts,
    pagination: { page, limit, total: countRow?.c || 0 },
    stats: { total: stats?.total || 0, active: stats?.active || 0, cancelled: stats?.cancelled || 0, monthly_gross: stats?.monthly_gross || 0 },
    cost_centers: costCenters.map((c: any) => c.cc),
  })
}

export async function POST(req: NextRequest) {
  const session = await getSessionFromRequest(req)
  if (!session) return NextResponse.json({ error: "Nicht angemeldet" }, { status: 401 })
  if (!session.role.includes("admin") && !session.role.includes("agent")) {
    return NextResponse.json({ error: "Keine Berechtigung" }, { status: 403 })
  }

  const body = await req.json()
  if (!body.phone_number) return NextResponse.json({ error: "Rufnummer erforderlich" }, { status: 400 })

  const id = await hdInsert(
    `INSERT INTO mobile_contracts (phone_number, base_price, connection_costs, discount, total_net, total_gross,
     cost_center_1, cost_center_2, active_user, device_id, pin, puk, pin2, puk2, comment, status)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [body.phone_number, body.base_price || 0, body.connection_costs || 0, body.discount || 0,
     body.total_net || 0, body.total_gross || 0, body.cost_center_1 || null, body.cost_center_2 || null,
     body.active_user || null, body.device_id || null, body.pin || null, body.puk || null,
     body.pin2 || null, body.puk2 || null, body.comment || null, body.status || "Aktiv"]
  )
  return NextResponse.json({ id }, { status: 201 })
}
