import { NextRequest, NextResponse } from "next/server"
import { getSession } from "@/lib/auth"
import { query, insert } from "@/lib/db"

export async function GET(req: NextRequest) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const groups = await query(
    'SELECT g.*, pg.name as parent_name FROM `groups` g LEFT JOIN `groups` pg ON g.parent_id = pg.id ORDER BY g.name ASC'
  )

  const { searchParams } = new URL(req.url)
  if (searchParams.get("format") === "tree") {
    const map = new Map<number, any>()
    const roots: any[] = []
    for (const g of groups as any[]) {
      map.set(g.id, { ...g, children: [] })
    }
    for (const g of groups as any[]) {
      const node = map.get(g.id)!
      if (g.parent_id && map.has(g.parent_id)) {
        map.get(g.parent_id)!.children.push(node)
      } else {
        roots.push(node)
      }
    }
    return NextResponse.json(roots)
  }

  return NextResponse.json(groups)
}

export async function POST(req: NextRequest) {
  const session = await getSession()
  if (!session || !session.role.includes("admin")) {
    return NextResponse.json({ error: "Keine Berechtigung" }, { status: 403 })
  }

  const { name, description, parent_id, default_roles } = await req.json()
  if (!name) return NextResponse.json({ error: "Name erforderlich" }, { status: 400 })

  try {
    const id = await insert(
      'INSERT INTO `groups` (name, description, parent_id, default_roles) VALUES (?, ?, ?, ?)',
      [name, description || null, parent_id || null, default_roles || null]
    )
    return NextResponse.json({ id }, { status: 201 })
  } catch (err: any) {
    if (err.code === 'ER_DUP_ENTRY') {
      return NextResponse.json({ error: "Gruppe existiert bereits" }, { status: 400 })
    }
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
