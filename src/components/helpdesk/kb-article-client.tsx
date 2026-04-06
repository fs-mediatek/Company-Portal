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
  ArrowLeft, Loader2, Eye, ThumbsUp, ThumbsDown, Pencil, Save, X, User, Clock,
} from "lucide-react"
import { formatDistanceToNow } from "date-fns"
import { de } from "date-fns/locale"

export function HelpdeskKbArticleClient({ articleId }: { articleId: string }) {
  const [article, setArticle] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [editing, setEditing] = useState(false)
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState<any>({})
  const [voted, setVoted] = useState(false)
  const [userRole, setUserRole] = useState("")
  const router = useRouter()

  async function fetchArticle() {
    try {
      const res = await fetch(`/api/helpdesk/kb/${articleId}`)
      if (res.ok) {
        const data = await res.json()
        setArticle(data)
        setForm(data)
      }
    } catch {}
    setLoading(false)
  }

  useEffect(() => {
    fetchArticle()
    fetch("/api/auth/me").then(r => r.json()).then(d => setUserRole(d.role || "")).catch(() => {})
  }, [articleId])

  const isPrivileged = userRole.includes("admin") || userRole.includes("agent") || userRole.includes("redakteur")

  async function handleSave() {
    setSaving(true)
    await fetch(`/api/helpdesk/kb/${articleId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: form.title, content_html: form.content_html, tags: form.tags, status: form.status }),
    })
    setSaving(false)
    setEditing(false)
    fetchArticle()
  }

  async function vote(type: "helpful" | "unhelpful") {
    if (voted) return
    await fetch(`/api/helpdesk/kb/${articleId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ vote: type }),
    })
    setVoted(true)
    setArticle((a: any) => ({
      ...a,
      helpful_votes: type === "helpful" ? a.helpful_votes + 1 : a.helpful_votes,
      unhelpful_votes: type === "unhelpful" ? a.unhelpful_votes + 1 : a.unhelpful_votes,
    }))
  }

  if (loading) return <div className="flex justify-center py-16"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
  if (!article) return <div className="text-center py-16 text-muted-foreground">Artikel nicht gefunden</div>

  return (
    <div className="space-y-5 animate-fade-in max-w-4xl">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => router.push("/helpdesk/kb")}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div className="flex-1 min-w-0">
          {editing ? (
            <Input value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} className="text-xl font-bold" />
          ) : (
            <h1 className="text-xl font-bold">{article.title}</h1>
          )}
          <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
            {article.author_name && <span className="flex items-center gap-1"><User className="h-3 w-3" /> {article.author_name}</span>}
            <span className="flex items-center gap-1"><Clock className="h-3 w-3" /> {formatDistanceToNow(new Date(article.updated_at || article.created_at), { locale: de, addSuffix: true })}</span>
            <span className="flex items-center gap-1"><Eye className="h-3 w-3" /> {article.views} Aufrufe</span>
            {article.status === "draft" && <Badge variant="warning" className="text-[10px]">Entwurf</Badge>}
          </div>
        </div>
        {isPrivileged && !editing && (
          <Button variant="outline" size="sm" onClick={() => setEditing(true)}>
            <Pencil className="h-3.5 w-3.5 mr-1" /> Bearbeiten
          </Button>
        )}
        {editing && (
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => { setEditing(false); setForm(article) }}>
              <X className="h-3.5 w-3.5 mr-1" /> Abbrechen
            </Button>
            <Button size="sm" onClick={handleSave} disabled={saving} className="bg-purple-600 hover:bg-purple-700">
              {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <><Save className="h-3.5 w-3.5 mr-1" /> Speichern</>}
            </Button>
          </div>
        )}
      </div>

      {/* Tags */}
      {editing ? (
        <div className="space-y-1.5">
          <Label>Tags (komma-separiert)</Label>
          <Input value={form.tags || ""} onChange={e => setForm({ ...form, tags: e.target.value })} />
        </div>
      ) : article.tags ? (
        <div className="flex flex-wrap gap-1.5">
          {article.tags.split(",").map((tag: string, i: number) => (
            <Badge key={i} variant="outline" className="text-xs">{tag.trim()}</Badge>
          ))}
        </div>
      ) : null}

      {/* Status (editing) */}
      {editing && (
        <div className="space-y-1.5 max-w-xs">
          <Label>Status</Label>
          <Select value={form.status} onValueChange={v => setForm({ ...form, status: v })}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="draft">Entwurf</SelectItem>
              <SelectItem value="published">Veröffentlicht</SelectItem>
            </SelectContent>
          </Select>
        </div>
      )}

      {/* Content */}
      <Card>
        <CardContent className="p-6">
          {editing ? (
            <Textarea value={form.content_html || ""} onChange={e => setForm({ ...form, content_html: e.target.value })} rows={20} className="font-mono text-sm" />
          ) : (
            <div className="prose prose-sm dark:prose-invert max-w-none" dangerouslySetInnerHTML={{ __html: article.content_html || "<p class='text-muted-foreground'>Kein Inhalt</p>" }} />
          )}
        </CardContent>
      </Card>

      {/* Voting */}
      {!editing && (
        <Card>
          <CardContent className="p-5 flex items-center justify-between">
            <p className="text-sm text-muted-foreground">War dieser Artikel hilfreich?</p>
            <div className="flex items-center gap-3">
              <Button variant={voted ? "secondary" : "outline"} size="sm" onClick={() => vote("helpful")} disabled={voted}>
                <ThumbsUp className="h-3.5 w-3.5 mr-1" /> Ja ({article.helpful_votes})
              </Button>
              <Button variant={voted ? "secondary" : "outline"} size="sm" onClick={() => vote("unhelpful")} disabled={voted}>
                <ThumbsDown className="h-3.5 w-3.5 mr-1" /> Nein ({article.unhelpful_votes})
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
