import { NextRequest, NextResponse } from "next/server"
import { getSessionFromRequest } from "@/lib/auth"
import { hdQuery } from "@/lib/helpdesk-db"

export async function GET(req: NextRequest) {
  const session = await getSessionFromRequest(req)
  if (!session) return NextResponse.json({ error: "Nicht angemeldet" }, { status: 401 })

  const assets = await hdQuery(
    "SELECT * FROM assets WHERE assigned_to_user_id = ? AND active = 1 ORDER BY name ASC",
    [session.userId]
  )

  return NextResponse.json(assets)
}
