import { coreQuery } from "@/lib/core-db"

export interface MicrosoftSettings {
  ms_tenant_id: string
  ms_client_id: string
  ms_client_secret: string
  ms_login_enabled: string
}

let cachedSettings: MicrosoftSettings | null = null
let cacheTime = 0

export async function getMicrosoftSettings(): Promise<MicrosoftSettings> {
  if (cachedSettings && Date.now() - cacheTime < 60_000) return cachedSettings
  const rows = await coreQuery("SELECT key_name, value FROM settings WHERE key_name LIKE 'ms_%'") as any[]
  const s: any = {}
  rows.forEach(r => { s[r.key_name] = r.value })
  cachedSettings = s as MicrosoftSettings
  cacheTime = Date.now()
  return cachedSettings
}

export function invalidateMicrosoftCache() {
  cachedSettings = null
}

// OAuth2 Authorization Code Flow

export async function exchangeCodeForToken(code: string, redirectUri: string) {
  const s = await getMicrosoftSettings()

  const res = await fetch(`https://login.microsoftonline.com/${s.ms_tenant_id}/oauth2/v2.0/token`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: s.ms_client_id,
      client_secret: s.ms_client_secret,
      code,
      redirect_uri: redirectUri,
      grant_type: "authorization_code",
      scope: "openid profile email User.Read",
    }),
  })

  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(`Token-Austausch fehlgeschlagen: ${err.error_description || err.error || res.statusText}`)
  }

  return res.json()
}

export async function getMicrosoftUserProfile(accessToken: string) {
  const res = await fetch("https://graph.microsoft.com/v1.0/me", {
    headers: { Authorization: `Bearer ${accessToken}` },
  })

  if (!res.ok) throw new Error("Microsoft-Profil konnte nicht geladen werden")
  return res.json()
}
