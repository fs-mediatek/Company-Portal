import { getSession } from "@/lib/auth"
import { redirect } from "next/navigation"
import { HelpdeskAssetsClient } from "@/components/helpdesk/assets-client"

export default async function HelpdeskAssetsPage() {
  const session = await getSession()
  if (!session) redirect("/login")
  return <HelpdeskAssetsClient />
}
