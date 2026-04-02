import { NextRequest, NextResponse } from "next/server"
import { getSession } from "@/lib/auth"
import { query, queryOne } from "@/lib/db"

export async function GET() {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const setting = await queryOne<any>("SELECT value FROM settings WHERE key_name = 'nav_visibility'")
  try {
    return NextResponse.json(setting?.value ? JSON.parse(setting.value) : {})
  } catch {
    return NextResponse.json({})
  }
}

export async function PUT(req: NextRequest) {
  const session = await getSession()
  if (!session || !session.role.includes("admin")) {
    return NextResponse.json({ error: "Keine Berechtigung" }, { status: 403 })
  }

  const body = await req.json()
  await query(
    "INSERT INTO settings (key_name, value) VALUES ('nav_visibility', ?) ON DUPLICATE KEY UPDATE value = VALUES(value)",
    [JSON.stringify(body)]
  )

  return NextResponse.json({ success: true })
}
