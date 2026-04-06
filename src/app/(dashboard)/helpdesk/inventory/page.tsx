import { getSession } from "@/lib/auth"
import { redirect } from "next/navigation"
import { InventoryClient } from "@/components/helpdesk/inventory-client"

export default async function InventoryPage() {
  const session = await getSession()
  if (!session) redirect("/login")
  return <InventoryClient />
}
