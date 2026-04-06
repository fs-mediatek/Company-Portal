import { getSession } from "@/lib/auth"
import { redirect } from "next/navigation"
import { HelpdeskAnalyticsClient } from "@/components/helpdesk/analytics-client"

export default async function HelpdeskAnalyticsPage() {
  const session = await getSession()
  if (!session) redirect("/login")
  const isPrivileged = session.role.includes("admin") || session.role.includes("agent") || session.role.includes("manager")
  if (!isPrivileged) redirect("/helpdesk/dashboard")
  return <HelpdeskAnalyticsClient />
}
