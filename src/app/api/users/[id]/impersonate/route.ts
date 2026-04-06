import { NextRequest, NextResponse } from "next/server"
import { getSessionFromRequest, signToken } from "@/lib/auth"
import { coreQueryOne } from "@/lib/core-db"

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSessionFromRequest(req)
  if (!session || !session.role.includes("admin")) {
    return NextResponse.json({ error: "Keine Berechtigung" }, { status: 403 })
  }

  const { id } = await params
  const user = await coreQueryOne<any>("SELECT id, name, email, role, active FROM users WHERE id = ?", [id])
  if (!user) return NextResponse.json({ error: "Benutzer nicht gefunden" }, { status: 404 })
  if (!user.active) return NextResponse.json({ error: "Benutzer ist deaktiviert" }, { status: 400 })

  // Store original admin token
  const originalToken = req.cookies.get("token")?.value

  // Create new token for impersonated user
  const newToken = await signToken({
    userId: user.id,
    email: user.email,
    name: user.name,
    role: user.role || "user",
  })

  const res = NextResponse.json({ success: true, name: user.name })
  res.cookies.set("original_token", originalToken || "", {
    httpOnly: true,
    secure: false,
    sameSite: "lax",
    maxAge: 60 * 60 * 8, // 8 hours
    path: "/",
  })
  res.cookies.set("token", newToken, {
    httpOnly: true,
    secure: false,
    sameSite: "lax",
    maxAge: 60 * 60 * 24,
    path: "/",
  })

  return res
}
