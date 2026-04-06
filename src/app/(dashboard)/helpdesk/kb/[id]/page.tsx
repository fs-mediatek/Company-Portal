import { getSession } from "@/lib/auth"
import { redirect } from "next/navigation"
import { HelpdeskKbArticleClient } from "@/components/helpdesk/kb-article-client"

export default async function HelpdeskKbArticlePage({ params }: { params: Promise<{ id: string }> }) {
  const session = await getSession()
  if (!session) redirect("/login")
  const { id } = await params
  return <HelpdeskKbArticleClient articleId={id} />
}
