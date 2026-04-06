import { getSession } from "@/lib/auth"
import { redirect } from "next/navigation"
import { SlaClient } from "@/components/sla/sla-client"

export default async function SlaPage() {
  const session = await getSession()
  if (!session) redirect("/login")
  if (!session.role.includes("admin")) redirect("/dashboard")
  return <SlaClient />
}
