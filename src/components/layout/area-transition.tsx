"use client"
import { useEffect, useState } from "react"
import { Building2, Car } from "lucide-react"

interface Props {
  area: "facility" | "fleet" | null
  onDone: () => void
}

/* ── SVG person figure ── */
function Person({ x, flip, delay, from }: { x: number; flip?: boolean; delay: string; from: "left" | "right" }) {
  return (
    <g
      className={`${from === "left" ? "person-walk-left" : "person-walk-right"} person-bob`}
      style={{ animationDelay: delay }}
      transform={`translate(${x}, 0)${flip ? " scale(-1,1)" : ""}`}
    >
      <circle cx="0" cy="-26" r="4" fill="white" opacity="0.25" />
      <line x1="0" y1="-22" x2="0" y2="-10" stroke="white" strokeWidth="2.5" opacity="0.2" strokeLinecap="round" />
      <line x1="0" y1="-10" x2="-3" y2="0" stroke="white" strokeWidth="2" opacity="0.18" strokeLinecap="round" />
      <line x1="0" y1="-10" x2="4" y2="0" stroke="white" strokeWidth="2" opacity="0.18" strokeLinecap="round" />
      <line x1="0" y1="-20" x2="-4" y2="-13" stroke="white" strokeWidth="1.5" opacity="0.15" strokeLinecap="round" />
      <line x1="0" y1="-20" x2="5" y2="-14" stroke="white" strokeWidth="1.5" opacity="0.15" strokeLinecap="round" />
    </g>
  )
}

/* ── SVG tree ── */
function Tree({ x, h, delay }: { x: number; h: number; delay: string }) {
  return (
    <g className="tree-sway" style={{ animationDelay: delay }}>
      <rect x={x - 2} y={-h * 0.4} width="4" height={h * 0.45} rx="2" fill="white" opacity="0.08" />
      <ellipse cx={x} cy={-h * 0.55} rx={h * 0.35} ry={h * 0.38} fill="white" opacity="0.1" />
      <ellipse cx={x - h * 0.15} cy={-h * 0.45} rx={h * 0.22} ry={h * 0.25} fill="white" opacity="0.07" />
      <ellipse cx={x + h * 0.18} cy={-h * 0.48} rx={h * 0.2} ry={h * 0.23} fill="white" opacity="0.07" />
    </g>
  )
}

/* ── Fleet vehicle with ÜAG logo ── */
function FleetVehicle({ type, delay, direction }: { type: "transporter" | "pkw" | "lkw"; delay: string; direction: "left" | "right" }) {
  const cls = direction === "left" ? "fleet-car-left" : "fleet-car-right"
  const flipScale = direction === "right" ? -1 : 1

  return (
    <g className={cls} style={{ animationDelay: delay }} transform={`scale(${flipScale}, 1)`}>
      {type === "transporter" && (
        <>
          {/* Transporter body */}
          <rect x="-55" y="-32" width="110" height="32" rx="3" fill="white" opacity="0.15" />
          {/* Cabin */}
          <path d="M45,-32 L55,-32 L62,-18 L55,-18 Z" fill="white" opacity="0.12" />
          {/* Windshield */}
          <path d="M47,-30 L54,-30 L59,-20 L47,-20 Z" fill="white" opacity="0.06" />
          {/* Cargo area */}
          <rect x="-55" y="-32" width="95" height="30" rx="2" fill="white" opacity="0.04" />
          {/* ÜAG Logo on cargo side */}
          <rect x="-30" y="-26" width="40" height="14" rx="2" fill="white" opacity="0.1" />
          <text x="-10" y="-16" textAnchor="middle" fontSize="9" fontWeight="700" fill="white" opacity="0.3" fontFamily="Inter, sans-serif">ÜAG</text>
          {/* Wheels */}
          <circle cx="-35" cy="3" r="7" fill="white" opacity="0.18" />
          <circle cx="40" cy="3" r="7" fill="white" opacity="0.18" />
          <circle cx="-35" cy="3" r="3.5" fill="white" opacity="0.06" />
          <circle cx="40" cy="3" r="3.5" fill="white" opacity="0.06" />
        </>
      )}
      {type === "pkw" && (
        <>
          {/* Car body */}
          <path d="M-35,-10 L-30,-10 L-22,-25 L18,-27 L35,-15 L40,-10 L40,0 L-38,0 L-38,-10 Z" fill="white" opacity="0.14" />
          {/* Roof */}
          <path d="M-18,-25 L15,-27 L28,-17 L-25,-15 Z" fill="white" opacity="0.06" />
          {/* ÜAG on door */}
          <text x="0" y="-5" textAnchor="middle" fontSize="7" fontWeight="700" fill="white" opacity="0.25" fontFamily="Inter, sans-serif">ÜAG</text>
          {/* Wheels */}
          <circle cx="-22" cy="3" r="6" fill="white" opacity="0.18" />
          <circle cx="28" cy="3" r="6" fill="white" opacity="0.18" />
          <circle cx="-22" cy="3" r="3" fill="white" opacity="0.06" />
          <circle cx="28" cy="3" r="3" fill="white" opacity="0.06" />
        </>
      )}
      {type === "lkw" && (
        <>
          {/* LKW body */}
          <rect x="-65" y="-42" width="130" height="42" rx="3" fill="white" opacity="0.15" />
          {/* Cabin */}
          <rect x="55" y="-35" width="25" height="35" rx="2" fill="white" opacity="0.13" />
          {/* Windshield */}
          <rect x="60" y="-32" width="16" height="14" rx="1" fill="white" opacity="0.06" />
          {/* ÜAG Logo large on side */}
          <rect x="-45" y="-34" width="55" height="18" rx="2" fill="white" opacity="0.1" />
          <text x="-18" y="-21" textAnchor="middle" fontSize="12" fontWeight="700" fill="white" opacity="0.3" fontFamily="Inter, sans-serif">ÜAG</text>
          {/* Wheels */}
          <circle cx="-40" cy="4" r="8" fill="white" opacity="0.18" />
          <circle cx="-20" cy="4" r="8" fill="white" opacity="0.18" />
          <circle cx="55" cy="4" r="8" fill="white" opacity="0.18" />
          <circle cx="-40" cy="4" r="4" fill="white" opacity="0.06" />
          <circle cx="-20" cy="4" r="4" fill="white" opacity="0.06" />
          <circle cx="55" cy="4" r="4" fill="white" opacity="0.06" />
        </>
      )}
    </g>
  )
}

