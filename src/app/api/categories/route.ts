import { NextRequest, NextResponse } from "next/server"
import { getSession } from "@/lib/auth"
import { query, insert } from "@/lib/db"

export async function GET() {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const categories = await query('SELECT * FROM ticket_categories WHERE active = 1 ORDER BY sort_order ASC, name ASC')
  return NextResponse.json(categories)
}

export async function POST(req: NextRequest) {
  const session = await getSession()
  if (!session || !session.role.includes("admin")) {
    return NextResponse.json({ error: "Keine Berechtigung" }, { status: 403 })
  }

  const { name, icon, sort_order } = await req.json()
  if (!name) return NextResponse.json({ error: "Name erforderlich" }, { status: 400 })

  try {
    const id = await insert(
      'INSERT INTO ticket_categories (name, icon, sort_order) VALUES (?, ?, ?)',
      [name, icon || null, sort_order || 0]
    )
    return NextResponse.json({ id }, { status: 201 })
  } catch (err: any) {
    if (err.code === 'ER_DUP_ENTRY') {
      return NextResponse.json({ error: "Kategorie existiert bereits" }, { status: 400 })
    }
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
