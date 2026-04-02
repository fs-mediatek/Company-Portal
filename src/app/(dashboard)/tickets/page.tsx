import { getSession } from "@/lib/auth"
import { redirect } from "next/navigation"
import { TicketListClient } from "@/components/tickets/ticket-list-client"

export default async function TicketsPage() {
  const session = await getSession()
  if (!session) redirect("/login")

  return <TicketListClient />
}
