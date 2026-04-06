import { NextRequest, NextResponse } from "next/server"
import { getSessionFromRequest } from "@/lib/auth"
import { hdQuery, hdInsert } from "@/lib/helpdesk-db"

type Ctx = { params: Promise<{ id: string }> }

export async function GET(req: NextRequest, { params }: Ctx) {
  const session = await getSessionFromRequest(req)
  if (!session) return NextResponse.json({ error: "Nicht angemeldet" }, { status: 401 })

  const { id } = await params
  const [contract] = await hdQuery<any>("SELECT * FROM mobile_contracts WHERE id = ?", [id])
  if (!contract) return NextResponse.json({ error: "Vertrag nicht gefunden" }, { status: 404 })

  const history = await hdQuery("SELECT * FROM mobile_contract_history WHERE contract_id = ? ORDER BY changed_at DESC LIMIT 50", [id])

  return NextResponse.json({ ...contract, history })
}

export async function PUT(req: NextRequest, { params }: Ctx) {
  const session = await getSessionFromRequest(req)
  if (!session) return NextResponse.json({ error: "Nicht angemeldet" }, { status: 401 })
  if (!session.role.includes("admin") && !session.role.includes("agent")) {
    return NextResponse.json({ error: "Keine Berechtigung" }, { status: 403 })
  }

  const { id } = await params
  const body = await req.json()

  // Get current for history tracking
  const [current] = await hdQuery<any>("SELECT * FROM mobile_contracts WHERE id = ?", [id])
  if (!current) return NextResponse.json({ error: "Nicht gefunden" }, { status: 404 })

  const tracked = ["active_user", "cost_center_1", "cost_center_2", "status", "device_id", "comment", "base_price", "total_gross"]
  const allowed = ["phone_number", "base_price", "connection_costs", "discount", "total_net", "total_gross",
    "cost_center_1", "cost_center_2", "active_user", "device_id", "pin", "puk", "pin2", "puk2", "comment", "status"]

  const sets: string[] = []
  const vals: any[] = []

  for (const key of allowed) {
    if (body[key] !== undefined) {
      sets.push(`${key} = ?`)
      vals.push(body[key])

      // Track history for important fields
      if (tracked.includes(key) && String(current[key] || "") !== String(body[key] || "")) {
        await hdInsert(
          "INSERT INTO mobile_contract_history (contract_id, field_name, old_value, new_value, changed_by) VALUES (?, ?, ?, ?, ?)",
          [id, key, String(current[key] || ""), String(body[key] || ""), session.userId]
        )
      }
    }
  }

  if (sets.length === 0) return NextResponse.json({ error: "Keine Änderungen" }, { status: 400 })
  vals.push(id)
  await hdQuery(`UPDATE mobile_contracts SET ${sets.join(", ")} WHERE id = ?`, vals)
  return NextResponse.json({ success: true })
}

export async function DELETE(req: NextRequest, { params }: Ctx) {
  const session = await getSessionFromRequest(req)
  if (!session || !session.role.includes("admin")) {
    return NextResponse.json({ error: "Keine Berechtigung" }, { status: 403 })
  }
  const { id } = await params
  await hdQuery("DELETE FROM mobile_contract_history WHERE contract_id = ?", [id])
  await hdQuery("DELETE FROM mobile_contracts WHERE id = ?", [id])
  return NextResponse.json({ success: true })
}
