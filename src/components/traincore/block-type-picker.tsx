"use client"
import { FileText, Image, PlayCircle, Video, FileDown, Link, AlertCircle, Minus } from "lucide-react"
import { Button } from "@/components/ui/button"

const blockTypes = [
  { type: "text", label: "Fließtext", icon: FileText },
  { type: "image", label: "Bild", icon: Image },
  { type: "video", label: "YouTube / Video", icon: PlayCircle },
  { type: "file", label: "Datei", icon: FileDown },
  { type: "link", label: "Link", icon: Link },
]

export function BlockTypePicker({ onSelect }: { onSelect: (type: string) => void }) {
  return (
    <div className="flex flex-wrap gap-1.5 pt-2">
      {blockTypes.map(({ type, label, icon: Icon }) => (
        <Button key={type} variant="outline" size="sm" className="text-xs gap-1.5" onClick={() => onSelect(type)}>
          <Icon className="h-3 w-3" />
          {label}
        </Button>
      ))}
    </div>
  )
}
