"use client"
import { useState, useEffect, Suspense, useRef } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Building2, Car, Loader2, KeyRound, Mail } from "lucide-react"

export default function LoginPage() {
  return (
    <Suspense>
      <LoginContent />
    </Suspense>
  )
}

/* ────────────────────────────────────────────────
   Animated particle canvas (blueprint dots + lines)
   ──────────────────────────────────────────────── */
function ParticleCanvas() {
  const ref = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = ref.current
    if (!canvas) return
    const ctx = canvas.getContext("2d")
    if (!ctx) return

    let raf: number
    let particles: { x: number; y: number; vx: number; vy: number; r: number; o: number }[] = []

    function resize() {
      canvas!.width = window.innerWidth
      canvas!.height = window.innerHeight
    }
    resize()
    window.addEventListener("resize", resize)

    const count = Math.min(60, Math.floor((canvas.width * canvas.height) / 18000))
    for (let i = 0; i < count; i++) {
      particles.push({
        x: Math.random() * canvas.width,
        y: Math.random() * canvas.height,
        vx: (Math.random() - 0.5) * 0.3,
        vy: (Math.random() - 0.5) * 0.3,
        r: Math.random() * 1.5 + 0.5,
        o: Math.random() * 0.3 + 0.1,
      })
    }

    const isDark = document.documentElement.classList.contains("dark")
    const dotColor = isDark ? "rgba(94,234,212," : "rgba(13,148,136,"
    const lineColor = isDark ? "rgba(94,234,212," : "rgba(13,148,136,"

    function draw() {
      ctx!.clearRect(0, 0, canvas!.width, canvas!.height)
      for (let i = 0; i < particles.length; i++) {
        for (let j = i + 1; j < particles.length; j++) {
          const dx = particles[i].x - particles[j].x
          const dy = particles[i].y - particles[j].y
          const dist = Math.sqrt(dx * dx + dy * dy)
          if (dist < 150) {
            const alpha = (1 - dist / 150) * 0.08
            ctx!.beginPath()
            ctx!.strokeStyle = lineColor + alpha + ")"
            ctx!.lineWidth = 0.5
            ctx!.moveTo(particles[i].x, particles[i].y)
            ctx!.lineTo(particles[j].x, particles[j].y)
            ctx!.stroke()
          }
        }
      }
      for (const p of particles) {
        ctx!.beginPath()
        ctx!.arc(p.x, p.y, p.r, 0, Math.PI * 2)
        ctx!.fillStyle = dotColor + p.o + ")"
        ctx!.fill()
        p.x += p.vx
        p.y += p.vy
        if (p.x < 0 || p.x > canvas!.width) p.vx *= -1
        if (p.y < 0 || p.y > canvas!.height) p.vy *= -1
      }
      raf = requestAnimationFrame(draw)
    }
    draw()

    return () => {
      cancelAnimationFrame(raf)
      window.removeEventListener("resize", resize)
    }
  }, [])

  return <canvas ref={ref} className="absolute inset-0 pointer-events-none" />
}

/* ────────────────────────────────────────────────
   Jena Skyline — recognizable landmarks
   ──────────────────────────────────────────────── */
