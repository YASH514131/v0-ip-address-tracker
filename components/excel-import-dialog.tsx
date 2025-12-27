"use client"

import * as React from "react"
import { Upload, FileSpreadsheet, AlertCircle, CheckCircle2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { ScrollArea } from "@/components/ui/scroll-area"
import { useStore } from "@/lib/store"
import { useToast } from "@/hooks/use-toast"
import { isValidIp } from "@/lib/ip-utils"
import * as XLSX from "xlsx"

interface ParsedRow {
  location: string
  ipAddress: string
  deviceName: string
  isValid: boolean
  error?: string
}

export function ExcelImportDialog() {
  const [open, setOpen] = React.useState(false)
  const [file, setFile] = React.useState<File | null>(null)
  const [parsedData, setParsedData] = React.useState<ParsedRow[]>([])
  const [selectedVlan, setSelectedVlan] = React.useState<string>("none")
  const [importing, setImporting] = React.useState(false)
  const [importResult, setImportResult] = React.useState<{
    imported: number
    skipped: number
    errors: string[]
  } | null>(null)

  const { vlans, bulkImportDevices } = useStore()
  const { toast } = useToast()
  const fileInputRef = React.useRef<HTMLInputElement>(null)

  const resetForm = () => {
    setFile(null)
    setParsedData([])
    setSelectedVlan("none")
    setImportResult(null)
  }

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0]
    if (!selectedFile) return

    setFile(selectedFile)
    setImportResult(null)

    try {
      const data = await selectedFile.arrayBuffer()
      const workbook = XLSX.read(data)
      const sheetName = workbook.SheetNames[0]
      const worksheet = workbook.Sheets[sheetName]
      const jsonData = XLSX.utils.sheet_to_json<Record<string, unknown>>(worksheet, { header: 1 })

      // Find header row and column indices
      const headers = jsonData[0] as string[]
      const locationIdx = headers.findIndex((h) => h?.toString().toLowerCase().includes("location"))
      const ipIdx = headers.findIndex(
        (h) => h?.toString().toLowerCase().includes("ip") || h?.toString().toLowerCase().includes("address"),
      )
      const deviceIdx = headers.findIndex(
        (h) => h?.toString().toLowerCase().includes("device") || h?.toString().toLowerCase().includes("name"),
      )

      if (locationIdx === -1 || ipIdx === -1 || deviceIdx === -1) {
        toast({
          title: "Invalid Format",
          description: "Excel file must contain Location, IP Address, and Device Name columns",
          variant: "destructive",
        })
        return
      }

      // Parse rows
      const rows: ParsedRow[] = []
      for (let i = 1; i < jsonData.length; i++) {
        const row = jsonData[i] as unknown[]
        const location = row[locationIdx]?.toString().trim() || ""
        const ipAddress = row[ipIdx]?.toString().trim() || ""
        const deviceName = row[deviceIdx]?.toString().trim() || ""

        // Skip empty rows
        if (!location && !ipAddress && !deviceName) continue

        let isValid = true
        let error: string | undefined

        if (!deviceName) {
          isValid = false
          error = "Device name is required"
        } else if (!location) {
          isValid = false
          error = "Location is required"
        } else if (!ipAddress) {
          isValid = false
          error = "IP address is required"
        } else if (!isValidIp(ipAddress)) {
          isValid = false
          error = "Invalid IP format"
        }

        rows.push({ location, ipAddress, deviceName, isValid, error })
      }

      setParsedData(rows)
    } catch {
      toast({
        title: "Parse Error",
        description: "Failed to parse Excel file. Please check the format.",
        variant: "destructive",
      })
    }
  }

  const handleImport = () => {
    setImporting(true)

    const validRows = parsedData.filter((row) => row.isValid)
    const importData = validRows.map((row) => ({
      name: row.deviceName,
      location: row.location,
      ipAddress: row.ipAddress,
      vlanId: selectedVlan !== "none" ? selectedVlan : undefined,
    }))

    const result = bulkImportDevices(importData)
    setImportResult(result)
    setImporting(false)

    if (result.imported > 0) {
      toast({
        title: "Import Complete",
        description: `Successfully imported ${result.imported} device(s)`,
      })
    }
  }

  const validCount = parsedData.filter((r) => r.isValid).length
  const invalidCount = parsedData.filter((r) => !r.isValid).length

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        setOpen(v)
        if (!v) resetForm()
      }}
    >
      <DialogTrigger asChild>
        <Button size="sm" variant="outline" className="gap-2 bg-transparent">
          <Upload className="h-4 w-4" />
          Import Excel
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Import from Excel</DialogTitle>
          <DialogDescription>
            Upload an Excel file (.xlsx) with columns: Location, IP Address, Device Name
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* File Upload */}
          <div className="space-y-2">
            <input ref={fileInputRef} type="file" accept=".xlsx,.xls" onChange={handleFileChange} className="hidden" />
            <Button
              type="button"
              variant="outline"
              className="w-full h-24 border-dashed gap-3 bg-transparent"
              onClick={() => fileInputRef.current?.click()}
            >
              <FileSpreadsheet className="h-8 w-8 text-muted-foreground" />
              <div className="text-left">
                <p className="font-medium">{file ? file.name : "Choose Excel file"}</p>
                <p className="text-xs text-muted-foreground">
                  {file ? `${parsedData.length} rows found` : "Click to browse or drag and drop"}
                </p>
              </div>
            </Button>
          </div>

          {/* VLAN Selection */}
          {parsedData.length > 0 && (
            <div className="space-y-2">
              <Label>Assign to VLAN (Optional)</Label>
              <Select value={selectedVlan} onValueChange={setSelectedVlan}>
                <SelectTrigger>
                  <SelectValue placeholder="Select VLAN" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">No VLAN</SelectItem>
                  {vlans.map((vlan) => (
                    <SelectItem key={vlan.id} value={vlan.id}>
                      VLAN {vlan.vlanId} - {vlan.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Preview */}
          {parsedData.length > 0 && (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label>Preview</Label>
                <div className="flex gap-2">
                  {validCount > 0 && (
                    <Badge variant="secondary" className="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                      <CheckCircle2 className="h-3 w-3 mr-1" />
                      {validCount} valid
                    </Badge>
                  )}
                  {invalidCount > 0 && (
                    <Badge variant="secondary" className="bg-amber-500/10 text-amber-600 dark:text-amber-400">
                      <AlertCircle className="h-3 w-3 mr-1" />
                      {invalidCount} invalid
                    </Badge>
                  )}
                </div>
              </div>
              <ScrollArea className="h-48 rounded-md border">
                <div className="p-2 space-y-1">
                  {parsedData.slice(0, 50).map((row, idx) => (
                    <div
                      key={idx}
                      className={`text-xs p-2 rounded ${row.isValid ? "bg-muted/50" : "bg-destructive/10"}`}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-medium truncate">{row.deviceName || "(empty)"}</span>
                        <span className="font-mono text-muted-foreground">{row.ipAddress || "(empty)"}</span>
                      </div>
                      <div className="flex items-center justify-between gap-2 mt-1">
                        <span className="text-muted-foreground truncate">{row.location || "(empty)"}</span>
                        {row.error && <span className="text-destructive text-xs">{row.error}</span>}
                      </div>
                    </div>
                  ))}
                  {parsedData.length > 50 && (
                    <p className="text-xs text-muted-foreground text-center py-2">
                      ...and {parsedData.length - 50} more rows
                    </p>
                  )}
                </div>
              </ScrollArea>
            </div>
          )}

          {/* Import Result */}
          {importResult && (
            <div className="rounded-lg bg-muted p-3 space-y-2">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                <span className="font-medium">Import Complete</span>
              </div>
              <p className="text-sm text-muted-foreground">
                Imported: {importResult.imported} | Skipped: {importResult.skipped}
              </p>
              {importResult.errors.length > 0 && (
                <div className="text-xs text-muted-foreground max-h-20 overflow-auto">
                  {importResult.errors.slice(0, 5).map((err, i) => (
                    <p key={i}>{err}</p>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => setOpen(false)}>
            {importResult ? "Close" : "Cancel"}
          </Button>
          {!importResult && parsedData.length > 0 && (
            <Button onClick={handleImport} disabled={validCount === 0 || importing}>
              {importing ? "Importing..." : `Import ${validCount} Device${validCount !== 1 ? "s" : ""}`}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
