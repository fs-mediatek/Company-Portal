import { NextRequest, NextResponse } from "next/server"
import { getSession } from "@/lib/auth"
import { getAllSites, testSiteConnection } from "@/lib/sharepoint"

export async function POST(req: NextRequest) {
  const session = await getSession()
  if (!session || !session.role.includes("admin")) {
    return NextResponse.json({ error: "Keine Berechtigung" }, { status: 403 })
  }

  // Test the first active site as a general connectivity check
  const sites = await getAllSites()
  if (!sites.length) {
    return NextResponse.json({ ok: false, message: "Keine SharePoint-Sites konfiguriert" }, { status: 400 })
  }

  const result = await testSiteConnection(sites[0].id)
  return NextResponse.json(result, { status: result.ok ? 200 : 400 })
}