function JenaSkyline() {
  return (
    <div className="absolute bottom-0 left-0 right-0 pointer-events-none overflow-hidden" style={{ height: 420 }}>
      <svg
        className="absolute bottom-0 left-0 w-full"
        viewBox="0 0 1200 420"
        preserveAspectRatio="xMidYMax slice"
        fill="currentColor"
        style={{ color: "var(--skyline-color, currentColor)" }}
      >
        <defs>
          {/* Window pattern */}
          <pattern id="win" width="10" height="14" patternUnits="userSpaceOnUse">
            <rect x="1" y="1" width="7" height="10" rx="1" className="window-light" style={{ animationDelay: "1.5s" }} fill="hsl(var(--primary) / 0.06)" />
          </pattern>
        </defs>

        {/* ── Hills / Kernberge background ── */}
        <g className="skyline-building" style={{ animationDelay: "0s" }}>
          {/* Jenzig (right) — distinctive pointed hill */}
          <path d="M850,420 L850,200 Q900,120 960,180 L1000,220 Q1050,250 1100,240 L1200,280 L1200,420 Z"
            className="fill-foreground/[0.025] dark:fill-foreground/[0.015]" />
          {/* Kernberge (left) — rolling hills */}
          <path d="M0,420 L0,260 Q80,200 180,240 Q280,190 380,230 Q440,210 500,250 L600,280 L600,420 Z"
            className="fill-foreground/[0.02] dark:fill-foreground/[0.012]" />
          {/* Landgrafenberg (center-left) */}
          <path d="M200,420 L200,220 Q300,160 420,210 Q500,190 580,230 L650,260 L650,420 Z"
            className="fill-foreground/[0.018] dark:fill-foreground/[0.01]" />
        </g>

        {/* ── Saale River ── */}
        <g className="skyline-building" style={{ animationDelay: "0.1s" }}>
          <path d="M0,395 Q150,388 300,392 Q500,385 700,390 Q900,383 1100,388 L1200,390 L1200,420 L0,420 Z"
            className="fill-primary/[0.04] dark:fill-primary/[0.03]" />
          {/* River shimmer line */}
          <path d="M0,393 Q200,386 400,390 Q600,384 800,389 Q1000,384 1200,387"
            stroke="hsl(var(--primary) / 0.08)" strokeWidth="1" fill="none" />
        </g>

        {/* ── University / historische Gebäude links ── */}
        <g className="skyline-building" style={{ animationDelay: "0.5s" }}>
          {/* Uni-Hauptgebäude */}
          <rect x="40" y="300" width="100" height="95" rx="2" className="fill-foreground/[0.05] dark:fill-foreground/[0.03]" />
          <rect x="55" y="290" width="70" height="12" rx="1" className="fill-foreground/[0.04] dark:fill-foreground/[0.025]" />
          {/* Windows */}
          {[0,1,2,3].map(row => [0,1,2,3,4].map(col => (
            <rect key={`u${row}${col}`} x={52 + col * 18} y={310 + row * 20} width="10" height="12" rx="1"
              className="window-light" style={{ animationDelay: `${1.2 + ((row * 5 + col) * 31 % 20) / 10}s` }}
              fill="hsl(var(--primary) / 0.06)" />
          )))}
        </g>

        {/* ── Stadtkirche St. Michael ── */}
        <g className="skyline-building" style={{ animationDelay: "0.3s" }}>
          {/* Church body */}
          <rect x="195" y="290" width="70" height="105" rx="2" className="fill-foreground/[0.055] dark:fill-foreground/[0.035]" />
          {/* Church tower */}
          <rect x="215" y="190" width="30" height="105" rx="1" className="fill-foreground/[0.06] dark:fill-foreground/[0.04]" />
          {/* Spire */}
          <polygon points="230,120 215,190 245,190" className="fill-foreground/[0.07] dark:fill-foreground/[0.045]" />
          {/* Cross */}
          <line x1="230" y1="110" x2="230" y2="125" stroke="hsl(var(--foreground) / 0.1)" strokeWidth="2" />
          <line x1="225" y1="116" x2="235" y2="116" stroke="hsl(var(--foreground) / 0.1)" strokeWidth="2" />
          {/* Clock */}
          <circle cx="230" cy="210" r="8" fill="none" stroke="hsl(var(--foreground) / 0.08)" strokeWidth="1.5" />
          <line x1="230" y1="210" x2="230" y2="205" stroke="hsl(var(--foreground) / 0.1)" strokeWidth="1" />
          <line x1="230" y1="210" x2="234" y2="212" stroke="hsl(var(--foreground) / 0.1)" strokeWidth="1" />
          {/* Rose window */}
          <circle cx="230" cy="310" r="10" fill="none" stroke="hsl(var(--foreground) / 0.06)" strokeWidth="1" />
          {/* Door */}
          <path d="M222,395 L222,372 Q230,365 238,372 L238,395" className="fill-foreground/[0.07]" />
        </g>

        {/* ── Wohngebäude Mitte ── */}
        <g className="skyline-building" style={{ animationDelay: "0.45s" }}>
          <rect x="310" y="310" width="60" height="85" rx="2" className="fill-foreground/[0.045] dark:fill-foreground/[0.028]" />
          {[0,1,2].map(row => [0,1,2].map(col => (
            <rect key={`w1${row}${col}`} x={320 + col * 16} y={320 + row * 22} width="9" height="13" rx="1"
              className="window-light" style={{ animationDelay: `${1.8 + ((row * 3 + col) * 47 % 20) / 10}s` }}
              fill="hsl(var(--primary) / 0.06)" />
          )))}
          {/* Pointed roof */}
          <polygon points="308,310 340,285 372,310" className="fill-foreground/[0.04] dark:fill-foreground/[0.025]" />
        </g>

        {/* ── Zeiss Planetarium (dome) ── */}
        <g className="skyline-building" style={{ animationDelay: "0.2s" }}>
          {/* Dome */}
          <path d="M420,395 L420,340 Q420,280 480,270 Q540,280 540,340 L540,395 Z"
            className="fill-foreground/[0.05] dark:fill-foreground/[0.032]" />
          {/* Dome ribs */}
          <path d="M440,395 Q445,310 480,275" fill="none" stroke="hsl(var(--foreground) / 0.04)" strokeWidth="1" />
          <path d="M480,270 Q480,310 480,395" fill="none" stroke="hsl(var(--foreground) / 0.04)" strokeWidth="1" />
          <path d="M520,395 Q515,310 480,275" fill="none" stroke="hsl(var(--foreground) / 0.04)" strokeWidth="1" />
          {/* Dome entrance */}
          <rect x="460" y="365" width="40" height="30" rx="2" className="fill-foreground/[0.06] dark:fill-foreground/[0.04]" />
          <path d="M465,365 Q480,352 495,365" fill="none" stroke="hsl(var(--foreground) / 0.06)" strokeWidth="1.5" />
          {/* Star projector hint on top */}
          <circle cx="480" cy="270" r="3" className="fill-primary/20 animate-blink" style={{ animationDelay: "2s" }} />
        </g>

        {/* ── JenTower (Intershop Tower) — the iconic landmark ── */}
        <g className="skyline-building" style={{ animationDelay: "0.08s" }}>
          {/* Tower shaft — cylindrical shape */}
          <rect x="620" y="75" width="50" height="320" rx="4" className="fill-foreground/[0.065] dark:fill-foreground/[0.04]" />
          {/* Top platform / restaurant level — wider */}
          <rect x="610" y="75" width="70" height="30" rx="3" className="fill-foreground/[0.07] dark:fill-foreground/[0.045]" />
          {/* Crown / antenna structure */}
          <rect x="638" y="45" width="14" height="32" rx="2" className="fill-foreground/[0.06] dark:fill-foreground/[0.038]" />
          <rect x="643" y="25" width="4" height="22" rx="1" className="fill-foreground/[0.05]" />
          {/* Antenna light */}
          <circle cx="645" cy="23" r="2.5" className="fill-red-400/50 animate-blink" />
          {/* Tower windows — horizontal bands */}
          {Array.from({ length: 18 }).map((_, row) => (
            <rect key={`jt${row}`} x="624" y={110 + row * 16} width="42" height="8" rx="1"
              className="window-light" style={{ animationDelay: `${0.9 + (row * 37 % 20) / 10}s` }}
              fill="hsl(var(--primary) / 0.05)" />
          ))}
          {/* Restaurant level windows — panoramic */}
          <rect x="614" y="80" width="62" height="18" rx="2"
            className="window-light" style={{ animationDelay: "1.3s" }}
            fill="hsl(45 90% 65% / 0.08)" />
        </g>

        {/* ── Moderne Gebäude (Zeiss/Schott area) rechts vom Tower ── */}
        <g className="skyline-building" style={{ animationDelay: "0.4s" }}>
          {/* Zeiss HQ — modern glass facade */}
          <rect x="710" y="270" width="80" height="125" rx="2" className="fill-foreground/[0.045] dark:fill-foreground/[0.028]" />
          {/* Glass facade reflection lines */}
          {[0,1,2,3,4,5].map(row => (
            <rect key={`z${row}`} x="714" y={278 + row * 18} width="72" height="10" rx="1"
              className="window-light" style={{ animationDelay: `${1.5 + (row * 23 % 15) / 10}s` }}
              fill="hsl(var(--primary) / 0.05)" />
          ))}
          {/* Zeiss logo hint — lens shape */}
          <circle cx="750" cy="280" r="5" fill="none" stroke="hsl(var(--primary) / 0.08)" strokeWidth="1" />
        </g>

        {/* ── Ernst-Abbe-Hochhaus (historischer Turm) ── */}
        <g className="skyline-building" style={{ animationDelay: "0.35s" }}>
          <rect x="830" y="220" width="35" height="175" rx="2" className="fill-foreground/[0.05] dark:fill-foreground/[0.032]" />
          <rect x="825" y="215" width="45" height="10" rx="1" className="fill-foreground/[0.04]" />
          {[0,1,2,3,4,5,6].map(row => [0,1].map(col => (
            <rect key={`ea${row}${col}`} x={835 + col * 14} y={230 + row * 22} width="8" height="14" rx="1"
              className="window-light" style={{ animationDelay: `${2 + ((row * 2 + col) * 41 % 18) / 10}s` }}
              fill="hsl(var(--primary) / 0.06)" />
          )))}
        </g>

        {/* ── Weitere Wohngebäude rechts ── */}
        <g className="skyline-building" style={{ animationDelay: "0.55s" }}>
          <rect x="910" y="320" width="65" height="75" rx="2" className="fill-foreground/[0.04] dark:fill-foreground/[0.025]" />
          <polygon points="908,320 942,295 977,320" className="fill-foreground/[0.035] dark:fill-foreground/[0.02]" />
          {[0,1,2].map(row => [0,1,2].map(col => (
            <rect key={`r${row}${col}`} x={918 + col * 17} y={330 + row * 20} width="10" height="12" rx="1"
              className="window-light" style={{ animationDelay: `${2.2 + ((row * 3 + col) * 29 % 18) / 10}s` }}
              fill="hsl(var(--primary) / 0.06)" />
          )))}
        </g>

        <g className="skyline-building" style={{ animationDelay: "0.6s" }}>
          <rect x="1010" y="330" width="55" height="65" rx="2" className="fill-foreground/[0.035] dark:fill-foreground/[0.022]" />
          <rect x="1080" y="310" width="70" height="85" rx="2" className="fill-foreground/[0.04] dark:fill-foreground/[0.025]" />
          {[0,1,2].map(row => [0,1,2,3].map(col => (
            <rect key={`rr${row}${col}`} x={1086 + col * 15} y={318 + row * 22} width="8" height="14" rx="1"
              className="window-light" style={{ animationDelay: `${1.6 + ((row * 4 + col) * 53 % 20) / 10}s` }}
              fill="hsl(var(--primary) / 0.06)" />
          )))}
        </g>

        {/* ── Camsdorfer Brücke (bridge over Saale) ── */}
        <g className="skyline-building" style={{ animationDelay: "0.25s" }}>
          <rect x="560" y="385" width="200" height="4" rx="1" className="fill-foreground/[0.06] dark:fill-foreground/[0.04]" />
          {/* Bridge arches */}
          {[0,1,2,3].map(i => (
            <path key={`br${i}`} d={`M${568 + i * 48},389 Q${592 + i * 48},405 ${616 + i * 48},389`}
              fill="none" stroke="hsl(var(--foreground) / 0.05)" strokeWidth="1.5" />
          ))}
          {/* Bridge railings */}
          {[0,1,2,3,4,5,6,7,8].map(i => (
            <rect key={`rl${i}`} x={565 + i * 22} y="380" width="1.5" height="6" rx="0.5" className="fill-foreground/[0.04]" />
          ))}
        </g>

        {/* ── Labels ── */}
        <g className="skyline-labels">
          {/* Universität */}
          <text x="90" y="285" textAnchor="middle" className="skyline-label">
            Universität
          </text>

          {/* Stadtkirche St. Michael */}
          <text x="230" y="105" textAnchor="middle" className="skyline-label">
            St. Michael
          </text>

          {/* Planetarium */}
          <text x="480" y="260" textAnchor="middle" className="skyline-label">
            Planetarium
          </text>

          {/* JenTower */}
          <text x="645" y="16" textAnchor="middle" className="skyline-label" style={{ animationDelay: "1.2s" }}>
            JenTower
          </text>

          {/* Zeiss */}
          <text x="750" y="262" textAnchor="middle" className="skyline-label">
            Zeiss
          </text>

          {/* Ernst-Abbe-Hochhaus */}
          <text x="847" y="208" textAnchor="middle" className="skyline-label">
            Abbe-Hochhaus
          </text>

          {/* Camsdorfer Brücke */}
          <text x="660" y="410" textAnchor="middle" className="skyline-label">
            Camsdorfer Brücke
          </text>

          {/* Saale */}
          <text x="350" y="408" textAnchor="middle" className="skyline-label" style={{ fontStyle: "italic" }}>
            Saale
          </text>

          {/* Jenzig */}
          <text x="940" y="140" textAnchor="middle" className="skyline-label">
            Jenzig
          </text>

          {/* Kernberge */}
          <text x="150" y="215" textAnchor="middle" className="skyline-label">
            Kernberge
          </text>
        </g>

        {/* ── Ground / Straße ── */}
        <line x1="0" y1="395" x2="1200" y2="395"
          stroke="hsl(var(--foreground) / 0.06)" strokeWidth="1" />
      </svg>

      {/* Ground gradient fade */}
      <div className="absolute bottom-0 left-0 right-0 h-6 bg-gradient-to-t from-background to-transparent" />
    </div>
  )
}

