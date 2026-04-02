"use client"
import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Separator } from "@/components/ui/separator"
import { Loader2, Save, User } from "lucide-react"

export default function ProfilePage() {
  const [profile, setProfile] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({ name: "", phone: "", password: "", passwordConfirm: "" })
  const [message, setMessage] = useState("")
  const [error, setError] = useState("")

  useEffect(() => {
    fetch("/api/profile").then(r => r.json()).then(d => {
      setProfile(d)
      setForm(f => ({ ...f, name: d.name || "", phone: d.phone || "" }))
      setLoading(false)
    }).catch(() => setLoading(false))
  }, [])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setMessage("")
    setError("")

    if (form.password && form.password !== form.passwordConfirm) {
      setError("Passwörter stimmen nicht überein")
      return
    }

    setSaving(true)
    const body: any = { name: form.name, phone: form.phone }
    if (form.password) body.password = form.password

    try {
      const res = await fetch("/api/profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      })
      const data = await res.json()
      if (!res.ok) {
        setError(data.error || "Fehler")
      } else {
        setMessage("Profil gespeichert")
        setForm(f => ({ ...f, password: "", passwordConfirm: "" }))
      }
    } catch {
      setError("Verbindungsfehler")
    }
    setSaving(false)
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    )
  }

  return (
    <div className="space-y-5 animate-fade-in max-w-lg">
      <div>
        <h1 className="text-2xl font-bold">Profil</h1>
        <p className="text-muted-foreground text-sm mt-0.5">Persönliche Daten verwalten</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><User className="h-4 w-4" /> Profil bearbeiten</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <Label>Name</Label>
              <Input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} required />
            </div>
            <div className="space-y-1.5">
              <Label>E-Mail</Label>
              <Input value={profile?.email} disabled className="opacity-60" />
              <p className="text-xs text-muted-foreground">E-Mail kann nur durch einen Administrator geändert werden</p>
            </div>
            <div className="space-y-1.5">
              <Label>Telefon</Label>
              <Input value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} />
            </div>

            <Separator />

            <div className="space-y-1.5">
              <Label>Neues Passwort (optional)</Label>
              <Input type="password" value={form.password} onChange={e => setForm(f => ({ ...f, password: e.target.value }))} minLength={6} placeholder="Leer lassen wenn nicht ändern" />
            </div>
            <div className="space-y-1.5">
              <Label>Passwort bestätigen</Label>
              <Input type="password" value={form.passwordConfirm} onChange={e => setForm(f => ({ ...f, passwordConfirm: e.target.value }))} placeholder="Passwort wiederholen" />
            </div>

            {error && <p className="text-sm text-destructive bg-destructive/10 px-3 py-2 rounded-lg">{error}</p>}
            {message && <p className="text-sm text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-3 py-2 rounded-lg">{message}</p>}

            <Button type="submit" disabled={saving}>
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
              Speichern
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
