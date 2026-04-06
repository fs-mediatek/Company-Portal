import { NextRequest, NextResponse } from "next/server"
import { coreQuery } from "@/lib/core-db"
import { signToken } from "@/lib/auth"
import bcrypt from "bcryptjs"

export async function POST(req: NextRequest) {
  try {
    const { email, password } = await req.json()

    if (!email || !password) {
      return NextResponse.json({ error: "E-Mail und Passwort erforderlich" }, { status: 400 })
    }

    const user = await coreQuery(
      "SELECT id, name, email, password_hash, role, active FROM users WHERE email = ?",
      [email]
    ) as any[]

    if (!user.length) {
      return NextResponse.json({ error: "Ungültige Zugangsdaten" }, { status: 401 })
    }

    if (!user[0].active) {
      return NextResponse.json({ error: "Konto deaktiviert" }, { status: 401 })
    }

    const valid = await bcrypt.compare(password, user[0].password_hash)
    if (!valid) {
      return NextResponse.json({ error: "Ungültige Zugangsdaten" }, { status: 401 })
    }

    const token = await signToken({
      userId: user[0].id,
      email: user[0].email,
      name: user[0].name,
      role: user[0].role || "user",
    })

    const res = NextResponse.json({ success: true, name: user[0].name })
    res.cookies.set("token", token, {
      httpOnly: true,
      secure: false,
      sameSite: "lax",
      maxAge: 60 * 60 * 24,
      path: "/",
    })
    return res
  } catch (err: any) {
    console.error("[Login]", err)
    return NextResponse.json({ error: "Serverfehler" }, { status: 500 })
  }
}
