import { getSession } from "@/lib/auth"
import { redirect } from "next/navigation"
import { HelpdeskKbClient } from "@/components/helpdesk/kb-client"

export default async function HelpdeskKbPage() {
  const session = await getSession()
  if (!session) redirect("/login")
  return <HelpdeskKbClient />
}
