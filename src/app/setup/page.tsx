"use client"
import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Building2, Check, Loader2, ArrowRight } from "lucide-react"

export default function SetupPage() {
  const [step, setStep] = useState(0)
  const [dbOk, setDbOk] = useState(false)
  const [checking, setChecking] = useState(true)
  const [companyName, setCompanyName] = useState("")
  const [form, setForm] = useState({ name: "", email: "", password: "" })
  const [error, setError] = useState("")
  const [submitting, setSubmitting] = useState(false)
  const router = useRouter()

  useEffect(() => {
    fetch("/api/setup/check")
      .then(r => r.json())
      .then(d => {
        setDbOk(d.db_ok)
        if (d.has_users) router.push("/login")
        setChecking(false)
      })
      .catch(() => setChecking(false))
  }, [])

  async function handleFinish(e: React.FormEvent) {
    e.preventDefault()
    setSubmitting(true)
    setError("")
    try {
      const res = await fetch("/api/setup/finish", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...form, companyName }),
      })
      const data = await res.json()
      if (!res.ok) {
        setError(data.error || "Fehler beim Setup")
      } else {
        router.push("/login")
      }
    } catch {
      setError("Verbindungsfehler")
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-background to-primary/5 p-4">
      <div className="w-full max-w-md space-y-8 animate-fade-in">
        <div className="flex flex-col items-center gap-3 text-center">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary shadow-lg shadow-primary/25">
            <Building2 className="h-7 w-7 text-primary-foreground" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">Facility Management</h1>
            <p className="text-muted-foreground text-sm mt-1">Ersteinrichtung</p>
          </div>
        </div>

        {/* Steps */}
        <div className="flex items-center justify-center gap-2">
          {[0, 1, 2].map(i => (
            <div key={i} className={`h-2 rounded-full transition-all duration-300 ${step === i ? "w-8 bg-primary" : step > i ? "w-8 bg-primary/40" : "w-2 bg-muted"}`} />
          ))}
        </div>

        {/* Step 0: DB Check */}
        {step === 0 && (
          <div className="bg-card rounded-xl border p-6 shadow-lg space-y-4">
            <h2 className="font-semibold text-lg">Systemprüfung</h2>
            {checking ? (
              <div className="flex items-center gap-3 text-muted-foreground">
                <Loader2 className="h-5 w-5 animate-spin" />
                <span>Datenbankverbindung wird geprüft...</span>
              </div>
            ) : dbOk ? (
              <div className="flex items-center gap-3 text-emerald-600 dark:text-emerald-400">
                <Check className="h-5 w-5" />
                <span>Datenbank verbunden, Tabellen erstellt</span>
              </div>
            ) : (
              <p className="text-destructive text-sm">Datenbankverbindung fehlgeschlagen. Bitte .env.local prüfen.</p>
            )}
            {dbOk && (
              <button onClick={() => setStep(1)} className="w-full mt-2 inline-flex items-center justify-center gap-2 rounded-lg bg-primary text-primary-foreground h-10 px-4 text-sm font-medium hover:bg-primary/90 transition-colors">
                Weiter <ArrowRight className="h-4 w-4" />
              </button>
            )}
          </div>
        )}

        {/* Step 1: Company */}
        {step === 1 && (
          <div className="bg-card rounded-xl border p-6 shadow-lg space-y-4">
            <h2 className="font-semibold text-lg">Unternehmen</h2>
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Unternehmensname</label>
              <input
                className="flex h-10 w-full rounded-lg border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                placeholder="Mein Unternehmen"
                value={companyName}
                onChange={e => setCompanyName(e.target.value)}
              />
            </div>
            <button onClick={() => setStep(2)} className="w-full inline-flex items-center justify-center gap-2 rounded-lg bg-primary text-primary-foreground h-10 px-4 text-sm font-medium hover:bg-primary/90 transition-colors">
              Weiter <ArrowRight className="h-4 w-4" />
            </button>
          </div>
        )}

        {/* Step 2: Admin Account */}
        {step === 2 && (
          <form onSubmit={handleFinish} className="bg-card rounded-xl border p-6 shadow-lg space-y-4">
            <h2 className="font-semibold text-lg">Administrator-Konto</h2>
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Name</label>
              <input className="flex h-10 w-full rounded-lg border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} required />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium">E-Mail</label>
              <input type="email" className="flex h-10 w-full rounded-lg border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} required />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Passwort</label>
              <input type="password" className="flex h-10 w-full rounded-lg border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring" value={form.password} onChange={e => setForm(f => ({ ...f, password: e.target.value }))} required minLength={6} />
            </div>
            {error && <p className="text-sm text-destructive bg-destructive/10 px-3 py-2 rounded-lg">{error}</p>}
            <button type="submit" disabled={submitting} className="w-full inline-flex items-center justify-center gap-2 rounded-lg bg-primary text-primary-foreground h-10 px-4 text-sm font-medium hover:bg-primary/90 transition-colors disabled:opacity-50">
              {submitting ? <><Loader2 className="h-4 w-4 animate-spin" />Einrichten...</> : "Setup abschließen"}
            </button>
          </form>
        )}
      </div>
    </div>
  )
}
