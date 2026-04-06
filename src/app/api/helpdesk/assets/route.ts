import { NextRequest, NextResponse } from "next/server"
import { getSessionFromRequest } from "@/lib/auth"
import { hdQuery, hdInsert } from "@/lib/helpdesk-db"
import { coreQuery } from "@/lib/core-db"

export async function GET(req: NextRequest) {
  const session = await getSessionFromRequest(req)
  if (!session) return NextResponse.json({ error: "Nicht angemeldet" }, { status: 401 })

  const sp = req.nextUrl.searchParams
  const search = sp.get("search") || ""
  const platform = sp.get("platform") || ""

  let where = "WHERE a.active = 1"
  const params: any[] = []

  if (platform) {
    where += " AND a.platform = ?"
    params.push(platform)
  }
  if (search) {
    where += " AND (a.name LIKE ? OR a.asset_tag LIKE ? OR a.model LIKE ? OR a.serial_number LIKE ? OR a.manufacturer LIKE ?)"
    params.push(`%${search}%`, `%${search}%`, `%${search}%`, `%${search}%`, `%${search}%`)
  }

  const assets = await hdQuery<any>(`SELECT a.* FROM assets a ${where} ORDER BY a.created_at DESC`, params)

  // Resolve assigned user names from main DB
  const userIds = [...new Set(assets.map((a: any) => a.assigned_to_user_id).filter(Boolean))]
  let userMap: Record<number, string> = {}
  if (userIds.length > 0) {
    const users = await coreQuery<any>(`SELECT id, name FROM users WHERE id IN (${userIds.join(",")})`)
    userMap = Object.fromEntries(users.map((u: any) => [u.id, u.name]))
  }

  const enriched = assets.map((a: any) => ({
    ...a,
    assigned_to_name: a.assigned_to_user_id ? userMap[a.assigned_to_user_id] || "–" : null,
  }))

  return NextResponse.json(enriched)
}

export async function POST(req: NextRequest) {
  const session = await getSessionFromRequest(req)
  if (!session) return NextResponse.json({ error: "Nicht angemeldet" }, { status: 401 })
  if (!session.role.includes("admin") && !session.role.includes("agent")) {
    return NextResponse.json({ error: "Nicht berechtigt" }, { status: 403 })
  }

  const body = await req.json()
  if (!body.name) return NextResponse.json({ error: "Name erforderlich" }, { status: 400 })

  // Auto-generate asset tag if not provided
  // Asset prefix from settings
  const [prefixRow] = await coreQuery<any>("SELECT value FROM settings WHERE key_name = 'asset_tag_prefix'")
  const assetPrefix = prefixRow?.value || "AST"
  const assetTag = body.asset_tag || `${assetPrefix}-${Date.now().toString(36).toUpperCase()}`

  const id = await hdInsert(
    `INSERT INTO assets (asset_tag, name, type, platform, brand, model, manufacturer, serial_number, status, purchase_date, purchase_price, warranty_until, notes)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      assetTag, body.name, body.type || null, body.platform || "other",
      body.brand || null, body.model || null, body.manufacturer || null,
      body.serial_number || null, body.status || "available",
      body.purchase_date || null, body.purchase_price || null,
      body.warranty_until || null, body.notes || null,
    ]
  )

  return NextResponse.json({ id })
}
