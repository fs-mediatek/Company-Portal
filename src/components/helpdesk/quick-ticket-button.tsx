"use client"
import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Plus } from "lucide-react"
import { HelpdeskTicketCreateDialog } from "./ticket-create-dialog"
import { useRouter } from "next/navigation"

export function QuickTicketButton() {
  const [open, setOpen] = useState(false)
  const router = useRouter()

  return (
    <>
      <Button onClick={() => setOpen(true)} className="bg-purple-600 hover:bg-purple-700">
        <Plus className="h-4 w-4" /> Neues Ticket
      </Button>
      <HelpdeskTicketCreateDialog
        open={open}
        onOpenChange={setOpen}
        onCreated={() => router.refresh()}
      />
    </>
  )
}
