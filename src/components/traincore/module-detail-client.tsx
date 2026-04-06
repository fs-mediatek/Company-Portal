"use client"
import { useState, useEffect, useCallback, useRef } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Textarea } from "@/components/ui/textarea"
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Separator } from "@/components/ui/separator"
import {
  ArrowLeft, Plus, Loader2, AlertCircle, BookOpen, Users, Settings, Trash2,
  ChevronUp, ChevronDown, GraduationCap, FileText, Video, Link as LinkIcon, File,
  Clock, CalendarDays, CheckCircle2, CircleDashed, CircleDot, AlertTriangle, Image,
  PlayCircle, FileDown, Save,
} from "lucide-react"
import { cn } from "@/lib/utils"
import Link from "next/link"
import { RichTextEditor } from "./rich-text-editor"
import { BlockTypePicker } from "./block-type-picker"

type Tab = "content" | "participants" | "settings"
type ContentType = "text" | "video" | "link" | "file" | "image"

const contentTypeLabels: Record<ContentType, string> = {
  text: "Fließtext",
  video: "YouTube / Video",
  link: "Link",
  file: "Datei",
  image: "Bild",
}
const contentTypeIcons: Record<ContentType, any> = {
  text: FileText,
  video: PlayCircle,
  link: LinkIcon,
  file: FileDown,
  image: Image,
}

const statusColors: Record<string, string> = {
  assigned: "bg-blue-500/10 text-blue-600",
  in_progress: "bg-amber-500/10 text-amber-600",
  completed: "bg-emerald-500/10 text-emerald-600",
  overdue: "bg-red-500/10 text-red-600",
}
const statusLabels: Record<string, string> = {
  assigned: "Zugewiesen",
  in_progress: "In Bearbeitung",
  completed: "Abgeschlossen",
  overdue: "Überfällig",
}
const statusIcons: Record<string, any> = {
  assigned: CircleDashed,
  in_progress: CircleDot,
  completed: CheckCircle2,
  overdue: AlertTriangle,
}

const categories = ["Arbeitssicherheit", "Datenschutz", "IT-Systeme", "Prozesse", "Onboarding", "Sonstiges"] as const

interface Props {
  moduleId: string
  userRole: string
  userId: number
}

