import { NextRequest, NextResponse } from "next/server"
import { getSession } from "@/lib/auth"
import { query } from "@/lib/db"

export async function GET() {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const roles = await query('SELECT * FROM roles ORDER BY sort_order ASC, name ASC')
  return NextResponse.json(roles)
}

export async function POST(req: NextRequest) {
  const session = await getSession()
  if (!session || !session.role.includes("admin")) {
    return NextResponse.json({ error: "Keine Berechtigung" }, { status: 403 })
  }

  const { name, label, color } = await req.json()
  if (!name) return NextResponse.json({ error: "Name erforderlich" }, { status: 400 })

  try {
    await query(
      'INSERT INTO roles (name, label, color, is_builtin, sort_order) VALUES (?, ?, ?, 0, 100)',
      [name.toLowerCase().replace(/\s+/g, '_'), label || name, color || 'bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400']
    )
    return NextResponse.json({ success: true }, { status: 201 })
  } catch (err: any) {
    if (err.code === 'ER_DUP_ENTRY') {
      return NextResponse.json({ error: "Rolle existiert bereits" }, { status: 400 })
    }
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
