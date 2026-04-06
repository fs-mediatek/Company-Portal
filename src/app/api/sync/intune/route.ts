import { NextRequest, NextResponse } from "next/server"
import { getSessionFromRequest } from "@/lib/auth"
import { coreQuery } from "@/lib/core-db"
import { hdQuery, hdInsert } from "@/lib/helpdesk-db"

export async function POST(req: NextRequest) {
  const session = await getSessionFromRequest(req)
  if (!session || !session.role.includes("admin")) {
    return NextResponse.json({ error: "Keine Berechtigung" }, { status: 403 })
  }

  try {
    const settingRows = await coreQuery<any>("SELECT key_name, value FROM settings WHERE key_name LIKE 'ms_%'")
    const s: Record<string, string> = {}
    settingRows.forEach((r: any) => { s[r.key_name] = r.value })

    if (!s.ms_tenant_id || !s.ms_client_id || !s.ms_client_secret) {
      return NextResponse.json({ error: "Microsoft 365 nicht konfiguriert" }, { status: 400 })
    }

    // Get app access token
    const tokenRes = await fetch(`https://login.microsoftonline.com/${s.ms_tenant_id}/oauth2/v2.0/token`, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        client_id: s.ms_client_id,
        client_secret: s.ms_client_secret,
        scope: "https://graph.microsoft.com/.default",
        grant_type: "client_credentials",
      }),
    })

    if (!tokenRes.ok) return NextResponse.json({ error: "Token-Fehler" }, { status: 500 })
    const { access_token: token } = await tokenRes.json()

    // Fetch managed devices
    const devicesRes = await fetch(
      "https://graph.microsoft.com/v1.0/deviceManagement/managedDevices?$select=id,deviceName,serialNumber,model,manufacturer,operatingSystem,osVersion,userPrincipalName,userDisplayName,enrolledDateTime,phoneNumber,imei&$top=999",
      { headers: { Authorization: `Bearer ${token}` } }
    )

    if (!devicesRes.ok) return NextResponse.json({ error: "Geräte konnten nicht geladen werden" }, { status: 500 })
    const devicesData = await devicesRes.json()
    const devices = devicesData.value || []

    let imported = 0
    let updated = 0

    for (const d of devices) {
      const serial = d.serialNumber || ""
      const deviceId = d.id || ""
      if (!serial && !deviceId) continue

      const platform = (d.operatingSystem || "").toLowerCase().includes("windows") ? "windows"
        : (d.operatingSystem || "").toLowerCase().includes("ios") ? "ios"
        : (d.operatingSystem || "").toLowerCase().includes("android") ? "android" : "other"

      const name = d.deviceName || `${d.manufacturer} ${d.model}`.trim()
      const email = (d.userPrincipalName || "").toLowerCase()

      // Match user
      let assignedUserId: number | null = null
      if (email) {
        const [user] = await coreQuery<any>("SELECT id FROM users WHERE email = ?", [email])
        if (user) assignedUserId = user.id
      }

      // Check existing
      let [existing] = await hdQuery<any>("SELECT id FROM assets WHERE intune_device_id = ? AND active = 1", [deviceId])
      if (!existing && serial) {
        [existing] = await hdQuery<any>("SELECT id FROM assets WHERE serial_number = ? AND active = 1", [serial])
      }

      if (existing) {
        await hdQuery(
          "UPDATE assets SET name = ?, model = ?, manufacturer = ?, os_version = ?, primary_user_email = ?, intune_device_id = ?, phone_number = ?, imei = ?, assigned_to_user_id = COALESCE(?, assigned_to_user_id) WHERE id = ?",
          [name, d.model, d.manufacturer, d.osVersion, email || null, deviceId, d.phoneNumber || null, d.imei || null, assignedUserId, existing.id]
        )
        updated++
      } else {
        const tag = `AST-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).slice(2, 5).toUpperCase()}`
        await hdInsert(
          "INSERT INTO assets (asset_tag, name, type, platform, model, manufacturer, serial_number, os_version, primary_user_email, intune_device_id, phone_number, imei, assigned_to_user_id, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
          [tag, name, platform === "android" ? "Smartphone" : "PC", platform, d.model, d.manufacturer, serial || null, d.osVersion, email || null, deviceId, d.phoneNumber || null, d.imei || null, assignedUserId, assignedUserId ? "assigned" : "available"]
        )
        imported++
      }
    }

    await coreQuery("INSERT INTO settings (key_name, value) VALUES ('intune_last_sync', ?) ON DUPLICATE KEY UPDATE value = VALUES(value)", [new Date().toISOString()])
    await coreQuery("INSERT INTO settings (key_name, value) VALUES ('intune_last_result', ?) ON DUPLICATE KEY UPDATE value = VALUES(value)", [JSON.stringify({ imported, updated, total: devices.length })])

    return NextResponse.json({ imported, updated, total: devices.length })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

export async function GET(req: NextRequest) {
  const session = await getSessionFromRequest(req)
  if (!session || !session.role.includes("admin")) {
    return NextResponse.json({ error: "Keine Berechtigung" }, { status: 403 })
  }

  const [lastSync] = await coreQuery<any>("SELECT value FROM settings WHERE key_name = 'intune_last_sync'")
  const [lastResult] = await coreQuery<any>("SELECT value FROM settings WHERE key_name = 'intune_last_result'")

  return NextResponse.json({
    last_sync: lastSync?.value || null,
    last_result: lastResult?.value ? JSON.parse(lastResult.value) : null,
  })
}
