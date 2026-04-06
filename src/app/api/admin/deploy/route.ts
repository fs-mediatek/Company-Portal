import { NextRequest } from "next/server"
import { getSession } from "@/lib/auth"
import { spawn } from "child_process"

export async function POST(req: NextRequest) {
  const session = await getSession()
  if (!session || !session.role.includes("admin")) {
    return new Response(JSON.stringify({ error: "Keine Berechtigung" }), { status: 403 })
  }

  const encoder = new TextEncoder()

  const stream = new ReadableStream({
    start(controller) {
      const proc = spawn("bash", ["/opt/deploy-portal.sh"], {
        env: { ...process.env, PATH: "/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin" },
      })

      proc.stdout.on("data", (data: Buffer) => {
        controller.enqueue(encoder.encode(data.toString()))
      })

      proc.stderr.on("data", (data: Buffer) => {
        controller.enqueue(encoder.encode(data.toString()))
      })

      proc.on("close", (code: number) => {
        controller.enqueue(encoder.encode(`\n[exit] Process exited with code ${code}\n`))
        controller.close()
      })

      proc.on("error", (err: Error) => {
        controller.enqueue(encoder.encode(`[error] ${err.message}\n`))
        controller.close()
      })
    },
  })

  return new Response(stream, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "X-Content-Type-Options": "nosniff",
      "Cache-Control": "no-cache",
    },
  })
}
