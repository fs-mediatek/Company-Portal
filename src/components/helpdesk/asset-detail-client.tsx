"use client"
import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectTrigger, SelectContent, SelectItem, SelectValue } from "@/components/ui/select"
import {
  ArrowLeft, Loader2, Monitor, Smartphone, Tablet, Pencil, Save, X,
} from "lucide-react"

const statusConfig: Record<string, { label: string; variant: any }> = {
  available: { label: "Verfügbar", variant: "success" },
  assigned: { label: "Zugewiesen", variant: "info" },
  maintenance: { label: "Wartung", variant: "warning" },
  retired: { label: "Ausgemustert", variant: "secondary" },
}

export function AssetDetailClient({ assetId }: { assetId: string }) {
  const [asset, setAsset] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [editing, setEditing] = useState(false)
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState<any>({})
  const [userRole, setUserRole] = useState("")
  const [allUsers, setAllUsers] = useState<any[]>([])
  const router = useRouter()

  async function fetchAsset() {
    try {
      const res = await fetch(`/api/helpdesk/assets/${assetId}`)
      if (res.ok) {
        const data = await res.json()
        setAsset(data)
        setForm(data)
      }
    } catch {}
    setLoading(false)
  }

  useEffect(() => {
    fetchAsset()
    fetch("/api/auth/me").then(r => r.json()).then(d => setUserRole(d.role || "")).catch(() => {})
    fetch("/api/users?limit=500").then(r => r.json()).then(d => setAllUsers(d.users || [])).catch(() => {})
  }, [assetId])

  const isPrivileged = userRole.includes("admin") || userRole.includes("agent")

  async function handleSave() {
    setSaving(true)
    await fetch(`/api/helpdesk/assets/${assetId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    })
    setSaving(false)
    setEditing(false)
    fetchAsset()
  }

  if (loading) return <div className="flex justify-center py-16"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
  if (!asset) return <div className="text-center py-16 text-muted-foreground">Gerät nicht gefunden</div>

  const sc = statusConfig[asset.status] || { label: asset.status, variant: "secondary" }
  const PlatformIcon = asset.platform === "ios" ? Tablet : asset.platform === "android" ? Smartphone : Monitor

  return (
    <div className="space-y-5 animate-fade-in max-w-4xl">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => router.push("/helpdesk/assets")}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-purple-500/10 text-purple-500">
          <PlatformIcon className="h-5 w-5" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold truncate">{asset.name}</h1>
            <Badge variant={sc.variant}>{sc.label}</Badge>
          </div>
          <p className="text-xs text-muted-foreground font-mono">{asset.asset_tag}</p>
        </div>
        {isPrivileged && !editing && (
          <Button variant="outline" size="sm" onClick={() => setEditing(true)}>
            <Pencil className="h-3.5 w-3.5 mr-1" /> Bearbeiten
          </Button>
        )}
        {editing && (
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => { setEditing(false); setForm(asset) }}>
              <X className="h-3.5 w-3.5 mr-1" /> Abbrechen
            </Button>
            <Button size="sm" onClick={handleSave} disabled={saving} className="bg-purple-600 hover:bg-purple-700">
              {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <><Save className="h-3.5 w-3.5 mr-1" /> Speichern</>}
            </Button>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Device info */}
        <Card>
          <CardHeader><CardTitle className="text-sm">Geräteinformationen</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            <Field label="Name" value={form.name} editing={editing} onChange={v => setForm({ ...form, name: v })} />
            <Field label="Hersteller" value={form.manufacturer} editing={editing} onChange={v => setForm({ ...form, manufacturer: v })} />
            <Field label="Modell" value={form.model} editing={editing} onChange={v => setForm({ ...form, model: v })} />
            <Field label="Seriennummer" value={form.serial_number} editing={editing} onChange={v => setForm({ ...form, serial_number: v })} mono />
            <Field label="Plattform" value={form.platform} editing={editing} type="select" options={[
              { value: "windows", label: "Windows" }, { value: "ios", label: "iOS" },
              { value: "android", label: "Android" }, { value: "other", label: "Sonstiges" },
            ]} onChange={v => setForm({ ...form, platform: v })} />
            <Field label="OS-Version" value={form.os_version} editing={editing} onChange={v => setForm({ ...form, os_version: v })} />
            {editing ? (
              <div className="space-y-1">
                <label className="text-xs text-muted-foreground">Status</label>
                <Select value={form.status} onValueChange={v => setForm({ ...form, status: v })}>
                  <SelectTrigger className="h-8 text-sm"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {Object.entries(statusConfig).map(([k, v]) => <SelectItem key={k} value={k}>{v.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            ) : null}
          </CardContent>
        </Card>

        {/* Assignment + Purchase */}
        <div className="space-y-5">
          <Card>
            <CardHeader><CardTitle className="text-sm">Zuweisung</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              {editing && isPrivileged ? (
                <div className="space-y-1">
                  <label className="text-xs text-muted-foreground">Zugewiesen an</label>
                  <Select value={String(form.assigned_to_user_id || "")} onValueChange={v => setForm({ ...form, assigned_to_user_id: v ? parseInt(v) : null })}>
                    <SelectTrigger className="h-8 text-sm"><SelectValue placeholder="Nicht zugewiesen" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">Nicht zugewiesen</SelectItem>
                      {allUsers.map((u: any) => <SelectItem key={u.id} value={String(u.id)}>{u.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              ) : (
                <InfoRow label="Zugewiesen an" value={asset.assigned_to_name || "Nicht zugewiesen"} />
              )}
              <InfoRow label="E-Mail (Intune)" value={asset.primary_user_email || "–"} />
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle className="text-sm">Kauf & Garantie</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              <Field label="Kaufdatum" value={form.purchase_date?.split("T")[0]} editing={editing} type="date" onChange={v => setForm({ ...form, purchase_date: v })} />
              <Field label="Kaufpreis (€)" value={form.purchase_price} editing={editing} type="number" onChange={v => setForm({ ...form, purchase_price: v })} />
              <Field label="Garantie bis" value={form.warranty_until?.split("T")[0]} editing={editing} type="date" onChange={v => setForm({ ...form, warranty_until: v })} />
              <Field label="Inbetriebnahme" value={form.commissioned_at?.split("T")[0]} editing={editing} type="date" onChange={v => setForm({ ...form, commissioned_at: v })} />
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Notes */}
      <Card>
        <CardHeader><CardTitle className="text-sm">Notizen</CardTitle></CardHeader>
        <CardContent>
          {editing ? (
            <Textarea value={form.notes || ""} onChange={e => setForm({ ...form, notes: e.target.value })} rows={4} />
          ) : (
            <p className="text-sm whitespace-pre-wrap">{asset.notes || "Keine Notizen"}</p>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

function Field({ label, value, editing, onChange, mono, type, options }: {
  label: string; value: any; editing: boolean; onChange?: (v: string) => void; mono?: boolean; type?: string;
  options?: { value: string; label: string }[]
}) {
  if (editing && onChange) {
    if (type === "select" && options) {
      return (
        <div className="space-y-1">
          <label className="text-xs text-muted-foreground">{label}</label>
          <Select value={value || ""} onValueChange={onChange}>
            <SelectTrigger className="h-8 text-sm"><SelectValue /></SelectTrigger>
            <SelectContent>
              {options.map(o => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
      )
    }
    return (
      <div className="space-y-1">
        <label className="text-xs text-muted-foreground">{label}</label>
        <Input value={value || ""} onChange={e => onChange(e.target.value)} className="h-8 text-sm" type={type || "text"} />
      </div>
    )
  }
  return <InfoRow label={label} value={value || "–"} mono={mono} />
}

function InfoRow({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="flex items-center justify-between text-sm">
      <span className="text-muted-foreground">{label}</span>
      <span className={mono ? "font-mono text-xs" : ""}>{value}</span>
    </div>
  )
}
