import { NextRequest, NextResponse } from "next/server"
import { getSessionFromRequest } from "@/lib/auth"
import { sendMail } from "@/lib/mailer"

export async function POST(req: NextRequest) {
  const session = await getSessionFromRequest(req)
  if (!session || !session.role.includes("admin")) {
    return NextResponse.json({ error: "Keine Berechtigung" }, { status: 403 })
  }

  const { to } = await req.json()
  const recipient = to || session.email

  try {
    await sendMail(
      recipient,
      "ÜAG Portal — Test-E-Mail",
      `<div style="font-family: sans-serif; padding: 20px;">
        <h2>Test-E-Mail erfolgreich!</h2>
        <p>Diese E-Mail bestätigt, dass die SMTP-Konfiguration des ÜAG Portals korrekt ist.</p>
        <p style="color: #666; font-size: 12px;">Gesendet am ${new Date().toLocaleString("de-DE")}</p>
      </div>`
    )
    return NextResponse.json({ success: true, sent_to: recipient })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
