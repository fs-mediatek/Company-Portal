import { NextRequest, NextResponse } from "next/server"

export async function POST(req: NextRequest) {
  const originalToken = req.cookies.get("original_token")?.value

  if (!originalToken) {
    return NextResponse.json({ error: "Keine Impersonation aktiv" }, { status: 400 })
  }

  const res = NextResponse.json({ success: true })
  res.cookies.set("token", originalToken, {
    httpOnly: true,
    secure: false,
    sameSite: "lax",
    maxAge: 60 * 60 * 24,
    path: "/",
  })
  res.cookies.delete("original_token")

  return res
}
