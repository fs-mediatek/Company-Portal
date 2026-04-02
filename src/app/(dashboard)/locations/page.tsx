import { getSession } from "@/lib/auth"
import { redirect } from "next/navigation"
import { LocationListClient } from "@/components/locations/location-list-client"

export default async function LocationsPage() {
  const session = await getSession()
  if (!session) redirect("/login")

  return <LocationListClient userRole={session.role} />
}
