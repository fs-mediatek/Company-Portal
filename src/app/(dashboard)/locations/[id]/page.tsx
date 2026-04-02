import { getSession } from "@/lib/auth"
import { redirect } from "next/navigation"
import { LocationDetailClient } from "@/components/locations/location-detail-client"

type Props = { params: Promise<{ id: string }> }

export default async function LocationDetailPage({ params }: Props) {
  const session = await getSession()
  if (!session) redirect("/login")

  const { id } = await params

  return <LocationDetailClient locationId={id} userRole={session.role} />
}
