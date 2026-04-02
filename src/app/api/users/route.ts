import { NextRequest, NextResponse } from "next/server"
import { getSession } from "@/lib/auth"
import { query, insert } from "@/lib/db"
import bcrypt from "bcryptjs"

export async function GET(req: NextRequest) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const isAdmin = session.role.includes("admin")
  const isManager = session.role.includes("manager")
  if (!isAdmin && !isManager) {
    return NextResponse.json({ error: "Keine Berechtigung" }, { status: 403 })
  }

  const { searchParams } = new URL(req.url)
  const search = searchParams.get("search") || ""
  const page = parseInt(searchParams.get("page") || "1")
  const limit = parseInt(searchParams.get("limit") || "50")
  const offset = (page - 1) * limit

  let where = "WHERE 1=1"
  const params: any[] = []

  if (search) {
    where += " AND (u.name LIKE ? OR u.email LIKE ?)"
    params.push(`%${search}%`, `%${search}%`)
  }

  // Managers only see users in their own group
  if (!isAdmin && isManager) {
    const me = await query<any>('SELECT group_id FROM users WHERE id = ?', [session.userId])
    if (me[0]?.group_id) {
      where += " AND u.group_id = ?"
      params.push(me[0].group_id)
    }
  }

  const users = await query(
    `SELECT u.id, u.name, u.email, u.role, u.group_id, u.phone, u.active, u.created_at,
            g.name as group_name
     FROM users u
     LEFT JOIN \`groups\` g ON u.group_id = g.id
     ${where}
     ORDER BY u.name ASC
     LIMIT ${limit} OFFSET ${offset}`,
    params
  )

  const [countResult] = await query(`SELECT COUNT(*) as total FROM users u ${where}`, params) as any[]

  return NextResponse.json({ users, total: countResult.total, page, limit })
}

export async function POST(req: NextRequest) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const isAdmin = session.role.includes("admin")
  if (!isAdmin) return NextResponse.json({ error: "Keine Berechtigung" }, { status: 403 })

  const { name, email, password, role, group_id, phone } = await req.json()

  if (!name || !email || !password) {
    return NextResponse.json({ error: "Name, E-Mail und Passwort erforderlich" }, { status: 400 })
  }

  // Check duplicate
  const existing = await query('SELECT id FROM users WHERE email = ?', [email])
  if (existing.length) {
    return NextResponse.json({ error: "E-Mail bereits vergeben" }, { status: 400 })
  }

  const hash = await bcrypt.hash(password, 12)
  const id = await insert(
    'INSERT INTO users (name, email, password_hash, role, group_id, phone) VALUES (?, ?, ?, ?, ?, ?)',
    [name, email, hash, role || 'melder', group_id || null, phone || null]
  )

  return NextResponse.json({ id }, { status: 201 })
}
