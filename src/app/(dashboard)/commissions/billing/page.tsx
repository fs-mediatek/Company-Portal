import { getSession } from "@/lib/auth"
import { redirect } from "next/navigation"
import { BillingClient } from "@/components/commissions/billing-client"

export default async function BillingPage() {
  const session = await getSession()
  if (!session) redirect("/login")

  const isPrivileged = ["admin", "manager"].some(r => session.role.includes(r))
  if (!isPrivileged) redirect("/commissions")

  return <BillingClient userName={session.name} />
}
