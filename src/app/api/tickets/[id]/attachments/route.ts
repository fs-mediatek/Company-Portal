import { NextRequest, NextResponse } from "next/server"
import { getSession } from "@/lib/auth"
import { query, insert } from "@/lib/db"
import { writeFile, mkdir } from "fs/promises"
import path from "path"
import crypto from "crypto"

type Ctx = { params: Promise<{ id: string }> }

export async function GET(req: NextRequest, { params }: Ctx) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { id } = await params
  const attachments = await query(
    `SELECT a.*, u.name as uploaded_by_name
     FROM ticket_attachments a
     LEFT JOIN users u ON a.uploaded_by = u.id
     WHERE a.ticket_id = ?
     ORDER BY a.created_at ASC`,
    [id]
  )
  return NextResponse.json(attachments)
}

export async function POST(req: NextRequest, { params }: Ctx) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { id } = await params

  try {
    const formData = await req.formData()
    const file = formData.get("file") as File | null
    if (!file) return NextResponse.json({ error: "Keine Datei" }, { status: 400 })

    // Generate unique filename
    const ext = path.extname(file.name) || ""
    const filename = `${crypto.randomUUID()}${ext}`

    // Ensure uploads dir exists
    const uploadsDir = path.join(process.cwd(), "uploads")
    await mkdir(uploadsDir, { recursive: true })

    // Write file
    const buffer = Buffer.from(await file.arrayBuffer())
    await writeFile(path.join(uploadsDir, filename), buffer)

    // Save to DB
    const attachmentId = await insert(
      'INSERT INTO ticket_attachments (ticket_id, filename, original_name, mime_type, size_bytes, uploaded_by) VALUES (?, ?, ?, ?, ?, ?)',
      [id, filename, file.name, file.type || null, buffer.length, session.userId]
    )

    return NextResponse.json({ id: attachmentId, filename }, { status: 201 })
  } catch (err: any) {
    console.error("[Upload]", err)
    return NextResponse.json({ error: "Upload fehlgeschlagen" }, { status: 500 })
  }
}
