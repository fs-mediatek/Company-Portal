import { getSession } from "@/lib/auth"
import { redirect } from "next/navigation"
import { HelpdeskCatalogClient } from "@/components/helpdesk/catalog-client"

export default async function HelpdeskCatalogPage() {
  const session = await getSession()
  if (!session) redirect("/login")
  return <HelpdeskCatalogClient />
}
