import { getSession } from "@/lib/auth"
import { redirect } from "next/navigation"
import { HelpdeskOrdersClient } from "@/components/helpdesk/orders-client"

export default async function HelpdeskOrdersPage() {
  const session = await getSession()
  if (!session) redirect("/login")
  return <HelpdeskOrdersClient />
}
