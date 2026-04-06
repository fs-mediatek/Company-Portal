"use client"
import { useState, useEffect } from "react"
import { useParams } from "next/navigation"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Star, CheckCircle2, Loader2 } from "lucide-react"
import { cn } from "@/lib/utils"

export default function SatisfactionPage() {
  const { token } = useParams<{ token: string }>()
  const [ticket, setTicket] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [rating, setRating] = useState(0)
  const [hover, setHover] = useState(0)
  const [comment, setComment] = useState("")
  const [submitted, setSubmitted] = useState(false)
  const [alreadyRated, setAlreadyRated] = useState(false)

  useEffect(() => {
    fetch(`/api/satisfaction/${token}`).then(r => r.json()).then(d => {
      if (d.already_rated) setAlreadyRated(true)
      else setTicket(d)
      setLoading(false)
    }).catch(() => setLoading(false))
  }, [token])

  async function submit() {
    if (rating === 0) return
    await fetch(`/api/satisfaction/${token}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ rating, comment }),
    })
    setSubmitted(true)
  }

  if (loading) return <div className="min-h-screen flex items-center justify-center"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>

  if (alreadyRated || submitted) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <Card className="max-w-md w-full">
          <CardContent className="p-8 text-center">
            <CheckCircle2 className="h-12 w-12 text-emerald-500 mx-auto mb-4" />
            <h1 className="text-xl font-bold mb-2">Vielen Dank!</h1>
            <p className="text-muted-foreground text-sm">Ihre Bewertung wurde gespeichert. Wir nutzen Ihr Feedback zur Verbesserung unseres Services.</p>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="max-w-md w-full">
        <CardContent className="p-8 space-y-6">
          <div className="text-center">
            <h1 className="text-xl font-bold mb-1">Wie zufrieden waren Sie?</h1>
            <p className="text-muted-foreground text-sm">
              Ticket: <span className="font-mono">{ticket?.ticket_number}</span>
            </p>
            <p className="text-sm mt-1">{ticket?.title}</p>
          </div>

          {/* Star rating */}
          <div className="flex justify-center gap-2">
            {[1, 2, 3, 4, 5].map(i => (
              <button
                key={i}
                onClick={() => setRating(i)}
                onMouseEnter={() => setHover(i)}
                onMouseLeave={() => setHover(0)}
                className="p-1 transition-transform hover:scale-110"
              >
                <Star className={cn(
                  "h-8 w-8 transition-colors",
                  i <= (hover || rating) ? "fill-amber-400 text-amber-400" : "text-muted-foreground/30"
                )} />
              </button>
            ))}
          </div>

          <Textarea
            value={comment}
            onChange={e => setComment(e.target.value)}
            placeholder="Optionaler Kommentar..."
            rows={3}
          />

          <Button onClick={submit} disabled={rating === 0} className="w-full">
            Bewertung abgeben
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}
