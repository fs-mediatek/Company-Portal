import { getSession } from "@/lib/auth"
import { redirect } from "next/navigation"
import { UsersClient } from "@/components/users/users-client"

export default async function UsersPage() {
  const session = await getSession()
  if (!session) redirect("/login")

  const isAdmin = session.role.includes("admin")
  const isManager = session.role.includes("manager")
  if (!isAdmin && !isManager) redirect("/dashboard")

  return <UsersClient />
}
