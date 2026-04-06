"use client"
import { useState, useEffect, useRef } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectTrigger, SelectContent, SelectItem, SelectValue } from "@/components/ui/select"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import {
  ArrowLeft, Loader2, Send, Clock, User, Tag, CheckSquare, Square, Plus,
  ImagePlus, Lock, Forward, AlertCircle,
} from "lucide-react"
import { formatDistanceToNow } from "date-fns"
import { de } from "date-fns/locale"

const statusConfig: Record<string, { label: string; variant: any }> = {
  open: { label: "Offen", variant: "info" },
  pending: { label: "Wartend", variant: "warning" },
  in_progress: { label: "In Bearbeitung", variant: "purple" },
  resolved: { label: "Gelöst", variant: "success" },
  closed: { label: "Geschlossen", variant: "secondary" },
}
const priorityConfig: Record<string, { label: string; variant: any }> = {
  low: { label: "Niedrig", variant: "secondary" },
  medium: { label: "Mittel", variant: "default" },
  high: { label: "Hoch", variant: "warning" },
  critical: { label: "Kritisch", variant: "destructive" },
}

export function HelpdeskTicketDetailClient({ ticketId }: { ticketId: string }) {
  const [ticket, setTicket] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [comment, setComment] = useState("")
  const [isInternal, setIsInternal] = useState(false)
  const [sending, setSending] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [newCheckItem, setNewCheckItem] = useState("")
  const [userRole, setUserRole] = useState("")
  const [showForward, setShowForward] = useState(false)
  const [forwardData, setForwardData] = useState({ to: "", subject: "", body: "" })
  const [forwarding, setForwarding] = useState(false)
  const [templates, setTemplates] = useState<any[]>([])
  const [categories, setCategories] = useState<any[]>([])
  const fileRef = useRef<HTMLInputElement>(null)
  const router = useRouter()

  async function fetchTicket() {
    try {
      const res = await fetch(`/api/helpdesk/tickets/${ticketId}`)
      if (res.ok) setTicket(await res.json())
    } catch {}
    setLoading(false)
  }

  useEffect(() => {
    fetchTicket()
    fetch("/api/auth/me").then(r => r.json()).then(d => setUserRole(d.role || "")).catch(() => {})
    fetch("/api/templates").then(r => r.json()).then(d => setTemplates(Array.isArray(d) ? d.filter((t: any) => t.category === "schnellantwort") : [])).catch(() => {})
    fetch("/api/helpdesk/categories").then(r => r.json()).then(d => setCategories(Array.isArray(d) ? d : [])).catch(() => {})
  }, [ticketId])

  const isPrivileged = userRole.includes("admin") || userRole.includes("agent")

  async function updateField(field: string, value: any) {
    await fetch(`/api/helpdesk/tickets/${ticketId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ [field]: value }),
    })
    fetchTicket()
  }

  async function addComment() {
    if (!comment.trim()) return
    setSending(true)
    await fetch(`/api/helpdesk/tickets/${ticketId}/comments`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ body: comment, is_internal: isInternal }),
    })
    setComment("")
    setIsInternal(false)
    setSending(false)
    fetchTicket()
  }

  async function handleImageUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setUploading(true)
    const formData = new FormData()
    formData.append("file", file)
    try {
      const res = await fetch(`/api/helpdesk/tickets/${ticketId}/upload`, { method: "POST", body: formData })
      const data = await res.json()
      if (data.url) {
        setComment(prev => prev + (prev ? "\n" : "") + `![${file.name}](${data.url})`)
      }
    } catch {}
    setUploading(false)
    if (fileRef.current) fileRef.current.value = ""
  }

  async function handleForward() {
    if (!forwardData.to || !forwardData.subject || !forwardData.body) return
    setForwarding(true)
    await fetch(`/api/helpdesk/tickets/${ticketId}/forward`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(forwardData),
    })
    setForwarding(false)
    setShowForward(false)
    setForwardData({ to: "", subject: "", body: "" })
    fetchTicket()
  }

  async function addCheckItem() {
    if (!newCheckItem.trim()) return
    await fetch(`/api/helpdesk/tickets/${ticketId}/checklist`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ content: newCheckItem }),
    })
    setNewCheckItem("")
    fetchTicket()
  }

  async function toggleCheckItem(itemId: number, isDone: boolean) {
    await fetch(`/api/helpdesk/tickets/${ticketId}/checklist`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ item_id: itemId, is_done: !isDone }),
    })
    fetchTicket()
  }

  if (loading) return <div className="flex justify-center py-16"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
  if (!ticket) return <div className="text-center py-16 text-muted-foreground">Ticket nicht gefunden</div>

  const sc = statusConfig[ticket.status] || { label: ticket.status, variant: "secondary" }
  const pc = priorityConfig[ticket.priority] || { label: ticket.priority, variant: "secondary" }
  const doneCount = ticket.checklist?.filter((i: any) => i.is_done).length || 0
  const totalCheck = ticket.checklist?.length || 0

  return (
    <div className="space-y-5 animate-fade-in max-w-5xl">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => router.push("/helpdesk/tickets")}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs font-mono text-muted-foreground">{ticket.ticket_number}</span>
            <Badge variant={sc.variant}>{sc.label}</Badge>
            <Badge variant={pc.variant}>{pc.label}</Badge>
          </div>
          <h1 className="text-xl font-bold mt-0.5 truncate">{ticket.title}</h1>
        </div>
        {isPrivileged && (
          <Button variant="outline" size="sm" onClick={() => {
            setForwardData({ to: "", subject: `Fwd: [${ticket.ticket_number}] ${ticket.title}`, body: ticket.description || "" })
            setShowForward(true)
          }}>
            <Forward className="h-3.5 w-3.5 mr-1" /> Weiterleiten
          </Button>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Main content */}
        <div className="lg:col-span-2 space-y-5">
          {/* Description */}
          <Card>
            <CardHeader><CardTitle className="text-sm">Beschreibung</CardTitle></CardHeader>
            <CardContent>
              <div className="text-sm whitespace-pre-wrap prose prose-sm dark:prose-invert max-w-none"
                dangerouslySetInnerHTML={{ __html: ticket.description || "<span class='text-muted-foreground'>Keine Beschreibung</span>" }}
              />
            </CardContent>
          </Card>

          {/* Checklist */}
          {(totalCheck > 0 || isPrivileged) && (
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm">Checkliste</CardTitle>
                  {totalCheck > 0 && (
                    <span className="text-xs text-muted-foreground">{doneCount}/{totalCheck}</span>
                  )}
                </div>
                {totalCheck > 0 && (
                  <div className="w-full bg-muted rounded-full h-1.5 mt-2">
                    <div className="bg-purple-500 h-1.5 rounded-full transition-all" style={{ width: `${totalCheck > 0 ? (doneCount / totalCheck) * 100 : 0}%` }} />
                  </div>
                )}
              </CardHeader>
              <CardContent className="space-y-1.5">
                {ticket.checklist?.map((item: any) => (
                  <button
                    key={item.id}
                    onClick={() => isPrivileged && toggleCheckItem(item.id, item.is_done)}
                    className="flex items-center gap-2.5 w-full text-left hover:bg-accent/50 rounded-lg px-2 py-1.5 transition-colors"
                    disabled={!isPrivileged}
                  >
                    {item.is_done ? <CheckSquare className="h-4 w-4 text-purple-500 shrink-0" /> : <Square className="h-4 w-4 text-muted-foreground shrink-0" />}
                    <span className={`text-sm ${item.is_done ? "line-through text-muted-foreground" : ""}`}>{item.content}</span>
                    {item.done_by && <span className="text-[10px] text-muted-foreground/60 ml-auto shrink-0">{item.done_by}</span>}
                  </button>
                ))}
                {isPrivileged && (
                  <div className="flex gap-2 pt-2">
                    <Input
                      value={newCheckItem}
                      onChange={e => setNewCheckItem(e.target.value)}
                      onKeyDown={e => e.key === "Enter" && addCheckItem()}
                      placeholder="Neuer Punkt..."
                      className="h-8 text-sm"
                    />
                    <Button size="sm" variant="outline" onClick={addCheckItem} disabled={!newCheckItem.trim()}>
                      <Plus className="h-3 w-3" />
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Comments */}
          <Card>
            <CardHeader><CardTitle className="text-sm">Kommentare ({ticket.comments?.length || 0})</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              {ticket.comments?.map((c: any) => {
                const initials = c.author_name?.split(" ").map((w: string) => w[0]).join("").slice(0, 2).toUpperCase() || "?"
                return (
                  <div key={c.id} className={`flex gap-3 ${c.is_system ? "opacity-50" : ""}`}>
                    <Avatar className="h-7 w-7 shrink-0">
                      <AvatarFallback className="text-[10px]">{c.is_system ? "⚙" : initials}</AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className={`text-sm ${c.is_system ? "text-muted-foreground italic" : "font-medium"}`}>{c.author_name}</span>
                        <span className="text-xs text-muted-foreground">
                          {formatDistanceToNow(new Date(c.created_at), { locale: de, addSuffix: true })}
                        </span>
                        {c.is_internal === 1 && (
                          <Badge variant="outline" className="text-[10px] py-0 gap-0.5">
                            <Lock className="h-2.5 w-2.5" /> Intern
                          </Badge>
                        )}
                      </div>
                      <div className="text-sm mt-0.5 whitespace-pre-wrap" dangerouslySetInnerHTML={{ __html: c.content }} />
                    </div>
                  </div>
                )
              })}

              {/* New comment */}
              <div className="pt-3 border-t space-y-2">
                <Textarea
                  value={comment}
                  onChange={e => setComment(e.target.value)}
                  placeholder="Kommentar schreiben..."
                  rows={3}
                />
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    {/* Image upload */}
                    <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleImageUpload} />
                    <Button variant="ghost" size="sm" onClick={() => fileRef.current?.click()} disabled={uploading}>
                      <ImagePlus className="h-3.5 w-3.5 mr-1" />
                      {uploading ? "Lädt..." : "Bild"}
                    </Button>
                    {/* Internal toggle */}
                    {isPrivileged && (
                      <Button
                        variant={isInternal ? "default" : "ghost"}
                        size="sm"
                        onClick={() => setIsInternal(!isInternal)}
                        className={isInternal ? "bg-amber-600 hover:bg-amber-700 text-white" : ""}
                      >
                        <Lock className="h-3.5 w-3.5 mr-1" />
                        Intern
                      </Button>
                    )}
                    {/* Template quick-reply */}
                    {templates.length > 0 && (
                      <select
                        className="h-8 rounded-md border border-input bg-background px-2 text-xs"
                        value=""
                        onChange={e => {
                          const tpl = templates.find((t: any) => String(t.id) === e.target.value)
                          if (tpl) setComment(prev => prev ? prev + "\n\n" + tpl.content : tpl.content)
                          e.target.value = ""
                        }}
                      >
                        <option value="" disabled>Vorlage einfügen...</option>
                        {templates.map((t: any) => (
                          <option key={t.id} value={String(t.id)}>{t.name}</option>
                        ))}
                      </select>
                    )}
                  </div>
                  <Button onClick={addComment} disabled={sending || !comment.trim()} size="sm" className="bg-purple-600 hover:bg-purple-700">
                    <Send className="h-3.5 w-3.5 mr-1" /> Senden
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Sidebar */}
        <div className="space-y-4">
          <Card>
            <CardContent className="p-4 space-y-4">
              {/* Status */}
              <div className="space-y-1">
                <label className="text-xs text-muted-foreground flex items-center gap-1"><Tag className="h-3 w-3" /> Status</label>
                {isPrivileged ? (
                  <Select value={ticket.status} onValueChange={v => updateField("status", v)}>
                    <SelectTrigger className="h-8 text-sm"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {Object.entries(statusConfig).map(([k, v]) => (
                        <SelectItem key={k} value={k}>{v.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                ) : <Badge variant={sc.variant}>{sc.label}</Badge>}
              </div>

              {/* Priority */}
              <div className="space-y-1">
                <label className="text-xs text-muted-foreground">Priorität</label>
                {isPrivileged ? (
                  <Select value={ticket.priority} onValueChange={v => updateField("priority", v)}>
                    <SelectTrigger className="h-8 text-sm"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {Object.entries(priorityConfig).map(([k, v]) => (
                        <SelectItem key={k} value={k}>{v.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                ) : <Badge variant={pc.variant}>{pc.label}</Badge>}
              </div>

              {/* Assignee */}
              {isPrivileged && ticket.all_users?.length > 0 && (
                <div className="space-y-1">
                  <label className="text-xs text-muted-foreground">Zugewiesen an</label>
                  <select
                    value={ticket.assignee_id || ""}
                    onChange={e => updateField("assignee_id", e.target.value ? parseInt(e.target.value) : null)}
                    className="flex h-8 w-full rounded-lg border border-input bg-background px-3 text-sm"
                  >
                    <option value="">Nicht zugewiesen</option>
                    {ticket.all_users.map((u: any) => (
                      <option key={u.id} value={u.id}>{u.name}</option>
                    ))}
                  </select>
                </div>
              )}

              {/* Affected user */}
              {isPrivileged && ticket.all_users?.length > 0 && (
                <div className="space-y-1">
                  <label className="text-xs text-muted-foreground">Betroffener Nutzer</label>
                  <select
                    value={ticket.affected_user_id || ""}
                    onChange={e => updateField("affected_user_id", e.target.value ? parseInt(e.target.value) : null)}
                    className="flex h-8 w-full rounded-lg border border-input bg-background px-3 text-sm"
                  >
                    <option value="">Kein</option>
                    {ticket.all_users.map((u: any) => (
                      <option key={u.id} value={u.id}>{u.name}</option>
                    ))}
                  </select>
                </div>
              )}

              {/* Info */}
              <div className="space-y-2.5 pt-3 border-t text-sm">
                <div className="flex items-center gap-2 text-muted-foreground">
                  <User className="h-3.5 w-3.5 shrink-0" /> <span className="truncate">Ersteller: {ticket.requester_name}</span>
                </div>
                {!isPrivileged && ticket.assignee_name && (
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <User className="h-3.5 w-3.5 shrink-0" /> <span className="truncate">Zugewiesen: {ticket.assignee_name}</span>
                  </div>
                )}
                {ticket.affected_user_name && (
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <AlertCircle className="h-3.5 w-3.5 shrink-0" /> <span className="truncate">Betroffen: {ticket.affected_user_name}</span>
                  </div>
                )}
                {isPrivileged && categories.length > 0 ? (
                  <div className="space-y-1">
                    <label className="text-xs text-muted-foreground">Kategorie</label>
                    <select
                      value={ticket.category || ""}
                      onChange={e => updateField("category", e.target.value)}
                      className="flex h-8 w-full rounded-lg border border-input bg-background px-3 text-sm"
                    >
                      {categories.map((c: any) => <option key={c.id || c.name} value={c.name}>{c.name}</option>)}
                      {ticket.category && !categories.find((c: any) => c.name === ticket.category) && (
                        <option value={ticket.category}>{ticket.category}</option>
                      )}
                    </select>
                  </div>
                ) : (
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Tag className="h-3.5 w-3.5 shrink-0" /> <span>Kategorie: {ticket.category}</span>
                  </div>
                )}
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Clock className="h-3.5 w-3.5 shrink-0" />
                  <span>Erstellt: {formatDistanceToNow(new Date(ticket.created_at), { locale: de, addSuffix: true })}</span>
                </div>
                {ticket.resolved_at && (
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <CheckSquare className="h-3.5 w-3.5 shrink-0" />
                    <span>Gelöst: {formatDistanceToNow(new Date(ticket.resolved_at), { locale: de, addSuffix: true })}</span>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Forward Dialog */}
      <Dialog open={showForward} onOpenChange={setShowForward}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>Ticket weiterleiten</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1">
              <Label>Empfänger *</Label>
              <Input value={forwardData.to} onChange={e => setForwardData({ ...forwardData, to: e.target.value })} placeholder="email@extern.de" type="email" />
            </div>
            <div className="space-y-1">
              <Label>Betreff</Label>
              <Input value={forwardData.subject} onChange={e => setForwardData({ ...forwardData, subject: e.target.value })} />
            </div>
            <div className="space-y-1">
              <Label>Nachricht *</Label>
              <Textarea value={forwardData.body} onChange={e => setForwardData({ ...forwardData, body: e.target.value })} rows={6} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowForward(false)}>Abbrechen</Button>
            <Button onClick={handleForward} disabled={forwarding || !forwardData.to || !forwardData.body} className="bg-purple-600 hover:bg-purple-700">
              {forwarding ? <Loader2 className="h-4 w-4 animate-spin" /> : <><Forward className="h-4 w-4 mr-1" /> Senden</>}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
