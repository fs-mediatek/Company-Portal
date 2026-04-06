import { NextRequest, NextResponse } from "next/server"
import { getSessionFromRequest } from "@/lib/auth"
import { hdQuery, hdInsert } from "@/lib/helpdesk-db"
import { coreQuery } from "@/lib/core-db"
import { fireTemplateTrigger } from "@/lib/template-triggers"

export async function GET(req: NextRequest) {
  const session = await getSessionFromRequest(req)
  if (!session) return NextResponse.json({ error: "Nicht angemeldet" }, { status: 401 })

  const sp = req.nextUrl.searchParams
  const page = parseInt(sp.get("page") || "1")
  const limit = parseInt(sp.get("limit") || "25")
  const offset = (page - 1) * limit
  const search = sp.get("search") || ""
  const status = sp.get("status") || ""
  const priority = sp.get("priority") || ""

  const isPrivileged = session.role.includes("admin") || session.role.includes("agent")

  let where = "WHERE 1=1"
  const params: any[] = []

  if (status && status !== "all") {
    if (status === "active") {
      where += " AND t.status IN ('open','pending','in_progress')"
    } else {
      where += " AND t.status = ?"
      params.push(status)
    }
  }
  if (priority && priority !== "all") {
    where += " AND t.priority = ?"
    params.push(priority)
  }
  if (search) {
    where += " AND (t.title LIKE ? OR t.ticket_number LIKE ?)"
    params.push(`%${search}%`, `%${search}%`)
  }
  if (!isPrivileged) {
    where += " AND t.requester_id = ?"
    params.push(session.userId)
  }

  const [countRow] = await hdQuery<any>(`SELECT COUNT(*) as c FROM tickets t ${where}`, params)
  const total = countRow?.c || 0

  const tickets = await hdQuery<any>(
    `SELECT t.* FROM tickets t ${where} ORDER BY t.created_at DESC LIMIT ${limit} OFFSET ${offset}`,
    params
  )

  // Resolve user names from main DB
  const userIds = [...new Set(tickets.flatMap((t: any) => [t.requester_id, t.assignee_id].filter(Boolean)))]
  let userMap: Record<number, string> = {}
  if (userIds.length > 0) {
    const users = await coreQuery<any>(`SELECT id, name FROM users WHERE id IN (${userIds.join(",")})`)
    userMap = Object.fromEntries(users.map((u: any) => [u.id, u.name]))
  }

  const enriched = tickets.map((t: any) => ({
    ...t,
    requester_name: userMap[t.requester_id] || "Unbekannt",
    assignee_name: t.assignee_id ? userMap[t.assignee_id] || "–" : "–",
  }))

  return NextResponse.json({ tickets: enriched, total, page, limit })
}

export async function POST(req: NextRequest) {
  const session = await getSessionFromRequest(req)
  if (!session) return NextResponse.json({ error: "Nicht angemeldet" }, { status: 401 })

  const { title, description, priority, category, on_behalf_of } = await req.json()
  if (!title) return NextResponse.json({ error: "Titel erforderlich" }, { status: 400 })

  // Delegation: Assistenz can create tickets on behalf of colleagues
  let requesterId = session.userId
  let delegateId: number | null = null

  if (on_behalf_of && on_behalf_of !== session.userId) {
    const isAssistenz = session.role.includes("assistenz") || session.role.includes("admin") || session.role.includes("agent")
    if (!isAssistenz) return NextResponse.json({ error: "Keine Berechtigung für Stellvertretung" }, { status: 403 })
    requesterId = on_behalf_of
    delegateId = session.userId
  }

  // Load settings for defaults
  const settingRows = await coreQuery<any>("SELECT key_name, value FROM settings WHERE key_name IN ('ticket_prefix_helpdesk','helpdesk_default_priority','helpdesk_default_category')")
  const cfg: Record<string, string> = {}
  settingRows.forEach((r: any) => { cfg[r.key_name] = r.value })

  const prefix = cfg.ticket_prefix_helpdesk || "IT"
  const defaultPriority = cfg.helpdesk_default_priority || "medium"
  const defaultCategory = cfg.helpdesk_default_category || "Sonstiges"

  // Generate ticket number
  const year = new Date().getFullYear()
  await hdQuery("INSERT INTO ticket_counters (year, last_number) VALUES (?, 0) ON DUPLICATE KEY UPDATE last_number = last_number", [year])
  await hdQuery("UPDATE ticket_counters SET last_number = last_number + 1 WHERE year = ?", [year])
  const [counter] = await hdQuery<any>("SELECT last_number FROM ticket_counters WHERE year = ?", [year])
  const num = String(counter.last_number).padStart(4, "0")
  const ticketNumber = `${prefix}-${year}-${num}`

  const id = await hdInsert(
    `INSERT INTO tickets (ticket_number, title, description, priority, category, requester_id, delegate_id)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [ticketNumber, title, description || "", priority || defaultPriority, category || defaultCategory, requesterId, delegateId]
  )

  // Apply SLA + Auto-Assign
  import("@/lib/sla").then(({ applySlaToHelpdeskTicket }) => {
    applySlaToHelpdeskTicket(id, { category: category || "Sonstiges", priority: priority || "medium" })
  })
  import("@/lib/auto-assign").then(({ autoAssignTicket }) => {
    autoAssignTicket("helpdesk", id, category || "Sonstiges")
  })

  // Fire template trigger
  fireTemplateTrigger("ticket_created", {
    ticket_nummer: ticketNumber,
    ticket_titel: title,
    ersteller_name: session.name,
    ersteller_email: session.email,
    datum: new Date().toLocaleDateString("de-DE"),
    bereich: "helpdesk",
  })

  return NextResponse.json({ id, ticket_number: ticketNumber })
}
