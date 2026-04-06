import { coreQuery } from "@/lib/core-db"

/**
 * Auto-assign a ticket based on rules in portal_core.
 * Central: rules + settings in portal_core, ticket update in area-specific DB.
 */
export async function autoAssignTicket(
  area: "helpdesk" | "facility",
  ticketId: number,
  category: string | null,
): Promise<number | null> {
  try {
    // Check if auto-assign is enabled
    const settingRows = await coreQuery<any>(
      "SELECT key_name, value FROM settings WHERE key_name IN ('auto_assign_enabled','auto_assign_round_robin')"
    )
    const settings: Record<string, string> = {}
    settingRows.forEach((r: any) => { settings[r.key_name] = r.value })

    if (settings.auto_assign_enabled !== "true") return null

    // Check rules
    const rules = await coreQuery<any>(
      "SELECT * FROM auto_assign_rules WHERE (area = ? OR area = 'all') AND active = 1 ORDER BY priority ASC",
      [area]
    )

    for (const rule of rules) {
      const categoryMatch = !rule.category || rule.category === category
      if (categoryMatch) {
        // Update ticket in area-specific DB
        if (area === "helpdesk") {
          const { hdQuery } = await import("@/lib/helpdesk-db")
          await hdQuery("UPDATE tickets SET assignee_id = ? WHERE id = ?", [rule.assign_to_user_id, ticketId])
        } else {
          const { query } = await import("@/lib/db")
          await query("UPDATE tickets SET assigned_to_user_id = ? WHERE id = ?", [rule.assign_to_user_id, ticketId])
        }
        console.log(`[AutoAssign] ${area} Ticket ${ticketId} → User ${rule.assign_to_user_id} (Regel ${rule.id})`)
        return rule.assign_to_user_id
      }
    }

    // Round-robin fallback
    if (settings.auto_assign_round_robin === "true") {
      // Find agent/admin with fewest open tickets across all areas
      const agents = await coreQuery<any>(
        `SELECT id FROM users WHERE active = 1 AND (role LIKE '%agent%' OR role LIKE '%admin%') ORDER BY id ASC LIMIT 5`
      )

      if (agents.length > 0) {
        const agentId = agents[0].id
        if (area === "helpdesk") {
          const { hdQuery } = await import("@/lib/helpdesk-db")
          await hdQuery("UPDATE tickets SET assignee_id = ? WHERE id = ?", [agentId, ticketId])
        } else {
          const { query } = await import("@/lib/db")
          await query("UPDATE tickets SET assigned_to_user_id = ? WHERE id = ?", [agentId, ticketId])
        }
        console.log(`[AutoAssign] ${area} Ticket ${ticketId} Round-Robin → User ${agentId}`)
        return agentId
      }
    }

    return null
  } catch (err: any) {
    console.error("[AutoAssign] Fehler:", err.message)
    return null
  }
}
