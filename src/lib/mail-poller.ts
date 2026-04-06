import { coreQuery } from "@/lib/core-db"

let polling = false
let intervalId: NodeJS.Timeout | null = null

async function getPollerSettings() {
  const rows = await coreQuery<any>(
    "SELECT key_name, value FROM settings WHERE key_name LIKE 'mail_poll_%' OR key_name LIKE 'ms_%'"
  )
  const s: Record<string, string> = {}
  rows.forEach((r: any) => { s[r.key_name] = r.value })
  return s
}

async function pollEmails() {
  if (polling) return
  polling = true

  try {
    const settings = await getPollerSettings()
    if (settings.mail_poll_enabled !== "true") { polling = false; return }

    const area = settings.mail_poll_area || "helpdesk"
    const mailbox = settings.ms_mailbox || settings.mail_poll_mailbox

    if (!mailbox) { polling = false; return }

    // Try MS365 Graph API first
    if (settings.ms_tenant_id && settings.ms_client_id && settings.ms_client_secret) {
      await pollMS365(mailbox, area, settings)
    }
    // IMAP fallback could be added here
  } catch (err) {
    console.error("[MailPoller] Error:", err)
  }

  polling = false
}

async function pollMS365(mailbox: string, area: string, settings: Record<string, string>) {
  try {
    const { getAppAccessToken } = await import("@/lib/microsoft")

    // Get app token (client credentials flow)
    const tokenRes = await fetch(`https://login.microsoftonline.com/${settings.ms_tenant_id}/oauth2/v2.0/token`, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        client_id: settings.ms_client_id,
        client_secret: settings.ms_client_secret,
        scope: "https://graph.microsoft.com/.default",
        grant_type: "client_credentials",
      }),
    })

    if (!tokenRes.ok) return
    const tokenData = await tokenRes.json()
    const token = tokenData.access_token

    // Fetch unread emails (max from settings)
    const maxMessages = parseInt(settings.mail_poll_max_messages || "10") || 10
    const res = await fetch(
      `https://graph.microsoft.com/v1.0/users/${encodeURIComponent(mailbox)}/mailFolders/inbox/messages?$filter=isRead eq false&$top=${maxMessages}&$orderby=receivedDateTime desc&$select=id,subject,bodyPreview,body,from,receivedDateTime`,
      { headers: { Authorization: `Bearer ${token}` } }
    )

    if (!res.ok) return
    const data = await res.json()
    const messages = data.value || []

    for (const msg of messages) {
      await createTicketFromEmail(msg, area)

      // Mark as read
      await fetch(
        `https://graph.microsoft.com/v1.0/users/${encodeURIComponent(mailbox)}/messages/${msg.id}`,
        {
          method: "PATCH",
          headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
          body: JSON.stringify({ isRead: true }),
        }
      )
    }

    if (messages.length > 0) {
      console.log(`[MailPoller] ${messages.length} E-Mails verarbeitet → ${area}`)
    }
  } catch (err) {
    console.error("[MailPoller] MS365 Error:", err)
  }
}

async function createTicketFromEmail(msg: any, area: string) {
  const fromEmail = msg.from?.emailAddress?.address?.toLowerCase() || ""
  const fromName = msg.from?.emailAddress?.name || fromEmail.split("@")[0]
  const subject = msg.subject || "Kein Betreff"
  const body = msg.body?.content || msg.bodyPreview || ""

  // Find or create user
  let userId: number
  const [existingUser] = await coreQuery<any>("SELECT id FROM users WHERE email = ?", [fromEmail])

  if (existingUser) {
    userId = existingUser.id
  } else {
    // Auto-create user from email
    const bcrypt = await import("bcryptjs")
    const hash = await bcrypt.hash(crypto.randomUUID(), 10)
    const { coreInsert } = await import("@/lib/core-db")
    userId = await coreInsert(
      "INSERT INTO users (name, email, password_hash, role, active) VALUES (?, ?, ?, 'user', 1)",
      [fromName, fromEmail, hash]
    )
  }

  // Load settings for prefix and category
  const settingRows = await coreQuery<any>("SELECT key_name, value FROM settings WHERE key_name IN ('ticket_prefix_helpdesk','mail_poll_default_category')")
  const cfg: Record<string, string> = {}
  settingRows.forEach((r: any) => { cfg[r.key_name] = r.value })
  const ticketPrefix = cfg.ticket_prefix_helpdesk || "IT"
  const mailCategory = cfg.mail_poll_default_category || "E-Mail"

  // Create ticket in area-specific DB
  const year = new Date().getFullYear()

  if (area === "helpdesk") {
    const { hdQuery, hdInsert } = await import("@/lib/helpdesk-db")
    await hdQuery("INSERT INTO ticket_counters (year, last_number) VALUES (?, 0) ON DUPLICATE KEY UPDATE last_number = last_number", [year])
    await hdQuery("UPDATE ticket_counters SET last_number = last_number + 1 WHERE year = ?", [year])
    const [counter] = await hdQuery<any>("SELECT last_number FROM ticket_counters WHERE year = ?", [year])
    const num = String(counter.last_number).padStart(4, "0")
    const ticketNumber = `${ticketPrefix}-${year}-${num}`

    await hdInsert(
      "INSERT INTO tickets (ticket_number, title, description, category, requester_id) VALUES (?, ?, ?, ?, ?)",
      [ticketNumber, subject, body, mailCategory, userId]
    )
  }
}

export async function startMailPoller() {
  if (intervalId) return
  // Read interval from settings
  let intervalSec = 60
  try {
    const [row] = await coreQuery<any>("SELECT value FROM settings WHERE key_name = 'mail_poll_interval_sec'")
    if (row?.value) intervalSec = parseInt(row.value) || 60
  } catch {}
  console.log(`[MailPoller] Gestartet (${intervalSec}s Intervall)`)
  intervalId = setInterval(pollEmails, intervalSec * 1000)
  // First poll after 10s
  setTimeout(pollEmails, 10_000)
}

export function stopMailPoller() {
  if (intervalId) { clearInterval(intervalId); intervalId = null }
}
