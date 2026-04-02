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
      l.name as location_name, l.street as location_street, l.zip as location_zip, l.city as location_city,
      l.contact_name as location_contact, l.contact_phone as location_phone
     FROM commissions c
     LEFT JOIN users u ON c.requester_id = u.id
     LEFT JOIN locations l ON c.location_id = l.id
     WHERE c.id = ?`,
    [id]
  ) as any
  if (!commission) return NextResponse.json({ error: "Nicht gefunden" }, { status: 404 })

  const items = await query(
    `SELECT * FROM commission_items WHERE commission_id = ? ORDER BY sort_order, id`,
    [id]
  )

  // Return delivery note data (rendered client-side for print)
  return NextResponse.json({
    commission,
    items,
    generated_at: new Date().toISOString(),
    generated_by: session.name,
  })
}
