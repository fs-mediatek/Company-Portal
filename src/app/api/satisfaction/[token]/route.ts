import { NextRequest, NextResponse } from "next/server"
import { hdQuery } from "@/lib/helpdesk-db"

// Public endpoint — no auth required (token-based)

export async function GET(req: NextRequest, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params

  // Token = base64(ticketId:ticketNumber)
  try {
    const decoded = Buffer.from(token, "base64").toString()
    const [ticketId] = decoded.split(":")

    const [ticket] = await hdQuery<any>(
      "SELECT id, ticket_number, title, status, satisfaction_rating FROM tickets WHERE id = ?",
      [ticketId]
    )

    if (!ticket) return NextResponse.json({ error: "Ticket nicht gefunden" }, { status: 404 })
    if (ticket.satisfaction_rating) return NextResponse.json({ already_rated: true, rating: ticket.satisfaction_rating })

    return NextResponse.json({ ticket_number: ticket.ticket_number, title: ticket.title, status: ticket.status })
  } catch {
    return NextResponse.json({ error: "Ungültiger Token" }, { status: 400 })
  }
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params

  try {
    const decoded = Buffer.from(token, "base64").toString()
    const [ticketId] = decoded.split(":")
    const { rating, comment } = await req.json()

    if (!rating || rating < 1 || rating > 5) {
      return NextResponse.json({ error: "Bewertung (1-5) erforderlich" }, { status: 400 })
    }

    await hdQuery(
      "UPDATE tickets SET satisfaction_rating = ?, satisfaction_comment = ? WHERE id = ?",
      [rating, comment || null, ticketId]
    )

    return NextResponse.json({ success: true })
  } catch {
    return NextResponse.json({ error: "Fehler" }, { status: 400 })
  }
}
