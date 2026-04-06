import { getSession } from "@/lib/auth"
import { redirect } from "next/navigation"
import { SchulungenDashboardClient } from "@/components/traincore/schulungen-dashboard-client"

export default async function SchulungenPage() {
  const session = await getSession()
  if (!session) redirect("/login")
  return <SchulungenDashboardClient />
}
