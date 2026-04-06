import { getSession } from "@/lib/auth"
import { redirect } from "next/navigation"
import { HelpdeskTicketListClient } from "@/components/helpdesk/ticket-list-client"

export default async function HelpdeskTicketsPage() {
  const session = await getSession()
  if (!session) redirect("/login")
  return <HelpdeskTicketListClient />
}
