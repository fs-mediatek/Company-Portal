"use client"
import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectTrigger, SelectContent, SelectItem, SelectValue } from "@/components/ui/select"
import { Separator } from "@/components/ui/separator"
import { ArrowLeft, Loader2, Send, Paperclip, Download, MapPin, Clock, User, Tag } from "lucide-react"
import { formatDistanceToNow, format } from "date-fns"
import { de } from "date-fns/locale"

const statusConfig: Record<string, { label: string; variant: any }> = {
  open: { label: "Offen", variant: "info" },
  in_progress: { label: "In Bearbeitung", variant: "purple" },
  waiting: { label: "Wartend", variant: "warning" },
  resolved: { label: "Gelöst", variant: "success" },
  closed: { label: "Geschlossen", variant: "secondary" },
}

const priorityConfig: Record<string, { label: string; variant: any }> = {
  low: { label: "Niedrig", variant: "secondary" },
  medium: { label: "Mittel", variant: "default" },
  high: { label: "Hoch", variant: "warning" },
  critical: { label: "Kritisch", variant: "destructive" },
}

interface Props {
  ticketId: string
  userRole: string
}

export function TicketDetailClient({ ticketId, userRole }: Props) {
  const [ticket, setTicket] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [comment, setComment] = useState("")
  const [sendingComment, setSendingComment] = useState(false)
  const [uploading, setUploading] = useState(false)
  const router = useRouter()

  const isPrivileged = ["admin", "manager", "techniker", "hausmeister"].some(r => userRole.includes(r))

  async function fetchTicket() {
    try {
      const res = await fetch(`/api/tickets/${ticketId}`)
      if (!res.ok) { router.push("/tickets"); return }
      const data = await res.json()
      setTicket(data)
    } catch { }
    setLoading(false)
  }

  useEffect(() => { fetchTicket() }, [ticketId])

  async function updateField(field: string, value: any) {
    await fetch(`/api/tickets/${ticketId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ [field]: value }),
    })
    fetchTicket()
  }

  async function addComment() {
    if (!comment.trim()) return
    setSendingComment(true)
    await fetch(`/api/tickets/${ticketId}/comments`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ content: comment }),
    })
    setComment("")
    setSendingComment(false)
    fetchTicket()
  }

  async function uploadFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setUploading(true)
    const formData = new FormData()
    formData.append("file", file)
    await fetch(`/api/tickets/${ticketId}/attachments`, { method: "POST", body: formData })
    setUploading(false)
    fetchTicket()
    e.target.value = ""
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (!ticket) return null

  const sc = statusConfig[ticket.status] || { label: ticket.status, variant: "secondary" }
  const pc = priorityConfig[ticket.priority] || { label: ticket.priority, variant: "secondary" }
  const location = [ticket.location_building, ticket.location_floor, ticket.location_room].filter(Boolean).join(" / ")

  return (
    <div className="space-y-5 animate-fade-in max-w-5xl">
      {/* Back + Header */}
      <div>
        <Button variant="ghost" size="sm" onClick={() => router.push("/tickets")} className="mb-3">
          <ArrowLeft className="h-4 w-4" /> Zurück
        </Button>
        <div className="flex items-start justify-between">
          <div>
            <span className="text-xs font-mono text-muted-foreground">{ticket.ticket_number}</span>
            <h1 className="text-2xl font-bold mt-0.5">{ticket.title}</h1>
          </div>
          <div className="flex gap-2">
            <Badge variant={sc.variant}>{sc.label}</Badge>
            <Badge variant={pc.variant}>{pc.label}</Badge>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Main content */}
        <div className="lg:col-span-2 space-y-5">
          {/* Description */}
          {ticket.description && (
            <Card>
              <CardContent className="p-5">
                <p className="text-sm whitespace-pre-wrap">{ticket.description}</p>
              </CardContent>
            </Card>
          )}

          {/* Comments */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Kommentare ({ticket.comments?.length || 0})</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {ticket.comments?.map((c: any) => (
                <div key={c.id} className={`rounded-lg p-3 text-sm ${c.is_system ? "bg-muted/50 text-muted-foreground italic" : "bg-accent/50"}`}>
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-medium text-xs">{c.is_system ? "System" : c.user_name}</span>
                    <span className="text-xs text-muted-foreground">
                      {formatDistanceToNow(new Date(c.created_at), { locale: de, addSuffix: true })}
                    </span>
                  </div>
                  <p>{c.content}</p>
                </div>
              ))}

              {ticket.comments?.length === 0 && (
                <p className="text-sm text-muted-foreground text-center py-4">Noch keine Kommentare</p>
              )}

              <Separator />

              {/* Add comment */}
              <div className="space-y-2">
                <Textarea value={comment} onChange={e => setComment(e.target.value)} placeholder="Kommentar schreiben..." rows={3} />
                <div className="flex justify-end">
                  <Button size="sm" onClick={addComment} disabled={sendingComment || !comment.trim()}>
                    {sendingComment ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                    Senden
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Attachments */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Anhänge ({ticket.attachments?.length || 0})</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {ticket.attachments?.map((a: any) => (
                <a
                  key={a.id}
                  href={`/api/attachments/${a.id}`}
                  target="_blank"
                  className="flex items-center gap-3 rounded-lg border p-3 hover:bg-accent/50 transition-colors"
                >
                  <Paperclip className="h-4 w-4 text-muted-foreground shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{a.original_name}</p>
                    <p className="text-xs text-muted-foreground">{a.uploaded_by_name} &middot; {(a.size_bytes / 1024).toFixed(0)} KB</p>
                  </div>
                  <Download className="h-4 w-4 text-muted-foreground shrink-0" />
                </a>
              ))}

              <label className="flex items-center gap-2 cursor-pointer text-sm text-primary hover:underline mt-2">
                <Paperclip className="h-4 w-4" />
                {uploading ? "Wird hochgeladen..." : "Datei anhängen"}
                <input type="file" className="hidden" onChange={uploadFile} disabled={uploading} />
              </label>
            </CardContent>
          </Card>
        </div>

        {/* Sidebar */}
        <div className="space-y-4">
          <Card>
            <CardContent className="p-4 space-y-4">
              {/* Status */}
              {isPrivileged ? (
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-muted-foreground">Status</label>
                  <Select value={ticket.status} onValueChange={v => updateField("status", v)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {Object.entries(statusConfig).map(([k, v]) => (
                        <SelectItem key={k} value={k}>{v.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              ) : (
                <div className="space-y-1">
                  <label className="text-xs font-medium text-muted-foreground">Status</label>
                  <div><Badge variant={sc.variant}>{sc.label}</Badge></div>
                </div>
              )}

              {/* Priority */}
              {isPrivileged ? (
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-muted-foreground">Priorität</label>
                  <Select value={ticket.priority} onValueChange={v => updateField("priority", v)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {Object.entries(priorityConfig).map(([k, v]) => (
                        <SelectItem key={k} value={k}>{v.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              ) : (
                <div className="space-y-1">
                  <label className="text-xs font-medium text-muted-foreground">Priorität</label>
                  <div><Badge variant={pc.variant}>{pc.label}</Badge></div>
                </div>
              )}

              {/* Assignee */}
              {isPrivileged && (
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-muted-foreground">Zugewiesen an</label>
                  <Select
                    value={ticket.assigned_to_user_id?.toString() || "none"}
                    onValueChange={v => updateField("assigned_to_user_id", v === "none" ? null : parseInt(v))}
                  >
                    <SelectTrigger><SelectValue placeholder="Nicht zugewiesen" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">Nicht zugewiesen</SelectItem>
                      {ticket.assignees?.map((a: any) => (
                        <SelectItem key={a.id} value={a.id.toString()}>{a.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              <Separator />

              {/* Info fields */}
              <div className="space-y-3 text-sm">
                <div className="flex items-center gap-2 text-muted-foreground">
                  <User className="h-4 w-4 shrink-0" />
                  <span>Melder: <span className="text-foreground">{ticket.requester_name}</span></span>
                </div>
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Tag className="h-4 w-4 shrink-0" />
                  <span>Kategorie: <span className="text-foreground">{ticket.category}</span></span>
                </div>
                {location && (
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <MapPin className="h-4 w-4 shrink-0" />
                    <span>Standort: <span className="text-foreground">{location}</span></span>
                  </div>
                )}
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Clock className="h-4 w-4 shrink-0" />
                  <span>Erstellt: <span className="text-foreground">{format(new Date(ticket.created_at), "dd.MM.yyyy HH:mm", { locale: de })}</span></span>
                </div>
                {ticket.resolved_at && (
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Clock className="h-4 w-4 shrink-0" />
                    <span>Gelöst: <span className="text-foreground">{format(new Date(ticket.resolved_at), "dd.MM.yyyy HH:mm", { locale: de })}</span></span>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
