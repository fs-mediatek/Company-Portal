import { NextRequest, NextResponse } from "next/server"
import { getSession } from "@/lib/auth"
import { queryOne } from "@/lib/db"
import { readFile } from "fs/promises"
import path from "path"
import {
  getSiteForVehicle,
  getGraphToken,
  getSiteAndDrive,
  getFileContent,
} from "@/lib/sharepoint"

type Ctx = { params: Promise<{ id: string; docId: string }> }

export async function GET(req: NextRequest, { params }: Ctx) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { id, docId } = await params

  // SharePoint mode — only if vehicle has a site assigned
  const spSite = await getSiteForVehicle(parseInt(id)).catch(() => null)
  if (spSite) {
    try {
      const token = await getGraphToken()
      const { siteId, driveId } = await getSiteAndDrive(token, spSite)
      const { buffer, mimeType, name } = await getFileContent(token, siteId, driveId, docId)

      const inline = mimeType.startsWith("image/") || mimeType === "application/pdf"
      return new NextResponse(buffer, {
        headers: {
          "Content-Type": mimeType,
          "Content-Disposition": `${inline ? "inline" : "attachment"}; filename="${name}"`,
          "Cache-Control": "private, max-age=300",
        },
      })
    } catch (err: any) {
      console.error("[SharePoint serve]", err.message)
      return NextResponse.json({ error: "Datei nicht gefunden" }, { status: 404 })
    }
  }

  // Local fallback — docId is the numeric DB id
  const doc = await queryOne<any>(
    `SELECT * FROM vehicle_documents WHERE id = ? AND vehicle_id = ?`, [docId, id]
  )
  if (!doc) return NextResponse.json({ error: "Nicht gefunden" }, { status: 404 })

  try {
    const filePath = path.join(process.cwd(), "uploads", "vehicles", doc.filename)
    const buffer = await readFile(filePath)
    const inline = (doc.mime_type || "").startsWith("image/") || doc.mime_type === "application/pdf"
    return new NextResponse(buffer, {
      headers: {
        "Content-Type": doc.mime_type || "application/octet-stream",
        "Content-Disposition": `${inline ? "inline" : "attachment"}; filename="${doc.original_name}"`,
      },
    })
  } catch {
    return NextResponse.json({ error: "Datei nicht gefunden" }, { status: 404 })
  }
}
