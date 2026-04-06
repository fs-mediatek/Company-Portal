import { NextRequest, NextResponse } from "next/server"
import { getSession } from "@/lib/auth"
import { coreQuery, coreInsert } from "@/lib/core-db"
import { testSiteConnection } from "@/lib/sharepoint"

export async function GET(req: NextRequest) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const sites = await coreQuery("SELECT * FROM sharepoint_sites ORDER BY name")
  return NextResponse.json(sites)
}

export async function POST(req: NextRequest) {
  const session = await getSession()
  if (!session || !session.role.includes("admin")) {
    return NextResponse.json({ error: "Keine Berechtigung" }, { status: 403 })
  }

  const body = await req.json()
  if (!body.name || !body.site_url) {
    return NextResponse.json({ error: "Name und Site-URL erforderlich" }, { status: 400 })
  }

  const id = await coreInsert(
    `INSERT INTO sharepoint_sites (name, site_url, drive_name, base_folder, description)
     VALUES (?, ?, ?, ?, ?)`,
    [
      body.name,
      body.site_url.trim(),
      body.drive_name || "Dokumente",
      body.base_folder || "",
      body.description || null,
    ]
  )
  return NextResponse.json({ id }, { status: 201 })
}
