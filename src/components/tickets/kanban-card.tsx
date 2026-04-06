"use client"

import Link from "next/link"
import { Draggable } from "@hello-pangea/dnd"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { formatDistanceToNow } from "date-fns"
import { de } from "date-fns/locale"

const priorityConfig: Record<string, { label: string; variant: any }> = {
  low: { label: "Niedrig", variant: "secondary" },
  medium: { label: "Mittel", variant: "default" },
  high: { label: "Hoch", variant: "warning" },
  critical: { label: "Kritisch", variant: "destructive" },
}

interface KanbanCardProps {
  ticket: any
  index: number
}

export function KanbanCard({ ticket, index }: KanbanCardProps) {
  const pc = priorityConfig[ticket.priority] || { label: ticket.priority, variant: "secondary" }
  const initials = ticket.assignee_name
    ? ticket.assignee_name.split(" ").map((w: string) => w[0]).join("").slice(0, 2).toUpperCase()
    : null

  return (
    <Draggable draggableId={String(ticket.id)} index={index}>
      {(provided, snapshot) => (
        <div
          ref={provided.innerRef}
          {...provided.draggableProps}
          {...provided.dragHandleProps}
          className={`rounded-lg border bg-card p-3 transition-shadow duration-150 ${
            snapshot.isDragging ? "shadow-lg ring-2 ring-primary/20" : "hover:shadow-sm"
          }`}
        >
          <Link href={`/tickets/${ticket.id}`} className="block space-y-2">
            <div className="flex items-start justify-between gap-2">
              <span className="text-xs font-mono text-muted-foreground">{ticket.ticket_number}</span>
              <Badge variant={pc.variant} className="text-[10px] px-1.5 py-0.5">{pc.label}</Badge>
            </div>
            <p className="text-sm font-medium leading-snug line-clamp-2">{ticket.title}</p>
            <div className="flex items-center justify-between pt-1">
              <span className="text-xs text-muted-foreground">{ticket.category}</span>
              <div className="flex items-center gap-1.5">
                <span className="text-xs text-muted-foreground">
                  {formatDistanceToNow(new Date(ticket.created_at), { locale: de, addSuffix: true })}
                </span>
                {initials && (
                  <Avatar className="h-5 w-5">
                    <AvatarFallback className="text-[9px]">{initials}</AvatarFallback>
                  </Avatar>
                )}
              </div>
            </div>
          </Link>
        </div>
      )}
    </Draggable>
  )
}
