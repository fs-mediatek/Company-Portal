import { NextRequest, NextResponse } from "next/server"
import { query } from "@/lib/db"
import bcrypt from "bcryptjs"

export async function POST(req: NextRequest) {
  try {
    // Check no users exist
    const users = await query('SELECT COUNT(*) as count FROM users')
    if ((users[0] as any).count > 0) {
      return NextResponse.json({ error: "Setup bereits abgeschlossen" }, { status: 400 })
    }

    const { name, email, password, companyName } = await req.json()

    if (!name || !email || !password) {
      return NextResponse.json({ error: "Alle Felder sind erforderlich" }, { status: 400 })
    }

    // Create admin user
    const hash = await bcrypt.hash(password, 12)
    await query(
      'INSERT INTO users (name, email, password_hash, role) VALUES (?, ?, ?, ?)',
      [name, email, hash, 'admin']
    )

    // Save company name
    if (companyName) {
      await query(
        'INSERT INTO settings (key_name, value) VALUES (?, ?) ON DUPLICATE KEY UPDATE value = VALUES(value)',
        ['company_name', companyName]
      )
    }

    return NextResponse.json({ success: true }, { status: 201 })
  } catch (err: any) {
    console.error("[Setup Finish]", err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
