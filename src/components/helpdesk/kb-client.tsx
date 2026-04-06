"use client"
import { useState, useEffect } from "react"
import Link from "next/link"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Textarea } from "@/components/ui/textarea"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Select, SelectTrigger, SelectContent, SelectItem, SelectValue } from "@/components/ui/select"
import { Plus, Search, Loader2, BookOpen, Eye, ThumbsUp, ThumbsDown, Clock } from "lucide-react"
import { formatDistanceToNow } from "date-fns"
import { de } from "date-fns/locale"

export function HelpdeskKbClient() {
  const [articles, setArticles] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState("")
  const [showCreate, setShowCreate] = useState(false)
  const [form, setForm] = useState({ title: "", content_html: "", tags: "", status: "draft" })
  const [saving, setSaving] = useState(false)
  const [userRole, setUserRole] = useState("")

  async function fetchArticles() {
    setLoading(true)
    const params = new URLSearchParams()
    if (search) params.set("search", search)
    try {
      const res = await fetch(`/api/helpdesk/kb?${params}`)
      setArticles(await res.json())
    } catch {}
    setLoading(false)
  }

  useEffect(() => { fetchArticles() }, [search])
  useEffect(() => {
    fetch("/api/auth/me").then(r => r.json()).then(d => setUserRole(d.role || "")).catch(() => {})
  }, [])

  const isPrivileged = userRole.includes("admin") || userRole.includes("agent") || userRole.includes("redakteur")

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault()
    if (!form.title.trim()) return
    setSaving(true)
    await fetch("/api/helpdesk/kb", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    })
    setSaving(false)
    setShowCreate(false)
    setForm({ title: "", content_html: "", tags: "", status: "draft" })
    fetchArticles()
  }

  return (
    <div className="space-y-5 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Wissensdatenbank</h1>
          <p className="text-muted-foreground text-sm mt-0.5">IT-Anleitungen, FAQs & Lösungen</p>
        </div>
        {isPrivileged && (
          <Button onClick={() => setShowCreate(true)} className="bg-purple-600 hover:bg-purple-700">
            <Plus className="h-4 w-4" /> Neuer Artikel
          </Button>
        )}
      </div>

      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input placeholder="Artikel suchen..." className="pl-9" value={search} onChange={e => setSearch(e.target.value)} />
      </div>

      {loading ? (
        <div className="flex justify-center py-16"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
      ) : articles.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
          <BookOpen className="h-8 w-8 mb-2 opacity-40" />
          <p className="text-sm">{search ? "Keine Artikel gefunden" : "Noch keine Artikel vorhanden"}</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {articles.map((a: any) => (
            <Link key={a.id} href={`/helpdesk/kb/${a.id}`}>
              <Card className="h-full hover:shadow-md hover:border-purple-500/20 transition-all duration-200 cursor-pointer">
                <CardContent className="p-5 flex flex-col h-full">
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <h3 className="font-semibold text-sm line-clamp-2">{a.title}</h3>
                    {a.status === "draft" && <Badge variant="warning" className="shrink-0 text-[10px]">Entwurf</Badge>}
                  </div>

                  {a.tags && (
                    <div className="flex flex-wrap gap-1 mb-3">
                      {a.tags.split(",").map((tag: string, i: number) => (
                        <Badge key={i} variant="outline" className="text-[10px] py-0">{tag.trim()}</Badge>
                      ))}
                    </div>
                  )}

                  <div className="mt-auto pt-3 flex items-center gap-4 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1"><Eye className="h-3 w-3" /> {a.views}</span>
                    <span className="flex items-center gap-1"><ThumbsUp className="h-3 w-3" /> {a.helpful_votes}</span>
                    <span className="flex items-center gap-1"><Clock className="h-3 w-3" /> {formatDistanceToNow(new Date(a.updated_at || a.created_at), { locale: de, addSuffix: true })}</span>
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}

      {/* Create Dialog */}
      <Dialog open={showCreate} onOpenChange={setShowCreate}>
        <DialogContent className="max-w-2xl">
          <DialogHeader><DialogTitle>Neuer KB-Artikel</DialogTitle></DialogHeader>
          <form onSubmit={handleCreate} className="space-y-4">
            <div className="space-y-1.5">
              <Label>Titel *</Label>
              <Input value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} placeholder="z.B. VPN-Verbindung einrichten" required />
            </div>
            <div className="space-y-1.5">
              <Label>Inhalt (HTML)</Label>
              <Textarea value={form.content_html} onChange={e => setForm({ ...form, content_html: e.target.value })} rows={10} placeholder="<h2>Schritt 1</h2><p>...</p>" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Tags (komma-separiert)</Label>
                <Input value={form.tags} onChange={e => setForm({ ...form, tags: e.target.value })} placeholder="VPN, Netzwerk, Anleitung" />
              </div>
              <div className="space-y-1.5">
                <Label>Status</Label>
                <Select value={form.status} onValueChange={v => setForm({ ...form, status: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="draft">Entwurf</SelectItem>
                    <SelectItem value="published">Veröffentlicht</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setShowCreate(false)}>Abbrechen</Button>
              <Button type="submit" disabled={saving || !form.title.trim()} className="bg-purple-600 hover:bg-purple-700">
                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : "Erstellen"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
