import { getSession } from "@/lib/auth"
import { redirect } from "next/navigation"
import { CommissionListClient } from "@/components/commissions/commission-list-client"

export default async function CommissionsPage() {
  const session = await getSession()
  if (!session) redirect("/login")

  return <CommissionListClient userRole={session.role} />
}
