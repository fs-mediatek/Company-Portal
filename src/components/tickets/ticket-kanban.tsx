"use client"

import { useState, useEffect } from "react"
import { DragDropContext, DropResult } from "@hello-pangea/dnd"
import { KanbanColumn } from "./kanban-column"
import { Loader2, AlertCircle } from "lucide-react"

const columns = [
  { status: "open", label: "Offen", color: "bg-blue-500" },
  { status: "in_progress", label: "In Bearbeitung", color: "bg-purple-500" },
  { status: "waiting", label: "Wartend", color: "bg-amber-500" },
  { status: "resolved", label: "Gelöst", color: "bg-emerald-500" },
  { status: "closed", label: "Geschlossen", color: "bg-gray-400" },
]

interface TicketKanbanProps {
  search?: string
  priorityFilter?: string
}

export function TicketKanban({ search, priorityFilter }: TicketKanbanProps) {
  const [tickets, setTickets] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  async function fetchAll() {
    setLoading(true)
    const params = new URLSearchParams({ page: "1", limit: "500" })
    if (search) params.set("search", search)
    if (priorityFilter) params.set("priority", priorityFilter)

    try {
      const res = await fetch(`/api/tickets?${params}`)
      const data = await res.json()
      setTickets(data.tickets || [])
    } catch {}
    setLoading(false)
  }

  useEffect(() => { fetchAll() }, [search, priorityFilter])

  async function handleDragEnd(result: DropResult) {
    const { draggableId, destination, source } = result
    if (!destination || destination.droppableId === source.droppableId) return

    const ticketId = parseInt(draggableId)
    const newStatus = destination.droppableId

    // Optimistic update
    setTickets(prev =>
      prev.map(t => t.id === ticketId ? { ...t, status: newStatus } : t)
    )

    try {
      const res = await fetch(`/api/tickets/${ticketId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      })
      if (!res.ok) {
        // Revert on failure
        fetchAll()
      }
    } catch {
      fetchAll()
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (tickets.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
        <AlertCircle className="h-8 w-8 mb-2 opacity-40" />
        <p className="text-sm">Keine Meldungen gefunden</p>
      </div>
    )
  }

  return (
    <DragDropContext onDragEnd={handleDragEnd}>
      <div className="flex gap-3 overflow-x-auto pb-4">
        {columns.map(col => (
          <KanbanColumn
            key={col.status}
            status={col.status}
            label={col.label}
            color={col.color}
            tickets={tickets.filter(t => t.status === col.status)}
          />
        ))}
      </div>
    </DragDropContext>
  )
}
