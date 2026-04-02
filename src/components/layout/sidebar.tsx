"use client"
import { useState, useEffect } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import {
  Building2, Car, LayoutDashboard, AlertTriangle, MapPin, PackageCheck, Receipt,
  Users, Settings, ChevronLeft, ChevronRight, Loader2, Truck,
} from "lucide-react"
import { cn } from "@/lib/utils"

interface NavItem {
  key: string
  href: string
  label: string
  icon: any
  requiredRoles?: string[]
}

const facilityNav: NavItem[] = [
  { key: "dashboard", href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { key: "tickets", href: "/tickets", label: "Störungsmeldungen", icon: AlertTriangle },
  { key: "locations", href: "/locations", label: "Standorte", icon: MapPin },
  { key: "commissions", href: "/commissions", label: "Kommissionierung", icon: PackageCheck },
  { key: "billing", href: "/commissions/billing", label: "Abrechnung", icon: Receipt, requiredRoles: ["admin", "manager"] },
  { key: "users", href: "/users", label: "Benutzer", icon: Users, requiredRoles: ["admin", "manager"] },
  { key: "settings", href: "/settings", label: "Einstellungen", icon: Settings, requiredRoles: ["admin"] },
]

const fleetNav: NavItem[] = [
  { key: "dashboard", href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { key: "vehicles", href: "/vehicles", label: "Fahrzeuge", icon: Truck },
  { key: "users", href: "/users", label: "Benutzer", icon: Users, requiredRoles: ["admin", "manager"] },
  { key: "settings", href: "/settings", label: "Einstellungen", icon: Settings, requiredRoles: ["admin"] },
]

export function Sidebar() {
  const [collapsed, setCollapsed] = useState(false)
  const [userRole, setUserRole] = useState("")
  const [loading, setLoading] = useState(true)
  const [area, setArea] = useState<"facility" | "fleet">("facility")
  const pathname = usePathname()

  useEffect(() => {
    fetch("/api/auth/me")
      .then(r => r.json())
      .then(d => {
        setUserRole(d.role || "")
        setLoading(false)
      })
      .catch(() => setLoading(false))

    // Read area from localStorage
    const stored = localStorage.getItem("active_area")
    if (stored === "fleet") setArea("fleet")
  }, [])

  function switchArea(newArea: "facility" | "fleet") {
    if (newArea === area) return
    // Dispatch custom event for transition overlay
    window.dispatchEvent(new CustomEvent("area-switch", { detail: newArea }))
    // Delay the actual switch until overlay is fully visible
    setTimeout(() => {
      setArea(newArea)
      localStorage.setItem("active_area", newArea)
    }, 800)
  }

  const isAdmin = userRole.includes("admin")
  const navItems = area === "fleet" ? fleetNav : facilityNav

  const visibleItems = navItems.filter(item => {
    if (!item.requiredRoles) return true
    if (isAdmin) return true
    return item.requiredRoles.some(r => userRole.includes(r))
  })

  return (
    <aside
      className={cn(
        "flex flex-col border-r bg-card transition-all duration-200 h-screen",
        collapsed ? "w-16" : "w-60"
      )}
    >
      {/* Logo */}
      <div className="flex items-center gap-3 px-4 h-14 border-b">
        <div className={cn(
          "flex h-8 w-8 shrink-0 items-center justify-center rounded-lg",
          area === "fleet" ? "bg-blue-600" : "bg-primary"
        )}>
          {area === "fleet"
            ? <Car className="h-4 w-4 text-white" />
            : <Building2 className="h-4 w-4 text-primary-foreground" />
          }
        </div>
        {!collapsed && (
          <span className="font-semibold text-sm truncate">
            {area === "fleet" ? "Fuhrpark" : "Facility"}
          </span>
        )}
      </div>

      {/* Area Toggle */}
      <div className={cn("border-b px-2 py-2", collapsed ? "px-1" : "px-3")}>
        <div className={cn(
          "flex rounded-lg bg-muted p-0.5",
          collapsed ? "flex-col gap-0.5" : "gap-0.5"
        )}>
          <button
            onClick={() => switchArea("facility")}
            className={cn(
              "flex items-center justify-center gap-2 rounded-md py-1.5 text-xs font-medium transition-all",
              collapsed ? "w-full px-1" : "flex-1 px-2",
              area === "facility"
                ? "bg-card shadow-sm text-primary"
                : "text-muted-foreground hover:text-foreground"
            )}
            title="Facility"
          >
            <Building2 className="h-3.5 w-3.5 shrink-0" />
            {!collapsed && <span>Facility</span>}
          </button>
          <button
            onClick={() => switchArea("fleet")}
            className={cn(
              "flex items-center justify-center gap-2 rounded-md py-1.5 text-xs font-medium transition-all",
              collapsed ? "w-full px-1" : "flex-1 px-2",
              area === "fleet"
                ? "bg-card shadow-sm text-blue-600 dark:text-blue-400"
                : "text-muted-foreground hover:text-foreground"
            )}
            title="Fuhrpark"
          >
            <Car className="h-3.5 w-3.5 shrink-0" />
            {!collapsed && <span>Fuhrpark</span>}
          </button>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 py-3 px-2 space-y-0.5 overflow-y-auto">
        {loading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          </div>
        ) : (
          visibleItems.map(item => {
            const Icon = item.icon
            const active = pathname === item.href || pathname.startsWith(item.href + "/")
            return (
              <Link
                key={item.key}
                href={item.href}
                className={cn(
                  "flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors",
                  active
                    ? area === "fleet"
                      ? "bg-blue-500/10 text-blue-600 dark:text-blue-400 font-medium"
                      : "bg-primary/10 text-primary font-medium"
                    : "text-muted-foreground hover:bg-accent hover:text-accent-foreground",
                  collapsed && "justify-center px-2"
                )}
                title={collapsed ? item.label : undefined}
              >
                <Icon className="h-4 w-4 shrink-0" />
                {!collapsed && <span>{item.label}</span>}
              </Link>
            )
          })
        )}
      </nav>

      {/* Collapse toggle */}
      <div className="border-t p-2">
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="flex items-center justify-center w-full rounded-lg py-2 text-muted-foreground hover:bg-accent hover:text-accent-foreground transition-colors"
        >
          {collapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
        </button>
      </div>
    </aside>
  )
}
