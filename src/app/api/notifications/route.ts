import { NextRequest, NextResponse } from "next/server"
import { getSessionFromRequest } from "@/lib/auth"
import { coreQuery } from "@/lib/core-db"

export async function GET(req: NextRequest) {
  const session = await getSessionFromRequest(req)
  if (!session) return NextResponse.json({ error: "Nicht angemeldet" }, { status: 401 })

  const notifications = await coreQuery(
    "SELECT * FROM notifications WHERE user_id = ? ORDER BY created_at DESC LIMIT 50",
    [session.userId]
  )

  const [unreadCount] = await coreQuery<any>(
    "SELECT COUNT(*) as c FROM notifications WHERE user_id = ? AND is_read = 0",
    [session.userId]
  )

  return NextResponse.json({ notifications, unread: unreadCount?.c || 0 })
}

export async function PATCH(req: NextRequest) {
  const session = await getSessionFromRequest(req)
  if (!session) return NextResponse.json({ error: "Nicht angemeldet" }, { status: 401 })

  const { id, mark_all_read } = await req.json()

  if (mark_all_read) {
    await coreQuery("UPDATE notifications SET is_read = 1 WHERE user_id = ?", [session.userId])
  } else if (id) {
    await coreQuery("UPDATE notifications SET is_read = 1 WHERE id = ? AND user_id = ?", [id, session.userId])
  }

  return NextResponse.json({ success: true })
}
