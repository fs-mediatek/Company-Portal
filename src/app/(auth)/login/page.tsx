"use client"
import { useState, useEffect, Suspense } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { motion, AnimatePresence, useReducedMotion } from "framer-motion"
import { Building2, Car, KeyRound, Mail, Eye, EyeClosed, ArrowRight, Loader2 } from "lucide-react"
import { Sparkles } from "@/components/ui/sparkles"
import { VerticalCutReveal } from "@/components/ui/vertical-cut-reveal"

export default function LoginPage() {
  return (
    <Suspense>
      <LoginContent />
    </Suspense>
  )
}

function LoginContent() {
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(false)
  const [mounted, setMounted] = useState(false)
  const [focusedInput, setFocusedInput] = useState<string | null>(null)
  const [msStatus, setMsStatus] = useState<{ show_microsoft: boolean; show_password: boolean }>({ show_microsoft: false, show_password: true })
  const [branding, setBranding] = useState({ app_name: "Facility & Fuhrpark", tagline: "Gebäude · Störungen · Fahrzeuge", copyright: "© ÜAG gGmbH", email_placeholder: "admin@firma.de" })
  const router = useRouter()
  const searchParams = useSearchParams()
  const shouldReduceMotion = useReducedMotion()

  useEffect(() => {
    setMounted(true)
    const err = searchParams.get("error")
    if (err) setError(decodeURIComponent(err))
    fetch("/api/setup/check").then(r => r.json()).then(d => {
      if (d.db_ok && !d.has_users) router.push("/setup")
    }).catch(() => {})
    // Load branding (public endpoint, no auth needed)
    fetch("/api/branding").then(r => r.json()).then(d => {
      if (d && !d.error) setBranding({
        app_name: d.branding_app_name || "Facility & Fuhrpark",
        tagline: d.branding_tagline || "Gebäude · Störungen · Fahrzeuge",
        copyright: d.branding_copyright || "© ÜAG gGmbH",
        email_placeholder: d.login_email_placeholder || "admin@firma.de",
      })
    }).catch(() => {})
    fetch("/api/auth/microsoft/status").then(r => r.json()).then(d => {
      setMsStatus({ show_microsoft: d.show_microsoft || false, show_password: d.show_password !== false })
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
    <div className="min-h-screen relative bg-background overflow-hidden flex flex-col items-center justify-center p-6">
      {/* Sparkle background */}
      {mounted && (
        <div className="absolute inset-0 h-96 overflow-hidden [mask-image:radial-gradient(50%_50%,white,transparent)]">
          <div className="absolute inset-0 bg-[linear-gradient(to_right,oklch(0.55_0.14_170_/_0.02)_1px,transparent_1px),linear-gradient(to_bottom,oklch(0.55_0.14_170_/_0.01)_1px,transparent_1px)] bg-[size:70px_80px]" />
          <Sparkles
            density={1200}
            direction="bottom"
            speed={0.8}
            color="#5eead4"
            size={1.2}
            className="absolute inset-x-0 bottom-0 h-full w-full [mask-image:radial-gradient(50%_50%,white,transparent_85%)]"
          />
        </div>
      )}

      {/* Gradient glow orb */}
      <div
        className="absolute top-0 left-[10%] right-[10%] w-[80%] h-full z-0 pointer-events-none"
        style={{
          backgroundImage: "radial-gradient(circle at center, oklch(0.55 0.14 170 / 0.15) 0%, transparent 60%)",
        }}
      />

      {/* Header */}
      <div className="text-center mb-10 relative z-10">
        <motion.div
          initial={shouldReduceMotion ? false : { opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
          className="flex items-center justify-center gap-3 mb-5"
        >
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br from-teal-500 to-emerald-600 shadow-lg shadow-teal-500/20">
            <Building2 className="h-5 w-5 text-white" />
          </div>
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 shadow-lg shadow-blue-500/20">
            <Car className="h-5 w-5 text-white" />
          </div>
        </motion.div>

        <h1 className="text-4xl font-medium text-foreground">
          <VerticalCutReveal
            splitBy="words"
            staggerDuration={0.15}
            staggerFrom="first"
            reverse={true}
            containerClassName="justify-center"
            transition={{
              type: "spring",
              stiffness: 250,
              damping: 40,
              delay: 0,
            }}
          >
            {branding.app_name}
          </VerticalCutReveal>
        </h1>

        <motion.p
          initial={shouldReduceMotion ? false : { opacity: 0, y: 8, filter: "blur(4px)" }}
          animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
          transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1], delay: 0.3 }}
          className="text-muted-foreground mt-2"
        >
          {branding.tagline}
        </motion.p>
      </div>

      {/* Login card */}
      <motion.div
        initial={shouldReduceMotion ? false : { opacity: 0, y: 30, filter: "blur(8px)" }}
        animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
        transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1], delay: 0.4 }}
        className="w-full max-w-sm relative z-10"
      >
        <div className="group relative">
          {/* Glow behind card */}
          <div
            className="absolute -inset-1 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-500 blur-xl"
            style={{ background: "radial-gradient(circle, rgba(13,148,136,0.2), transparent 70%)" }}
          />

          <div className="relative overflow-hidden rounded-2xl border bg-card p-6 transition-all duration-300 group-hover:shadow-2xl group-hover:shadow-teal-500/10">
            {/* Gradient accent top-right */}
            <div className="absolute top-0 right-0 w-40 h-40 rounded-full bg-gradient-to-br from-teal-500 to-emerald-600 opacity-[0.05] blur-2xl group-hover:opacity-[0.12] transition-opacity duration-500 -translate-y-10 translate-x-10" />

            {/* Top glow line */}
            <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-teal-500/30 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />

            <form onSubmit={handleSubmit} className="relative space-y-4">
              <div className="mb-1">
                <h2 className="text-lg font-semibold">Anmelden</h2>
                <p className="text-muted-foreground text-xs mt-0.5">Bitte mit deinen Zugangsdaten anmelden.</p>
              </div>

              {/* Email */}
              <div className="space-y-1.5">
                <label htmlFor="email" className="text-sm font-medium">E-Mail</label>
                <div className="relative">
                  <Mail className={`absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 transition-colors duration-200 ${
                    focusedInput === "email" ? "text-primary" : "text-muted-foreground/40"
                  }`} />
                  <input
                    id="email"
                    type="email"
                    placeholder={branding.email_placeholder}
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    onFocus={() => setFocusedInput("email")}
                    onBlur={() => setFocusedInput(null)}
                    required
                    className="w-full h-10 rounded-lg border border-input bg-background pl-10 pr-3 text-sm placeholder:text-muted-foreground/40 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 focus:ring-offset-background transition-all duration-200"
                  />
                </div>
              </div>

              {/* Password */}
              <div className="space-y-1.5">
                <label htmlFor="password" className="text-sm font-medium">Passwort</label>
                <div className="relative">
                  <KeyRound className={`absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 transition-colors duration-200 ${
                    focusedInput === "password" ? "text-primary" : "text-muted-foreground/40"
                  }`} />
                  <input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    placeholder="••••••••"
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    onFocus={() => setFocusedInput("password")}
                    onBlur={() => setFocusedInput(null)}
                    required
                    className="w-full h-10 rounded-lg border border-input bg-background pl-10 pr-10 text-sm placeholder:text-muted-foreground/40 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 focus:ring-offset-background transition-all duration-200"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2"
                    tabIndex={-1}
                  >
                    {showPassword
                      ? <Eye className="w-4 h-4 text-muted-foreground/40 hover:text-muted-foreground transition-colors" />
                      : <EyeClosed className="w-4 h-4 text-muted-foreground/40 hover:text-muted-foreground transition-colors" />
                    }
                  </button>
                </div>
              </div>

              {/* Error */}
              <AnimatePresence>
                {error && (
                  <motion.p
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    exit={{ opacity: 0, height: 0 }}
                    className="text-sm text-destructive bg-destructive/10 px-3 py-2 rounded-lg"
                  >
                    {error}
                  </motion.p>
                )}
              </AnimatePresence>

              {/* Submit */}
              <motion.button
                whileHover={shouldReduceMotion ? {} : { scale: 1.02 }}
                whileTap={shouldReduceMotion ? {} : { scale: 0.98 }}
                type="submit"
                disabled={loading}
                className="w-full h-10 rounded-lg bg-primary text-primary-foreground font-medium text-sm shadow-sm hover:bg-primary/90 transition-colors duration-150 flex items-center justify-center gap-1.5 disabled:opacity-50 mt-1"
              >
                {loading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <>
                    Anmelden
                    <ArrowRight className="w-3.5 h-3.5" />
                  </>
                )}
              </motion.button>

              {/* Microsoft SSO */}
              {msStatus.show_microsoft && (
                <>
                  <div className="relative flex items-center my-1">
                    <div className="flex-grow border-t border-border" />
                    <span className="mx-3 text-xs text-muted-foreground">oder</span>
                    <div className="flex-grow border-t border-border" />
                  </div>

                  <a
                    href="/api/auth/ms-login"
                    className="w-full h-10 rounded-lg border border-input bg-background hover:bg-accent text-sm font-medium flex items-center justify-center gap-2 transition-colors duration-150"
                  >
                    <svg className="h-4 w-4" viewBox="0 0 21 21" fill="none">
                      <rect x="1" y="1" width="9" height="9" fill="#f25022"/>
                      <rect x="11" y="1" width="9" height="9" fill="#7fba00"/>
                      <rect x="1" y="11" width="9" height="9" fill="#00a4ef"/>
                      <rect x="11" y="11" width="9" height="9" fill="#ffb900"/>
                    </svg>
                    Mit Microsoft anmelden
                  </a>
                </>
              )}
            </form>
          </div>
        </div>
      </motion.div>

      {/* Version */}
      <motion.p
        initial={shouldReduceMotion ? false : { opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1, duration: 0.5 }}
        className="text-xs text-muted-foreground/40 mt-10 relative z-10"
      >
        {branding.copyright}
      </motion.p>
    </div>
  )
}
