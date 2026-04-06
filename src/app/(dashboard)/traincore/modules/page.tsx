import { getSession } from "@/lib/auth"
import { redirect } from "next/navigation"
import { ReportsClient } from "@/components/traincore/reports-client"

export default async function ModulesPage() {
  const session = await getSession()
  if (!session) redirect("/login")
  // Admins/managers see full module management; others see their assignments
  const isPrivileged = ["admin", "manager"].some(r => session.role.includes(r))
  if (!isPrivileged) redirect("/traincore/dashboard")
  return <ReportsClient userRole={session.role} />
}
