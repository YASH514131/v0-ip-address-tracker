"use client"

import * as React from "react"
import { Upload, AlertCircle, CheckCircle2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { useStore } from "@/lib/store"

interface BackupRestoreDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

interface BackupData {
  version: number
  exportedAt: string
  data: {
    devices: unknown[]
    ipAddresses: unknown[]
    ipRanges: unknown[]
    vlans: unknown[]
  }
}

export function BackupRestoreDialog({ open, onOpenChange }: BackupRestoreDialogProps) {
  const [file, setFile] = React.useState<File | null>(null)
  const [error, setError] = React.useState<string | null>(null)
  const [success, setSuccess] = React.useState<string | null>(null)
  const [previewData, setPreviewData] = React.useState<BackupData | null>(null)
  const fileInputRef = React.useRef<HTMLInputElement>(null)

  const store = useStore()

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0]
    setError(null)
    setSuccess(null)
    setPreviewData(null)

    if (!selectedFile) {
      setFile(null)
      return
    }

    if (!selectedFile.name.endsWith(".json")) {
      setError("Please select a valid JSON backup file")
      setFile(null)
      return
    }

    setFile(selectedFile)

    try {
      const text = await selectedFile.text()
      const data = JSON.parse(text) as BackupData

      // Validate backup structure
      if (!data.version || !data.data) {
        setError("Invalid backup file format")
        return
      }

      if (!data.data.devices || !data.data.ipAddresses || !data.data.vlans) {
        setError("Backup file is missing required data sections")
        return
      }

      setPreviewData(data)
    } catch {
      setError("Failed to parse backup file. Please ensure it's a valid JSON file.")
    }
  }

  const handleRestore = () => {
    if (!previewData) return

    try {
      // Clear existing data and restore from backup
      store.clearAllData()

      // Restore VLANs first (dependencies)
      for (const vlan of previewData.data.vlans as { vlanId: number; name: string; description?: string }[]) {
        store.addVlan({
          vlanId: vlan.vlanId,
          name: vlan.name,
          description: vlan.description || "",
        })
      }

      // Restore IP ranges
      for (const range of previewData.data.ipRanges as {
        name: string
        startIp: string
        endIp: string
        vlanId?: string | null
        description?: string
      }[]) {
        store.addIpRange({
          name: range.name,
          startIp: range.startIp,
          endIp: range.endIp,
          vlanId: range.vlanId || null,
          description: range.description || "",
        })
      }

      // Restore devices with their IP assignments
      for (const device of previewData.data.devices as {
        name: string
        type: string
        location: string
        vlanId?: string | null
        macAddress?: string | null
        assignedIp?: string | null
        switchIp?: string | null
        notes?: string
      }[]) {
        // If device has an IP that doesn't exist, add it manually
        if (device.assignedIp) {
          const existingIp = store.ipAddresses.find((ip) => ip.address === device.assignedIp)
          if (!existingIp) {
            store.addManualIp(device.assignedIp, device.vlanId || null)
          }
        }

        store.addDevice({
          name: device.name,
          type: device.type as
            | "pc"
            | "laptop"
            | "phone"
            | "tablet"
            | "server"
            | "router"
            | "switch"
            | "printer"
            | "iot"
            | "other",
          location: device.location,
          vlanId: device.vlanId || null,
          macAddress: device.macAddress || null,
          assignedIp: device.assignedIp || null,
          switchIp: device.switchIp || null,
          notes: device.notes || "",
        })
      }

      setSuccess(
        `Successfully restored ${previewData.data.devices.length} devices, ${previewData.data.ipAddresses.length} IP addresses, and ${previewData.data.vlans.length} VLANs`,
      )
      setFile(null)
      setPreviewData(null)

      // Reset file input
      if (fileInputRef.current) {
        fileInputRef.current.value = ""
      }
    } catch (err) {
      setError(`Failed to restore backup: ${err instanceof Error ? err.message : "Unknown error"}`)
    }
  }

  const handleClose = () => {
    setFile(null)
    setError(null)
    setSuccess(null)
    setPreviewData(null)
    if (fileInputRef.current) {
      fileInputRef.current.value = ""
    }
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Restore from Backup</DialogTitle>
          <DialogDescription>
            Upload a JSON backup file to restore your data. This will replace all existing data.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="flex flex-col items-center justify-center rounded-lg border-2 border-dashed border-muted-foreground/25 p-6">
            <Upload className="mb-2 h-8 w-8 text-muted-foreground" />
            <p className="mb-2 text-sm text-muted-foreground">Click to select backup file</p>
            <input
              ref={fileInputRef}
              type="file"
              accept=".json"
              onChange={handleFileChange}
              className="cursor-pointer text-sm"
            />
          </div>

          {error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {success && (
            <Alert className="border-green-500 bg-green-50 text-green-700 dark:bg-green-950 dark:text-green-300">
              <CheckCircle2 className="h-4 w-4" />
              <AlertDescription>{success}</AlertDescription>
            </Alert>
          )}

          {previewData && (
            <div className="rounded-lg bg-muted p-4">
              <h4 className="mb-2 font-medium">Backup Preview</h4>
              <div className="space-y-1 text-sm text-muted-foreground">
                <p>Exported: {new Date(previewData.exportedAt).toLocaleString()}</p>
                <p>Devices: {previewData.data.devices.length}</p>
                <p>IP Addresses: {previewData.data.ipAddresses.length}</p>
                <p>IP Ranges: {previewData.data.ipRanges.length}</p>
                <p>VLANs: {previewData.data.vlans.length}</p>
              </div>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleClose}>
            Cancel
          </Button>
          <Button onClick={handleRestore} disabled={!previewData}>
            Restore Data
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