/* ────────────────────────────────────────────────
   Login form
   ──────────────────────────────────────────────── */
function LoginContent() {
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(false)
  const [mounted, setMounted] = useState(false)
  const router = useRouter()
  const searchParams = useSearchParams()

  useEffect(() => {
    setMounted(true)
    const err = searchParams.get("error")
    if (err) setError(decodeURIComponent(err))

    fetch("/api/setup/check").then(r => r.json()).then(d => {
      if (d.db_ok && !d.has_users) router.push("/setup")
    }).catch(() => {})
  }, [])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError("")
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      })
      const data = await res.json()
      if (!res.ok) {
        setError(data.error || "Anmeldung fehlgeschlagen")
      } else {
        router.push("/select")
      }
    } catch {
      setError("Verbindungsfehler")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="relative min-h-screen flex items-center justify-center overflow-hidden p-4">
      {/* Layer 1: Animated gradient */}
      <div className="absolute inset-0 animate-gradient bg-gradient-to-br from-primary/15 via-teal-400/5 to-emerald-600/15 dark:from-primary/10 dark:via-teal-900/15 dark:to-emerald-950/20" />
      <div className="absolute inset-0 bg-background/80 dark:bg-background/85" />

      {/* Layer 2: Blueprint grid */}
      <div className="absolute inset-0 blueprint-grid opacity-[0.03] dark:opacity-[0.04]" />

      {/* Layer 3: Particles */}
      {mounted && <ParticleCanvas />}

      {/* Layer 4: Glow orbs */}
      <div className="absolute top-[10%] right-[15%] w-80 h-80 rounded-full bg-primary/8 animate-orb blur-[100px]" />
      <div className="absolute bottom-[15%] left-[10%] w-64 h-64 rounded-full bg-teal-500/8 animate-orb blur-[80px]" style={{ animationDelay: "3s" }} />
      <div className="absolute top-[50%] left-[50%] -translate-x-1/2 -translate-y-1/2 w-96 h-96 rounded-full bg-emerald-400/5 animate-orb blur-[120px]" style={{ animationDelay: "6s" }} />

      {/* Layer 5: Jena Skyline */}
      <JenaSkyline />

      {/* Layer 6: Login card */}
      <div className="relative z-10 w-full max-w-sm space-y-6 login-entrance">
        {/* Logo + Title */}
        <div className="flex flex-col items-center gap-3 text-center">
          <div className="logo-icon relative flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-primary to-teal-600 shadow-xl shadow-primary/30">
            <Building2 className="h-5 w-5 text-white absolute top-2.5 left-2.5" />
            <Car className="h-4 w-4 text-white/80 absolute bottom-2.5 right-2.5" />
            <div className="absolute inset-0 rounded-2xl bg-white/20 opacity-0 hover:opacity-100 transition-opacity duration-300" />
          </div>
          <div className="title-fade">
            <h1 className="text-2xl font-bold tracking-tight">Facility & Fuhrpark</h1>
            <p className="text-muted-foreground text-sm mt-1">Gebäude · Störungen · Fahrzeuge</p>
          </div>
        </div>

        {/* Card */}
        <Card className="card-glow border-0 shadow-2xl shadow-black/5 dark:shadow-black/30 backdrop-blur-md bg-card/90 dark:bg-card/80">
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Anmelden</CardTitle>
            <CardDescription>Bitte mit deinen Zugangsdaten anmelden.</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="email">E-Mail</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground/50" />
                  <Input
                    id="email"
                    type="email"
                    className="pl-9"
                    placeholder="admin@firma.de"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                  />
                </div>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="password">Passwort</Label>
                <div className="relative">
                  <KeyRound className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground/50" />
                  <Input
                    id="password"
                    type="password"
                    className="pl-9"
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                  />
                </div>
              </div>
              {error && (
                <p className="text-sm text-destructive bg-destructive/10 px-3 py-2 rounded-lg animate-shake">{error}</p>
              )}
              <Button type="submit" className="w-full h-10 font-medium" disabled={loading}>
                {loading ? <><Loader2 className="h-4 w-4 animate-spin" />Anmelden...</> : "Anmelden"}
              </Button>
            </form>
          </CardContent>
        </Card>

        <p className="text-center text-xs text-muted-foreground/60">
          Facility & Fuhrpark v0.2.0
        </p>
      </div>
    </div>
  )
}
