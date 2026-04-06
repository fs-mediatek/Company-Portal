"use client"
import { useState, useEffect } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectTrigger, SelectContent, SelectItem, SelectValue } from "@/components/ui/select"
import { Loader2 } from "lucide-react"

interface Props {
  open: boolean
  onOpenChange: (open: boolean) => void
  onCreated: () => void
}

export function HelpdeskTicketCreateDialog({ open, onOpenChange, onCreated }: Props) {
  const [title, setTitle] = useState("")
  const [description, setDescription] = useState("")
  const [priority, setPriority] = useState("medium")
  const [category, setCategory] = useState("Sonstiges")
  const [saving, setSaving] = useState(false)
  const [categories, setCategories] = useState<any[]>([])

  useEffect(() => {
    fetch("/api/helpdesk/categories").then(r => r.json()).then(d => {
      if (Array.isArray(d) && d.length > 0) setCategories(d)
      else setCategories([{ name: "Hardware" }, { name: "Software" }, { name: "Netzwerk" }, { name: "E-Mail" }, { name: "Drucker" }, { name: "Zugang" }, { name: "Sonstiges" }])
    }).catch(() => {})
  }, [])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!title.trim()) return
    setSaving(true)
    try {
      const res = await fetch("/api/helpdesk/tickets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title, description, priority, category }),
      })
      if (res.ok) {
        setTitle("")
        setDescription("")
        setPriority("medium")
        setCategory("Sonstiges")
        onOpenChange(false)
        onCreated()
      }
    } catch {}
    setSaving(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Neues IT-Ticket</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="hd-title">Titel *</Label>
            <Input id="hd-title" value={title} onChange={e => setTitle(e.target.value)} placeholder="Kurze Beschreibung des Problems" required />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="hd-desc">Beschreibung</Label>
            <Textarea id="hd-desc" value={description} onChange={e => setDescription(e.target.value)} placeholder="Details zum Problem..." rows={4} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Kategorie</Label>
              <Select value={category} onValueChange={setCategory}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {categories.map((c: any) => <SelectItem key={c.name || c} value={c.name || c}>{c.name || c}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Priorität</Label>
              <Select value={priority} onValueChange={setPriority}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="low">Niedrig</SelectItem>
                  <SelectItem value="medium">Mittel</SelectItem>
                  <SelectItem value="high">Hoch</SelectItem>
                  <SelectItem value="critical">Kritisch</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Abbrechen</Button>
            <Button type="submit" disabled={saving || !title.trim()}>
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : "Erstellen"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
