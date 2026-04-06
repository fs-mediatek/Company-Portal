"use client"

import { Droppable } from "@hello-pangea/dnd"
import { KanbanCard } from "./kanban-card"
import { cn } from "@/lib/utils"

interface KanbanColumnProps {
  status: string
  label: string
  color: string
  tickets: any[]
}

export function KanbanColumn({ status, label, color, tickets }: KanbanColumnProps) {
  return (
    <div className="flex flex-col min-w-[260px] max-w-[320px] flex-1">
      {/* Column header */}
      <div className="flex items-center gap-2 mb-3 px-1">
        <div className={cn("h-2.5 w-2.5 rounded-full", color)} />
        <h3 className="text-sm font-semibold">{label}</h3>
        <span className="text-xs text-muted-foreground tabular-nums">({tickets.length})</span>
      </div>

      {/* Droppable area */}
      <Droppable droppableId={status}>
        {(provided, snapshot) => (
          <div
            ref={provided.innerRef}
            {...provided.droppableProps}
            className={cn(
              "flex-1 space-y-2 rounded-lg border border-dashed p-2 min-h-[120px] transition-colors duration-150",
              snapshot.isDraggingOver
                ? "border-primary/40 bg-primary/5"
                : "border-transparent bg-muted/30"
            )}
          >
            {tickets.length === 0 && !snapshot.isDraggingOver && (
              <p className="text-xs text-muted-foreground text-center py-6">Keine Tickets</p>
            )}
            {tickets.map((ticket, index) => (
              <KanbanCard key={ticket.id} ticket={ticket} index={index} />
            ))}
            {provided.placeholder}
          </div>
        )}
      </Droppable>
    </div>
  )
}