export function AreaTransition({ area, onDone }: Props) {
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    if (!area) return
    setVisible(true)
    const timer = setTimeout(() => {
      setVisible(false)
      onDone()
    }, 3000)
    return () => clearTimeout(timer)
  }, [area])

  if (!visible || !area) return null

  const isFacility = area === "facility"
  const Icon = isFacility ? Building2 : Car
  const gradient = isFacility
    ? "from-teal-600/95 via-emerald-600/95 to-teal-700/95"
    : "from-blue-600/95 via-indigo-600/95 to-blue-700/95"
  const label = isFacility ? "Facility" : "Fuhrpark"
  const sublabel = isFacility ? "Gebäude & Störungen" : "Fahrzeuge & Flotte"

  return (
    <div className={`area-overlay fixed inset-0 z-[100] flex items-center justify-center bg-gradient-to-br ${gradient} backdrop-blur-sm`}>
      {/* Radial pulse */}
      <div className="area-pulse absolute w-32 h-32 rounded-full bg-white/20" />

      {isFacility ? (
        /* ───── Facility: ÜAG building + animated people ───── */
        <div className="absolute bottom-0 left-0 right-0 flex items-end justify-center overflow-hidden" style={{ height: "55%" }}>
          <svg
            className="facility-bg-anim w-full max-w-2xl"
            viewBox="-50 -160 700 260"
            fill="none"
            style={{ transformOrigin: "bottom center" }}
          >
            {/* Ground */}
            <rect x="-50" y="95" width="700" height="10" fill="white" opacity="0.05" rx="1" />
            <line x1="-50" y1="95" x2="650" y2="95" stroke="white" strokeWidth="0.5" opacity="0.15" />
            <rect x="200" y="88" width="200" height="8" fill="white" opacity="0.03" rx="1" />

            {/* Trees left */}
            <g transform="translate(0, 95)">
              <Tree x={-20} h={70} delay="0.5s" />
              <Tree x={30} h={55} delay="1.2s" />
              <Tree x={70} h={45} delay="0.8s" />
            </g>

            {/* Main building */}
            <g>
              <rect x="100" y="-60" width="400" height="155" rx="2" fill="white" opacity="0.1" />
              <path d="M90,-62 L105,-72 L495,-72 L510,-62 L100,-62 Z" fill="white" opacity="0.08" />
              <line x1="90" y1="-62" x2="510" y2="-62" stroke="white" strokeWidth="1" opacity="0.15" />

              {/* Glass entrance center */}
              <rect x="255" y="-70" width="90" height="165" rx="1" fill="white" opacity="0.06" />
              {[0,1,2,3,4,5].map(row => (
                <line key={`eg${row}`} x1="255" y1={-55 + row * 25} x2="345" y2={-55 + row * 25} stroke="white" strokeWidth="0.5" opacity="0.12" />
              ))}
              {[0,1,2].map(col => (
                <line key={`ev${col}`} x1={275 + col * 30} y1="-70" x2={275 + col * 30} y2="95" stroke="white" strokeWidth="0.5" opacity="0.1" />
              ))}
              <rect x="280" y="65" width="40" height="30" rx="1" fill="white" opacity="0.08" />
              <line x1="300" y1="65" x2="300" y2="95" stroke="white" strokeWidth="0.5" opacity="0.12" />

              {/* Windows left wing */}
              {[0,1,2,3,4,5].map(i => (
                <rect key={`ul${i}`} x={115 + i * 22} y="-48" width="16" height="20" rx="1" fill="white" opacity={0.06 + ((i * 17) % 5) * 0.01} />
              ))}
              {[0,1,2,3,4,5].map(i => (
                <rect key={`ll${i}`} x={115 + i * 22} y="8" width="16" height="20" rx="1" fill="white" opacity={0.05 + ((i * 23) % 5) * 0.01} />
              ))}
              {/* Windows right wing */}
              {[0,1,2,3,4,5].map(i => (
                <rect key={`ur${i}`} x={360 + i * 22} y="-48" width="16" height="20" rx="1" fill="white" opacity={0.06 + ((i * 13) % 5) * 0.01} />
              ))}
              {[0,1,2,3,4,5].map(i => (
                <rect key={`lr${i}`} x={360 + i * 22} y="8" width="16" height="20" rx="1" fill="white" opacity={0.05 + ((i * 19) % 5) * 0.01} />
              ))}
              <rect x="240" y="-48" width="12" height="35" rx="1" fill="white" opacity="0.05" />
              <rect x="348" y="-48" width="12" height="35" rx="1" fill="white" opacity="0.05" />
              <line x1="100" y1="-2" x2="500" y2="-2" stroke="white" strokeWidth="0.5" opacity="0.08" />
            </g>

            {/* Sign */}
            <g transform="translate(230, 70)">
              <rect x="-1" y="-15" width="2" height="25" fill="white" opacity="0.1" />
              <circle cx="0" cy="-20" r="5" fill="white" opacity="0.08" />
            </g>

            {/* Trees right */}
            <g transform="translate(0, 95)">
              <Tree x={530} h={50} delay="1.5s" />
              <Tree x={580} h={65} delay="0.3s" />
            </g>

            {/* Animated people */}
            <g transform="translate(0, 95)">
              <Person x={200} from="left" delay="0.6s" />
              <Person x={350} from="right" flip delay="0.9s" />
              <Person x={100} from="left" delay="1.2s" />
              <Person x={300} from="left" delay="0.3s" />
              <Person x={470} from="right" flip delay="1.0s" />
            </g>

            {/* Bushes */}
            <g opacity="0.08">
              <ellipse cx="140" cy="90" rx="25" ry="10" fill="white" />
              <ellipse cx="460" cy="90" rx="30" ry="9" fill="white" />
              <ellipse cx="80" cy="92" rx="20" ry="7" fill="white" />
            </g>
          </svg>
        </div>
      ) : (
        /* ───── Fleet: ÜAG vehicles driving across ───── */
        <div className="absolute bottom-[12%] left-0 right-0 overflow-hidden" style={{ height: "50%" }}>
          <svg className="w-full h-full" viewBox="-600 -80 1200 160" preserveAspectRatio="xMidYMid meet">
            {/* Road surface */}
            <rect x="-600" y="12" width="1200" height="40" fill="white" opacity="0.04" rx="2" />
            <line x1="-600" y1="12" x2="600" y2="12" stroke="white" strokeWidth="0.5" opacity="0.12" />
            <line x1="-600" y1="52" x2="600" y2="52" stroke="white" strokeWidth="0.5" opacity="0.08" />

            {/* Dashed center line */}
            {Array.from({ length: 20 }).map((_, i) => (
              <rect key={`dash${i}`} x={-580 + i * 60} y="30" width="30" height="2" rx="1" fill="white" opacity="0.1" />
            ))}

            {/* ── Vehicles driving left to right (top lane) ── */}
            <g transform="translate(-200, 22)">
              <FleetVehicle type="transporter" delay="0.2s" direction="left" />
            </g>
            <g transform="translate(150, 22)">
              <FleetVehicle type="pkw" delay="0.5s" direction="left" />
            </g>
            <g transform="translate(450, 22)">
              <FleetVehicle type="transporter" delay="0.8s" direction="left" />
            </g>

            {/* ── Vehicles driving right to left (bottom lane) ── */}
            <g transform="translate(100, 42)">
              <FleetVehicle type="lkw" delay="0.4s" direction="right" />
            </g>
            <g transform="translate(-300, 42)">
              <FleetVehicle type="pkw" delay="0.7s" direction="right" />
            </g>
          </svg>
        </div>
      )}

      {/* Center icon + text */}
      <div className="relative flex flex-col items-center gap-4">
        <div className="area-icon-pop flex h-20 w-20 items-center justify-center rounded-3xl bg-white/20 backdrop-blur-sm shadow-2xl">
          <Icon className="h-10 w-10 text-white" />
        </div>
        <div className="area-label-slide text-center">
          <h2 className="text-2xl font-bold text-white">{label}</h2>
          <p className="text-white/60 text-sm mt-0.5">{sublabel}</p>
        </div>
      </div>
    </div>
  )
}
