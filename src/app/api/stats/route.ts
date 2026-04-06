import { NextRequest, NextResponse } from "next/server"
import { getSessionFromRequest } from "@/lib/auth"
import { query } from "@/lib/db"

export async function GET(req: NextRequest) {
  const session = await getSessionFromRequest(req)
  if (!session) return NextResponse.json({ error: "Nicht angemeldet" }, { status: 401 })

  const type = req.nextUrl.searchParams.get("type")

  if (type === "ticket-trend") {
    const range = req.nextUrl.searchParams.get("range") || "30d"
    const days = parseInt(range) || 30

    const rows = await query<any>(
      `SELECT
        DATE(created_at) as date,
        COUNT(*) as created,
        SUM(CASE WHEN status = 'resolved' OR status = 'closed' THEN 1 ELSE 0 END) as resolved
      FROM tickets
      WHERE created_at >= DATE_SUB(CURDATE(), INTERVAL ${days} DAY)
      GROUP BY DATE(created_at)
      ORDER BY date ASC`
    )

    const result = rows.map(r => ({
      date: new Date(r.date).toLocaleDateString("de-DE", { day: "2-digit", month: "2-digit" }),
      created: Number(r.created),
      resolved: Number(r.resolved),
    }))

    return NextResponse.json(result)
  }

  if (type === "ticket-categories") {
    const rows = await query<any>(
      `SELECT category, COUNT(*) as count
       FROM tickets
       GROUP BY category
       ORDER BY count DESC`
    )

    const result = rows.map(r => ({
      category: r.category || "Sonstiges",
      count: Number(r.count),
    }))

    return NextResponse.json(result)
  }

  if (type === "vehicle-status") {
    const rows = await query<any>(
      `SELECT status, COUNT(*) as count
       FROM vehicles
       GROUP BY status
       ORDER BY FIELD(status, 'verfuegbar', 'in_nutzung', 'werkstatt', 'ausgemustert')`
    )

    const labels: Record<string, string> = {
      verfuegbar: "Verfügbar",
      in_nutzung: "In Nutzung",
      werkstatt: "Werkstatt",
      ausgemustert: "Ausgemustert",
    }

    const result = rows.map(r => ({
      status: r.status,
      label: labels[r.status] || r.status,
      count: Number(r.count),
    }))

    return NextResponse.json(result)
  }

  return NextResponse.json({ error: "Unbekannter Statistik-Typ" }, { status: 400 })
}
