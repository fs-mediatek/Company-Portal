import { NextRequest, NextResponse } from "next/server"
import { getSessionFromRequest } from "@/lib/auth"
import { coreQuery } from "@/lib/core-db"
import { hdQuery } from "@/lib/helpdesk-db"

export async function POST(req: NextRequest) {
  const session = await getSessionFromRequest(req)
  if (!session) return NextResponse.json({ error: "Nicht angemeldet" }, { status: 401 })

  const { query: searchTerm } = await req.json()
  if (!searchTerm || searchTerm.trim().length < 2) {
    return NextResponse.json({ results: [], suggestion: null })
  }

  const term = searchTerm.trim().toLowerCase()
  const results: { type: string; title: string; content: string; link?: string }[] = []

  // 1. Search custom chatbot responses (portal_core)
  try {
    const responses = await coreQuery<any>(
      "SELECT * FROM chatbot_responses WHERE active = 1 ORDER BY sort_order ASC"
    )
    for (const r of responses) {
      const keywords = (r.keywords || "").toLowerCase().split(",").map((k: string) => k.trim())
      if (keywords.some((k: string) => term.includes(k) || k.includes(term))) {
        results.push({ type: "faq", title: r.title, content: r.answer, link: r.link || undefined })
      }
    }
  } catch {}

  // 2. Search KB articles (helpdesk DB)
  try {
    const articles = await hdQuery<any>(
      "SELECT id, title, content_html FROM kb_articles WHERE status = 'published' AND (title LIKE ? OR tags LIKE ?) LIMIT 5",
      [`%${term}%`, `%${term}%`]
    )
    for (const a of articles) {
      results.push({
        type: "kb",
        title: a.title,
        content: (a.content_html || "").replace(/<[^>]*>/g, "").substring(0, 200),
        link: `/helpdesk/kb/${a.id}`,
      })
    }
  } catch {}

  // Suggestion: if no results, suggest creating a ticket
  const suggestion = results.length === 0 ? "ticket" : null

  return NextResponse.json({ results, suggestion })
}
