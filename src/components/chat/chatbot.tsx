"use client"
import { useState, useEffect } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { MessageCircle, X, Send, Loader2, BookOpen, TicketCheck, ExternalLink } from "lucide-react"
import { cn } from "@/lib/utils"

interface ChatResult {
  type: string
  title: string
  content: string
  link?: string
}

export function Chatbot() {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState("")
  const [results, setResults] = useState<ChatResult[]>([])
  const [suggestion, setSuggestion] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [searched, setSearched] = useState(false)
  const [enabled, setEnabled] = useState(true)

  useEffect(() => {
    fetch("/api/settings").then(r => r.json()).then(d => {
      if (d?.chatbot_enabled === "false") setEnabled(false)
    }).catch(() => {})
  }, [])

  if (!enabled) return null

  async function handleSearch() {
    if (!query.trim()) return
    setLoading(true)
    setSearched(true)
    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query }),
      })
      const data = await res.json()
      setResults(data.results || [])
      setSuggestion(data.suggestion || null)
    } catch {}
    setLoading(false)
  }

  return (
    <>
      {/* Floating button */}
      <motion.button
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        onClick={() => setOpen(!open)}
        className={cn(
          "fixed bottom-6 right-6 z-50 flex h-14 w-14 items-center justify-center rounded-full shadow-lg transition-colors",
          open ? "bg-muted text-muted-foreground" : "bg-primary text-primary-foreground"
        )}
      >
        {open ? <X className="h-6 w-6" /> : <MessageCircle className="h-6 w-6" />}
      </motion.button>

      {/* Chat panel */}
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
            className="fixed bottom-24 right-6 z-50 w-80 sm:w-96 rounded-2xl border bg-card shadow-2xl overflow-hidden"
          >
            {/* Header */}
            <div className="p-4 border-b bg-primary/5">
              <h3 className="font-semibold text-sm">Hilfe & Suche</h3>
              <p className="text-xs text-muted-foreground">Durchsuchen Sie die Wissensdatenbank</p>
            </div>

            {/* Search */}
            <div className="p-3 border-b">
              <div className="flex gap-2">
                <input
                  value={query}
                  onChange={e => setQuery(e.target.value)}
                  onKeyDown={e => e.key === "Enter" && handleSearch()}
                  placeholder="Frage eingeben..."
                  className="flex-1 h-9 rounded-lg border border-input bg-background px-3 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring"
                />
                <button
                  onClick={handleSearch}
                  disabled={loading || !query.trim()}
                  className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
                >
                  {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                </button>
              </div>
            </div>

            {/* Results */}
            <div className="max-h-80 overflow-y-auto">
              {!searched ? (
                <div className="p-6 text-center text-muted-foreground">
                  <MessageCircle className="h-8 w-8 mx-auto mb-2 opacity-30" />
                  <p className="text-sm">Stellen Sie eine Frage oder suchen Sie nach einem Thema</p>
                </div>
              ) : loading ? (
                <div className="p-6 text-center">
                  <Loader2 className="h-5 w-5 animate-spin mx-auto text-muted-foreground" />
                </div>
              ) : results.length > 0 ? (
                <div className="divide-y">
                  {results.map((r, i) => (
                    <div key={i} className="p-3 hover:bg-accent/50 transition-colors">
                      <div className="flex items-start gap-2">
                        <div className={cn(
                          "flex h-6 w-6 items-center justify-center rounded-md shrink-0 mt-0.5",
                          r.type === "kb" ? "bg-purple-500/10 text-purple-500" : "bg-primary/10 text-primary"
                        )}>
                          {r.type === "kb" ? <BookOpen className="h-3.5 w-3.5" /> : <MessageCircle className="h-3.5 w-3.5" />}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium">{r.title}</p>
                          <p className="text-xs text-muted-foreground line-clamp-2 mt-0.5">{r.content}</p>
                          {r.link && (
                            <a href={r.link} className="text-xs text-primary hover:underline flex items-center gap-1 mt-1">
                              Artikel öffnen <ExternalLink className="h-3 w-3" />
                            </a>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : suggestion === "ticket" ? (
                <div className="p-4 text-center">
                  <p className="text-sm text-muted-foreground mb-3">Leider keine passenden Ergebnisse gefunden.</p>
                  <a
                    href="/helpdesk/tickets"
                    className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-purple-600 text-white text-sm font-medium hover:bg-purple-700 transition-colors"
                  >
                    <TicketCheck className="h-4 w-4" /> Ticket erstellen
                  </a>
                </div>
              ) : (
                <div className="p-6 text-center text-muted-foreground">
                  <p className="text-sm">Keine Ergebnisse gefunden</p>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  )
}
