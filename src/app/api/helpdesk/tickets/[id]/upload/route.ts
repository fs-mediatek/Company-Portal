import { NextRequest, NextResponse } from "next/server"
import { getSessionFromRequest } from "@/lib/auth"
import { writeFile, mkdir } from "fs/promises"
import { readFileSync, existsSync } from "fs"
import { join } from "path"

const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/gif", "image/webp"]
const MAX_SIZE = 10 * 1024 * 1024 // 10 MB

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSessionFromRequest(req)
  if (!session) return NextResponse.json({ error: "Nicht angemeldet" }, { status: 401 })

  const { id } = await params

  try {
    const formData = await req.formData()
    const file = formData.get("file") as File | null
    if (!file) return NextResponse.json({ error: "Keine Datei" }, { status: 400 })

    if (!ALLOWED_TYPES.includes(file.type)) {
      return NextResponse.json({ error: "Nur Bilder erlaubt (JPG, PNG, GIF, WebP)" }, { status: 400 })
    }
    if (file.size > MAX_SIZE) {
      return NextResponse.json({ error: "Datei zu groß (max. 10 MB)" }, { status: 400 })
    }

    const ext = file.name.split(".").pop()?.toLowerCase() || "jpg"
    const filename = `${Date.now()}_${Math.random().toString(36).slice(2, 8)}.${ext}`

    // Prevent path traversal
    if (filename.includes("..") || filename.includes("/")) {
      return NextResponse.json({ error: "Ungültiger Dateiname" }, { status: 400 })
    }

    const dir = join(process.cwd(), "uploads", "tickets", id)
    await mkdir(dir, { recursive: true })

    const buffer = Buffer.from(await file.arrayBuffer())
    await writeFile(join(dir, filename), buffer)

    const url = `/api/helpdesk/tickets/${id}/upload?file=${filename}`
    return NextResponse.json({ success: true, url, filename })
  } catch (err: any) {
    console.error("[Upload]", err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const filename = req.nextUrl.searchParams.get("file")
  if (!filename || filename.includes("..") || filename.includes("/")) {
    return NextResponse.json({ error: "Ungültig" }, { status: 400 })
  }

  const filepath = join(process.cwd(), "uploads", "tickets", id, filename)
  if (!existsSync(filepath)) {
    return NextResponse.json({ error: "Nicht gefunden" }, { status: 404 })
  }

  const buffer = readFileSync(filepath)
  const ext = filename.split(".").pop()?.toLowerCase()
  const mime = ext === "png" ? "image/png" : ext === "gif" ? "image/gif" : ext === "webp" ? "image/webp" : "image/jpeg"

  return new NextResponse(buffer, {
    headers: {
      "Content-Type": mime,
      "Cache-Control": "public, max-age=86400",
    },
  })
}
