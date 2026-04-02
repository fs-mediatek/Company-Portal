import { getSession } from "@/lib/auth"
import { redirect } from "next/navigation"
import { TicketDetailClient } from "@/components/tickets/ticket-detail-client"

type Props = { params: Promise<{ id: string }> }

export default async function TicketDetailPage({ params }: Props) {
  const session = await getSession()
  if (!session) redirect("/login")

  const { id } = await params

  return <TicketDetailClient ticketId={id} userRole={session.role} />
}
