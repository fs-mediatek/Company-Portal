import { NextRequest, NextResponse } from "next/server"
import { getSession } from "@/lib/auth"
import { queryOne } from "@/lib/db"
import { readFile } from "fs/promises"
import path from "path"

type Ctx = { params: Promise<{ id: string }> }

export async function GET(req: NextRequest, { params }: Ctx) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { id } = await params
  const attachment = await queryOne<any>(
    'SELECT * FROM ticket_attachments WHERE id = ?', [id]
  )

  if (!attachment) return NextResponse.json({ error: "Nicht gefunden" }, { status: 404 })

  try {
    const filePath = path.join(process.cwd(), "uploads", attachment.filename)
    const buffer = await readFile(filePath)

    return new NextResponse(buffer, {
      headers: {
        "Content-Type": attachment.mime_type || "application/octet-stream",
        "Content-Disposition": `inline; filename="${attachment.original_name}"`,
      },
    })
  } catch {
    return NextResponse.json({ error: "Datei nicht gefunden" }, { status: 404 })
  }
}
