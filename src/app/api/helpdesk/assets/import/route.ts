import { NextRequest, NextResponse } from "next/server"
import { getSessionFromRequest } from "@/lib/auth"
import { hdQuery, hdInsert } from "@/lib/helpdesk-db"
import { coreQuery } from "@/lib/core-db"

export async function POST(req: NextRequest) {
  const session = await getSessionFromRequest(req)
  if (!session) return NextResponse.json({ error: "Nicht angemeldet" }, { status: 401 })
  if (!session.role.includes("admin") && !session.role.includes("agent")) {
    return NextResponse.json({ error: "Keine Berechtigung" }, { status: 403 })
  }

  const { rows, platform } = await req.json()
  if (!Array.isArray(rows) || !platform) {
    return NextResponse.json({ error: "rows (Array) und platform erforderlich" }, { status: 400 })
  }

  let imported = 0
  let updated = 0
  const userMatches: { deviceName: string; userName: string; email: string }[] = []

  for (const row of rows) {
    const serial = (row["Serial number"] || row["Seriennummer"] || "").trim()
    const deviceName = (row["Device name"] || row["Gerätename"] || "").trim()
    const model = (row["Model"] || row["Modell"] || "").trim()
    const manufacturer = (row["Manufacturer"] || row["Hersteller"] || "").trim()
    const osVersion = (row["OS version"] || row["OS-Version"] || "").trim()
    const userEmail = (row["Primary user email address"] || row["E-Mail"] || "").trim().toLowerCase()
    const userName = (row["Primary user display name"] || row["Benutzername"] || "").trim()
    const enrollDate = (row["Enrollment date"] || row["Registrierungsdatum"] || "").trim()
    const deviceId = (row["Device ID"] || row["Geräte-ID"] || "").trim()
    const phone = (row["Phone number"] || row["Telefonnummer"] || "").trim()
    const imei = (row["IMEI"] || "").trim()

    if (!serial && !deviceId) continue

    // Parse date
    let commissioned: string | null = null
    if (enrollDate) {
      try {
        const d = new Date(enrollDate)
        if (!isNaN(d.getTime())) commissioned = d.toISOString().split("T")[0]
      } catch {}
    }

    // Check existing by device_id or serial
    let existing: any = null
    if (deviceId) {
      [existing] = await hdQuery("SELECT id FROM assets WHERE intune_device_id = ? AND active = 1", [deviceId])
    }
    if (!existing && serial) {
      [existing] = await hdQuery("SELECT id FROM assets WHERE serial_number = ? AND active = 1", [serial])
    }

    // Match user
    let assignedUserId: number | null = null
    if (userEmail) {
      const [user] = await coreQuery<any>("SELECT id, name FROM users WHERE email = ? AND active = 1", [userEmail])
      if (user) {
        assignedUserId = user.id
        userMatches.push({ deviceName: deviceName || model, userName: user.name, email: userEmail })
      }
    }

    const name = deviceName || `${manufacturer} ${model}`.trim() || "Unbekanntes Gerät"
    const assetTag = `AST-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).slice(2, 5).toUpperCase()}`

    if (existing) {
      await hdQuery(
        `UPDATE assets SET name = ?, model = ?, manufacturer = ?, os_version = ?, primary_user_email = ?,
         intune_device_id = ?, phone_number = ?, imei = ?, commissioned_at = COALESCE(?, commissioned_at),
         assigned_to_user_id = COALESCE(?, assigned_to_user_id)
         WHERE id = ?`,
        [name, model, manufacturer, osVersion, userEmail || null, deviceId || null, phone || null, imei || null, commissioned, assignedUserId, existing.id]
      )
      updated++
    } else {
      await hdInsert(
        `INSERT INTO assets (asset_tag, name, type, platform, model, manufacturer, serial_number, os_version,
         primary_user_email, intune_device_id, phone_number, imei, commissioned_at, assigned_to_user_id,
         status) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [assetTag, name, platform === "android" ? "Smartphone" : "PC", platform, model, manufacturer,
         serial || null, osVersion, userEmail || null, deviceId || null, phone || null, imei || null,
         commissioned, assignedUserId, assignedUserId ? "assigned" : "available"]
      )
      imported++
    }
  }

  return NextResponse.json({ imported, updated, total: rows.length, userMatches })
}
