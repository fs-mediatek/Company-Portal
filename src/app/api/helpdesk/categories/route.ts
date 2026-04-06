import { NextRequest, NextResponse } from "next/server"
import { getSessionFromRequest } from "@/lib/auth"
import { hdQuery, hdInsert } from "@/lib/helpdesk-db"

export async function GET(req: NextRequest) {
  const session = await getSessionFromRequest(req)
  if (!session) return NextResponse.json({ error: "Nicht angemeldet" }, { status: 401 })

  // Ensure table exists
  await hdQuery(`CREATE TABLE IF NOT EXISTS ticket_categories (
    id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100) NOT NULL UNIQUE,
    icon VARCHAR(50) DEFAULT NULL,
    sort_order INT DEFAULT 0,
    active TINYINT(1) DEFAULT 1
  )`).catch(() => {})

  const categories = await hdQuery("SELECT * FROM ticket_categories WHERE active = 1 ORDER BY sort_order ASC, name ASC")

  // Seed defaults if empty
  if (categories.length === 0) {
    const defaults = ["Hardware", "Software", "Netzwerk", "E-Mail", "Drucker", "Zugang", "Sonstiges"]
    for (let i = 0; i < defaults.length; i++) {
      await hdQuery("INSERT IGNORE INTO ticket_categories (name, sort_order) VALUES (?, ?)", [defaults[i], i + 1]).catch(() => {})
    }
    return NextResponse.json(await hdQuery("SELECT * FROM ticket_categories WHERE active = 1 ORDER BY sort_order ASC"))
  }

  return NextResponse.json(categories)
}

export async function POST(req: NextRequest) {
  const session = await getSessionFromRequest(req)
  if (!session || !session.role.includes("admin")) {
    return NextResponse.json({ error: "Keine Berechtigung" }, { status: 403 })
  }

  const { name, icon } = await req.json()
  if (!name) return NextResponse.json({ error: "Name erforderlich" }, { status: 400 })

  const id = await hdInsert(
    "INSERT INTO ticket_categories (name, icon) VALUES (?, ?)",
    [name, icon || null]
  )
  return NextResponse.json({ id }, { status: 201 })
}

export async function DELETE(req: NextRequest) {
  const session = await getSessionFromRequest(req)
  if (!session || !session.role.includes("admin")) {
    return NextResponse.json({ error: "Keine Berechtigung" }, { status: 403 })
  }

  const { id } = await req.json()
  await hdQuery("UPDATE ticket_categories SET active = 0 WHERE id = ?", [id])
  return NextResponse.json({ success: true })
}
