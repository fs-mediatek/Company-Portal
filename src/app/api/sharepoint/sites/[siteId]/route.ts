import { NextRequest, NextResponse } from "next/server"
import { getSession } from "@/lib/auth"
import { coreQuery } from "@/lib/core-db"
import { testSiteConnection } from "@/lib/sharepoint"

type Ctx = { params: Promise<{ siteId: string }> }

export async function PUT(req: NextRequest, { params }: Ctx) {
  const session = await getSession()
  if (!session || !session.role.includes("admin")) {
    return NextResponse.json({ error: "Keine Berechtigung" }, { status: 403 })
  }

  const { siteId } = await params
  const body = await req.json()

  const allowed = ["name", "site_url", "drive_name", "base_folder", "description", "active"]
  const updates = Object.entries(body).filter(([k]) => allowed.includes(k))
  if (!updates.length) return NextResponse.json({ error: "Keine Felder" }, { status: 400 })

  const sets = updates.map(([k]) => `${k} = ?`).join(", ")
  const vals = updates.map(([, v]) => v ?? null)
  await coreQuery(`UPDATE sharepoint_sites SET ${sets} WHERE id = ?`, [...vals, siteId])

  return NextResponse.json({ success: true })
}

export async function DELETE(req: NextRequest, { params }: Ctx) {
  const session = await getSession()
  if (!session || !session.role.includes("admin")) {
    return NextResponse.json({ error: "Keine Berechtigung" }, { status: 403 })
  }

  const { siteId } = await params
  await coreQuery("UPDATE sharepoint_sites SET active = 0 WHERE id = ?", [siteId])
  return NextResponse.json({ success: true })
}

export async function POST(req: NextRequest, { params }: Ctx) {
  // Test connection for a specific site
  const session = await getSession()
  if (!session || !session.role.includes("admin")) {
    return NextResponse.json({ error: "Keine Berechtigung" }, { status: 403 })
  }

  const { siteId } = await params
  const result = await testSiteConnection(parseInt(siteId))
  return NextResponse.json(result, { status: result.ok ? 200 : 400 })
}
