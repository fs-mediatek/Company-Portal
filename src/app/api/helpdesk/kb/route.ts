import { NextRequest, NextResponse } from "next/server"
import { getSessionFromRequest } from "@/lib/auth"
import { hdQuery, hdInsert } from "@/lib/helpdesk-db"
import { coreQuery } from "@/lib/core-db"

export async function GET(req: NextRequest) {
  const session = await getSessionFromRequest(req)
  if (!session) return NextResponse.json({ error: "Nicht angemeldet" }, { status: 401 })

  const sp = req.nextUrl.searchParams
  const search = sp.get("search") || ""
  const status = sp.get("status") || ""
  const isPrivileged = session.role.includes("admin") || session.role.includes("agent") || session.role.includes("redakteur")

  let where = isPrivileged ? "WHERE 1=1" : "WHERE a.status = 'published'"
  const params: any[] = []

  if (search) {
    where += " AND (a.title LIKE ? OR a.tags LIKE ?)"
    params.push(`%${search}%`, `%${search}%`)
  }
  if (status && isPrivileged) {
    where += " AND a.status = ?"
    params.push(status)
  }

  const articles = await hdQuery<any>(
    `SELECT a.id, a.title, a.slug, a.status, a.tags, a.author_id, a.views, a.helpful_votes, a.unhelpful_votes, a.created_at, a.updated_at
     FROM kb_articles a ${where} ORDER BY a.updated_at DESC`,
    params
  )

  // Resolve author names
  const authorIds = [...new Set(articles.map((a: any) => a.author_id).filter(Boolean))]
  let authorMap: Record<number, string> = {}
  if (authorIds.length > 0) {
    const users = await coreQuery<any>(`SELECT id, name FROM users WHERE id IN (${authorIds.join(",")})`)
    authorMap = Object.fromEntries(users.map((u: any) => [u.id, u.name]))
  }

  return NextResponse.json(articles.map((a: any) => ({
    ...a,
    author_name: a.author_id ? authorMap[a.author_id] || "Unbekannt" : null,
  })))
}

export async function POST(req: NextRequest) {
  const session = await getSessionFromRequest(req)
  if (!session) return NextResponse.json({ error: "Nicht angemeldet" }, { status: 401 })

  const isPrivileged = session.role.includes("admin") || session.role.includes("agent") || session.role.includes("redakteur")
  if (!isPrivileged) return NextResponse.json({ error: "Keine Berechtigung" }, { status: 403 })

  const { title, content_html, status, tags } = await req.json()
  if (!title) return NextResponse.json({ error: "Titel erforderlich" }, { status: 400 })

  const slug = title.toLowerCase().replace(/[^a-z0-9äöüß]+/g, "-").replace(/^-|-$/g, "")

  const id = await hdInsert(
    "INSERT INTO kb_articles (title, slug, content_html, status, tags, author_id) VALUES (?, ?, ?, ?, ?, ?)",
    [title, slug, content_html || "", status || "draft", tags || null, session.userId]
  )

  return NextResponse.json({ id }, { status: 201 })
}
