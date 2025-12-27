"use client"

import * as React from "react"
import { Header } from "@/components/header"
import { StatsCards } from "@/components/stats-cards"
import { DashboardTable } from "@/components/dashboard-table"
import { VlanList } from "@/components/vlan-list"
import { VlanDetailPage } from "@/components/vlan-detail-page"
import { OthersPage } from "@/components/others-page"
import { Toaster } from "@/components/ui/toaster"
import type { VLAN } from "@/lib/types"

type ViewState = { type: "dashboard" } | { type: "vlan"; vlan: VLAN; colorIndex: number } | { type: "others" }

export default function Home() {
  const [view, setView] = React.useState<ViewState>({ type: "dashboard" })

  const handleVlanClick = (vlan: VLAN, colorIndex: number) => {
    setView({ type: "vlan", vlan, colorIndex })
  }

  const handleOthersClick = () => {
    setView({ type: "others" })
  }

  const handleBack = () => {
    setView({ type: "dashboard" })
  }

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="container mx-auto max-w-7xl px-4 py-6 md:px-6">
        {view.type === "dashboard" && (
          <div className="space-y-6">
            {/* Stats Overview */}
            <StatsCards onOthersClick={handleOthersClick} />

            {/* VLAN Management */}
            <VlanList onVlanClick={handleVlanClick} />

            {/* Main Dashboard Table */}
            <DashboardTable />
          </div>
        )}

        {view.type === "vlan" && <VlanDetailPage vlan={view.vlan} colorIndex={view.colorIndex} onBack={handleBack} />}

        {view.type === "others" && <OthersPage onBack={handleBack} />}
      </main>
      <Toaster />
    </div>
  )
}
