import { getSession } from "@/lib/auth"
import { redirect } from "next/navigation"
import { CommissionDetailClient } from "@/components/commissions/commission-detail-client"

export default async function CommissionDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await getSession()
  if (!session) redirect("/login")
  const { id } = await params

  return <CommissionDetailClient id={id} userRole={session.role} userName={session.name} />
}
