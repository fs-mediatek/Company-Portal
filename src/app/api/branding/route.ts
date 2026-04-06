import { NextResponse } from "next/server"
import { coreQuery } from "@/lib/core-db"

// Public endpoint — no auth required (used by login page)
export async function GET() {
  try {
    const rows = await coreQuery<any>(
      "SELECT key_name, value FROM settings WHERE key_name LIKE 'branding_%' OR key_name = 'login_email_placeholder' OR key_name = 'chatbot_enabled'"
    )
    const result: Record<string, string> = {}
    rows.forEach((r: any) => { result[r.key_name] = r.value })
    return NextResponse.json(result)
  } catch {
    return NextResponse.json({})
  }
}
