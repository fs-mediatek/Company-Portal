import { getSession } from "@/lib/auth"
import { redirect } from "next/navigation"
import { AssetDetailClient } from "@/components/helpdesk/asset-detail-client"

export default async function AssetDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await getSession()
  if (!session) redirect("/login")
  const { id } = await params
  return <AssetDetailClient assetId={id} />
}
