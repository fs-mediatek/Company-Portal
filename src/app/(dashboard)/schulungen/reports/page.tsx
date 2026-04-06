import { getSession } from "@/lib/auth"
import { redirect } from "next/navigation"
import { ReportsClient } from "@/components/traincore/reports-client"

export default async function ReportsPage() {
  const session = await getSession()
  if (!session) redirect("/login")
  return <ReportsClient userRole={session.role} />
}
