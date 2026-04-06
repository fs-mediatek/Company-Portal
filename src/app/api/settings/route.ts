import { NextRequest, NextResponse } from "next/server"
import { getSession } from "@/lib/auth"
import { coreQuery } from "@/lib/core-db"
import { invalidateMailCache } from "@/lib/mailer"

export async function GET() {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const rows = await coreQuery<any>("SELECT key_name, value FROM settings")
  const settings: Record<string, string> = {}
  for (const r of rows) settings[r.key_name] = r.value
  return NextResponse.json(settings)
}

export async function PUT(req: NextRequest) {
  const session = await getSession()
  if (!session || !session.role.includes("admin")) {
    return NextResponse.json({ error: "Keine Berechtigung" }, { status: 403 })
  }

  const body = await req.json()
  for (const [key, value] of Object.entries(body)) {
    await coreQuery(
      "INSERT INTO settings (key_name, value) VALUES (?, ?) ON DUPLICATE KEY UPDATE value = VALUES(value)",
      [key, value as string]
    )
  }

  // Invalidate mail cache when SMTP settings change
  if (Object.keys(body).some(k => k.startsWith("smtp_"))) {
    invalidateMailCache()
  }

  return NextResponse.json({ success: true })
}
