import { getSession } from "@/lib/auth"
import { redirect } from "next/navigation"
import { VehicleDetailClient } from "@/components/vehicles/vehicle-detail-client"

type Props = { params: Promise<{ id: string }> }

export default async function VehicleDetailPage({ params }: Props) {
  const session = await getSession()
  if (!session) redirect("/login")

  const { id } = await params

  return <VehicleDetailClient vehicleId={id} userRole={session.role} />
}
