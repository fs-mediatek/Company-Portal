import { getSession } from "@/lib/auth"
import { redirect } from "next/navigation"
import { VehicleListClient } from "@/components/vehicles/vehicle-list-client"

export default async function VehiclesPage() {
  const session = await getSession()
  if (!session) redirect("/login")

  return <VehicleListClient userRole={session.role} />
}
