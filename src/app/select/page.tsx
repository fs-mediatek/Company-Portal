"use client"
import { useRouter } from "next/navigation"
import { useEffect, useState } from "react"
import { motion, useReducedMotion } from "framer-motion"
import {
  Building2, Car, ArrowRight, MapPin, AlertTriangle, Truck, Wrench,
  Headset, TicketCheck, GraduationCap, BookOpen, ClipboardCheck, Puzzle,
} from "lucide-react"
import { Sparkles } from "@/components/ui/sparkles"
import { VerticalCutReveal } from "@/components/ui/vertical-cut-reveal"
import { cn } from "@/lib/utils"

const areas = [
  {
    key: "facility",
    label: "Facility",
    description: "Gebäudemanagement, Störungsmeldungen & Standortverwaltung",
    icon: Building2,
    gradient: "from-teal-500 to-emerald-600",
    shadowGlow: "shadow-teal-500/30",
    bgGlow: "#0d9488",
    accentText: "text-teal-500",
    accentBg: "bg-teal-500/10 text-teal-500",
    features: [
      { icon: AlertTriangle, text: "Störungsmeldungen" },
      { icon: MapPin, text: "Standorte & Gebäude" },
    ],
  },
  {
    key: "fleet",
    label: "Fuhrpark",
    description: "Fahrzeugverwaltung, Flottenübersicht & Wartungsplanung",
    icon: Car,
    gradient: "from-blue-500 to-indigo-600",
    shadowGlow: "shadow-blue-500/30",
    bgGlow: "#3b82f6",
    accentText: "text-blue-500",
    accentBg: "bg-blue-500/10 text-blue-500",
    features: [
      { icon: Truck, text: "Fahrzeugflotte" },
      { icon: Wrench, text: "Wartung & TÜV" },
    ],
  },
  {
    key: "helpdesk",
    label: "IT-Helpdesk",
    description: "IT-Support, Ticketsystem & Geräteverwaltung",
    icon: Headset,
    gradient: "from-purple-500 to-violet-600",
    shadowGlow: "shadow-purple-500/30",
    bgGlow: "#a855f7",
    accentText: "text-purple-500",
    accentBg: "bg-purple-500/10 text-purple-500",
    features: [
      { icon: TicketCheck, text: "Support-Tickets" },
      { icon: Headset, text: "IT-Anfragen" },
    ],
  },
  {
    key: "traincore",
    label: "Schulungen",
    description: "Schulungsmodule, Quizze & Zertifizierungen verwalten",
    icon: GraduationCap,
    gradient: "from-amber-500 to-orange-600",
    shadowGlow: "shadow-amber-500/30",
    bgGlow: "#f59e0b",
    accentText: "text-amber-500",
    accentBg: "bg-amber-500/10 text-amber-500",
    features: [
      { icon: BookOpen, text: "Schulungsmodule" },
      { icon: ClipboardCheck, text: "Quizze & Zertifikate" },
    ],
  },
]

