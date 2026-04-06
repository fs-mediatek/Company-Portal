import { getSession } from "@/lib/auth"
import { redirect } from "next/navigation"
import { ReportsClient } from "@/components/traincore/reports-client"

export default async function TraincoreReportsPage() {
  const session = await getSession()
  if (!session) redirect("/login")
  if (!["admin", "manager"].some(r => session.role.includes(r))) redirect("/traincore/dashboard")
  return <ReportsClient userRole={session.role} />
}
