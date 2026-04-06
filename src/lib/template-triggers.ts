import { coreQuery, coreInsert } from "@/lib/core-db"

export interface TriggerContext {
  // Shared
  ticket_nummer?: string
  ticket_titel?: string
  ersteller_name?: string
  ersteller_email?: string
  agent_name?: string
  agent_email?: string
  betroffener_name?: string
  betroffener_email?: string
  datum?: string
  betreff?: string
  bereich?: string
  // Assets
  geraet_name?: string
  geraet_tag?: string
  // Onboarding/HR
  mitarbeiter_name?: string
  mitarbeiter_email?: string
  abteilung?: string
  austrittsdatum?: string
  // Vehicles
  fahrzeug_kennzeichen?: string
  fahrzeug_modell?: string
}

/**
 * Fire a template trigger — sends emails + creates notifications.
 * Used across all areas (Facility, Fuhrpark, Helpdesk, Schulungen).
 */
export async function fireTemplateTrigger(event: string, context: TriggerContext, notifyUserIds?: number[]): Promise<void> {
  try {
    const { sendMail } = await import("@/lib/mailer")

    const templates = await coreQuery(
      "SELECT id, name, content, trigger_recipient FROM templates WHERE trigger_event = ? AND trigger_enabled = 1",
      [event]
    ) as any[]

    // Build replacement map
    const replacements: Record<string, string> = {}
    for (const [key, value] of Object.entries(context)) {
      if (value) replacements[`{{${key}}}`] = value
    }

    function applyReplacements(text: string): string {
      let result = text
      for (const [placeholder, value] of Object.entries(replacements)) {
        result = result.split(placeholder).join(value)
      }
      return result
    }

    // Send template emails
    for (const template of templates) {
      try {
        const content = applyReplacements(template.content || "")
        const subject = applyReplacements(template.name || "")

        const recipientField = (template.trigger_recipient || "").trim()
        let recipient: string | undefined

        if (recipientField === "{{ersteller}}") recipient = context.ersteller_email
        else if (recipientField === "{{agent}}") recipient = context.agent_email
        else if (recipientField === "{{betroffener}}") recipient = context.betroffener_email
        else if (recipientField === "{{mitarbeiter}}") recipient = context.mitarbeiter_email
        else if (recipientField) recipient = recipientField

        if (recipient) {
          await sendMail(recipient, subject, content)
        }
      } catch (err) {
        console.error(`[TemplateTrigger] Template ${template.id} for ${event}:`, err)
      }
    }

    // Create in-app notifications
    if (notifyUserIds && notifyUserIds.length > 0) {
      const title = context.betreff || context.ticket_titel || event
      const message = context.ticket_nummer
        ? `${context.ticket_nummer}: ${context.ticket_titel || ""}`
        : title
      const link = context.ticket_nummer
        ? (context.bereich === "helpdesk" ? `/helpdesk/tickets/` : `/tickets/`)
        : undefined

      for (const userId of notifyUserIds) {
        try {
          await coreInsert(
            "INSERT INTO notifications (user_id, title, message, link, area) VALUES (?, ?, ?, ?, ?)",
            [userId, title, message, link || null, context.bereich || null]
          )
        } catch {}
      }
    }
  } catch (err) {
    console.error(`[TemplateTrigger] Event ${event}:`, err)
  }
}
