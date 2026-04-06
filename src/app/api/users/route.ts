import { NextRequest, NextResponse } from "next/server"
import { getSessionFromRequest } from "@/lib/auth"
import { coreQuery, coreInsert } from "@/lib/core-db"
import bcrypt from "bcryptjs"

export async function GET(req: NextRequest) {
  const session = await getSessionFromRequest(req)
  if (!session) return NextResponse.json({ error: "Nicht angemeldet" }, { status: 401 })

  const isPrivileged = session.role.includes("admin") || session.role.includes("manager") || session.role.includes("agent")
  if (!isPrivileged) return NextResponse.json({ error: "Keine Berechtigung" }, { status: 403 })

  const sp = req.nextUrl.searchParams
  const search = sp.get("search") || ""
  const page = parseInt(sp.get("page") || "1")
  const limit = parseInt(sp.get("limit") || "50")
  const offset = (page - 1) * limit

  let where = "WHERE 1=1"
  const params: any[] = []

  if (search) {
    where += " AND (u.name LIKE ? OR u.email LIKE ?)"
    params.push(`%${search}%`, `%${search}%`)
  }

  const users = await coreQuery(
    `SELECT u.id, u.name, u.email, u.role, u.department_id, u.phone, u.active, u.created_at,
            d.display_name as department_name
     FROM users u
     LEFT JOIN departments d ON u.department_id = d.id
     ${where}
     ORDER BY u.name ASC
     LIMIT ${limit} OFFSET ${offset}`,
    params
  )

  const [countResult] = await coreQuery(`SELECT COUNT(*) as total FROM users u ${where}`, params) as any[]

  return NextResponse.json({ users, total: countResult.total, page, limit })
}

export async function POST(req: NextRequest) {
  const session = await getSessionFromRequest(req)
  if (!session) return NextResponse.json({ error: "Nicht angemeldet" }, { status: 401 })
  if (!session.role.includes("admin")) return NextResponse.json({ error: "Keine Berechtigung" }, { status: 403 })

  const { name, email, password, role, department_id, phone } = await req.json()

  if (!name || !email || !password) {
    return NextResponse.json({ error: "Name, E-Mail und Passwort erforderlich" }, { status: 400 })
  }

  const existing = await coreQuery("SELECT id FROM users WHERE email = ?", [email])
  if (existing.length) return NextResponse.json({ error: "E-Mail bereits vergeben" }, { status: 400 })

  const hash = await bcrypt.hash(password, 12)
  const id = await coreInsert(
    "INSERT INTO users (name, email, password_hash, role, department_id, phone) VALUES (?, ?, ?, ?, ?, ?)",
    [name, email, hash, role || "user", department_id || null, phone || null]
  )

  return NextResponse.json({ id }, { status: 201 })
}
