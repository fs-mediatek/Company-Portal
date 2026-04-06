"use client"
import { useEditor, EditorContent } from "@tiptap/react"
import StarterKit from "@tiptap/starter-kit"
import Underline from "@tiptap/extension-underline"
import Link from "@tiptap/extension-link"
import { Bold, Italic, Underline as UnderlineIcon, List, ListOrdered, Heading2, Heading3 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

interface Props {
  content: string
  onChange: (html: string) => void
}

export function RichTextEditor({ content, onChange }: Props) {
  const editor = useEditor({
    immediatelyRender: false,
    extensions: [
      StarterKit,
      Underline,
      Link.configure({ openOnClick: false }),
    ],
    content,
    onUpdate: ({ editor }) => {
      onChange(editor.getHTML())
    },
  })

  if (!editor) return null

  const tools = [
    { icon: Bold, action: () => editor.chain().focus().toggleBold().run(), active: editor.isActive("bold") },
    { icon: Italic, action: () => editor.chain().focus().toggleItalic().run(), active: editor.isActive("italic") },
    { icon: UnderlineIcon, action: () => editor.chain().focus().toggleUnderline().run(), active: editor.isActive("underline") },
    { icon: Heading2, action: () => editor.chain().focus().toggleHeading({ level: 2 }).run(), active: editor.isActive("heading", { level: 2 }) },
    { icon: Heading3, action: () => editor.chain().focus().toggleHeading({ level: 3 }).run(), active: editor.isActive("heading", { level: 3 }) },
    { icon: List, action: () => editor.chain().focus().toggleBulletList().run(), active: editor.isActive("bulletList") },
    { icon: ListOrdered, action: () => editor.chain().focus().toggleOrderedList().run(), active: editor.isActive("orderedList") },
  ]

  return (
    <div className="rounded-lg border bg-background">
      <div className="flex items-center gap-0.5 border-b p-1">
        {tools.map(({ icon: Icon, action, active }, i) => (
          <Button
            key={i}
            type="button"
            variant="ghost"
            size="icon"
            className={cn("h-7 w-7", active && "bg-accent")}
            onClick={action}
          >
            <Icon className="h-3.5 w-3.5" />
          </Button>
        ))}
      </div>
      <EditorContent editor={editor} className="prose prose-sm dark:prose-invert max-w-none p-3 min-h-[100px] focus:outline-none [&_.tiptap]:outline-none [&_.tiptap]:min-h-[80px]" />
    </div>
  )
}
