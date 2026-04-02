import { NextRequest, NextResponse } from "next/server"
import { getSession } from "@/lib/auth"
import { query, insert } from "@/lib/db"
import { generateTicketNumber } from "@/lib/numbering"

export async function GET(req: NextRequest) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const page = parseInt(searchParams.get("page") || "1")
  const limit = parseInt(searchParams.get("limit") || "25")
  const offset = (page - 1) * limit
  const status = searchParams.get("status")
  const priority = searchParams.get("priority")
  const category = searchParams.get("category")
  const search = searchParams.get("search")

  const isAdmin = session.role.includes("admin")
  const isManager = session.role.includes("manager")
  const isTechniker = session.role.includes("techniker") || session.role.includes("hausmeister")

  let where = "WHERE 1=1"
  const params: any[] = []

  // Role-based filtering
  if (!isAdmin && !isManager) {
    if (isTechniker) {
      where += " AND (t.assigned_to_user_id = ? OR t.requester_id = ?)"
      params.push(session.userId, session.userId)
    } else {
      // melder: only own tickets
      where += " AND t.requester_id = ?"
      params.push(session.userId)
    }
  }

  if (status) { where += " AND t.status = ?"; params.push(status) }
  if (priority) { where += " AND t.priority = ?"; params.push(priority) }
  if (category) { where += " AND t.category = ?"; params.push(category) }
  if (search) {
    where += " AND (t.title LIKE ? OR t.ticket_number LIKE ?)"
    params.push(`%${search}%`, `%${search}%`)
  }

  const tickets = await query(
    `SELECT t.*, r.name as requester_name, a.name as assignee_name
     FROM tickets t
     LEFT JOIN users r ON t.requester_id = r.id
     LEFT JOIN users a ON t.assigned_to_user_id = a.id
     ${where}
     ORDER BY t.created_at DESC
     LIMIT ${limit} OFFSET ${offset}`,
    params
  )

  const [countResult] = await query(
    `SELECT COUNT(*) as total FROM tickets t ${where}`, params
  ) as any[]

  return NextResponse.json({ tickets, total: countResult.total, page, limit })
}

export async function POST(req: NextRequest) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const body = await req.json()
  if (!body.title) return NextResponse.json({ error: "Titel erforderlich" }, { status: 400 })

  const ticketNumber = await generateTicketNumber()

  const id = await insert(
    `INSERT INTO tickets (ticket_number, title, description, category, priority, location_building, location_floor, location_room, location_id, requester_id)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      ticketNumber,
      body.title,
      body.description || null,
      body.category || "Sonstiges",
      body.priority || "medium",
      body.location_building || null,
      body.location_floor || null,
      body.location_room || null,
      body.location_id ? parseInt(body.location_id) : null,
      session.userId,
    ]
  )

  return NextResponse.json({ id, ticket_number: ticketNumber }, { status: 201 })
}
