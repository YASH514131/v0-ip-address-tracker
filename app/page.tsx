"use client"

import { Header } from "@/components/header"
import { StatsCards } from "@/components/stats-cards"
import { DashboardTable } from "@/components/dashboard-table"
import { VlanList } from "@/components/vlan-list"
import { Toaster } from "@/components/ui/toaster"

export default function Home() {
  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="container mx-auto max-w-7xl px-4 py-6 md:px-6">
        <div className="space-y-6">
          {/* Stats Overview */}
          <StatsCards />

          {/* VLAN Management */}
          <VlanList />

          {/* Main Dashboard Table */}
          <DashboardTable />
        </div>
      </main>
      <Toaster />
    </div>
  )
}
