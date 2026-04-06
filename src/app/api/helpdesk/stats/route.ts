import { NextRequest, NextResponse } from "next/server"
import { getSessionFromRequest } from "@/lib/auth"
import { hdQuery } from "@/lib/helpdesk-db"

export async function GET(req: NextRequest) {
  const session = await getSessionFromRequest(req)
  if (!session) return NextResponse.json({ error: "Nicht angemeldet" }, { status: 401 })

  const type = req.nextUrl.searchParams.get("type")

  if (type === "ticket-trend") {
    const rows = await hdQuery<any>(
      `SELECT DATE(created_at) as date, COUNT(*) as created,
       SUM(CASE WHEN status IN ('resolved','closed') THEN 1 ELSE 0 END) as resolved
       FROM tickets WHERE created_at >= DATE_SUB(CURDATE(), INTERVAL 30 DAY)
       GROUP BY DATE(created_at) ORDER BY date ASC`
    )
    return NextResponse.json(rows.map((r: any) => ({
      date: new Date(r.date).toLocaleDateString("de-DE", { day: "2-digit", month: "2-digit" }),
      created: Number(r.created),
      resolved: Number(r.resolved),
    })))
  }

  if (type === "ticket-categories") {
    const rows = await hdQuery<any>(
      "SELECT category, COUNT(*) as count FROM tickets GROUP BY category ORDER BY count DESC"
    )
    return NextResponse.json(rows.map((r: any) => ({ category: r.category || "Sonstiges", count: Number(r.count) })))
  }

  return NextResponse.json({ error: "Unbekannter Typ" }, { status: 400 })
}
