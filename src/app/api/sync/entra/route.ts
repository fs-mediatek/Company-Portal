import { NextRequest, NextResponse } from "next/server"
import { getSessionFromRequest } from "@/lib/auth"
import { coreQuery, coreInsert } from "@/lib/core-db"
import bcrypt from "bcryptjs"

export async function POST(req: NextRequest) {
  const session = await getSessionFromRequest(req)
  if (!session || !session.role.includes("admin")) {
    return NextResponse.json({ error: "Keine Berechtigung" }, { status: 403 })
  }

  try {
    // Get MS settings
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
    const tokenData = await tokenRes.json()
    const token = tokenData.access_token

    // Fetch all users from Entra ID
    const usersRes = await fetch(
      "https://graph.microsoft.com/v1.0/users?$select=id,displayName,mail,userPrincipalName,department,businessPhones,mobilePhone,accountEnabled&$top=999",
      { headers: { Authorization: `Bearer ${token}` } }
    )

    if (!usersRes.ok) return NextResponse.json({ error: "Benutzer konnten nicht geladen werden" }, { status: 500 })
    const usersData = await usersRes.json()
    const entraUsers = usersData.value || []

    let created = 0
    let updated = 0
    let skipped = 0

    for (const eu of entraUsers) {
      const email = (eu.mail || eu.userPrincipalName || "").toLowerCase()
      if (!email || email.includes("#EXT#")) { skipped++; continue }

      const name = eu.displayName || email.split("@")[0]
      const phone = eu.businessPhones?.[0] || eu.mobilePhone || null

      const [existing] = await coreQuery<any>("SELECT id, name FROM users WHERE email = ?", [email])

      if (existing) {
        await coreQuery("UPDATE users SET name = ?, phone = COALESCE(?, phone) WHERE id = ?", [name, phone, existing.id])
        updated++
      } else {
        if (!eu.accountEnabled) { skipped++; continue }
        const hash = await bcrypt.hash(crypto.randomUUID(), 10)
        await coreInsert(
          "INSERT INTO users (name, email, password_hash, role, phone, active) VALUES (?, ?, ?, 'user', ?, 1)",
          [name, email, hash, phone]
        )
        created++
      }
    }

    // Save sync result
    await coreQuery("INSERT INTO settings (key_name, value) VALUES ('entra_last_sync', ?) ON DUPLICATE KEY UPDATE value = VALUES(value)", [new Date().toISOString()])
    await coreQuery("INSERT INTO settings (key_name, value) VALUES ('entra_last_result', ?) ON DUPLICATE KEY UPDATE value = VALUES(value)", [JSON.stringify({ created, updated, skipped, total: entraUsers.length })])

    return NextResponse.json({ created, updated, skipped, total: entraUsers.length })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

export async function GET(req: NextRequest) {
  const session = await getSessionFromRequest(req)
  if (!session || !session.role.includes("admin")) {
    return NextResponse.json({ error: "Keine Berechtigung" }, { status: 403 })
  }

  const [lastSync] = await coreQuery<any>("SELECT value FROM settings WHERE key_name = 'entra_last_sync'")
  const [lastResult] = await coreQuery<any>("SELECT value FROM settings WHERE key_name = 'entra_last_result'")

  return NextResponse.json({
    last_sync: lastSync?.value || null,
    last_result: lastResult?.value ? JSON.parse(lastResult.value) : null,
  })
}
