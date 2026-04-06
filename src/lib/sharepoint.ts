/**
 * SharePoint / Microsoft Graph API helper — Multi-Site
 *
 * Sites are managed in portal_core.sharepoint_sites.
 * Each vehicle can be assigned a specific site via vehicles.sharepoint_site_id.
 *
 * Required Azure App permissions: Sites.ReadWrite.All
 */

import { getMicrosoftSettings } from "@/lib/microsoft"
import { coreQuery, coreInsert } from "@/lib/core-db"

// ─── Token cache (shared across all sites — same Azure app) ─────────────────

let tokenCache: { token: string; expires: number } | null = null

export async function getGraphToken(): Promise<string> {
  if (tokenCache && Date.now() < tokenCache.expires - 60_000) return tokenCache.token

  const s = await getMicrosoftSettings()
  if (!s.ms_tenant_id || !s.ms_client_id || !s.ms_client_secret) {
    throw new Error("Microsoft 365 nicht konfiguriert (Tenant/Client ID fehlen)")
  }

  const res = await fetch(
    `https://login.microsoftonline.com/${s.ms_tenant_id}/oauth2/v2.0/token`,
    {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        client_id: s.ms_client_id,
        client_secret: s.ms_client_secret,
        scope: "https://graph.microsoft.com/.default",
        grant_type: "client_credentials",
      }),
    }
  )

  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(`Graph-Token-Fehler: ${err.error_description || err.error || res.statusText}`)
  }

  const data = await res.json()
  tokenCache = { token: data.access_token, expires: Date.now() + data.expires_in * 1000 }
  return tokenCache.token
}

// ─── Site-Konfiguration ──────────────────────────────────────────────────────

export interface SharePointSite {
  id: number
  name: string
  site_url: string
  drive_name: string
  base_folder: string
  description: string | null
  active: boolean
}

export async function getAllSites(): Promise<SharePointSite[]> {
  const rows = await coreQuery<any>(
    "SELECT * FROM sharepoint_sites WHERE active = 1 ORDER BY name"
  )
  return rows
}

export async function getSiteById(siteId: number): Promise<SharePointSite | null> {
  const rows = await coreQuery<any>(
    "SELECT * FROM sharepoint_sites WHERE id = ? AND active = 1", [siteId]
  )
  return rows[0] ?? null
}

export async function getSiteForVehicle(vehicleId: number | string): Promise<SharePointSite | null> {
  const rows = await coreQuery<any>(
    `SELECT s.* FROM sharepoint_sites s
     INNER JOIN facility_mgmt.vehicles v ON v.sharepoint_site_id = s.id
     WHERE v.id = ? AND s.active = 1`,
    [vehicleId]
  )
  return rows[0] ?? null
}

// ─── Drive-Auflösung (mit Site-spezifischem Cache) ──────────────────────────

const driveCache = new Map<string, { siteId: string; driveId: string; ts: number }>()

export async function getSiteAndDrive(
  token: string,
  site: SharePointSite
): Promise<{ siteId: string; driveId: string }> {
  const cacheKey = `${site.id}`
  const cached = driveCache.get(cacheKey)
  if (cached && Date.now() - cached.ts < 10 * 60_000) {
    return { siteId: cached.siteId, driveId: cached.driveId }
  }

  const url = new URL(site.site_url)
  const siteRes = await fetch(
    `https://graph.microsoft.com/v1.0/sites/${url.hostname}:${url.pathname}`,
    { headers: { Authorization: `Bearer ${token}` } }
  )
  if (!siteRes.ok) throw new Error(`SharePoint-Site nicht erreichbar: ${site.site_url}`)
  const siteData = await siteRes.json()
  const graphSiteId: string = siteData.id

  const drivesRes = await fetch(
    `https://graph.microsoft.com/v1.0/sites/${graphSiteId}/drives`,
    { headers: { Authorization: `Bearer ${token}` } }
  )
  if (!drivesRes.ok) throw new Error("Document Libraries konnten nicht geladen werden")
  const drivesData = await drivesRes.json()

  const drive = (drivesData.value as any[]).find(
    d =>
      d.name?.toLowerCase() === site.drive_name.toLowerCase() ||
      d.webUrl?.toLowerCase().includes(site.drive_name.toLowerCase())
  )
  if (!drive) throw new Error(`Document Library "${site.drive_name}" nicht gefunden in ${site.site_url}`)

  driveCache.set(cacheKey, { siteId: graphSiteId, driveId: drive.id, ts: Date.now() })
  return { siteId: graphSiteId, driveId: drive.id }
}

