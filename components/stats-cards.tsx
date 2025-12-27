"use client"

import { Server, Globe, CheckCircle, Clock, AlertCircle, Network } from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"
import { useStore } from "@/lib/store"

export function StatsCards() {
  const { devices, ipAddresses, vlans } = useStore()

  const stats = {
    totalDevices: devices.length,
    totalIps: ipAddresses.length,
    available: ipAddresses.filter((ip) => ip.status === "available").length,
    assigned: ipAddresses.filter((ip) => ip.status === "assigned").length,
    reserved: ipAddresses.filter((ip) => ip.status === "reserved").length,
    vlans: vlans.length,
  }

  const cards = [
    {
      label: "Devices",
      value: stats.totalDevices,
      icon: Server,
      color: "text-sky-600 dark:text-sky-400",
      bgColor: "bg-sky-500/10",
    },
    {
      label: "Total IPs",
      value: stats.totalIps,
      icon: Globe,
      color: "text-foreground",
      bgColor: "bg-muted",
    },
    {
      label: "Available",
      value: stats.available,
      icon: CheckCircle,
      color: "text-emerald-600 dark:text-emerald-400",
      bgColor: "bg-emerald-500/10",
    },
    {
      label: "Assigned",
      value: stats.assigned,
      icon: Clock,
      color: "text-sky-600 dark:text-sky-400",
      bgColor: "bg-sky-500/10",
    },
    {
      label: "Reserved",
      value: stats.reserved,
      icon: AlertCircle,
      color: "text-amber-600 dark:text-amber-400",
      bgColor: "bg-amber-500/10",
    },
    {
      label: "VLANs",
      value: stats.vlans,
      icon: Network,
      color: "text-violet-600 dark:text-violet-400",
      bgColor: "bg-violet-500/10",
    },
  ]

  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
      {cards.map((card) => (
        <Card key={card.label} className="border-border/50">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className={`rounded-lg p-2 ${card.bgColor}`}>
                <card.icon className={`h-4 w-4 ${card.color}`} />
              </div>
              <div>
                <p className="text-2xl font-bold">{card.value}</p>
                <p className="text-xs text-muted-foreground">{card.label}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}
