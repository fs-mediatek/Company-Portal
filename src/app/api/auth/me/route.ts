import { NextResponse } from "next/server"
import { getSession } from "@/lib/auth"
import { queryOne } from "@/lib/db"

export async function GET() {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const user = await queryOne(
    `SELECT u.id, u.name, u.email, u.role, u.phone, u.group_id, g.name as group_name
     FROM users u LEFT JOIN \`groups\` g ON u.group_id = g.id
     WHERE u.id = ?`,
    [session.userId]
  )

  if (!user) return NextResponse.json({ error: "Benutzer nicht gefunden" }, { status: 404 })

  return NextResponse.json(user)
}