export function ModuleDetailClient({ moduleId, userRole, userId }: Props) {
  const [tab, setTab] = useState<Tab>("content")
  const [course, setCourse] = useState<any>(null)
  const [chapters, setChapters] = useState<any[]>([])
  const [assignments, setAssignments] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [savingChapterId, setSavingChapterId] = useState<number | null>(null)

  // Assign dialog
  const [showAssign, setShowAssign] = useState(false)
  const [users, setUsers] = useState<any[]>([])
  const [assignUserId, setAssignUserId] = useState("")
  const [assignDueDate, setAssignDueDate] = useState("")
  const [loadingUsers, setLoadingUsers] = useState(false)
  const [saving, setSaving] = useState(false)

  // Settings form
  const [settingsForm, setSettingsForm] = useState({ title: "", description: "", category: "", duration_minutes: "", instructor: "", is_active: true })
  const [savingSettings, setSavingSettings] = useState(false)

  const isAdmin = userRole === "admin" || userRole === "manager"

  // Debounce timers for inline editing
  const debounceTimers = useRef<Record<number, NodeJS.Timeout>>({})

  const fetchCourse = useCallback(async () => {
    try {
      const res = await fetch(`/api/traincore/courses/${moduleId}`)
      const data = await res.json()
      setCourse(data)
      setSettingsForm({
        title: data.title || "",
        description: data.description || "",
        category: data.category || "Sonstiges",
        duration_minutes: String(data.duration_minutes || ""),
        instructor: data.instructor || "",
        is_active: data.is_active !== false,
      })
    } catch {}
  }, [moduleId])

  const fetchChapters = useCallback(async () => {
    try {
      const res = await fetch(`/api/traincore/courses/${moduleId}/chapters`)
      const data = await res.json()
      setChapters(Array.isArray(data) ? data : data.chapters || data.data || [])
    } catch { setChapters([]) }
  }, [moduleId])

  const fetchAssignments = useCallback(async () => {
    try {
      const res = await fetch(`/api/traincore/courses/${moduleId}/assignments`)
      const data = await res.json()
      setAssignments(Array.isArray(data) ? data : data.assignments || data.data || [])
    } catch { setAssignments([]) }
  }, [moduleId])

  useEffect(() => {
    async function init() {
      setLoading(true)
      await Promise.all([fetchCourse(), fetchChapters(), fetchAssignments()])
      setLoading(false)
    }
    init()
  }, [fetchCourse, fetchChapters, fetchAssignments])

  // Add new chapter block
  async function addChapterBlock(type: string) {
    const defaultTitles: Record<string, string> = {
      text: "Neuer Textblock",
      video: "Neues Video",
      link: "Neuer Link",
      file: "Neue Datei",
      image: "Neues Bild",
    }
    try {
      await fetch(`/api/traincore/courses/${moduleId}/chapters`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: defaultTitles[type] || "Neues Kapitel",
          content_type: type,
          content: type === "text" ? "<p></p>" : "",
          media_url: "",
          duration_minutes: 0,
          sort_order: chapters.length,
        }),
      })
      fetchChapters()
    } catch {}
  }

  // Update chapter inline (debounced)
  function updateChapterLocal(id: number, field: string, value: string) {
    setChapters(prev => prev.map(ch => ch.id === id ? { ...ch, [field]: value } : ch))

    // Debounce the API call
    if (debounceTimers.current[id]) clearTimeout(debounceTimers.current[id])
    debounceTimers.current[id] = setTimeout(() => {
      const chapter = chapters.find(ch => ch.id === id)
      if (!chapter) return
      const updated = { ...chapter, [field]: value }
      persistChapter(updated)
    }, 800)
  }

  // Persist chapter to server
  async function persistChapter(chapter: any) {
    setSavingChapterId(chapter.id)
    try {
      await fetch(`/api/traincore/courses/${moduleId}/chapters`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: chapter.id,
          title: chapter.title,
          content_type: chapter.content_type,
          content: chapter.content,
          media_url: chapter.media_url,
          duration_minutes: parseInt(chapter.duration_minutes) || 0,
          sort_order: chapter.sort_order,
        }),
      })
    } catch {}
    setSavingChapterId(null)
  }

  // Immediate save (for blur events)
  function saveChapterNow(id: number) {
    if (debounceTimers.current[id]) {
      clearTimeout(debounceTimers.current[id])
      delete debounceTimers.current[id]
    }
    const chapter = chapters.find(ch => ch.id === id)
    if (chapter) persistChapter(chapter)
  }

  async function deleteChapter(id: number) {
    if (!confirm("Kapitel wirklich löschen?")) return
    await fetch(`/api/traincore/courses/${moduleId}/chapters`, {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    })
    fetchChapters()
  }

  async function moveChapter(index: number, direction: "up" | "down") {
    const sorted = [...chapters].sort((a, b) => Number(a.sort_order || 0) - Number(b.sort_order || 0))
    const swapIndex = direction === "up" ? index - 1 : index + 1
    if (swapIndex < 0 || swapIndex >= sorted.length) return
    ;[sorted[index], sorted[swapIndex]] = [sorted[swapIndex], sorted[index]]
    setChapters(sorted)
    for (let i = 0; i < sorted.length; i++) {
      if (Number(sorted[i].sort_order) !== i) {
        await fetch(`/api/traincore/courses/${moduleId}/chapters`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ id: sorted[i].id, sort_order: i }),
        })
      }
    }
    fetchChapters()
  }

  // Assignment CRUD
  async function fetchUsers() {
    setLoadingUsers(true)
    try {
      const res = await fetch("/api/users")
      const data = await res.json()
      setUsers(Array.isArray(data) ? data : data.users || data.data || [])
    } catch { setUsers([]) }
    setLoadingUsers(false)
  }

  async function assignUser(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    try {
      await fetch(`/api/traincore/courses/${moduleId}/assignments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ user_id: Number(assignUserId), due_date: assignDueDate || null }),
      })
      setShowAssign(false)
      setAssignUserId("")
      setAssignDueDate("")
      fetchAssignments()
    } catch {}
    setSaving(false)
  }

  async function removeAssignment(assignmentId: number) {
    if (!confirm("Zuweisung wirklich entfernen?")) return
    await fetch(`/api/traincore/courses/${moduleId}/assignments`, {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: assignmentId }),
    })
    fetchAssignments()
  }

  // Settings
  async function saveSettings(e: React.FormEvent) {
    e.preventDefault()
    setSavingSettings(true)
    try {
      await fetch(`/api/traincore/courses/${moduleId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...settingsForm,
          duration_minutes: Number(settingsForm.duration_minutes) || 0,
        }),
      })
      fetchCourse()
    } catch {}
    setSavingSettings(false)
  }

  if (loading) {
    return <div className="flex justify-center py-20"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
  }

  if (!course) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-muted-foreground animate-fade-in">
        <AlertCircle className="h-8 w-8 mb-2 opacity-40" />
        <p className="text-sm">Modul nicht gefunden</p>
        <Link href="/traincore/modules"><Button variant="outline" className="mt-4"><ArrowLeft className="h-4 w-4" /> Zurück</Button></Link>
      </div>
    )
  }

  return (
    <div className="space-y-5 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link href="/traincore/modules">
            <Button variant="outline" size="icon" className="h-8 w-8"><ArrowLeft className="h-4 w-4" /></Button>
          </Link>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-bold">{course.title}</h1>
              {!course.is_active && <Badge variant="outline" className="text-red-600 border-red-200">Inaktiv</Badge>}
            </div>
            <p className="text-muted-foreground text-sm mt-0.5">{course.category} &middot; {Number(course.duration_minutes || 0)} Min. &middot; {chapters.length} Kapitel</p>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex rounded-lg bg-muted p-0.5 w-fit">
        <button onClick={() => setTab("content")} className={cn("flex items-center gap-1.5 rounded-md px-4 py-2 text-sm font-medium transition-colors", tab === "content" ? "bg-card shadow-sm text-amber-600" : "text-muted-foreground")}>
          <BookOpen className="h-3.5 w-3.5" /> Inhalt
        </button>
        <button onClick={() => setTab("participants")} className={cn("flex items-center gap-1.5 rounded-md px-4 py-2 text-sm font-medium transition-colors", tab === "participants" ? "bg-card shadow-sm text-amber-600" : "text-muted-foreground")}>
          <Users className="h-3.5 w-3.5" /> Teilnehmer
        </button>
        {isAdmin && (
          <button onClick={() => setTab("settings")} className={cn("flex items-center gap-1.5 rounded-md px-4 py-2 text-sm font-medium transition-colors", tab === "settings" ? "bg-card shadow-sm text-amber-600" : "text-muted-foreground")}>
            <Settings className="h-3.5 w-3.5" /> Einstellungen
          </button>
        )}
      </div>

      {/* Tab: Content — Block-based Editor */}
      {tab === "content" && (
        <div className="space-y-3">
          {chapters.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-16 text-muted-foreground">
                <BookOpen className="h-8 w-8 mb-2 opacity-40" />
                <p className="text-sm">Noch keine Kapitel vorhanden</p>
                {isAdmin && <p className="text-xs mt-1">Füge unten einen Block hinzu, um zu starten.</p>}
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-2">
              {chapters
                .sort((a: any, b: any) => Number(a.sort_order || 0) - Number(b.sort_order || 0))
                .map((chapter: any, index: number) => {
                  const Icon = contentTypeIcons[chapter.content_type as ContentType] || FileText
                  const typeLabel = contentTypeLabels[chapter.content_type as ContentType] || chapter.content_type

                  return (
                    <Card key={chapter.id} className="group">
                      <CardContent className="p-4">
                        <div className="flex items-start gap-3">
                          {/* Sort controls */}
                          <div className="flex flex-col items-center gap-0.5 pt-1">
                            {isAdmin && (
                              <>
                                <button onClick={() => moveChapter(index, "up")} disabled={index === 0} className="p-0.5 rounded hover:bg-accent disabled:opacity-20">
                                  <ChevronUp className="h-3.5 w-3.5 text-muted-foreground" />
                                </button>
                                <span className="text-xs text-muted-foreground font-mono w-5 text-center">{index + 1}</span>
                                <button onClick={() => moveChapter(index, "down")} disabled={index === chapters.length - 1} className="p-0.5 rounded hover:bg-accent disabled:opacity-20">
                                  <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
                                </button>
                              </>
                            )}
                            {!isAdmin && <span className="text-xs text-muted-foreground font-mono w-5 text-center">{index + 1}</span>}
                          </div>

                          {/* Block content */}
                          <div className="flex-1 min-w-0 space-y-2">
                            {/* Header with badge and title */}
                            <div className="flex items-center gap-2">
                              <Badge className="bg-amber-600/10 text-amber-700 border-amber-200 text-[10px] px-1.5 py-0 shrink-0">
                                <Icon className="h-3 w-3 mr-1" />
                                {typeLabel}
                              </Badge>
                              {savingChapterId === chapter.id && (
                                <span className="flex items-center gap-1 text-[10px] text-muted-foreground">
                                  <Loader2 className="h-3 w-3 animate-spin" /> Speichert...
                                </span>
                              )}
                            </div>

                            {/* Title input */}
                            {isAdmin ? (
                              <Input
                                value={chapter.title}
                                onChange={e => updateChapterLocal(chapter.id, "title", e.target.value)}
                                onBlur={() => saveChapterNow(chapter.id)}
                                className="h-8 font-medium text-sm"
                                placeholder="Kapitelüberschrift..."
                              />
                            ) : (
                              <h4 className="font-medium text-sm">{chapter.title}</h4>
                            )}

                            {/* Inline editor by content type */}
                            {isAdmin ? (
                              <>
                                {chapter.content_type === "text" && (
                                  <RichTextEditor
                                    content={chapter.content || "<p></p>"}
                                    onChange={(html) => updateChapterLocal(chapter.id, "content", html)}
                                  />
                                )}

                                {chapter.content_type === "video" && (
                                  <div className="space-y-2">
                                    <Input
                                      value={chapter.media_url || ""}
                                      onChange={e => updateChapterLocal(chapter.id, "media_url", e.target.value)}
                                      onBlur={() => saveChapterNow(chapter.id)}
                                      placeholder="https://youtube.com/watch?v=... oder Video-URL"
                                      className="h-8 text-sm"
                                    />
                                    {chapter.media_url && (
                                      <div className="rounded-lg overflow-hidden border bg-muted/30 aspect-video max-w-md">
                                        {chapter.media_url.includes("youtube.com") || chapter.media_url.includes("youtu.be") ? (
                                          <iframe
                                            src={`https://www.youtube.com/embed/${extractYouTubeId(chapter.media_url)}`}
                                            className="w-full h-full"
                                            allowFullScreen
                                          />
                                        ) : (
                                          <video src={chapter.media_url} controls className="w-full h-full" />
                                        )}
                                      </div>
                                    )}
                                  </div>
                                )}

                                {chapter.content_type === "image" && (
                                  <div className="space-y-2">
                                    <Input
                                      value={chapter.media_url || ""}
                                      onChange={e => updateChapterLocal(chapter.id, "media_url", e.target.value)}
                                      onBlur={() => saveChapterNow(chapter.id)}
                                      placeholder="Bild-URL eingeben..."
                                      className="h-8 text-sm"
                                    />
                                    <Input
                                      value={chapter.content || ""}
                                      onChange={e => updateChapterLocal(chapter.id, "content", e.target.value)}
                                      onBlur={() => saveChapterNow(chapter.id)}
                                      placeholder="Alt-Text / Beschreibung"
                                      className="h-8 text-sm"
                                    />
                                    {chapter.media_url && (
                                      <div className="rounded-lg overflow-hidden border bg-muted/30 max-w-md">
                                        <img src={chapter.media_url} alt={chapter.content || ""} className="w-full h-auto" />
                                      </div>
                                    )}
                                  </div>
                                )}

                                {chapter.content_type === "link" && (
                                  <div className="space-y-2">
                                    <Input
                                      value={chapter.media_url || ""}
                                      onChange={e => updateChapterLocal(chapter.id, "media_url", e.target.value)}
                                      onBlur={() => saveChapterNow(chapter.id)}
                                      placeholder="https://docs.example.com/..."
                                      className="h-8 text-sm"
                                    />
                                    <Input
                                      value={chapter.content || ""}
                                      onChange={e => updateChapterLocal(chapter.id, "content", e.target.value)}
                                      onBlur={() => saveChapterNow(chapter.id)}
                                      placeholder="Link-Label / Beschreibung"
                                      className="h-8 text-sm"
                                    />
                                  </div>
                                )}

                                {chapter.content_type === "file" && (
                                  <div className="space-y-2">
                                    <Input
                                      value={chapter.media_url || ""}
                                      onChange={e => updateChapterLocal(chapter.id, "media_url", e.target.value)}
                                      onBlur={() => saveChapterNow(chapter.id)}
                                      placeholder="/pfad/zur/datei.pdf oder URL"
                                      className="h-8 text-sm"
                                    />
                                    <Input
                                      value={chapter.content || ""}
                                      onChange={e => updateChapterLocal(chapter.id, "content", e.target.value)}
                                      onBlur={() => saveChapterNow(chapter.id)}
                                      placeholder="Datei-Label / Beschreibung"
                                      className="h-8 text-sm"
                                    />
                                  </div>
                                )}
                              </>
                            ) : (
                              /* Read-only view for non-admins */
                              <div className="mt-1">
                                {chapter.content_type === "text" && chapter.content && (
                                  <div
                                    className="prose prose-sm dark:prose-invert max-w-none"
                                    dangerouslySetInnerHTML={{ __html: chapter.content }}
                                  />
                                )}
                                {(chapter.content_type === "video" || chapter.content_type === "link") && chapter.media_url && (
                                  <a href={chapter.media_url} target="_blank" rel="noopener noreferrer" className="text-xs text-amber-600 hover:underline break-all">
                                    {chapter.content || chapter.media_url}
                                  </a>
                                )}
                                {chapter.content_type === "image" && chapter.media_url && (
                                  <img src={chapter.media_url} alt={chapter.content || ""} className="rounded-lg max-w-md" />
                                )}
                                {chapter.content_type === "file" && chapter.media_url && (
                                  <a href={chapter.media_url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1.5 text-xs text-amber-600 hover:underline">
                                    <FileDown className="h-3.5 w-3.5" />
                                    {chapter.content || chapter.media_url}
                                  </a>
                                )}
                              </div>
                            )}
                          </div>

                          {/* Delete button */}
                          {isAdmin && (
                            <div className="shrink-0 pt-6">
                              <button onClick={() => deleteChapter(chapter.id)} className="p-1.5 rounded-lg hover:bg-accent opacity-0 group-hover:opacity-100 transition-opacity">
                                <Trash2 className="h-3.5 w-3.5 text-muted-foreground hover:text-red-500" />
                              </button>
                            </div>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  )
                })}
            </div>
          )}

          {/* Block Type Picker for adding new chapters */}
          {isAdmin && (
            <Card className="border-dashed">
              <CardContent className="p-4">
                <p className="text-xs text-muted-foreground font-medium mb-1">Kapitel hinzufügen:</p>
                <BlockTypePicker onSelect={addChapterBlock} />
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {/* Tab: Participants */}
      {tab === "participants" && (
        <div className="space-y-3">
          {isAdmin && (
            <div className="flex justify-end">
              <Button onClick={() => { fetchUsers(); setAssignUserId(""); setAssignDueDate(""); setShowAssign(true) }} className="bg-amber-600 hover:bg-amber-700">
                <Plus className="h-4 w-4" /> Mitarbeiter zuweisen
              </Button>
            </div>
          )}

          {assignments.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-16 text-muted-foreground">
                <Users className="h-8 w-8 mb-2 opacity-40" />
                <p className="text-sm">Noch keine Teilnehmer zugewiesen</p>
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Mitarbeiter</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Fortschritt</TableHead>
                      <TableHead>Fälligkeitsdatum</TableHead>
                      {isAdmin && <TableHead className="w-16">Aktionen</TableHead>}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {assignments.map((a: any) => {
                      const status = a.status || "assigned"
                      const progress = Number(a.progress || 0)
                      const dueDate = a.due_date ? new Date(a.due_date) : null
                      const isOverdue = dueDate && dueDate < new Date() && status !== "completed"
                      const displayStatus = isOverdue ? "overdue" : status
                      const DisplayIcon = statusIcons[displayStatus] || CircleDashed

                      return (
                        <TableRow key={a.id}>
                          <TableCell>
                            <div>
                              <p className="font-medium text-sm">{a.user_name || a.name || `User #${a.user_id}`}</p>
                              {a.user_email && <p className="text-xs text-muted-foreground">{a.user_email}</p>}
                            </div>
                          </TableCell>
                          <TableCell>
                            <span className={cn("inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-semibold", statusColors[displayStatus] || statusColors.assigned)}>
                              <DisplayIcon className="h-3 w-3" />
                              {statusLabels[displayStatus] || displayStatus}
                            </span>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2 min-w-[120px]">
                              <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
                                <div
                                  className={cn("h-full rounded-full transition-all", progress >= 100 ? "bg-emerald-500" : "bg-amber-500")}
                                  style={{ width: `${Math.min(progress, 100)}%` }}
                                />
                              </div>
                              <span className="text-xs text-muted-foreground tabular-nums w-10 text-right">{Number(progress).toFixed(0)}%</span>
                            </div>
                          </TableCell>
                          <TableCell>
                            {dueDate ? (
                              <span className={cn("flex items-center gap-1 text-xs", isOverdue ? "text-red-600 font-medium" : "text-muted-foreground")}>
                                <CalendarDays className="h-3.5 w-3.5" />
                                {dueDate.toLocaleDateString("de-DE")}
                              </span>
                            ) : (
                              <span className="text-xs text-muted-foreground">--</span>
                            )}
                          </TableCell>
                          {isAdmin && (
                            <TableCell>
                              <button onClick={() => removeAssignment(a.id)} className="p-1.5 rounded-lg hover:bg-accent">
                                <Trash2 className="h-3.5 w-3.5 text-muted-foreground" />
                              </button>
                            </TableCell>
                          )}
                        </TableRow>
                      )
                    })}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {/* Tab: Settings */}
      {tab === "settings" && isAdmin && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Modul bearbeiten</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={saveSettings} className="space-y-4 max-w-lg">
              <div className="space-y-2">
                <Label>Titel *</Label>
                <Input value={settingsForm.title} onChange={e => setSettingsForm(f => ({ ...f, title: e.target.value }))} required />
              </div>
              <div className="space-y-2">
                <Label>Beschreibung</Label>
                <Textarea value={settingsForm.description} onChange={e => setSettingsForm(f => ({ ...f, description: e.target.value }))} rows={3} />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Kategorie</Label>
                  <select
                    value={settingsForm.category}
                    onChange={e => setSettingsForm(f => ({ ...f, category: e.target.value }))}
                    className="flex h-11 w-full rounded-xl border border-border/50 bg-background/50 px-4 text-sm"
                  >
                    {categories.map(cat => <option key={cat} value={cat}>{cat}</option>)}
                  </select>
                </div>
                <div className="space-y-2">
                  <Label>Dauer (Minuten)</Label>
                  <Input type="number" min="0" value={settingsForm.duration_minutes} onChange={e => setSettingsForm(f => ({ ...f, duration_minutes: e.target.value }))} />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Dozent</Label>
                <Input value={settingsForm.instructor} onChange={e => setSettingsForm(f => ({ ...f, instructor: e.target.value }))} />
              </div>
              <Separator />
              <div className="flex items-center gap-3">
                <label className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={settingsForm.is_active}
                    onChange={e => setSettingsForm(f => ({ ...f, is_active: e.target.checked }))}
                    className="rounded border-input"
                  />
                  Modul aktiv
                </label>
                <p className="text-xs text-muted-foreground">Inaktive Module werden Teilnehmern nicht angezeigt</p>
              </div>
              <div className="flex gap-2">
                <Button type="submit" disabled={savingSettings || !settingsForm.title.trim()} className="bg-amber-600 hover:bg-amber-700">
                  {savingSettings ? <Loader2 className="h-4 w-4 animate-spin" /> : "Speichern"}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {/* Assign Dialog */}
      <Dialog open={showAssign} onOpenChange={setShowAssign}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Mitarbeiter zuweisen</DialogTitle>
          </DialogHeader>
          <form onSubmit={assignUser} className="space-y-4 px-6 py-4">
            <div className="space-y-2">
              <Label>Mitarbeiter *</Label>
              {loadingUsers ? (
                <div className="flex items-center gap-2 py-2 text-sm text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" /> Lade Mitarbeiter...</div>
              ) : (
                <select
                  value={assignUserId}
                  onChange={e => setAssignUserId(e.target.value)}
                  required
                  className="flex h-11 w-full rounded-xl border border-border/50 bg-background/50 px-4 text-sm"
                >
                  <option value="">Mitarbeiter auswählen...</option>
                  {users
                    .filter((u: any) => !assignments.some((a: any) => Number(a.user_id) === Number(u.id)))
                    .map((u: any) => (
                      <option key={u.id} value={u.id}>{u.name} ({u.email})</option>
                    ))}
                </select>
              )}
            </div>
            <div className="space-y-2">
              <Label>Fälligkeitsdatum</Label>
              <Input type="date" value={assignDueDate} onChange={e => setAssignDueDate(e.target.value)} />
            </div>
            <div className="flex justify-end gap-3 pt-4">
              <Button type="button" variant="outline" onClick={() => setShowAssign(false)}>Abbrechen</Button>
              <Button type="submit" disabled={saving || !assignUserId} className="bg-amber-600 hover:bg-amber-700">
                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : "Zuweisen"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}

/** Extract YouTube video ID from various URL formats */
function extractYouTubeId(url: string): string {
  const match = url.match(/(?:youtube\.com\/(?:watch\?v=|embed\/)|youtu\.be\/)([a-zA-Z0-9_-]{11})/)
  return match?.[1] || ""
}
