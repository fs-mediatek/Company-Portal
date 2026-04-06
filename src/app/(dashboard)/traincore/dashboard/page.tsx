import { getSession } from "@/lib/auth"
import { redirect } from "next/navigation"
import { GraduationCap, BookOpen, ClipboardCheck, Users } from "lucide-react"
import { DashboardHeader } from "@/components/dashboard/dashboard-header"

export default async function TraincoreDashboardPage() {
  const session = await getSession()
  if (!session) redirect("/login")

  const stats = [
    { label: "Schulungsmodule", value: 0, iconKey: "alert" },
    { label: "Zugewiesen", value: 0, iconKey: "clock" },
    { label: "Abgeschlossen", value: 0, iconKey: "check" },
    { label: "Benutzer", value: 0, iconKey: "users" },
  ]

  return (
    <div className="space-y-6 animate-fade-in">
      <DashboardHeader name={session.name} stats={stats} />

      <div className="rounded-xl border bg-card p-12 text-center">
        <div className="flex justify-center mb-4">
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-amber-500 to-orange-600 shadow-lg shadow-amber-500/20">
            <GraduationCap className="h-8 w-8 text-white" />
          </div>
        </div>
        <h2 className="text-xl font-bold mb-2">Schulungsplattform</h2>
        <p className="text-muted-foreground text-sm max-w-md mx-auto">
          Die Schulungsplattform wird derzeit eingerichtet. Hier können Sie bald Schulungsmodule erstellen, Quizze verwalten und den Fortschritt Ihrer Mitarbeiter verfolgen.
        </p>
      </div>
    </div>
  )
}
