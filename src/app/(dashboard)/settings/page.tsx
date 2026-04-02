import { getSession } from "@/lib/auth"
import { redirect } from "next/navigation"
import { query } from "@/lib/db"
import { SettingsClient } from "@/components/settings/settings-client"

export default async function SettingsPage() {
  const session = await getSession()
  if (!session) redirect("/login")
  if (!session.role.includes("admin")) redirect("/dashboard")

  // Load settings
  const rows = await query<any>('SELECT key_name, value FROM settings')
  const settings: Record<string, string> = {}
  for (const r of rows) settings[r.key_name] = r.value

  return <SettingsClient initialSettings={settings} />
}
