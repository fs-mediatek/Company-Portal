import { NextRequest, NextResponse } from "next/server"
import { getSession, verifyToken } from "@/lib/auth"
import { coreQueryOne } from "@/lib/core-db"
import { cookies } from "next/headers"

export async function GET() {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const user = await coreQueryOne(
    `SELECT u.id, u.name, u.email, u.role, u.phone, u.department_id,
            d.display_name as department_name
     FROM users u LEFT JOIN departments d ON u.department_id = d.id
     WHERE u.id = ?`,
    [session.userId]
  )

  if (!user) return NextResponse.json({ error: "Benutzer nicht gefunden" }, { status: 404 })

  // Check if impersonating
  const cookieStore = await cookies()
  const originalToken = cookieStore.get("original_token")?.value
  let impersonating = false
  let originalName: string | null = null

  if (originalToken) {
    try {
      const originalSession = await verifyToken(originalToken)
      if (originalSession) {
        impersonating = true
        originalName = originalSession.name
      }
    } catch {}
  }

  return NextResponse.json({ ...(user as any), impersonating, original_name: originalName })
}
