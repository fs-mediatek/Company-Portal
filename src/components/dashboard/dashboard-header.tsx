"use client"

import { useEffect, useState } from "react"
import { AlertTriangle, Clock, CheckCircle2, Users, Building2, Car, Headset, GraduationCap } from "lucide-react"
import { cn } from "@/lib/utils"

const iconMap: Record<string, any> = {
  alert: AlertTriangle,
  clock: Clock,
  check: CheckCircle2,
  users: Users,
}

interface Stat {
  label: string
  value: number
  iconKey: string
}

interface DashboardHeaderProps {
  name: string
  stats: Stat[]
  action?: React.ReactNode
}

// Area-specific color schemes for stat cards
const facilityColors = [
  "bg-teal-500/10 text-teal-600 dark:text-teal-400",
  "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
  "bg-green-500/10 text-green-600 dark:text-green-400",
  "bg-teal-500/10 text-teal-600 dark:text-teal-400",
]

const fleetColors = [
  "bg-blue-500/10 text-blue-600 dark:text-blue-400",
  "bg-indigo-500/10 text-indigo-600 dark:text-indigo-400",
  "bg-sky-500/10 text-sky-600 dark:text-sky-400",
  "bg-blue-500/10 text-blue-600 dark:text-blue-400",
]

const helpdeskColors = [
  "bg-purple-500/10 text-purple-600 dark:text-purple-400",
  "bg-violet-500/10 text-violet-600 dark:text-violet-400",
  "bg-fuchsia-500/10 text-fuchsia-600 dark:text-fuchsia-400",
  "bg-purple-500/10 text-purple-600 dark:text-purple-400",
]

const traincoreColors = [
  "bg-amber-500/10 text-amber-600 dark:text-amber-400",
  "bg-orange-500/10 text-orange-600 dark:text-orange-400",
  "bg-yellow-500/10 text-yellow-600 dark:text-yellow-400",
  "bg-amber-500/10 text-amber-600 dark:text-amber-400",
]

export function DashboardHeader({ name, stats, action }: DashboardHeaderProps) {
  const [area, setArea] = useState<string>("facility")

  useEffect(() => {
    const stored = localStorage.getItem("active_area")
    if (stored) setArea(stored)
  }, [])

  const isFleet = area === "fleet"
  const isHelpdesk = area === "helpdesk"
  const isTraincore = area === "traincore"
  const colors = isTraincore ? traincoreColors : isHelpdesk ? helpdeskColors : isFleet ? fleetColors : facilityColors
  const AreaIcon = isTraincore ? GraduationCap : isHelpdesk ? Headset : isFleet ? Car : Building2

  return (
    <>
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-3">
          <div className={cn(
            "flex h-9 w-9 items-center justify-center rounded-lg",
            isTraincore ? "bg-amber-500/10 text-amber-600 dark:text-amber-400" : isHelpdesk ? "bg-purple-500/10 text-purple-600 dark:text-purple-400" : isFleet ? "bg-blue-500/10 text-blue-600 dark:text-blue-400" : "bg-primary/10 text-primary"
          )}>
            <AreaIcon className="h-4 w-4" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">Dashboard</h1>
            <p className="text-muted-foreground text-sm mt-0.5">
              Willkommen zurück, {name}
              <span className={cn(
                "ml-2 text-xs font-medium px-1.5 py-0.5 rounded-full",
                isTraincore ? "bg-amber-500/10 text-amber-600 dark:text-amber-400" : isHelpdesk ? "bg-purple-500/10 text-purple-600 dark:text-purple-400" : isFleet ? "bg-blue-500/10 text-blue-600 dark:text-blue-400" : "bg-primary/10 text-primary"
              )}>
                {isTraincore ? "Schulungen" : isHelpdesk ? "IT-Helpdesk" : isFleet ? "Fuhrpark" : "Facility"}
              </span>
            </p>
          </div>
        </div>
        {action && <div>{action}</div>}
      </div>

      {/* Stats with area colors */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((s, i) => {
          const Icon = iconMap[s.iconKey] || AlertTriangle
          return (
            <div key={i} className={cn(
              "rounded-xl border bg-card p-5",
              isTraincore ? "border-amber-500/5" : isHelpdesk ? "border-purple-500/5" : isFleet ? "border-blue-500/5" : "border-primary/5"
            )}>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">{s.label}</p>
                  <p className="text-3xl font-bold mt-1 tabular-nums">{s.value}</p>
                </div>
                <div className={cn("flex h-11 w-11 items-center justify-center rounded-xl", colors[i % colors.length])}>
                  <Icon className="h-5 w-5" />
                </div>
              </div>
            </div>
          )
        })}
      </div>
    </>
  )
}
