"use client"
import { useState, useEffect, useRef } from "react"
import { useRouter } from "next/navigation"
import { useTheme } from "next-themes"
import { motion, AnimatePresence, useReducedMotion } from "framer-motion"
import { Sun, Moon, Bell, LogOut, User, ChevronDown, Menu, UserCheck, ArrowLeft } from "lucide-react"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"

interface UserInfo {
  name: string
  email: string
  role: string
}

const dropdownVariants = {
  hidden: { opacity: 0, y: -4, scale: 0.97 },
  visible: { opacity: 1, y: 0, scale: 1 },
  exit: { opacity: 0, y: -4, scale: 0.97 },
}

export function Topbar({ onMenuToggle }: { onMenuToggle?: () => void }) {
  const [user, setUser] = useState<UserInfo | null>(null)
  const [showMenu, setShowMenu] = useState(false)
  const [showNotif, setShowNotif] = useState(false)
  const [notifications, setNotifications] = useState<any[]>([])
  const [unreadCount, setUnreadCount] = useState(0)
  const [mounted, setMounted] = useState(false)
  const [isImpersonating, setIsImpersonating] = useState(false)
  const [originalName, setOriginalName] = useState<string | null>(null)
  const { theme, setTheme } = useTheme()
  const router = useRouter()
  const shouldReduceMotion = useReducedMotion()

  useEffect(() => { setMounted(true) }, [])
  const menuRef = useRef<HTMLDivElement>(null)
  const notifRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    fetch("/api/auth/me").then(r => r.json()).then(d => {
      if (d.name) setUser(d)
      if (d.impersonating) { setIsImpersonating(true); setOriginalName(d.original_name || null) }
    }).catch(() => {})
  }, [])

  // Poll notifications every 30s
  useEffect(() => {
    function fetchNotifs() {
      fetch("/api/notifications").then(r => r.json()).then(d => {
        if (d.notifications) setNotifications(d.notifications.slice(0, 10))
        if (d.unread !== undefined) setUnreadCount(d.unread)
      }).catch(() => {})
    }
    fetchNotifs()
    const interval = setInterval(fetchNotifs, 30000)
    return () => clearInterval(interval)
  }, [])

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setShowMenu(false)
      if (notifRef.current && !notifRef.current.contains(e.target as Node)) setShowNotif(false)
    }
    document.addEventListener("mousedown", handleClick)
    return () => document.removeEventListener("mousedown", handleClick)
  }, [])

  async function handleLogout() {
    await fetch("/api/auth/logout", { method: "POST" })
    router.push("/login")
  }

  const initials = user?.name?.split(" ").map(w => w[0]).join("").slice(0, 2).toUpperCase() || "?"
  const transition = shouldReduceMotion ? { duration: 0 } : { duration: 0.15, ease: [0.16, 1, 0.3, 1] }

  return (
    <>
    {/* Impersonation banner */}
    {isImpersonating && (
      <div className="flex items-center justify-between bg-amber-500/10 border-b border-amber-500/30 px-4 md:px-6 py-1.5">
        <div className="flex items-center gap-2 text-sm text-amber-700 dark:text-amber-400">
          <UserCheck className="h-4 w-4" />
          <span>Eingeloggt als <strong>{user?.name}</strong></span>
        </div>
        <button
          onClick={async () => {
            await fetch("/api/auth/unimpersonate", { method: "POST" })
            window.location.href = "/select"
          }}
          className="flex items-center gap-1.5 px-3 py-1 rounded-lg bg-amber-500/20 text-xs font-medium text-amber-700 dark:text-amber-400 hover:bg-amber-500/30 transition-colors"
        >
          <ArrowLeft className="h-3 w-3" />
          Zurück zu {originalName?.split(" ")[0] || "meinem Konto"}
        </button>
      </div>
    )}
    <header className={`flex items-center justify-between h-14 border-b bg-card px-4 md:px-6 ${isImpersonating ? "border-amber-500/20" : ""}`}>
      {/* Left: hamburger on mobile */}
      <div className="flex items-center">
        <button
          onClick={onMenuToggle}
          className="flex md:hidden items-center justify-center h-10 w-10 rounded-lg hover:bg-accent transition-colors duration-150 -ml-1"
        >
          <Menu className="h-5 w-5" />
        </button>
      </div>

      <div className="flex items-center gap-1 sm:gap-2">
        {/* Theme toggle */}
        <button
          onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
          className="flex items-center justify-center h-10 w-10 rounded-lg hover:bg-accent transition-colors duration-150"
        >
          {mounted ? (theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />) : <Sun className="h-4 w-4" />}
        </button>

        {/* Notifications */}
        <div className="relative" ref={notifRef}>
          <button
            onClick={() => setShowNotif(!showNotif)}
            className="flex items-center justify-center h-10 w-10 rounded-lg hover:bg-accent transition-colors duration-150 relative"
          >
            <Bell className="h-4 w-4" />
            <AnimatePresence>
              {unreadCount > 0 && (
                <motion.span
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  exit={{ scale: 0 }}
                  transition={{ type: "spring", stiffness: 400, damping: 20 }}
                  className="absolute -top-0.5 -right-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-destructive text-[10px] font-bold text-destructive-foreground"
                >
                  {unreadCount > 9 ? "9+" : unreadCount}
                </motion.span>
              )}
            </AnimatePresence>
          </button>
          <AnimatePresence>
            {showNotif && (
              <motion.div
                variants={dropdownVariants}
                initial="hidden"
                animate="visible"
                exit="exit"
                transition={transition}
                className="absolute right-0 top-12 w-72 sm:w-80 bg-card border rounded-xl shadow-lg z-50"
              >
                <div className="flex items-center justify-between p-3 border-b">
                  <h3 className="font-semibold text-sm">Benachrichtigungen</h3>
                  {unreadCount > 0 && (
                    <button
                      onClick={async () => {
                        await fetch("/api/notifications", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ mark_all_read: true }) })
                        setUnreadCount(0)
                        setNotifications(prev => prev.map(n => ({ ...n, is_read: 1 })))
                      }}
                      className="text-xs text-primary hover:underline"
                    >
                      Alle gelesen
                    </button>
                  )}
                </div>
                <div className="max-h-72 overflow-y-auto">
                  {notifications.length === 0 ? (
                    <p className="text-sm text-muted-foreground text-center py-6">Keine Benachrichtigungen</p>
                  ) : (
                    notifications.map((n: any) => (
                      <div
                        key={n.id}
                        className={`px-3 py-2.5 border-b last:border-0 hover:bg-accent/50 transition-colors cursor-pointer ${!n.is_read ? "bg-primary/5" : ""}`}
                        onClick={async () => {
                          if (!n.is_read) {
                            await fetch("/api/notifications", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id: n.id }) })
                            setUnreadCount(prev => Math.max(0, prev - 1))
                            setNotifications(prev => prev.map(x => x.id === n.id ? { ...x, is_read: 1 } : x))
                          }
                          if (n.link) { window.location.href = n.link; setShowNotif(false) }
                        }}
                      >
                        <p className={`text-sm ${!n.is_read ? "font-medium" : ""}`}>{n.title}</p>
                        {n.message && <p className="text-xs text-muted-foreground mt-0.5 truncate">{n.message}</p>}
                        <p className="text-[10px] text-muted-foreground/60 mt-1">
                          {new Date(n.created_at).toLocaleString("de-DE", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" })}
                        </p>
                      </div>
                    ))
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* User menu */}
        <div className="relative" ref={menuRef}>
          <button
            onClick={() => setShowMenu(!showMenu)}
            className="flex items-center gap-2 rounded-lg px-2 py-1.5 hover:bg-accent transition-colors duration-150"
          >
            <Avatar className="h-7 w-7">
              <AvatarFallback className="text-xs">{initials}</AvatarFallback>
            </Avatar>
            <span className="text-sm font-medium hidden sm:inline max-w-[120px] truncate">{user?.name}</span>
            <ChevronDown className="h-3 w-3 text-muted-foreground hidden sm:block" />
          </button>
          <AnimatePresence>
            {showMenu && (
              <motion.div
                variants={dropdownVariants}
                initial="hidden"
                animate="visible"
                exit="exit"
                transition={transition}
                className="absolute right-0 top-12 w-56 bg-card border rounded-xl shadow-lg z-50 py-1"
              >
                <div className="px-3 py-2 border-b">
                  <p className="text-sm font-medium truncate">{user?.name}</p>
                  <p className="text-xs text-muted-foreground truncate">{user?.email}</p>
                </div>
                <button
                  onClick={() => { router.push("/profile"); setShowMenu(false) }}
                  className="flex items-center gap-2 w-full px-3 py-2.5 text-sm hover:bg-accent transition-colors duration-150"
                >
                  <User className="h-4 w-4" /> Profil
                </button>
                <button
                  onClick={handleLogout}
                  className="flex items-center gap-2 w-full px-3 py-2.5 text-sm text-destructive hover:bg-accent transition-colors duration-150"
                >
                  <LogOut className="h-4 w-4" /> Abmelden
                </button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </header>
    </>
  )
}
