import { NextRequest, NextResponse } from "next/server"
import { getSessionFromRequest } from "@/lib/auth"
import { coreQuery, coreQueryOne } from "@/lib/core-db"

/**
 * Nav visibility config per area per nav-key per role.
 * Stored in portal_core.settings as key "nav_config".
 *
 * Format: { [navKey: string]: string[] }
 * - Key = nav item key (e.g. "hd-kb", "hd-assets", "tickets")
 * - Value = array of roles that can see it
 * - Empty array = hidden for everyone
 * - Missing key = use hardcoded default from sidebar
 */

export async function GET(req: NextRequest) {
  const session = await getSessionFromRequest(req)
  if (!session) return NextResponse.json({ error: "Nicht angemeldet" }, { status: 401 })

  const row = await coreQueryOne<any>("SELECT value FROM settings WHERE key_name = 'nav_config'")
  let config: Record<string, string[]> = {}
  if (row?.value) {
    try { config = JSON.parse(row.value) } catch {}
  }

  return NextResponse.json(config)
}

export async function PUT(req: NextRequest) {
  const session = await getSessionFromRequest(req)
  if (!session || !session.role.includes("admin")) {
    return NextResponse.json({ error: "Keine Berechtigung" }, { status: 403 })
  }

  const config = await req.json()

  await coreQuery(
    "INSERT INTO settings (key_name, value) VALUES ('nav_config', ?) ON DUPLICATE KEY UPDATE value = VALUES(value)",
    [JSON.stringify(config)]
  )

  return NextResponse.json({ success: true })
}
