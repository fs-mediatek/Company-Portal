"use client"
import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Select, SelectTrigger, SelectContent, SelectItem, SelectValue } from "@/components/ui/select"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import {
  Loader2, Plus, Trash2, Save, Building2, Users, Shield, Hash, Mail, KeyRound,
  CheckCircle2, XCircle, Send, Menu, RefreshCw, Palette, Inbox, TicketCheck, MessageCircle,
  GitBranch, Play, FolderOpen, Link2, Unlink,
} from "lucide-react"
import { cn } from "@/lib/utils"

type Tab = "company" | "branding" | "smtp" | "mailpoller" | "microsoft" | "sync" | "tickets" | "departments" | "roles" | "numbering" | "navigation" | "deploy"

export function SettingsClient({ initialSettings }: { initialSettings: Record<string, string> }) {
  const [tab, setTab] = useState<Tab>("company")
  const [settings, setSettings] = useState(initialSettings)
  const [saving, setSaving] = useState(false)
  const [roles, setRoles] = useState<any[]>([])
  const [departments, setDepartments] = useState<any[]>([])
  const [testMailResult, setTestMailResult] = useState<{ ok: boolean; msg: string } | null>(null)
  const [testingMail, setTestingMail] = useState(false)

  const [navConfig, setNavConfig] = useState<Record<string, string[]>>({})
  const [navSaving, setNavSaving] = useState(false)

  const [showRoleDialog, setShowRoleDialog] = useState(false)
  const [roleForm, setRoleForm] = useState({ name: "", label: "", color: "gray" })

  const [showDeptDialog, setShowDeptDialog] = useState(false)
  const [deptForm, setDeptForm] = useState({ name: "", display_name: "", parent_id: "" })

  const [deployLog, setDeployLog] = useState<string>("")
  const [deploying, setDeploying] = useState(false)

  const [spSites, setSpSites] = useState<any[]>([])
  const [spLoading, setSpLoading] = useState(false)
  const [spForm, setSpForm] = useState({ name: "", site_url: "", drive_name: "Dokumente", base_folder: "", description: "" })
  const [spAdding, setSpAdding] = useState(false)
  const [spTestResults, setSpTestResults] = useState<Record<number, { ok: boolean; message: string }>>({})
  const [spTesting, setSpTesting] = useState<number | null>(null)

  useEffect(() => {
    fetch("/api/roles").then(r => r.json()).then(d => setRoles(Array.isArray(d) ? d : [])).catch(() => {})
    fetch("/api/departments").then(r => r.json()).then(d => setDepartments(Array.isArray(d) ? d : [])).catch(() => {})
    fetch("/api/settings/nav").then(r => r.json()).then(d => { if (d && typeof d === "object" && !d.error) setNavConfig(d) }).catch(() => {})
  }, [])

  async function saveSettings(updates: Record<string, string>) {
    setSaving(true)
    await fetch("/api/settings", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(updates) })
    setSettings(s => ({ ...s, ...updates }))
    setSaving(false)
  }

  async function testMail() {
    setTestingMail(true)
    setTestMailResult(null)
    try {
      const res = await fetch("/api/settings/test-mail", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({}) })
      const data = await res.json()
      setTestMailResult(res.ok ? { ok: true, msg: `Gesendet an ${data.sent_to}` } : { ok: false, msg: data.error })
    } catch (e: any) {
      setTestMailResult({ ok: false, msg: e.message })
    }
    setTestingMail(false)
  }

  async function saveRole(e: React.FormEvent) {
    e.preventDefault()
    await fetch("/api/roles", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(roleForm) })
    setShowRoleDialog(false)
    setRoles(await (await fetch("/api/roles")).json())
  }

  async function saveDept(e: React.FormEvent) {
    e.preventDefault()
    await fetch("/api/departments", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: deptForm.name, display_name: deptForm.display_name || deptForm.name, parent_id: deptForm.parent_id ? parseInt(deptForm.parent_id) : null }),
    })
    setShowDeptDialog(false)
    setDepartments(await (await fetch("/api/departments")).json())
  }

  function updateSetting(key: string, value: string) {
    setSettings(s => ({ ...s, [key]: value }))
  }

  async function startDeploy() {
    setDeploying(true)
    setDeployLog("")
    try {
      const res = await fetch("/api/admin/deploy", { method: "POST" })
      if (!res.body) throw new Error("Kein Stream")
      const reader = res.body.getReader()
      const decoder = new TextDecoder()
      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        setDeployLog(prev => prev + decoder.decode(value))
      }
    } catch (e: any) {
      setDeployLog(prev => prev + `\n[Fehler] ${e.message}`)
    }
    setDeploying(false)
  }

  const tabs: { key: Tab; label: string; icon: any }[] = [
    { key: "company", label: "Unternehmen", icon: Building2 },
    { key: "branding", label: "Branding", icon: Palette },
    { key: "smtp", label: "E-Mail (SMTP)", icon: Mail },
    { key: "mailpoller", label: "E-Mail-Empfang", icon: Inbox },
    { key: "microsoft", label: "Microsoft 365", icon: KeyRound },
    { key: "sync", label: "Synchronisation", icon: RefreshCw },
    { key: "tickets", label: "Tickets & Aufträge", icon: TicketCheck },
    { key: "departments", label: "Abteilungen", icon: Users },
    { key: "roles", label: "Rollen", icon: Shield },
    { key: "numbering", label: "Nummerierung", icon: Hash },
    { key: "navigation", label: "Navigation", icon: Menu },
    { key: "sharepoint", label: "SharePoint", icon: FolderOpen },
    { key: "deploy", label: "Updates", icon: GitBranch },
  ]

  return (
    <div className="space-y-5 animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold">Einstellungen</h1>
        <p className="text-muted-foreground text-sm mt-0.5">Zentrale Konfiguration für alle Bereiche</p>
      </div>

      <div className="flex flex-col md:flex-row gap-6">
        <nav className="md:w-48 flex md:flex-col gap-1 overflow-x-auto shrink-0">
          {tabs.map(t => {
            const Icon = t.icon
            return (
              <button key={t.key} onClick={() => setTab(t.key)} className={cn(
                "flex items-center gap-2 rounded-lg px-3 py-2 text-sm whitespace-nowrap transition-colors",
                tab === t.key ? "bg-primary/10 text-primary font-medium" : "text-muted-foreground hover:bg-accent"
              )}>
                <Icon className="h-4 w-4 shrink-0" /> {t.label}
              </button>
            )
          })}
        </nav>

        <div className="flex-1 min-w-0">
          {/* ── Company ── */}
          {tab === "company" && (
            <Card>
              <CardHeader><CardTitle>Unternehmen</CardTitle></CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-1.5 max-w-sm">
                  <Label>Unternehmensname</Label>
                  <Input value={settings.company_name || ""} onChange={e => updateSetting("company_name", e.target.value)} />
                </div>
                <div className="space-y-1.5 max-w-sm">
                  <Label>App-URL (für E-Mail-Links)</Label>
                  <Input value={settings.app_url || ""} onChange={e => updateSetting("app_url", e.target.value)} placeholder="https://portal.firma.de" />
                </div>
                <Button onClick={() => saveSettings({ company_name: settings.company_name || "", app_url: settings.app_url || "" })} disabled={saving}>
                  {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />} Speichern
                </Button>
              </CardContent>
            </Card>
          )}

          {/* ── Branding ── */}
          {tab === "branding" && (
            <Card>
              <CardHeader><CardTitle>Branding & Darstellung</CardTitle></CardHeader>
              <CardContent className="space-y-4 max-w-lg">
                <div className="space-y-1.5">
                  <Label>App-Name</Label>
                  <Input value={settings.branding_app_name || ""} onChange={e => updateSetting("branding_app_name", e.target.value)} placeholder="Facility & Fuhrpark" />
                  <p className="text-xs text-muted-foreground">Wird auf Login- und Auswahlseite angezeigt</p>
                </div>
                <div className="space-y-1.5">
                  <Label>Untertitel</Label>
                  <Input value={settings.branding_tagline || ""} onChange={e => updateSetting("branding_tagline", e.target.value)} placeholder="Gebäude · Störungen · Fahrzeuge" />
                </div>
                <div className="space-y-1.5">
                  <Label>Copyright-Zeile</Label>
                  <Input value={settings.branding_copyright || ""} onChange={e => updateSetting("branding_copyright", e.target.value)} placeholder="© ÜAG gGmbH" />
                </div>
                <div className="space-y-1.5">
                  <Label>Login E-Mail Platzhalter</Label>
                  <Input value={settings.login_email_placeholder || ""} onChange={e => updateSetting("login_email_placeholder", e.target.value)} placeholder="admin@firma.de" />
                </div>
                <div className="flex items-center gap-3">
                  <Label className="flex items-center gap-2">
                    <input type="checkbox" checked={settings.chatbot_enabled !== "false"} onChange={e => updateSetting("chatbot_enabled", e.target.checked ? "true" : "false")} className="h-4 w-4 rounded border-input" />
                    Chatbot-Widget aktivieren
                  </Label>
                </div>
                <Button onClick={() => saveSettings({
                  branding_app_name: settings.branding_app_name || "", branding_tagline: settings.branding_tagline || "",
                  branding_copyright: settings.branding_copyright || "", login_email_placeholder: settings.login_email_placeholder || "",
                  chatbot_enabled: settings.chatbot_enabled || "true",
                })} disabled={saving}>
                  {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />} Speichern
                </Button>
              </CardContent>
            </Card>
          )}

          {/* ── SMTP ── */}
          {tab === "smtp" && (
            <Card>
              <CardHeader><CardTitle>E-Mail-Versand (SMTP)</CardTitle></CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-lg">
                  <div className="space-y-1.5">
                    <Label>SMTP-Host</Label>
                    <Input value={settings.smtp_host || ""} onChange={e => updateSetting("smtp_host", e.target.value)} placeholder="mail.firma.de" />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Port</Label>
                    <Input value={settings.smtp_port || ""} onChange={e => updateSetting("smtp_port", e.target.value)} placeholder="587" />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Benutzername</Label>
                    <Input value={settings.smtp_user || ""} onChange={e => updateSetting("smtp_user", e.target.value)} />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Passwort</Label>
                    <Input type="password" value={settings.smtp_pass || ""} onChange={e => updateSetting("smtp_pass", e.target.value)} />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Absender-Adresse</Label>
                    <Input value={settings.smtp_from || ""} onChange={e => updateSetting("smtp_from", e.target.value)} placeholder="portal@firma.de" />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Verschlüsselung</Label>
                    <Select value={settings.smtp_secure || "none"} onValueChange={v => updateSetting("smtp_secure", v)}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">Keine</SelectItem>
                        <SelectItem value="starttls">STARTTLS</SelectItem>
                        <SelectItem value="ssl">SSL/TLS</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="flex items-center gap-3 pt-2">
                  <Button onClick={() => saveSettings({
                    smtp_host: settings.smtp_host || "", smtp_port: settings.smtp_port || "", smtp_user: settings.smtp_user || "",
                    smtp_pass: settings.smtp_pass || "", smtp_from: settings.smtp_from || "", smtp_secure: settings.smtp_secure || "none",
                  })} disabled={saving}>
                    {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />} Speichern
                  </Button>
                  <Button variant="outline" onClick={testMail} disabled={testingMail}>
                    {testingMail ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />} Test-Mail senden
                  </Button>
                  {testMailResult && (
                    <span className={cn("text-sm flex items-center gap-1", testMailResult.ok ? "text-emerald-500" : "text-destructive")}>
                      {testMailResult.ok ? <CheckCircle2 className="h-4 w-4" /> : <XCircle className="h-4 w-4" />}
                      {testMailResult.msg}
                    </span>
                  )}
                </div>
              </CardContent>
            </Card>
          )}

          {/* ── Mail Poller ── */}
          {tab === "mailpoller" && (
            <Card>
              <CardHeader><CardTitle>E-Mail-Empfang (Mail-to-Ticket)</CardTitle></CardHeader>
              <CardContent className="space-y-4 max-w-lg">
                <p className="text-sm text-muted-foreground">Eingehende E-Mails werden automatisch als Tickets angelegt. Erfordert MS365-Konfiguration.</p>
                <div className="flex items-center gap-3">
                  <Label className="flex items-center gap-2">
                    <input type="checkbox" checked={settings.mail_poll_enabled === "true"} onChange={e => updateSetting("mail_poll_enabled", e.target.checked ? "true" : "false")} className="h-4 w-4 rounded border-input" />
                    E-Mail-Polling aktivieren
                  </Label>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label>Mailbox / Postfach</Label>
                    <Input value={settings.mail_poll_mailbox || settings.ms_mailbox || ""} onChange={e => updateSetting("mail_poll_mailbox", e.target.value)} placeholder="servicedesk@firma.de" />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Ziel-Bereich</Label>
                    <select value={settings.mail_poll_area || "helpdesk"} onChange={e => updateSetting("mail_poll_area", e.target.value)} className="flex h-10 w-full rounded-lg border border-input bg-background px-3 text-sm">
                      <option value="helpdesk">IT-Helpdesk</option>
                      <option value="facility">Facility</option>
                    </select>
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-4">
                  <div className="space-y-1.5">
                    <Label>Intervall (Sekunden)</Label>
                    <Input type="number" value={settings.mail_poll_interval_sec || "60"} onChange={e => updateSetting("mail_poll_interval_sec", e.target.value)} />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Max. E-Mails pro Lauf</Label>
                    <Input type="number" value={settings.mail_poll_max_messages || "10"} onChange={e => updateSetting("mail_poll_max_messages", e.target.value)} />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Standard-Kategorie</Label>
                    <Input value={settings.mail_poll_default_category || "E-Mail"} onChange={e => updateSetting("mail_poll_default_category", e.target.value)} />
                  </div>
                </div>
                <Button onClick={() => saveSettings({
                  mail_poll_enabled: settings.mail_poll_enabled || "false",
                  mail_poll_mailbox: settings.mail_poll_mailbox || "",
                  mail_poll_area: settings.mail_poll_area || "helpdesk",
                  mail_poll_interval_sec: settings.mail_poll_interval_sec || "60",
                  mail_poll_max_messages: settings.mail_poll_max_messages || "10",
                  mail_poll_default_category: settings.mail_poll_default_category || "E-Mail",
                })} disabled={saving}>
                  {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />} Speichern
                </Button>
              </CardContent>
            </Card>
          )}

          {/* ── Microsoft 365 ── */}
          {tab === "microsoft" && (
            <Card>
              <CardHeader><CardTitle>Microsoft 365 SSO</CardTitle></CardHeader>
              <CardContent className="space-y-4">
                <p className="text-sm text-muted-foreground">Azure AD App-Registrierung für Single Sign-On. Redirect-URI: <code className="text-xs bg-muted px-1.5 py-0.5 rounded">{settings.app_url || "http://..."}/api/auth/microsoft/callback</code></p>
                <div className="grid grid-cols-1 gap-4 max-w-lg">
                  <div className="space-y-1.5">
                    <Label>Tenant ID</Label>
                    <Input value={settings.ms_tenant_id || ""} onChange={e => updateSetting("ms_tenant_id", e.target.value)} placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx" />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Client ID</Label>
                    <Input value={settings.ms_client_id || ""} onChange={e => updateSetting("ms_client_id", e.target.value)} />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Client Secret</Label>
                    <Input type="password" value={settings.ms_client_secret || ""} onChange={e => updateSetting("ms_client_secret", e.target.value)} />
                  </div>
                  <div className="flex items-center gap-3">
                    <Label className="flex items-center gap-2">
                      <input type="checkbox" checked={settings.ms_login_enabled === "true"} onChange={e => updateSetting("ms_login_enabled", e.target.checked ? "true" : "false")}
                        className="h-4 w-4 rounded border-input" />
                      Microsoft-Login aktivieren
                    </Label>
                  </div>
                </div>
                <Button onClick={() => saveSettings({
                  ms_tenant_id: settings.ms_tenant_id || "", ms_client_id: settings.ms_client_id || "",
                  ms_client_secret: settings.ms_client_secret || "", ms_login_enabled: settings.ms_login_enabled || "false",
                })} disabled={saving}>
                  {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />} Speichern
                </Button>
              </CardContent>
            </Card>
          )}

          {/* ── Sync ── */}
          {tab === "sync" && (
            <SyncTab />
          )}

          {/* ── Tickets & Aufträge ── */}
          {tab === "tickets" && (
            <Card>
              <CardHeader><CardTitle>Tickets & Aufträge</CardTitle></CardHeader>
              <CardContent className="space-y-5 max-w-lg">
                <h3 className="text-sm font-semibold">IT-Helpdesk</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label>Ticket-Prefix</Label>
                    <Input value={settings.ticket_prefix_helpdesk || "IT"} onChange={e => updateSetting("ticket_prefix_helpdesk", e.target.value)} />
                    <p className="text-xs text-muted-foreground">Ergebnis: {settings.ticket_prefix_helpdesk || "IT"}-2026-0001</p>
                  </div>
                  <div className="space-y-1.5">
                    <Label>Auftrags-Prefix</Label>
                    <Input value={settings.order_prefix_helpdesk || "ORD-IT"} onChange={e => updateSetting("order_prefix_helpdesk", e.target.value)} />
                    <p className="text-xs text-muted-foreground">Ergebnis: {settings.order_prefix_helpdesk || "ORD-IT"}-2026-0001</p>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label>Standard-Priorität</Label>
                    <select value={settings.helpdesk_default_priority || "medium"} onChange={e => updateSetting("helpdesk_default_priority", e.target.value)} className="flex h-10 w-full rounded-lg border border-input bg-background px-3 text-sm">
                      <option value="low">Niedrig</option><option value="medium">Mittel</option><option value="high">Hoch</option><option value="critical">Kritisch</option>
                    </select>
                  </div>
                  <div className="space-y-1.5">
                    <Label>Standard-Kategorie</Label>
                    <Input value={settings.helpdesk_default_category || "Sonstiges"} onChange={e => updateSetting("helpdesk_default_category", e.target.value)} />
                  </div>
                </div>

                <div className="border-t pt-4">
                  <h3 className="text-sm font-semibold mb-3">Facility</h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <Label>Ticket-Prefix</Label>
                      <Input value={settings.ticket_number_prefix || "FM"} onChange={e => updateSetting("ticket_number_prefix", e.target.value)} />
                      <p className="text-xs text-muted-foreground">Ergebnis: {settings.ticket_number_prefix || "FM"}-2026-0001</p>
                    </div>
                  </div>
                </div>

                <div className="border-t pt-4">
                  <h3 className="text-sm font-semibold mb-3">Assets</h3>
                  <div className="space-y-1.5">
                    <Label>Asset-Tag-Prefix</Label>
                    <Input value={settings.asset_tag_prefix || "AST"} onChange={e => updateSetting("asset_tag_prefix", e.target.value)} />
                    <p className="text-xs text-muted-foreground">Ergebnis: {settings.asset_tag_prefix || "AST"}-XXXXXXX</p>
                  </div>
                </div>

                <div className="border-t pt-4">
                  <h3 className="text-sm font-semibold mb-3">Auto-Zuweisung</h3>
                  <div className="flex items-center gap-3 mb-3">
                    <Label className="flex items-center gap-2">
                      <input type="checkbox" checked={settings.auto_assign_enabled === "true"} onChange={e => updateSetting("auto_assign_enabled", e.target.checked ? "true" : "false")} className="h-4 w-4 rounded border-input" />
                      Auto-Zuweisung aktivieren
                    </Label>
                  </div>
                  <div className="flex items-center gap-3">
                    <Label className="flex items-center gap-2">
                      <input type="checkbox" checked={settings.auto_assign_round_robin === "true"} onChange={e => updateSetting("auto_assign_round_robin", e.target.checked ? "true" : "false")} className="h-4 w-4 rounded border-input" />
                      Round-Robin Fallback (Agent mit wenigsten offenen Tickets)
                    </Label>
                  </div>
                </div>

                <Button onClick={() => saveSettings({
                  ticket_prefix_helpdesk: settings.ticket_prefix_helpdesk || "IT",
                  order_prefix_helpdesk: settings.order_prefix_helpdesk || "ORD-IT",
                  helpdesk_default_priority: settings.helpdesk_default_priority || "medium",
                  helpdesk_default_category: settings.helpdesk_default_category || "Sonstiges",
                  ticket_number_prefix: settings.ticket_number_prefix || "FM",
                  asset_tag_prefix: settings.asset_tag_prefix || "AST",
                  auto_assign_enabled: settings.auto_assign_enabled || "false",
                  auto_assign_round_robin: settings.auto_assign_round_robin || "false",
                })} disabled={saving}>
                  {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />} Speichern
                </Button>
              </CardContent>
            </Card>
          )}

          {/* ── Departments ── */}
          {tab === "departments" && (
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle>Abteilungen</CardTitle>
                <Button size="sm" onClick={() => { setDeptForm({ name: "", display_name: "", parent_id: "" }); setShowDeptDialog(true) }}>
                  <Plus className="h-4 w-4" /> Neue Abteilung
                </Button>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {departments.map((d: any) => (
                    <div key={d.id} className="flex items-center justify-between rounded-lg border p-3">
                      <div>
                        <p className="font-medium text-sm">{d.display_name || d.name}</p>
                        <p className="text-xs text-muted-foreground">{d.name}</p>
                      </div>
                    </div>
                  ))}
                  {departments.length === 0 && <p className="text-sm text-muted-foreground text-center py-4">Keine Abteilungen</p>}
                </div>
              </CardContent>
            </Card>
          )}

          {/* ── Roles ── */}
          {tab === "roles" && (
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle>Rollen</CardTitle>
                <Button size="sm" onClick={() => { setRoleForm({ name: "", label: "", color: "gray" }); setShowRoleDialog(true) }}>
                  <Plus className="h-4 w-4" /> Neue Rolle
                </Button>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {roles.map((r: any) => (
                    <div key={r.name || r.id} className="flex items-center justify-between rounded-lg border p-3">
                      <div className="flex items-center gap-3">
                        <Badge variant="outline">{r.label}</Badge>
                        <span className="text-xs font-mono text-muted-foreground">{r.name}</span>
                        {r.is_builtin ? <Badge variant="secondary" className="text-[10px]">Standard</Badge> : null}
                      </div>
                      {r.name !== "admin" && (
                        <button onClick={async () => {
                          if (!confirm(`Rolle "${r.label}" wirklich löschen?`)) return
                          await fetch(`/api/roles/${r.name}`, { method: "DELETE" })
                          setRoles(await (await fetch("/api/roles")).json())
                        }} className="p-1.5 rounded-lg hover:bg-accent transition-colors">
                          <Trash2 className="h-4 w-4 text-muted-foreground" />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* ── Numbering ── */}
          {tab === "numbering" && (
            <Card>
              <CardHeader><CardTitle>Ticket-Nummerierung</CardTitle></CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-1.5 max-w-xs">
                  <Label>Facility-Prefix</Label>
                  <Input value={settings.ticket_number_prefix || "FM"} onChange={e => updateSetting("ticket_number_prefix", e.target.value)} placeholder="FM" />
                  <p className="text-xs text-muted-foreground">Beispiel: {settings.ticket_number_prefix || "FM"}-2026-0001</p>
                </div>
                <p className="text-xs text-muted-foreground">IT-Helpdesk: IT-2026-XXXX (fest)</p>
                <Button onClick={() => saveSettings({ ticket_number_prefix: settings.ticket_number_prefix || "FM" })} disabled={saving}>
                  {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />} Speichern
                </Button>
              </CardContent>
            </Card>
          )}

          {/* ── Navigation ── */}
          {tab === "navigation" && (
            <NavConfigEditor
              navConfig={navConfig}
              setNavConfig={setNavConfig}
              roles={roles}
              saving={navSaving}
              onSave={async () => {
                setNavSaving(true)
                await fetch("/api/settings/nav", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(navConfig) })
                setNavSaving(false)
              }}
            />
          )}

          {/* ── SharePoint ── */}
          {tab === "sharepoint" && (
            <SharePointTab
              sites={spSites}
              setSites={setSpSites}
              loading={spLoading}
              setLoading={setSpLoading}
              form={spForm}
              setForm={setSpForm}
              adding={spAdding}
              setAdding={setSpAdding}
              testResults={spTestResults}
              setTestResults={setSpTestResults}
              testing={spTesting}
              setTesting={setSpTesting}
            />
          )}

          {/* ── Updates / Deploy ── */}
          {tab === "deploy" && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <GitBranch className="h-4 w-4" />
                  Updates einspielen
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-sm text-muted-foreground">
                  Zieht den aktuellen Stand aus dem GitHub-Repository, baut die Anwendung neu und startet sie.
                </p>
                <Button onClick={startDeploy} disabled={deploying} className="gap-2">
                  {deploying ? <Loader2 className="h-4 w-4 animate-spin" /> : <Play className="h-4 w-4" />}
                  {deploying ? "Wird deployed…" : "Deploy starten"}
                </Button>
                {(deployLog || deploying) && (
                  <pre className="mt-2 max-h-96 overflow-auto rounded-md bg-black p-4 text-xs text-green-400 whitespace-pre-wrap font-mono">
                    {deployLog || "Starte…"}
                  </pre>
                )}
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      {/* Role Dialog */}
      <Dialog open={showRoleDialog} onOpenChange={setShowRoleDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader><DialogTitle>Neue Rolle</DialogTitle></DialogHeader>
          <form onSubmit={saveRole} className="space-y-4">
            <div className="space-y-1.5"><Label>Schlüssel</Label><Input value={roleForm.name} onChange={e => setRoleForm(f => ({ ...f, name: e.target.value }))} required placeholder="z.B. elektriker" /></div>
            <div className="space-y-1.5"><Label>Anzeigename</Label><Input value={roleForm.label} onChange={e => setRoleForm(f => ({ ...f, label: e.target.value }))} required placeholder="z.B. Elektriker" /></div>
            <DialogFooter><Button type="button" variant="outline" onClick={() => setShowRoleDialog(false)}>Abbrechen</Button><Button type="submit">Erstellen</Button></DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Department Dialog */}
      <Dialog open={showDeptDialog} onOpenChange={setShowDeptDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader><DialogTitle>Neue Abteilung</DialogTitle></DialogHeader>
          <form onSubmit={saveDept} className="space-y-4">
            <div className="space-y-1.5"><Label>Kurzname</Label><Input value={deptForm.name} onChange={e => setDeptForm(f => ({ ...f, name: e.target.value }))} required placeholder="z.B. it" /></div>
            <div className="space-y-1.5"><Label>Anzeigename</Label><Input value={deptForm.display_name} onChange={e => setDeptForm(f => ({ ...f, display_name: e.target.value }))} placeholder="z.B. IT-Abteilung" /></div>
            <div className="space-y-1.5">
              <Label>Übergeordnet</Label>
              <Select value={deptForm.parent_id || "none"} onValueChange={v => setDeptForm(f => ({ ...f, parent_id: v === "none" ? "" : v }))}>
                <SelectTrigger><SelectValue placeholder="Keine" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Keine</SelectItem>
                  {departments.map(d => <SelectItem key={d.id} value={String(d.id)}>{d.display_name || d.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <DialogFooter><Button type="button" variant="outline" onClick={() => setShowDeptDialog(false)}>Abbrechen</Button><Button type="submit">Erstellen</Button></DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}

// ── Nav Config Editor Component ──

const ALL_NAV_ITEMS = [
  { section: "Facility", items: [
    { key: "dashboard", label: "Dashboard" },
    { key: "tickets", label: "Störungsmeldungen" },
    { key: "locations", label: "Standorte" },
    { key: "commissions", label: "Kommissionierung" },
    { key: "billing", label: "Abrechnung" },
    { key: "sla", label: "SLA & Zuweisung" },
  ]},
  { section: "Fuhrpark", items: [
    { key: "fleet-dashboard", label: "Dashboard" },
    { key: "vehicles", label: "Fahrzeuge" },
  ]},
  { section: "IT-Helpdesk", items: [
    { key: "hd-dashboard", label: "Dashboard" },
    { key: "hd-tickets", label: "Tickets" },
    { key: "hd-assets", label: "Geräte" },
    { key: "hd-mydevices", label: "Meine Geräte" },
    { key: "hd-kb", label: "Wissensdatenbank" },
    { key: "hd-sla", label: "SLA & Zuweisung" },
  ]},
  { section: "Schulungen", items: [
    { key: "tc-dashboard", label: "Dashboard" },
    { key: "tc-modules", label: "Schulungsmodule" },
    { key: "tc-reports", label: "Berichte" },
  ]},
  { section: "Übergreifend", items: [
    { key: "users", label: "Benutzer" },
    { key: "settings", label: "Einstellungen" },
  ]},
]

function SharePointTab({ sites, setSites, loading, setLoading, form, setForm, adding, setAdding, testResults, setTestResults, testing, setTesting }: any) {
  useEffect(() => {
    setLoading(true)
    fetch("/api/sharepoint/sites").then(r => r.json()).then(d => setSites(Array.isArray(d) ? d : [])).catch(() => {}).finally(() => setLoading(false))
  }, [])

  async function addSite(e: React.FormEvent) {
    e.preventDefault()
    setAdding(true)
    const res = await fetch("/api/sharepoint/sites", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(form) })
    if (res.ok) {
      setForm({ name: "", site_url: "", drive_name: "Dokumente", base_folder: "", description: "" })
      const updated = await fetch("/api/sharepoint/sites").then(r => r.json())
      setSites(Array.isArray(updated) ? updated : [])
    }
    setAdding(false)
  }

  async function deleteSite(id: number) {
    await fetch(`/api/sharepoint/sites/${id}`, { method: "DELETE" })
    setSites((s: any[]) => s.filter(x => x.id !== id))
  }

  async function testSite(id: number) {
    setTesting(id)
    const res = await fetch(`/api/sharepoint/sites/${id}`, { method: "POST" })
    const data = await res.json()
    setTestResults((r: any) => ({ ...r, [id]: data }))
    setTesting(null)
  }

  return (
    <div className="space-y-5">
      <Card>
        <CardHeader><CardTitle className="flex items-center gap-2"><FolderOpen className="h-4 w-4" />SharePoint-Sites</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">Verwalte SharePoint-Sites für die Dokumentenablage. Jedes Fahrzeug kann einer Site zugewiesen werden.</p>
          {loading ? (
            <div className="flex justify-center py-6"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>
          ) : sites.length === 0 ? (
            <p className="text-sm text-muted-foreground py-4 text-center">Noch keine Sites konfiguriert.</p>
          ) : (
            <div className="divide-y divide-border/50">
              {sites.map((site: any) => (
                <div key={site.id} className="py-3 flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-sm">{site.name}</span>
                      {!site.active && <Badge variant="secondary">Inaktiv</Badge>}
                    </div>
                    <p className="text-xs text-muted-foreground truncate">{site.site_url}</p>
                    <p className="text-xs text-muted-foreground">Library: {site.drive_name}{site.base_folder ? ` · Ordner: ${site.base_folder}` : ""}</p>
                    {testResults[site.id] && (
                      <p className={`text-xs mt-1 ${testResults[site.id].ok ? "text-emerald-600" : "text-red-600"}`}>{testResults[site.id].message}</p>
                    )}
                  </div>
                  <div className="flex gap-2 shrink-0">
                    <Button size="sm" variant="outline" onClick={() => testSite(site.id)} disabled={testing === site.id} className="gap-1">
                      {testing === site.id ? <Loader2 className="h-3 w-3 animate-spin" /> : <Link2 className="h-3 w-3" />}
                      Testen
                    </Button>
                    <Button size="sm" variant="ghost" onClick={() => deleteSite(site.id)}><Trash2 className="h-3.5 w-3.5 text-destructive" /></Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Neue Site hinzufügen</CardTitle></CardHeader>
        <CardContent>
          <form onSubmit={addSite} className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5"><Label>Name</Label><Input value={form.name} onChange={e => setForm((f: any) => ({ ...f, name: e.target.value }))} required placeholder="z.B. ÜAG SharePoint" /></div>
              <div className="space-y-1.5"><Label>Site-URL</Label><Input value={form.site_url} onChange={e => setForm((f: any) => ({ ...f, site_url: e.target.value }))} required placeholder="https://contoso.sharepoint.com/sites/..." /></div>
              <div className="space-y-1.5"><Label>Document Library</Label><Input value={form.drive_name} onChange={e => setForm((f: any) => ({ ...f, drive_name: e.target.value }))} placeholder="Dokumente" /></div>
              <div className="space-y-1.5"><Label>Basis-Ordner (optional)</Label><Input value={form.base_folder} onChange={e => setForm((f: any) => ({ ...f, base_folder: e.target.value }))} placeholder="z.B. Fuhrpark" /></div>
            </div>
            <div className="space-y-1.5"><Label>Beschreibung (optional)</Label><Input value={form.description} onChange={e => setForm((f: any) => ({ ...f, description: e.target.value }))} placeholder="Optionale Beschreibung" /></div>
            <Button type="submit" disabled={adding} className="gap-2">{adding ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}Site hinzufügen</Button>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}

function SyncTab() {
  const [entraStatus, setEntraStatus] = useState<any>(null)
  const [intuneStatus, setIntuneStatus] = useState<any>(null)
  const [syncing, setSyncing] = useState<string | null>(null)
  const [result, setResult] = useState<{ type: string; data: any } | null>(null)

  useEffect(() => {
    fetch("/api/sync/entra").then(r => r.json()).then(setEntraStatus).catch(() => {})
    fetch("/api/sync/intune").then(r => r.json()).then(setIntuneStatus).catch(() => {})
  }, [])

  async function runSync(type: "entra" | "intune") {
    setSyncing(type)
    setResult(null)
    try {
      const res = await fetch(`/api/sync/${type}`, { method: "POST" })
      const data = await res.json()
      setResult({ type, data })
      // Refresh status
      if (type === "entra") setEntraStatus(await (await fetch("/api/sync/entra")).json())
      else setIntuneStatus(await (await fetch("/api/sync/intune")).json())
    } catch (err: any) {
      setResult({ type, data: { error: err.message } })
    }
    setSyncing(null)
  }

  return (
    <div className="space-y-5">
      {/* Entra ID */}
      <Card>
        <CardHeader><CardTitle>Azure Entra ID — Benutzer-Sync</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          <p className="text-sm text-muted-foreground">Synchronisiert Benutzer aus Azure AD in die zentrale Benutzerverwaltung. Erfordert MS365-Konfiguration.</p>
          {entraStatus?.last_sync && (
            <p className="text-xs text-muted-foreground">Letzte Synchronisation: {new Date(entraStatus.last_sync).toLocaleString("de-DE")}
              {entraStatus.last_result && ` — ${entraStatus.last_result.created} erstellt, ${entraStatus.last_result.updated} aktualisiert`}
            </p>
          )}
          <Button onClick={() => runSync("entra")} disabled={syncing === "entra"}>
            {syncing === "entra" ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <RefreshCw className="h-4 w-4 mr-1" />}
            Benutzer synchronisieren
          </Button>
          {result?.type === "entra" && (
            <p className={`text-sm ${result.data.error ? "text-destructive" : "text-emerald-600"}`}>
              {result.data.error || `${result.data.created} erstellt, ${result.data.updated} aktualisiert, ${result.data.skipped} übersprungen`}
            </p>
          )}
        </CardContent>
      </Card>

      {/* Intune */}
      <Card>
        <CardHeader><CardTitle>Microsoft Intune — Geräte-Sync</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          <p className="text-sm text-muted-foreground">Synchronisiert verwaltete Geräte aus Intune in die IT-Helpdesk Asset-Verwaltung.</p>
          {intuneStatus?.last_sync && (
            <p className="text-xs text-muted-foreground">Letzte Synchronisation: {new Date(intuneStatus.last_sync).toLocaleString("de-DE")}
              {intuneStatus.last_result && ` — ${intuneStatus.last_result.imported} importiert, ${intuneStatus.last_result.updated} aktualisiert`}
            </p>
          )}
          <Button onClick={() => runSync("intune")} disabled={syncing === "intune"}>
            {syncing === "intune" ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <RefreshCw className="h-4 w-4 mr-1" />}
            Geräte synchronisieren
          </Button>
          {result?.type === "intune" && (
            <p className={`text-sm ${result.data.error ? "text-destructive" : "text-emerald-600"}`}>
              {result.data.error || `${result.data.imported} importiert, ${result.data.updated} aktualisiert (${result.data.total} gesamt)`}
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

function NavConfigEditor({ navConfig, setNavConfig, roles, saving, onSave }: {
  navConfig: Record<string, string[]>
  setNavConfig: (c: Record<string, string[]>) => void
  roles: any[]
  saving: boolean
  onSave: () => void
}) {
  function toggleRole(navKey: string, roleName: string) {
    const current = navConfig[navKey] || []
    const updated = current.includes(roleName)
      ? current.filter(r => r !== roleName)
      : [...current, roleName]
    setNavConfig({ ...navConfig, [navKey]: updated })
  }

  function isRoleEnabled(navKey: string, roleName: string) {
    if (!navConfig[navKey]) return true // default: visible (not configured)
    return navConfig[navKey].includes(roleName)
  }

  function isConfigured(navKey: string) {
    return navConfig[navKey] !== undefined
  }

  function resetItem(navKey: string) {
    const updated = { ...navConfig }
    delete updated[navKey]
    setNavConfig(updated)
  }

  function configureItem(navKey: string) {
    // Initialize with all roles enabled
    setNavConfig({ ...navConfig, [navKey]: roles.map((r: any) => r.name) })
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Navigation pro Rolle</CardTitle>
        <p className="text-sm text-muted-foreground">Legen Sie fest, welche Menüpunkte für welche Rollen sichtbar sind. Nicht konfigurierte Einträge verwenden die Standard-Berechtigungen.</p>
      </CardHeader>
      <CardContent className="space-y-6">
        {ALL_NAV_ITEMS.map(section => (
          <div key={section.section}>
            <h3 className="text-sm font-semibold mb-3">{section.section}</h3>
            <div className="space-y-2">
              {section.items.map(item => (
                <div key={item.key} className="rounded-lg border p-3">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium">{item.label}</span>
                    {isConfigured(item.key) ? (
                      <button onClick={() => resetItem(item.key)} className="text-xs text-muted-foreground hover:text-foreground">
                        Zurücksetzen
                      </button>
                    ) : (
                      <button onClick={() => configureItem(item.key)} className="text-xs text-primary hover:underline">
                        Anpassen
                      </button>
                    )}
                  </div>
                  {isConfigured(item.key) ? (
                    <div className="flex flex-wrap gap-1.5">
                      {roles.map((role: any) => (
                        <button
                          key={role.name}
                          onClick={() => toggleRole(item.key, role.name)}
                          className={cn(
                            "px-2 py-0.5 rounded-full text-[11px] font-medium border transition-colors",
                            isRoleEnabled(item.key, role.name)
                              ? "bg-primary/10 text-primary border-primary/20"
                              : "bg-muted text-muted-foreground border-transparent opacity-50"
                          )}
                        >
                          {role.label || role.name}
                        </button>
                      ))}
                    </div>
                  ) : (
                    <p className="text-xs text-muted-foreground">Standard-Berechtigungen aktiv</p>
                  )}
                </div>
              ))}
            </div>
          </div>
        ))}

        <Button onClick={onSave} disabled={saving}>
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />} Konfiguration speichern
        </Button>
      </CardContent>
    </Card>
  )
}
