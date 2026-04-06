import { NextRequest, NextResponse } from "next/server"
import { getSessionFromRequest } from "@/lib/auth"
import { hdQuery } from "@/lib/helpdesk-db"

// GET: List devices available for claiming by current user
export async function GET(req: NextRequest) {
  const session = await getSessionFromRequest(req)
  if (!session) return NextResponse.json({ error: "Nicht angemeldet" }, { status: 401 })

  const assets = await hdQuery(
    `SELECT * FROM assets WHERE primary_user_email = ? AND (assigned_to_user_id IS NULL OR assigned_to_user_id = 0) AND active = 1`,
    [session.email]
  )

  return NextResponse.json(assets)
}

// POST: Claim devices
export async function POST(req: NextRequest) {
  const session = await getSessionFromRequest(req)
  if (!session) return NextResponse.json({ error: "Nicht angemeldet" }, { status: 401 })

  const { asset_ids } = await req.json()
  if (!Array.isArray(asset_ids) || asset_ids.length === 0) {
    return NextResponse.json({ error: "asset_ids erforderlich" }, { status: 400 })
  }

  let claimed = 0
  for (const assetId of asset_ids) {
    await hdQuery(
      "UPDATE assets SET assigned_to_user_id = ?, status = 'assigned' WHERE id = ? AND primary_user_email = ? AND (assigned_to_user_id IS NULL OR assigned_to_user_id = 0) AND active = 1",
      [session.userId, assetId, session.email]
    )
    claimed++
  }

  return NextResponse.json({ claimed })
}