// ─── Ordnerpfad ──────────────────────────────────────────────────────────────

export function vehicleFolderPath(site: SharePointSite, vehicleId: string | number, licensePlate: string): string {
  const safePlate = licensePlate.replace(/[/\\:*?"<>|]/g, "_")
  const base = site.base_folder.trim().replace(/^\/|\/$/g, "")
  return base ? `${base}/${vehicleId}_${safePlate}` : `${vehicleId}_${safePlate}`
}

// ─── Dateien auflisten ───────────────────────────────────────────────────────

export async function listFiles(
  token: string,
  siteId: string,
  driveId: string,
  folderPath: string
): Promise<any[]> {
  const res = await fetch(
    `https://graph.microsoft.com/v1.0/sites/${siteId}/drives/${driveId}/root:/${folderPath}:/children` +
      `?$select=id,name,size,file,createdDateTime,lastModifiedDateTime,webUrl`,
    { headers: { Authorization: `Bearer ${token}` } }
  )
  if (res.status === 404) return []
  if (!res.ok) throw new Error("Dateien konnten nicht geladen werden")
  const data = await res.json()
  return (data.value as any[]).filter(item => item.file)
}

// ─── Datei hochladen ─────────────────────────────────────────────────────────

export async function uploadFile(
  token: string,
  siteId: string,
  driveId: string,
  folderPath: string,
  filename: string,
  buffer: Buffer,
  mimeType: string
): Promise<{ id: string; name: string; webUrl: string }> {
  const res = await fetch(
    `https://graph.microsoft.com/v1.0/sites/${siteId}/drives/${driveId}/root:/${folderPath}/${filename}:/content`,
    {
      method: "PUT",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": mimeType || "application/octet-stream",
      },
      body: buffer,
    }
  )
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(`Upload fehlgeschlagen: ${err.error?.message || res.statusText}`)
  }
  return res.json()
}

// ─── Dateiinhalt abrufen ─────────────────────────────────────────────────────

export async function getFileContent(
  token: string,
  siteId: string,
  driveId: string,
  itemId: string
): Promise<{ buffer: Buffer; mimeType: string; name: string }> {
  const metaRes = await fetch(
    `https://graph.microsoft.com/v1.0/sites/${siteId}/drives/${driveId}/items/${itemId}?$select=name,file`,
    { headers: { Authorization: `Bearer ${token}` } }
  )
  if (!metaRes.ok) throw new Error("Datei nicht gefunden")
  const meta = await metaRes.json()

  const contentRes = await fetch(
    `https://graph.microsoft.com/v1.0/sites/${siteId}/drives/${driveId}/items/${itemId}/content`,
    { headers: { Authorization: `Bearer ${token}` } }
  )
  if (!contentRes.ok) throw new Error("Dateiinhalt konnte nicht geladen werden")

  return {
    buffer: Buffer.from(await contentRes.arrayBuffer()),
    mimeType: meta.file?.mimeType || "application/octet-stream",
    name: meta.name,
  }
}

// ─── Datei löschen ───────────────────────────────────────────────────────────

export async function deleteFile(
  token: string,
  siteId: string,
  driveId: string,
  itemId: string
): Promise<void> {
  const res = await fetch(
    `https://graph.microsoft.com/v1.0/sites/${siteId}/drives/${driveId}/items/${itemId}`,
    { method: "DELETE", headers: { Authorization: `Bearer ${token}` } }
  )
  if (!res.ok && res.status !== 404) throw new Error("Datei konnte nicht gelöscht werden")
}

// ─── Verbindungstest ─────────────────────────────────────────────────────────

export async function testSiteConnection(siteId: number): Promise<{ ok: boolean; message: string }> {
  try {
    const site = await getSiteById(siteId)
    if (!site) return { ok: false, message: "Site nicht gefunden" }
    const token = await getGraphToken()
    const { siteId: gSiteId, driveId } = await getSiteAndDrive(token, site)
    return {
      ok: true,
      message: `✓ Verbunden mit „${site.name}" · Library: ${site.drive_name}`,
    }
  } catch (err: any) {
    return { ok: false, message: err.message || "Verbindung fehlgeschlagen" }
  }
}