export default function SelectPage() {
  const router = useRouter()
  const [user, setUser] = useState<{ name: string } | null>(null)
  const [mounted, setMounted] = useState(false)
  const [activeIndex, setActiveIndex] = useState(-1)
  const [copyright, setCopyright] = useState("© ÜAG gGmbH")
  const shouldReduceMotion = useReducedMotion()

  useEffect(() => {
    setMounted(true)
    fetch("/api/auth/me")
      .then(r => r.json())
      .then(d => { if (d.name) setUser(d) })
      .catch(() => {})
    fetch("/api/settings").then(r => r.json()).then(d => {
      if (d?.branding_copyright) setCopyright(d.branding_copyright)
    }).catch(() => {})
  }, [])

  function selectArea(areaKey: string) {
    localStorage.setItem("active_area", areaKey)
    if (areaKey === "helpdesk") router.push("/helpdesk/dashboard")
    else if (areaKey === "traincore") router.push("/schulungen")
    else router.push("/dashboard")
  }

  return (
    <div className="min-h-screen relative bg-background overflow-hidden flex flex-col items-center justify-center p-4 md:p-6">
      {/* Sparkle background */}
      {mounted && (
        <div className="absolute inset-0 h-96 overflow-hidden [mask-image:radial-gradient(50%_50%,white,transparent)]">
          <div className="absolute inset-0 bg-[linear-gradient(to_right,oklch(0.55_0.14_170_/_0.02)_1px,transparent_1px),linear-gradient(to_bottom,oklch(0.55_0.14_170_/_0.01)_1px,transparent_1px)] bg-[size:70px_80px]" />
          <Sparkles density={1200} direction="bottom" speed={0.8} color="#5eead4" size={1.2} className="absolute inset-x-0 bottom-0 h-full w-full [mask-image:radial-gradient(50%_50%,white,transparent_85%)]" />
        </div>
      )}

      <div className="absolute top-0 left-[10%] right-[10%] w-[80%] h-full z-0 pointer-events-none" style={{ backgroundImage: "radial-gradient(circle at center, oklch(0.55 0.14 170 / 0.15) 0%, transparent 60%)" }} />

      {/* Header */}
      <div className="text-center mb-8 md:mb-10 relative z-10">
        <motion.div
          initial={shouldReduceMotion ? false : { opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
          className="flex items-center justify-center gap-2 mb-5"
        >
          {areas.map(a => {
            const I = a.icon
            return (
              <div key={a.key} className={cn("flex h-9 w-9 md:h-11 md:w-11 items-center justify-center rounded-xl bg-gradient-to-br shadow-lg", a.gradient, a.shadowGlow)}>
                <I className="h-4 w-4 md:h-5 md:w-5 text-white" />
              </div>
            )
          })}
        </motion.div>

        <h1 className="text-3xl md:text-4xl font-medium text-foreground">
          <VerticalCutReveal splitBy="words" staggerDuration={0.15} staggerFrom="first" reverse={true} containerClassName="justify-center" transition={{ type: "spring", stiffness: 250, damping: 40, delay: 0 }}>
            {user ? `Hallo, ${user.name.split(" ")[0]}` : "Willkommen"}
          </VerticalCutReveal>
        </h1>

        <motion.p
          initial={shouldReduceMotion ? false : { opacity: 0, y: 8, filter: "blur(4px)" }}
          animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
          transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1], delay: 0.3 }}
          className="text-muted-foreground mt-2"
        >
          Wähle deinen Bereich, um loszulegen
        </motion.p>
      </div>

      {/* ═══ MOBILE: Vertical card grid ═══ */}
      <motion.div
        initial={shouldReduceMotion ? false : { opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1], delay: 0.4 }}
        className="grid grid-cols-1 sm:grid-cols-2 gap-4 w-full max-w-lg sm:max-w-2xl relative z-10 lg:hidden"
      >
        {areas.map((area, i) => {
          const Icon = area.icon
          return (
            <motion.button
              key={area.key}
              initial={shouldReduceMotion ? false : { opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1], delay: 0.45 + i * 0.08 }}
              whileTap={{ scale: 0.97 }}
              onClick={() => selectArea(area.key)}
              className="group relative text-left"
            >
              <div className={cn("relative overflow-hidden rounded-2xl border bg-card p-6 transition-all duration-300 group-active:shadow-lg", area.shadowGlow.replace("shadow-", "group-active:shadow-"))}>
                <div className={cn("absolute top-0 right-0 w-32 h-32 rounded-full bg-gradient-to-br opacity-[0.07] blur-2xl -translate-y-8 translate-x-8", area.gradient)} />
                <div className={cn("flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br shadow-lg mb-4", area.gradient, area.shadowGlow)}>
                  <Icon className="h-6 w-6 text-white" />
                </div>
                <h3 className="text-lg font-bold mb-1">{area.label}</h3>
                <p className="text-muted-foreground text-xs leading-relaxed mb-3">{area.description}</p>
                <div className={cn("flex items-center gap-1.5 text-xs font-semibold", area.accentText)}>
                  <span>Öffnen</span>
                  <ArrowRight className="h-3 w-3" />
                </div>
              </div>
            </motion.button>
          )
        })}
        {/* Placeholder mobile */}
        <div className="relative rounded-2xl border bg-card p-6 opacity-40 cursor-not-allowed sm:col-span-2">
          <div className="flex items-center gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-rose-500 to-pink-600 shadow-lg shadow-rose-500/30 shrink-0">
              <Puzzle className="h-6 w-6 text-white" />
            </div>
            <div>
              <h3 className="text-lg font-bold">Weiteres Modul</h3>
              <p className="text-muted-foreground text-xs">Demnächst verfügbar</p>
            </div>
          </div>
        </div>
      </motion.div>

      {/* ═══ DESKTOP: All 5 items in one accordion grid ═══ */}
      <motion.div
        initial={shouldReduceMotion ? false : { opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1], delay: 0.4 }}
        className="hidden lg:grid gap-3 w-full max-w-7xl relative z-10 h-[420px]"
        style={{
          gridTemplateColumns: [
            // Placeholder always gets a fixed comfortable width
            activeIndex === -1 ? "1.5fr" : "200px",
            // 4 area panels
            ...areas.map((_, i) => i === activeIndex ? "3fr" : "60px"),
          ].join(" "),
          transition: "grid-template-columns 500ms cubic-bezier(0.16, 1, 0.3, 1)",
        }}
        onMouseLeave={() => setActiveIndex(-1)}
      >
        {/* Placeholder panel */}
        <div className="relative rounded-2xl overflow-hidden cursor-not-allowed group">
          <div className="absolute inset-0 bg-card border border-border rounded-2xl" />
          <div className="absolute top-0 right-0 w-40 h-40 rounded-full bg-gradient-to-br from-rose-500 to-pink-600 opacity-[0.05] blur-2xl -translate-y-10 translate-x-10" />

          <div className={cn(
            "relative z-10 flex flex-col h-full p-8 transition-opacity duration-300",
            activeIndex === -1 ? "opacity-50" : "opacity-30"
          )}>
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-rose-500 to-pink-600 shadow-lg shadow-rose-500/30 mb-5">
              <Puzzle className="h-7 w-7 text-white" />
            </div>
            <h2 className={cn("font-bold mb-2 transition-all duration-300", activeIndex === -1 ? "text-2xl" : "text-lg")}>Weiteres Modul</h2>
            {activeIndex === -1 && (
              <>
                <p className="text-muted-foreground text-sm leading-relaxed mb-5">Hier entsteht ein zentrales Instrument für die Verwaltung und Steuerung Ihrer Prozesse.</p>
                <div className="flex items-center gap-2.5 mb-5">
                  <div className="flex h-6 w-6 items-center justify-center rounded-md bg-rose-500/10 text-rose-500"><Puzzle className="h-3.5 w-3.5" /></div>
                  <span className="text-sm text-muted-foreground">In Planung</span>
                </div>
              </>
            )}
            <div className="flex items-center gap-2 text-sm font-semibold mt-auto pt-4 text-rose-500 opacity-60">
              <span>Demnächst verfügbar</span>
            </div>
          </div>
        </div>

        {/* 4 area panels */}
        {areas.map((area, index) => {
          const Icon = area.icon
          const isActive = index === activeIndex

          return (
            <div
              key={area.key}
              className="relative rounded-2xl overflow-hidden cursor-pointer"
              onMouseEnter={() => setActiveIndex(index)}
              onClick={() => isActive && selectArea(area.key)}
            >
              <div className="absolute inset-0 bg-card border border-border rounded-2xl" />

              <div className={cn("absolute top-0 right-0 w-48 h-48 rounded-full bg-gradient-to-br opacity-[0.08] blur-2xl -translate-y-12 translate-x-12 transition-opacity duration-500", isActive && "opacity-[0.2]", area.gradient)} />

              <div className={cn(
                "absolute top-0 left-0 right-0 h-px transition-opacity duration-500",
                isActive ? "opacity-100" : "opacity-0",
              )} style={{ background: `linear-gradient(to right, transparent, ${area.bgGlow}80, transparent)` }} />

              <div className={cn(
                "absolute -inset-1 rounded-2xl blur-xl -z-10 transition-opacity duration-500",
                isActive ? "opacity-100" : "opacity-0"
              )} style={{ background: `radial-gradient(circle, ${area.bgGlow}22, transparent 70%)` }} />

              {/* Expanded */}
              <div className={cn(
                "relative z-10 flex flex-col h-full p-8 transition-opacity duration-300",
                isActive ? "opacity-100" : "opacity-0 pointer-events-none"
              )}>
                <div className={cn("flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br shadow-lg mb-6", area.gradient, area.shadowGlow)}>
                  <Icon className="h-8 w-8 text-white" />
                </div>

                <h2 className="text-2xl font-bold mb-2">{area.label}</h2>
                <p className="text-muted-foreground text-sm leading-relaxed mb-6 max-w-sm">{area.description}</p>

                <div className="space-y-2.5 mb-6">
                  {area.features.map((feature, fi) => (
                    <div key={fi} className="flex items-center gap-2.5">
                      <div className={cn("flex h-6 w-6 items-center justify-center rounded-md", area.accentBg)}>
                        <feature.icon className="h-3.5 w-3.5" />
                      </div>
                      <span className="text-sm text-muted-foreground">{feature.text}</span>
                    </div>
                  ))}
                </div>

                <div className={cn("flex items-center gap-2 text-sm font-semibold mt-auto pt-4 group/cta", area.accentText)}>
                  <span>Bereich öffnen</span>
                  <ArrowRight className="h-4 w-4 group-hover/cta:translate-x-1 transition-transform duration-200" />
                </div>
              </div>

              {/* Collapsed */}
              <div className={cn(
                "absolute inset-0 flex items-center justify-center transition-opacity duration-300",
                isActive ? "opacity-0 pointer-events-none" : "opacity-100"
              )}>
                <div className="flex flex-col items-center gap-3">
                  <Icon className={cn("h-5 w-5", area.accentText)} />
                  <span className="text-sm font-semibold whitespace-nowrap text-muted-foreground [writing-mode:vertical-lr]">
                    {area.label}
                  </span>
                </div>
              </div>
            </div>
          )
        })}
      </motion.div>

      <motion.p
        initial={shouldReduceMotion ? false : { opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1, duration: 0.5 }}
        className="text-xs text-muted-foreground/40 mt-10 relative z-10"
      >
        {copyright}
      </motion.p>
    </div>
  )
}
