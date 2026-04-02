"use client"
import { useState, useEffect, useRef } from "react"
import { AreaTransition } from "./area-transition"

export function DashboardShell({ children }: { children: React.ReactNode }) {
  const [transitionArea, setTransitionArea] = useState<"facility" | "fleet" | null>(null)
  const keyRef = useRef(0)

  useEffect(() => {
    function handleSwitch(e: Event) {
      const area = (e as CustomEvent).detail as "facility" | "fleet"
      keyRef.current++
      setTransitionArea(area)
    }
    window.addEventListener("area-switch", handleSwitch)
    return () => window.removeEventListener("area-switch", handleSwitch)
  }, [])

  return (
    <>
      {children}
      <AreaTransition
        key={keyRef.current}
        area={transitionArea}
        onDone={() => setTransitionArea(null)}
      />
    </>
  )
}
