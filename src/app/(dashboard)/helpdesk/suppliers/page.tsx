import { getSession } from "@/lib/auth"
import { redirect } from "next/navigation"
import { SuppliersClient } from "@/components/helpdesk/suppliers-client"

export default async function SuppliersPage() {
  const session = await getSession()
  if (!session) redirect("/login")
  return <SuppliersClient />
}
