import { NextRequest, NextResponse } from "next/server"
import { coreQuery, coreInsert } from "@/lib/core-db"
import bcrypt from "bcryptjs"

export async function POST(req: NextRequest) {
  try {
    // Check no users exist in portal_core
    const users = await coreQuery("SELECT COUNT(*) as count FROM users")
    if ((users[0] as any).count > 0) {
      return NextResponse.json({ error: "Setup bereits abgeschlossen" }, { status: 400 })
    }

    const { name, email, password, companyName } = await req.json()

    if (!name || !email || !password) {
      return NextResponse.json({ error: "Alle Felder sind erforderlich" }, { status: 400 })
    }

    // Create admin user in portal_core
    const hash = await bcrypt.hash(password, 12)
    await coreInsert(
      "INSERT INTO users (name, email, password_hash, role) VALUES (?, ?, ?, ?)",
      [name, email, hash, "admin"]
    )

    // Save company name in portal_core.settings
    if (companyName) {
      await coreQuery(
        "INSERT INTO settings (key_name, value) VALUES (?, ?) ON DUPLICATE KEY UPDATE value = VALUES(value)",
        ["company_name", companyName]
      )
    }

    return NextResponse.json({ success: true }, { status: 201 })
  } catch (err: any) {
    console.error("[Setup Finish]", err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
