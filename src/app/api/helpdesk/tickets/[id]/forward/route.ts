import { NextRequest, NextResponse } from "next/server"
import { getSessionFromRequest } from "@/lib/auth"
import { hdQuery, hdInsert } from "@/lib/helpdesk-db"
import { sendMail } from "@/lib/mailer"

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSessionFromRequest(req)
  if (!session) return NextResponse.json({ error: "Nicht angemeldet" }, { status: 401 })

  const isPrivileged = session.role.includes("admin") || session.role.includes("agent")
  if (!isPrivileged) return NextResponse.json({ error: "Keine Berechtigung" }, { status: 403 })

  const { id } = await params
  const { to, subject, body } = await req.json()

  if (!to || !subject || !body) {
    return NextResponse.json({ error: "Empfänger, Betreff und Nachricht erforderlich" }, { status: 400 })
  }

  try {
    // Send email
    const htmlBody = body.includes("<") ? body : body.replace(/\n/g, "<br>")
    await sendMail(to, subject, htmlBody)

    // Save as internal comment
    await hdInsert(
      "INSERT INTO ticket_comments (ticket_id, user_id, content, is_internal) VALUES (?, ?, ?, 1)",
      [id, session.userId, `📧 Weitergeleitet an: ${to}\n\nBetreff: ${subject}\n\n${body}`]
    )

    return NextResponse.json({ success: true })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
