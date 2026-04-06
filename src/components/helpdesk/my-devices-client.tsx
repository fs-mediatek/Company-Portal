"use client"
import { useState, useEffect } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Monitor, Smartphone, Tablet, Loader2, AlertCircle, CheckCircle2 } from "lucide-react"

const statusConfig: Record<string, { label: string; variant: any }> = {
  available: { label: "Verfügbar", variant: "success" },
  assigned: { label: "Zugewiesen", variant: "info" },
  maintenance: { label: "Wartung", variant: "warning" },
  retired: { label: "Ausgemustert", variant: "secondary" },
}

const platformIcons: Record<string, any> = {
  windows: Monitor,
  ios: Tablet,
  android: Smartphone,
}

export function MyDevicesClient() {
  const [myDevices, setMyDevices] = useState<any[]>([])
  const [claimable, setClaimable] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [claiming, setClaiming] = useState(false)

  async function fetchData() {
    setLoading(true)
    try {
      const [myRes, claimRes] = await Promise.all([
        fetch("/api/helpdesk/assets/my"),
        fetch("/api/helpdesk/assets/claim"),
      ])
      const myData = await myRes.json()
      const claimData = await claimRes.json()
      setMyDevices(Array.isArray(myData) ? myData : [])
      setClaimable(Array.isArray(claimData) ? claimData : [])
    } catch {}
    setLoading(false)
  }

  useEffect(() => { fetchData() }, [])

  async function claimAll() {
    if (claimable.length === 0) return
    setClaiming(true)
    await fetch("/api/helpdesk/assets/claim", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ asset_ids: claimable.map(a => a.id) }),
    })
    setClaiming(false)
    fetchData()
  }

  if (loading) return <div className="flex justify-center py-16"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold">Meine Geräte</h1>
        <p className="text-muted-foreground text-sm mt-0.5">Ihnen zugewiesene IT-Geräte</p>
      </div>

      {/* Claimable devices */}
      {claimable.length > 0 && (
        <Card className="border-purple-500/20 bg-purple-500/5">
          <CardContent className="p-5">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-semibold text-sm">Neue Geräte verfügbar</h3>
              <Button size="sm" onClick={claimAll} disabled={claiming} className="bg-purple-600 hover:bg-purple-700">
                {claiming ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <><CheckCircle2 className="h-3.5 w-3.5 mr-1" /> Alle übernehmen</>}
              </Button>
            </div>
            <div className="space-y-2">
              {claimable.map(a => (
                <div key={a.id} className="flex items-center gap-3 text-sm">
                  {(() => { const I = platformIcons[a.platform] || Monitor; return <I className="h-4 w-4 text-muted-foreground shrink-0" /> })()}
                  <span className="font-medium">{a.name}</span>
                  <span className="text-muted-foreground">{a.model}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* My devices */}
      {myDevices.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
          <AlertCircle className="h-8 w-8 mb-2 opacity-40" />
          <p className="text-sm">Keine Geräte zugewiesen</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {myDevices.map(a => {
            const sc = statusConfig[a.status] || { label: a.status, variant: "secondary" }
            const PlatformIcon = platformIcons[a.platform] || Monitor
            return (
              <Card key={a.id}>
                <CardContent className="p-5">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-purple-500/10 text-purple-500">
                      <PlatformIcon className="h-5 w-5" />
                    </div>
                    <Badge variant={sc.variant}>{sc.label}</Badge>
                  </div>
                  <h3 className="font-semibold text-sm">{a.name}</h3>
                  <p className="text-xs text-muted-foreground mt-0.5">{a.asset_tag}</p>
                  <div className="mt-3 space-y-1 text-xs text-muted-foreground">
                    {a.manufacturer && <p>{a.manufacturer} {a.model}</p>}
                    {a.serial_number && <p className="font-mono">SN: {a.serial_number}</p>}
                    {a.os_version && <p>OS: {a.os_version}</p>}
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}
    </div>
  )
}
