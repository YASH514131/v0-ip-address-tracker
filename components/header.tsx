"use client"

import * as React from "react"
import { Network, Moon, Sun, Download, Trash2, FileSpreadsheet, Save, Upload } from "lucide-react"
import { useTheme } from "next-themes"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import { useStore } from "@/lib/store"
import { exportDevicesToCsv, exportIpsToCsv, downloadCsv } from "@/lib/csv-export"
import { exportDevicesToExcel, exportIpsToExcel, exportAllToExcel } from "@/lib/excel-export"
import { DeviceDialog } from "./device-dialog"
import { VlanDialog } from "./vlan-dialog"
import { ExcelImportDialog } from "./excel-import-dialog"
import { IpRangeDialog } from "./ip-range-dialog"
import { ExportFilenameDialog } from "./export-filename-dialog"
import { BackupRestoreDialog } from "./backup-restore-dialog"

type ExportType = "all" | "devices" | "ips" | "backup" | null

export function Header() {
  const { theme, setTheme } = useTheme()
  const { devices, ipAddresses, ipRanges, vlans, clearAllData } = useStore()

  const [exportDialogOpen, setExportDialogOpen] = React.useState(false)
  const [pendingExport, setPendingExport] = React.useState<ExportType>(null)
  const [defaultFilename, setDefaultFilename] = React.useState("")
  const [restoreDialogOpen, setRestoreDialogOpen] = React.useState(false)

  const getDateString = () => new Date().toISOString().split("T")[0]

  const handleBackupData = () => {
    setDefaultFilename(`ip-manager-backup-${getDateString()}`)
    setPendingExport("backup")
    setExportDialogOpen(true)
  }

  const handleExportAllExcel = () => {
    setDefaultFilename(`network-inventory-${getDateString()}`)
    setPendingExport("all")
    setExportDialogOpen(true)
  }

  const handleExportDevicesExcel = () => {
    setDefaultFilename(`devices-${getDateString()}`)
    setPendingExport("devices")
    setExportDialogOpen(true)
  }

  const handleExportIpsExcel = () => {
    setDefaultFilename(`ip-addresses-${getDateString()}`)
    setPendingExport("ips")
    setExportDialogOpen(true)
  }

  const handleExportConfirm = (filename: string) => {
    switch (pendingExport) {
      case "all":
        exportAllToExcel(devices, ipAddresses, ipRanges, vlans, filename)
        break
      case "devices":
        exportDevicesToExcel(devices, ipAddresses, vlans, filename)
        break
      case "ips":
        exportIpsToExcel(ipAddresses, devices, ipRanges, vlans, filename)
        break
      case "backup":
        downloadBackup(filename)
        break
    }
    setPendingExport(null)
  }

  const downloadBackup = (filename: string) => {
    const backupData = {
      version: 1,
      exportedAt: new Date().toISOString(),
      data: {
        devices,
        ipAddresses,
        ipRanges,
        vlans,
      },
    }

    const jsonString = JSON.stringify(backupData, null, 2)
    const blob = new Blob([jsonString], { type: "application/json" })
    const url = URL.createObjectURL(blob)
    const link = document.createElement("a")
    link.href = url
    link.download = `${filename}.json`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
  }

  // CSV exports
  const handleExportDevicesCsv = () => {
    const csv = exportDevicesToCsv(devices, ipAddresses, vlans)
    downloadCsv(csv, `devices-${getDateString()}.csv`)
  }

  const handleExportIpsCsv = () => {
    const csv = exportIpsToCsv(ipAddresses, devices, ipRanges, vlans)
    downloadCsv(csv, `ip-addresses-${getDateString()}.csv`)
  }

  return (
    <>
      <header className="sticky top-0 z-50 border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="flex h-14 items-center justify-between px-4 md:px-6">
          <div className="flex items-center gap-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary">
              <Network className="h-4 w-4 text-primary-foreground" />
            </div>
            <div>
              <h1 className="text-base font-semibold">IP Manager</h1>
              <p className="text-xs text-muted-foreground hidden sm:block">Network Inventory & VLAN Tracking</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <div className="hidden md:flex items-center gap-2">
              <DeviceDialog />
              <VlanDialog />
              <IpRangeDialog />
              <ExcelImportDialog />
            </div>

            {/* Mobile dropdown for actions */}
            <div className="md:hidden">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="sm">
                    Actions
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DeviceDialog
                    trigger={<DropdownMenuItem onSelect={(e) => e.preventDefault()}>Add Device</DropdownMenuItem>}
                  />
                  <VlanDialog
                    trigger={<DropdownMenuItem onSelect={(e) => e.preventDefault()}>Add VLAN</DropdownMenuItem>}
                  />
                  <IpRangeDialog
                    trigger={<DropdownMenuItem onSelect={(e) => e.preventDefault()}>Add IP Range</DropdownMenuItem>}
                  />
                  <ExcelImportDialog />
                </DropdownMenuContent>
              </DropdownMenu>
            </div>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm" className="gap-2 bg-transparent">
                  <Save className="h-4 w-4" />
                  <span className="hidden sm:inline">Backup</span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuItem onClick={handleBackupData} className="gap-2">
                  <Download className="h-4 w-4 text-blue-600" />
                  Download Backup (JSON)
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setRestoreDialogOpen(true)} className="gap-2">
                  <Upload className="h-4 w-4 text-green-600" />
                  Restore from Backup
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm" className="gap-2 bg-transparent">
                  <Download className="h-4 w-4" />
                  <span className="hidden sm:inline">Export</span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                {/* Excel exports */}
                <DropdownMenuItem onClick={handleExportAllExcel} className="gap-2">
                  <FileSpreadsheet className="h-4 w-4 text-green-600" />
                  Export All (Excel)
                </DropdownMenuItem>
                <DropdownMenuItem onClick={handleExportDevicesExcel} className="gap-2">
                  <FileSpreadsheet className="h-4 w-4 text-green-600" />
                  Export Devices (Excel)
                </DropdownMenuItem>
                <DropdownMenuItem onClick={handleExportIpsExcel} className="gap-2">
                  <FileSpreadsheet className="h-4 w-4 text-green-600" />
                  Export IP Addresses (Excel)
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                {/* CSV exports */}
                <DropdownMenuItem onClick={handleExportDevicesCsv} className="gap-2">
                  <Download className="h-4 w-4 text-muted-foreground" />
                  Export Devices (CSV)
                </DropdownMenuItem>
                <DropdownMenuItem onClick={handleExportIpsCsv} className="gap-2">
                  <Download className="h-4 w-4 text-muted-foreground" />
                  Export IP Addresses (CSV)
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

            {/* Theme Toggle */}
            <Button variant="outline" size="icon" onClick={() => setTheme(theme === "dark" ? "light" : "dark")}>
              <Sun className="h-4 w-4 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
              <Moon className="absolute h-4 w-4 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
              <span className="sr-only">Toggle theme</span>
            </Button>

            {/* Clear Data */}
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button
                  variant="outline"
                  size="icon"
                  className="text-destructive hover:text-destructive bg-transparent"
                >
                  <Trash2 className="h-4 w-4" />
                  <span className="sr-only">Clear all data</span>
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Clear All Data?</AlertDialogTitle>
                  <AlertDialogDescription>
                    This will permanently delete all devices, VLANs, IP ranges, and assignments. This action cannot be
                    undone.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction
                    onClick={clearAllData}
                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                  >
                    Clear All Data
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        </div>
      </header>

      <ExportFilenameDialog
        open={exportDialogOpen}
        onOpenChange={setExportDialogOpen}
        defaultFilename={defaultFilename}
        onConfirm={handleExportConfirm}
        title={pendingExport === "backup" ? "Backup Data" : "Export to Excel"}
        description={
          pendingExport === "backup" ? "Enter a name for your backup file" : "Enter a name for your export file"
        }
      />

      <BackupRestoreDialog open={restoreDialogOpen} onOpenChange={setRestoreDialogOpen} />
    </>
  )
}
