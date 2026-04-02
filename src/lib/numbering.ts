import { query } from "@/lib/db"

export async function generateTicketNumber(): Promise<string> {
  const year = new Date().getFullYear()

  // Get or create counter for this year
  await query(
    'INSERT INTO ticket_counters (year, last_number) VALUES (?, 0) ON DUPLICATE KEY UPDATE year = year',
    [year]
  )

  // Increment atomically
  await query('UPDATE ticket_counters SET last_number = last_number + 1 WHERE year = ?', [year])

  const counter = await query<any>('SELECT last_number FROM ticket_counters WHERE year = ?', [year])
  const num = counter[0]?.last_number || 1

  // Get settings for prefix/pattern
  let prefix = "FM"
  try {
    const setting = await query<any>("SELECT value FROM settings WHERE key_name = 'ticket_number_prefix'")
    if (setting[0]?.value) prefix = setting[0].value
  } catch {}

  return `${prefix}-${year}-${String(num).padStart(4, "0")}`
}
