import { getSession } from "@/lib/auth"
import { redirect } from "next/navigation"
import { ModuleDetailClient } from "@/components/traincore/module-detail-client"

type Ctx = { params: Promise<{ moduleId: string }> }

export default async function ModuleDetailPage({ params }: Ctx) {
  const session = await getSession()
  if (!session) redirect("/login")
  const { moduleId } = await params
  return <ModuleDetailClient moduleId={moduleId} userRole={session.role} userId={session.userId} />
}
