"use client"
import { useState, useEffect } from "react"
import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import { motion, AnimatePresence, useReducedMotion } from "framer-motion"
import {
  Building2, Car, LayoutDashboard, AlertTriangle, MapPin, PackageCheck, Receipt,
  Users, Settings, ChevronLeft, ChevronRight, Loader2, Truck, Headset, TicketCheck, Monitor, X,
  GraduationCap, BookOpen, ClipboardCheck, Smartphone, Timer, Warehouse, ContactRound,
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
  { key: "sla", href: "/sla", label: "SLA & Zuweisung", icon: Timer, requiredRoles: ["admin"] },
  { key: "users", href: "/users", label: "Benutzer", icon: Users, requiredRoles: ["admin", "manager"] },
  { key: "settings", href: "/settings", label: "Einstellungen", icon: Settings, requiredRoles: ["admin"] },
]

const fleetNav: NavItem[] = [
  { key: "dashboard", href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { key: "vehicles", href: "/vehicles", label: "Fahrzeuge", icon: Truck },
  { key: "users", href: "/users", label: "Benutzer", icon: Users, requiredRoles: ["admin", "manager"] },
  { key: "settings", href: "/settings", label: "Einstellungen", icon: Settings, requiredRoles: ["admin"] },
]

const traincoreNav: NavItem[] = [
  { key: "tc-dashboard", href: "/traincore/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { key: "tc-modules", href: "/traincore/modules", label: "Schulungsmodule", icon: BookOpen },
  { key: "tc-reports", href: "/traincore/reports", label: "Berichte", icon: ClipboardCheck },
  { key: "tc-users", href: "/users", label: "Benutzer", icon: Users, requiredRoles: ["admin", "manager"] },
  { key: "tc-settings", href: "/settings", label: "Einstellungen", icon: Settings, requiredRoles: ["admin"] },
]

const helpdeskNav: NavItem[] = [
  { key: "hd-dashboard", href: "/helpdesk/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { key: "hd-tickets", href: "/helpdesk/tickets", label: "Tickets", icon: TicketCheck },
  { key: "hd-assets", href: "/helpdesk/assets", label: "Geräte", icon: Monitor },
  { key: "hd-orders", href: "/helpdesk/orders", label: "Aufträge", icon: ClipboardCheck },
  { key: "hd-catalog", href: "/helpdesk/catalog", label: "Katalog", icon: PackageCheck },
  { key: "hd-contracts", href: "/helpdesk/mobile-contracts", label: "Mobilfunk", icon: Smartphone },
  { key: "hd-mydevices", href: "/helpdesk/my-devices", label: "Meine Geräte", icon: Monitor },
  { key: "hd-kb", href: "/helpdesk/kb", label: "Wissensdatenbank", icon: BookOpen },
  { key: "hd-suppliers", href: "/helpdesk/suppliers", label: "Lieferanten", icon: ContactRound, requiredRoles: ["admin", "agent"] },
  { key: "hd-inventory", href: "/helpdesk/inventory", label: "Inventar", icon: Warehouse, requiredRoles: ["admin", "agent"] },
  { key: "hd-analytics", href: "/helpdesk/analytics", label: "Analytik", icon: ClipboardCheck, requiredRoles: ["admin", "agent", "manager"] },
  { key: "hd-sla", href: "/sla", label: "SLA & Zuweisung", icon: Timer, requiredRoles: ["admin"] },
  { key: "hd-users", href: "/users", label: "Benutzer", icon: Users, requiredRoles: ["admin", "agent"] },
  { key: "hd-settings", href: "/settings", label: "Einstellungen", icon: Settings, requiredRoles: ["admin"] },
]

export function Sidebar({ mobileOpen, onMobileClose }: { mobileOpen?: boolean; onMobileClose?: () => void }) {
  const [collapsed, setCollapsed] = useState(false)
  const [userRole, setUserRole] = useState("")
  const [loading, setLoading] = useState(true)
  const [area, setArea] = useState<"facility" | "fleet" | "helpdesk" | "traincore">("facility")
  const [navConfig, setNavConfig] = useState<Record<string, string[]>>({})
  const pathname = usePathname()
  const router = useRouter()
  const shouldReduceMotion = useReducedMotion()

  useEffect(() => {
    fetch("/api/auth/me")
      .then(r => r.json())
      .then(d => { setUserRole(d.role || ""); setLoading(false) })
      .catch(() => setLoading(false))

    const stored = localStorage.getItem("active_area")
    if (stored === "fleet") setArea("fleet")
    else if (stored === "helpdesk") setArea("helpdesk")
    else if (stored === "traincore") setArea("traincore")

    fetch("/api/settings/nav").then(r => r.json()).then(d => {
      if (d && typeof d === "object" && !d.error) setNavConfig(d)
    }).catch(() => {})
  }, [])

  // Close mobile sidebar on route change
  useEffect(() => {
    onMobileClose?.()
  }, [pathname])

  function goToSelect() {
    onMobileClose?.()
    router.push("/select")
  }

  const isAdmin = userRole.includes("admin")
  const userRoles = userRole.split(",").map(r => r.trim()).filter(Boolean)
  const navItems = area === "traincore" ? traincoreNav : area === "helpdesk" ? helpdeskNav : area === "fleet" ? fleetNav : facilityNav

  const visibleItems = navItems.filter(item => {
    // Check dynamic nav_config first
    if (navConfig[item.key] !== undefined) {
      const allowedRoles = navConfig[item.key]
      if (allowedRoles.length === 0) return false // hidden for everyone
      if (isAdmin) return true // admin always sees everything
      return allowedRoles.some(r => userRoles.includes(r))
    }
    // Fallback to hardcoded requiredRoles
    if (!item.requiredRoles) return true
    if (isAdmin) return true
    return item.requiredRoles.some(r => userRole.includes(r))
  })

  const areaColor = area === "helpdesk" ? "purple" : area === "fleet" ? "blue" : "teal"

  const sidebarContent = (
    <>
      {/* Logo */}
      <div className="flex items-center justify-between gap-3 px-4 h-14 border-b">
        <div className="flex items-center gap-3">
          <div className={cn(
            "flex h-8 w-8 shrink-0 items-center justify-center rounded-lg transition-colors duration-250",
            area === "traincore" ? "bg-amber-600" : area === "helpdesk" ? "bg-purple-600" : area === "fleet" ? "bg-blue-600" : "bg-primary"
          )}>
            {area === "traincore" ? <GraduationCap className="h-4 w-4 text-white" />
              : area === "helpdesk" ? <Headset className="h-4 w-4 text-white" />
              : area === "fleet" ? <Car className="h-4 w-4 text-white" />
              : <Building2 className="h-4 w-4 text-primary-foreground" />}
          </div>
          {!collapsed && (
            <span className="font-semibold text-sm truncate">
              {area === "traincore" ? "Schulungen" : area === "helpdesk" ? "IT-Helpdesk" : area === "fleet" ? "Fuhrpark" : "Facility"}
            </span>
          )}
        </div>
        {/* Mobile close button */}
        {mobileOpen && (
          <button onClick={onMobileClose} className="md:hidden flex items-center justify-center h-8 w-8 rounded-lg hover:bg-accent">
            <X className="h-4 w-4" />
          </button>
        )}
      </div>

      {/* Area Toggle */}
      <div className={cn("border-b px-2 py-2", collapsed ? "px-1" : "px-3")}>
        <button
          onClick={goToSelect}
          className={cn(
            "flex items-center justify-center gap-2 rounded-lg bg-muted py-2.5 text-xs font-medium transition-colors duration-150 w-full",
            area === "traincore" ? "text-amber-600 dark:text-amber-400 hover:bg-amber-500/10"
              : area === "helpdesk" ? "text-purple-600 dark:text-purple-400 hover:bg-purple-500/10"
              : area === "fleet" ? "text-blue-600 dark:text-blue-400 hover:bg-blue-500/10"
              : "text-primary hover:bg-primary/10"
          )}
          title="Modus wechseln"
        >
          {area === "traincore" ? <GraduationCap className="h-3.5 w-3.5 shrink-0" />
            : area === "helpdesk" ? <Headset className="h-3.5 w-3.5 shrink-0" />
            : area === "fleet" ? <Car className="h-3.5 w-3.5 shrink-0" />
            : <Building2 className="h-3.5 w-3.5 shrink-0" />}
          {!collapsed && <span>Modus wechseln</span>}
        </button>
      </div>

      {/* Nav */}
      <nav className="flex-1 py-3 px-2 space-y-0.5 overflow-y-auto">
        {loading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          </div>
        ) : (
          visibleItems.map((item) => {
            const Icon = item.icon
            const active = pathname === item.href || pathname.startsWith(item.href + "/")
            return (
              <Link
                key={item.key}
                href={item.href}
                onClick={onMobileClose}
                className={cn(
                  "relative flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition-colors duration-150",
                  active
                    ? area === "traincore" ? "bg-amber-500/10 text-amber-600 dark:text-amber-400 font-medium"
                      : area === "helpdesk" ? "bg-purple-500/10 text-purple-600 dark:text-purple-400 font-medium"
                      : area === "fleet" ? "bg-blue-500/10 text-blue-600 dark:text-blue-400 font-medium"
                      : "bg-primary/10 text-primary font-medium"
                    : "text-muted-foreground hover:bg-accent hover:text-accent-foreground",
                  collapsed && "justify-center px-2"
                )}
                title={collapsed ? item.label : undefined}
              >
                {active && (
                  <motion.div
                    layoutId="sidebar-active"
                    className={cn(
                      "absolute left-0 top-1 bottom-1 w-0.5 rounded-full",
                      area === "traincore" ? "bg-amber-600 dark:bg-amber-400"
                        : area === "helpdesk" ? "bg-purple-600 dark:bg-purple-400"
                        : area === "fleet" ? "bg-blue-600 dark:bg-blue-400" : "bg-primary"
                    )}
                    transition={{ type: "spring", stiffness: 350, damping: 30 }}
                  />
                )}
                <Icon className="h-4 w-4 shrink-0" />
                {!collapsed && <span className="truncate">{item.label}</span>}
              </Link>
            )
          })
        )}
      </nav>

      {/* Collapse toggle — desktop only */}
      <div className="border-t p-2 hidden md:block">
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="flex items-center justify-center w-full rounded-lg py-2.5 text-muted-foreground hover:bg-accent hover:text-accent-foreground transition-colors duration-150"
        >
          {collapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
        </button>
      </div>
    </>
  )

  return (
    <>
      {/* Desktop sidebar */}
      <motion.aside
        layout={!shouldReduceMotion}
        transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
        className={cn(
          "hidden md:flex flex-col border-r bg-card h-screen",
          collapsed ? "w-16" : "w-60",
          area === "traincore" ? "border-r-amber-500/20" : area === "helpdesk" ? "border-r-purple-500/20" : area === "fleet" ? "border-r-blue-500/20" : "border-r-primary/20"
        )}
      >
        {sidebarContent}
      </motion.aside>

      {/* Mobile sidebar overlay */}
      <AnimatePresence>
        {mobileOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm md:hidden"
              onClick={onMobileClose}
            />
            <motion.aside
              initial={{ x: "-100%" }}
              animate={{ x: 0 }}
              exit={{ x: "-100%" }}
              transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
              className={cn(
                "fixed inset-y-0 left-0 z-50 flex flex-col w-72 bg-card border-r md:hidden",
                area === "traincore" ? "border-r-amber-500/20" : area === "helpdesk" ? "border-r-purple-500/20" : area === "fleet" ? "border-r-blue-500/20" : "border-r-primary/20"
              )}
            >
              {sidebarContent}
            </motion.aside>
          </>
        )}
      </AnimatePresence>
    </>
  )
}
