"use client"
import { useEffect, useState } from "react"
import { motion, useReducedMotion } from "framer-motion"
import { Building2, Car } from "lucide-react"

interface Props {
  area: "facility" | "fleet" | null
  onDone: () => void
}

export function AreaTransition({ area, onDone }: Props) {
  const [visible, setVisible] = useState(false)
  const shouldReduceMotion = useReducedMotion()

  useEffect(() => {
    if (!area) return
    setVisible(true)
    const timer = setTimeout(() => {
      setVisible(false)
      onDone()
    }, shouldReduceMotion ? 200 : 800)
    return () => clearTimeout(timer)
  }, [area, shouldReduceMotion])

  if (!visible || !area) return null

  const isFacility = area === "facility"
  const Icon = isFacility ? Building2 : Car
  const label = isFacility ? "Facility" : "Fuhrpark"

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
      className={`fixed inset-0 z-[100] flex items-center justify-center ${
        isFacility
          ? "bg-gradient-to-br from-teal-600/95 via-emerald-600/95 to-teal-700/95"
          : "bg-gradient-to-br from-blue-600/95 via-indigo-600/95 to-blue-700/95"
      }`}
    >
      <motion.div
        initial={shouldReduceMotion ? false : { scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1], delay: 0.1 }}
        className="flex flex-col items-center gap-3"
      >
        <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-white/20 backdrop-blur-sm">
          <Icon className="h-8 w-8 text-white" />
        </div>
        <h2 className="text-xl font-bold text-white">{label}</h2>
      </motion.div>
    </motion.div>
  )
}
