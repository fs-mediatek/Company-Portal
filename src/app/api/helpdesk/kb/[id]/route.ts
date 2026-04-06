import { NextRequest, NextResponse } from "next/server"
import { getSessionFromRequest } from "@/lib/auth"
import { hdQuery, hdQueryOne } from "@/lib/helpdesk-db"
import { coreQueryOne } from "@/lib/core-db"

type Ctx = { params: Promise<{ id: string }> }

export async function GET(req: NextRequest, { params }: Ctx) {
  const session = await getSessionFromRequest(req)
  if (!session) return NextResponse.json({ error: "Nicht angemeldet" }, { status: 401 })

  const { id } = await params
  const article = await hdQueryOne<any>("SELECT * FROM kb_articles WHERE id = ?", [id])
  if (!article) return NextResponse.json({ error: "Artikel nicht gefunden" }, { status: 404 })

  // Non-privileged can only see published
  const isPrivileged = session.role.includes("admin") || session.role.includes("agent") || session.role.includes("redakteur")
  if (!isPrivileged && article.status !== "published") {
    return NextResponse.json({ error: "Artikel nicht gefunden" }, { status: 404 })
  }

  // Increment views
  await hdQuery("UPDATE kb_articles SET views = views + 1 WHERE id = ?", [id])

  // Author name
  let authorName = null
  if (article.author_id) {
    const author = await coreQueryOne<any>("SELECT name FROM users WHERE id = ?", [article.author_id])
    authorName = author?.name || null
  }

  return NextResponse.json({ ...article, views: article.views + 1, author_name: authorName })
}

export async function PUT(req: NextRequest, { params }: Ctx) {
  const session = await getSessionFromRequest(req)
  if (!session) return NextResponse.json({ error: "Nicht angemeldet" }, { status: 401 })

  const isPrivileged = session.role.includes("admin") || session.role.includes("agent") || session.role.includes("redakteur")
  if (!isPrivileged) return NextResponse.json({ error: "Keine Berechtigung" }, { status: 403 })

  const { id } = await params
  const body = await req.json()
  const allowed = ["title", "content_html", "status", "tags"]
  const sets: string[] = []
  const vals: any[] = []

  for (const key of allowed) {
    if (body[key] !== undefined) { sets.push(`${key} = ?`); vals.push(body[key]) }
  }
  if (body.title) {
    sets.push("slug = ?")
    vals.push(body.title.toLowerCase().replace(/[^a-z0-9äöüß]+/g, "-").replace(/^-|-$/g, ""))
  }

  if (sets.length === 0) return NextResponse.json({ error: "Keine Änderungen" }, { status: 400 })

  vals.push(id)
  await hdQuery(`UPDATE kb_articles SET ${sets.join(", ")} WHERE id = ?`, vals)
  return NextResponse.json({ success: true })
}

export async function DELETE(req: NextRequest, { params }: Ctx) {
  const session = await getSessionFromRequest(req)
  if (!session || !session.role.includes("admin")) {
    return NextResponse.json({ error: "Keine Berechtigung" }, { status: 403 })
  }
  const { id } = await params
  await hdQuery("DELETE FROM kb_articles WHERE id = ?", [id])
  return NextResponse.json({ success: true })
}

// Vote endpoint via query param
export async function PATCH(req: NextRequest, { params }: Ctx) {
  const session = await getSessionFromRequest(req)
  if (!session) return NextResponse.json({ error: "Nicht angemeldet" }, { status: 401 })

  const { id } = await params
  const { vote } = await req.json()

  if (vote === "helpful") {
    await hdQuery("UPDATE kb_articles SET helpful_votes = helpful_votes + 1 WHERE id = ?", [id])
  } else if (vote === "unhelpful") {
    await hdQuery("UPDATE kb_articles SET unhelpful_votes = unhelpful_votes + 1 WHERE id = ?", [id])
  }

  return NextResponse.json({ success: true })
}
