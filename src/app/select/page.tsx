"use client"
import { useRouter } from "next/navigation"
import { useEffect, useState } from "react"
import { Building2, Car, ArrowRight } from "lucide-react"

const areas = [
  {
    key: "facility",
    label: "Facility",
    description: "Gebäude, Störungen & Standorte",
    icon: Building2,
    gradient: "from-teal-500 to-emerald-600",
    hoverGlow: "group-hover:shadow-teal-500/25",
    bgAccent: "bg-teal-500/10",
    textAccent: "text-teal-600 dark:text-teal-400",
    glowColor: "hsl(168 75% 38% / 0.3)",
  },
  {
    key: "fleet",
    label: "Fuhrpark",
    description: "Fahrzeuge & Flotte",
    icon: Car,
    gradient: "from-blue-500 to-indigo-600",
    hoverGlow: "group-hover:shadow-blue-500/25",
    bgAccent: "bg-blue-500/10",
    textAccent: "text-blue-600 dark:text-blue-400",
    glowColor: "hsl(220 75% 50% / 0.3)",
  },
]

export default function SelectPage() {
  const router = useRouter()
  const [user, setUser] = useState<{ name: string } | null>(null)

  useEffect(() => {
    fetch("/api/auth/me")
      .then(r => r.json())
      .then(d => { if (d.name) setUser(d) })
      .catch(() => {})
  }, [])

  function selectArea(area: string) {
    localStorage.setItem("active_area", area)
    router.push("/dashboard")
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-background p-6">
      {/* Header */}
      <div className="text-center mb-10 tile-entry" style={{ animationDelay: "0s" }}>
        <div className="flex items-center justify-center gap-2 mb-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-teal-500 to-emerald-600 shadow-lg">
            <Building2 className="h-4 w-4 text-white" />
          </div>
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 shadow-lg">
            <Car className="h-4 w-4 text-white" />
          </div>
        </div>
        <h1 className="text-2xl font-bold">
          {user ? `Hallo, ${user.name.split(" ")[0]}` : "Willkommen"}
        </h1>
        <p className="text-muted-foreground text-sm mt-1">Wähle deinen Bereich</p>
      </div>

      {/* Tiles */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 w-full max-w-2xl">
        {areas.map((area, i) => {
          const Icon = area.icon
          return (
            <button
              key={area.key}
              onClick={() => selectArea(area.key)}
              className="tile-entry group relative"
              style={{
                animationDelay: `${0.15 + i * 0.12}s`,
                // @ts-ignore
                "--tile-glow": area.glowColor,
              } as any}
            >
              <div className={`tile-glow relative overflow-hidden rounded-2xl border bg-card p-8 text-left transition-all duration-300 hover:scale-[1.03] hover:shadow-2xl ${area.hoverGlow} active:scale-[0.98]`}>
                {/* Background gradient accent */}
                <div className={`absolute top-0 right-0 w-32 h-32 rounded-full bg-gradient-to-br ${area.gradient} opacity-[0.07] blur-2xl group-hover:opacity-[0.15] transition-opacity duration-500 -translate-y-8 translate-x-8`} />

                {/* Icon */}
                <div className={`tile-icon-float flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br ${area.gradient} shadow-lg mb-5`} style={{ animationDelay: `${i * 0.5}s` }}>
                  <Icon className="h-7 w-7 text-white" />
                </div>

                {/* Text */}
                <h2 className="text-xl font-bold mb-1">{area.label}</h2>
                <p className="text-muted-foreground text-sm">{area.description}</p>

                {/* Arrow */}
                <div className="flex items-center gap-1 mt-5 text-sm font-medium opacity-0 group-hover:opacity-100 transition-all duration-300 translate-x-0 group-hover:translate-x-1">
                  <span className={area.textAccent}>Öffnen</span>
                  <ArrowRight className={`h-4 w-4 ${area.textAccent}`} />
                </div>
              </div>
            </button>
          )
        })}
      </div>

      {/* Version */}
      <p className="text-xs text-muted-foreground/50 mt-10">Facility & Fuhrpark v0.2.0</p>
    </div>
  )
}
