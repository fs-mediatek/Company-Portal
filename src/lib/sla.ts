import { coreQuery } from "@/lib/core-db"

interface SlaRule {
  id: number
  name: string
  area: string
  match_category: string | null
  match_priority: string | null
  response_hours: number | null
  resolution_hours: number | null
  sort_order: number
}

/**
 * Find best matching SLA rule. More specific matches win.
 * Central: rules stored in portal_core.sla_rules with area field.
 */
export async function findMatchingSla(opts: {
  area: string
  category?: string | null
  priority?: string | null
}): Promise<SlaRule | null> {
  const rules = await coreQuery<SlaRule>(
    "SELECT * FROM sla_rules WHERE (area = ? OR area = 'all') AND active = 1 ORDER BY sort_order ASC",
    [opts.area]
  )

  if (rules.length === 0) return null

  let best: SlaRule | null = null
  let bestScore = -1

  for (const rule of rules) {
    let score = 0
    let matches = true

    // Area-specific rules score higher than "all"
    if (rule.area === opts.area) score += 8

    if (rule.match_category) {
      if (opts.category && opts.category.toLowerCase() === rule.match_category.toLowerCase()) score += 4
      else matches = false
    }
    if (rule.match_priority) {
      if (opts.priority && opts.priority.toLowerCase() === rule.match_priority.toLowerCase()) score += 1
      else matches = false
    }

    if (matches && score > bestScore) {
      best = rule
      bestScore = score
    }
    if (matches && score === 0 && !best) {
      best = rule
      bestScore = 0
    }
  }

  return best
}

/**
 * Apply SLA to a helpdesk ticket.
 */
export async function applySlaToHelpdeskTicket(ticketId: number, opts: {
  category?: string | null
  priority?: string | null
}) {
  try {
    const rule = await findMatchingSla({ area: "helpdesk", ...opts })
    if (!rule || !rule.resolution_hours) return
    const { hdQuery } = await import("@/lib/helpdesk-db")
    await hdQuery(
      "UPDATE tickets SET sla_due_at = DATE_ADD(created_at, INTERVAL ? HOUR) WHERE id = ?",
      [rule.resolution_hours, ticketId]
    )
  } catch (err) {
    console.error("[SLA] Helpdesk:", err)
  }
}

/**
 * Apply SLA to a facility ticket.
 */
export async function applySlaToFacilityTicket(ticketId: number, opts: {
  category?: string | null
  priority?: string | null
}) {
  try {
    const rule = await findMatchingSla({ area: "facility", ...opts })
    if (!rule || !rule.resolution_hours) return
    const { query } = await import("@/lib/db")
    await query(
      "UPDATE tickets SET sla_due_at = DATE_ADD(created_at, INTERVAL ? HOUR) WHERE id = ?",
      [rule.resolution_hours, ticketId]
    )
  } catch (err) {
    console.error("[SLA] Facility:", err)
  }
}
