import { getSession } from "@/lib/auth"
import { redirect } from "next/navigation"
import { MobileContractsClient } from "@/components/helpdesk/mobile-contracts-client"

export default async function MobileContractsPage() {
  const session = await getSession()
  if (!session) redirect("/login")
  return <MobileContractsClient />
}
