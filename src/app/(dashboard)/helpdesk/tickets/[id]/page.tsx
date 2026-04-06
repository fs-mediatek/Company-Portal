import { getSession } from "@/lib/auth"
import { redirect } from "next/navigation"
import { HelpdeskTicketDetailClient } from "@/components/helpdesk/ticket-detail-client"

export default async function HelpdeskTicketDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await getSession()
  if (!session) redirect("/login")
  const { id } = await params
  return <HelpdeskTicketDetailClient ticketId={id} />
}
