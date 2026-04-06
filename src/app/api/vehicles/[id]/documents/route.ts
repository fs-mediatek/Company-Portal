import { NextRequest, NextResponse } from "next/server"
import { getSession } from "@/lib/auth"
import { query, insert, queryOne } from "@/lib/db"
import { writeFile, mkdir, unlink } from "fs/promises"
import path from "path"
import crypto from "crypto"
import {
  getSiteForVehicle,
  getGraphToken,
  getSiteAndDrive,
  vehicleFolderPath,
  listFiles,
  uploadFile,
  deleteFile,
} from "@/lib/sharepoint"

type Ctx = { params: Promise<{ id: string }> }

export async function GET(req: NextRequest, { params }: Ctx) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { id } = await params

  // SharePoint mode — only if vehicle has a site assigned
  const spSite = await getSiteForVehicle(parseInt(id)).catch(() => null)
  if (spSite) {
    try {
      const vehicle = await queryOne<any>(`SELECT license_plate FROM vehicles WHERE id = ?`, [id])
      if (!vehicle) return NextResponse.json([])

      const token = await getGraphToken()
      const { siteId, driveId } = await getSiteAndDrive(token, spSite)
      const folderPath = vehicleFolderPath(spSite, id, vehicle.license_plate)
      const files = await listFiles(token, siteId, driveId, folderPath)

      // Merge with DB metadata (labels, uploader)
      const dbDocs = await query<any>(
        `SELECT d.*, u.name as uploaded_by_name
         FROM vehicle_documents d LEFT JOIN users u ON d.uploaded_by = u.id
         WHERE d.vehicle_id = ? AND d.storage_type = 'sharepoint'`,
        [id]
      )
      const dbByItemId: Record<string, any> = {}
      dbDocs.forEach((d: any) => { if (d.sharepoint_item_id) dbByItemId[d.sharepoint_item_id] = d })

      return NextResponse.json(files.map(f => ({
        id: f.id,
        filename: f.name,
        original_name: f.name,
        mime_type: f.file?.mimeType || null,
        size_bytes: f.size,
        doc_label: dbByItemId[f.id]?.doc_label || null,
        uploaded_by_name: dbByItemId[f.id]?.uploaded_by_name || null,
        uploaded_at: f.createdDateTime,
        storage_type: "sharepoint",
        web_url: f.webUrl,
      })))
    } catch (err: any) {
      console.error("[SharePoint GET]", err.message)
    }
  }

  // Local fallback
  const docs = await query(
    `SELECT d.*, u.name as uploaded_by_name
     FROM vehicle_documents d LEFT JOIN users u ON d.uploaded_by = u.id
     WHERE d.vehicle_id = ? AND d.storage_type = 'local'
     ORDER BY d.uploaded_at DESC`,
    [id]
  )
  return NextResponse.json(docs)
}

export async function POST(req: NextRequest, { params }: Ctx) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const isPrivileged = ["admin", "manager"].some(r => session.role.includes(r))
  if (!isPrivileged) return NextResponse.json({ error: "Keine Berechtigung" }, { status: 403 })

  const { id } = await params

  try {
    const formData = await req.formData()
    const file = formData.get("file") as File | null
    const label = formData.get("label") as string || null
    if (!file) return NextResponse.json({ error: "Keine Datei" }, { status: 400 })

    const buffer = Buffer.from(await file.arrayBuffer())
    const spSite = await getSiteForVehicle(parseInt(id)).catch(() => null)

    if (spSite) {
      const vehicle = await queryOne<any>(`SELECT license_plate FROM vehicles WHERE id = ?`, [id])
      if (!vehicle) throw new Error("Fahrzeug nicht gefunden")

      const token = await getGraphToken()
      const { siteId, driveId } = await getSiteAndDrive(token, spSite)
      const folderPath = vehicleFolderPath(spSite, id, vehicle.license_plate)

      const ext = path.extname(file.name)
      const base = path.basename(file.name, ext)
      const filename = `${base}_${Date.now()}${ext}`

      const spItem = await uploadFile(token, siteId, driveId, folderPath, filename, buffer, file.type || "")

      await insert(
        `INSERT INTO vehicle_documents (vehicle_id, filename, original_name, mime_type, size_bytes, doc_label, sharepoint_item_id, storage_type, uploaded_by)
         VALUES (?, ?, ?, ?, ?, ?, ?, 'sharepoint', ?)`,
        [id, filename, file.name, file.type || null, buffer.length, label, spItem.id, session.userId]
      )
      return NextResponse.json({ id: spItem.id, filename, storage_type: "sharepoint" }, { status: 201 })
    }

    // Local fallback
    const ext = path.extname(file.name) || ""
    const filename = `vehicle_${id}_${crypto.randomUUID()}${ext}`
    const uploadsDir = path.join(process.cwd(), "uploads", "vehicles")
    await mkdir(uploadsDir, { recursive: true })
    await writeFile(path.join(uploadsDir, filename), buffer)

    const docId = await insert(
      `INSERT INTO vehicle_documents (vehicle_id, filename, original_name, mime_type, size_bytes, doc_label, storage_type, uploaded_by)
       VALUES (?, ?, ?, ?, ?, ?, 'local', ?)`,
      [id, filename, file.name, file.type || null, buffer.length, label, session.userId]
    )
    return NextResponse.json({ id: docId, filename, storage_type: "local" }, { status: 201 })
  } catch (err: any) {
    console.error("[VehicleUpload]", err)
    return NextResponse.json({ error: err.message || "Upload fehlgeschlagen" }, { status: 500 })
  }
}

export async function DELETE(req: NextRequest, { params }: Ctx) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const isPrivileged = ["admin", "manager"].some(r => session.role.includes(r))
  if (!isPrivileged) return NextResponse.json({ error: "Keine Berechtigung" }, { status: 403 })

  const { id } = await params
  const { searchParams } = new URL(req.url)
  const docId = searchParams.get("docId")
  if (!docId) return NextResponse.json({ error: "docId fehlt" }, { status: 400 })

  const spSite = await getSiteForVehicle(parseInt(id)).catch(() => null)
  if (spSite) {
    try {
      const token = await getGraphToken()
      const { siteId, driveId } = await getSiteAndDrive(token, spSite)
      await deleteFile(token, siteId, driveId, docId)
      await query(`DELETE FROM vehicle_documents WHERE sharepoint_item_id = ? AND vehicle_id = ?`, [docId, id])
      return NextResponse.json({ success: true })
    } catch (err: any) {
      console.error("[SharePoint DELETE]", err.message)
    }
  }

  // Local fallback
  const doc = await queryOne<any>(`SELECT * FROM vehicle_documents WHERE id = ? AND vehicle_id = ?`, [docId, id])
  if (!doc) return NextResponse.json({ error: "Nicht gefunden" }, { status: 404 })
  try { await unlink(path.join(process.cwd(), "uploads", "vehicles", doc.filename)) } catch {}
  await query(`DELETE FROM vehicle_documents WHERE id = ?`, [docId])
  return NextResponse.json({ success: true })
}
