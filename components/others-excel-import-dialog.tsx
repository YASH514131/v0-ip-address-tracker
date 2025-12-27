"use client"

import * as React from "react"
import { Upload, FileSpreadsheet, AlertCircle, CheckCircle } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Badge } from "@/components/ui/badge"
import { useStore } from "@/lib/store"
import { useToast } from "@/hooks/use-toast"
import { isValidIp } from "@/lib/ip-utils"
import * as XLSX from "xlsx"

interface ParsedOtherDevice {
  name: string
  displayIp: string
  controllerIp: string
  location: string
  cameraIp: string | null
  isValid: boolean
  errors: string[]
}

export function OthersExcelImportDialog() {
  const [open, setOpen] = React.useState(false)
  const [file, setFile] = React.useState<File | null>(null)
  const [parsedData, setParsedData] = React.useState<ParsedOtherDevice[]>([])
  const [detectedColumns, setDetectedColumns] = React.useState<string[]>([])
  const [importing, setImporting] = React.useState(false)
  const fileInputRef = React.useRef<HTMLInputElement>(null)

  const { otherDevices, addOtherDevice } = useStore()
  const { toast } = useToast()

  const resetState = () => {
    setFile(null)
    setParsedData([])
    setDetectedColumns([])
    setImporting(false)
  }

  const findColumn = (headers: string[], keywords: string[]): string | null => {
    const normalizedHeaders = headers.map((h) => h.toLowerCase().trim())
    for (const keyword of keywords) {
      const index = normalizedHeaders.findIndex((h) => h === keyword.toLowerCase() || h.includes(keyword.toLowerCase()))
      if (index !== -1) return headers[index]
    }
    return null
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0]
    if (!selectedFile) return

    setFile(selectedFile)

    const reader = new FileReader()
    reader.onload = (event) => {
      try {
        const data = new Uint8Array(event.target?.result as ArrayBuffer)
        const workbook = XLSX.read(data, { type: "array" })
        const firstSheet = workbook.Sheets[workbook.SheetNames[0]]
        const jsonData = XLSX.utils.sheet_to_json<Record<string, unknown>>(firstSheet)

        if (jsonData.length === 0) {
          toast({ title: "Error", description: "No data found in Excel file", variant: "destructive" })
          return
        }

        const headers = Object.keys(jsonData[0])
        setDetectedColumns(headers)

        const nameCol = findColumn(headers, ["name"])
        const displayIpCol = findColumn(headers, ["display ip"])
        const controllerIpCol = findColumn(headers, ["controller ip"])
        const locationCol = findColumn(headers, ["location"])
        const cameraIpCol = findColumn(headers, ["camera ip"])

        if (!nameCol || !displayIpCol || !controllerIpCol || !locationCol) {
          toast({
            title: "Missing Columns",
            description: "Excel must have: Name, Display IP, Controller IP, and Location columns",
            variant: "destructive",
          })
          return
        }

        const existingDisplayIps = new Set(otherDevices.map((d) => d.displayIp.toLowerCase()))

        const parsed: ParsedOtherDevice[] = jsonData.map((row) => {
          const errors: string[] = []
          const name = String(row[nameCol] || "").trim()
          const displayIp = String(row[displayIpCol] || "").trim()
          const controllerIp = String(row[controllerIpCol] || "").trim()
          const location = String(row[locationCol] || "").trim()
          const cameraIp = cameraIpCol ? String(row[cameraIpCol] || "").trim() : null

          if (!name) errors.push("Missing name")
          if (!displayIp) errors.push("Missing Display IP")
          else if (!isValidIp(displayIp)) errors.push("Invalid Display IP format")
          else if (existingDisplayIps.has(displayIp.toLowerCase())) errors.push("Display IP already exists")

          if (!controllerIp) errors.push("Missing Controller IP")
          else if (!isValidIp(controllerIp)) errors.push("Invalid Controller IP format")

          if (!location) errors.push("Missing location")

          if (cameraIp && cameraIp !== "-" && !isValidIp(cameraIp)) errors.push("Invalid Camera IP format")

          return {
            name,
            displayIp,
            controllerIp,
            location,
            cameraIp: cameraIp && cameraIp !== "-" ? cameraIp : null,
            isValid: errors.length === 0,
            errors,
          }
        })

        setParsedData(parsed)
      } catch (error) {
        toast({ title: "Error", description: "Failed to parse Excel file", variant: "destructive" })
      }
    }
    reader.readAsArrayBuffer(selectedFile)
  }

  const handleImport = () => {
    setImporting(true)
    let imported = 0
    let failed = 0

    for (const device of parsedData) {
      if (!device.isValid) {
        failed++
        continue
      }

      const result = addOtherDevice({
        name: device.name,
        displayIp: device.displayIp,
        controllerIp: device.controllerIp,
        location: device.location,
        cameraIp: device.cameraIp,
      })

      if (result.success) {
        imported++
      } else {
        failed++
      }
    }

    toast({
      title: "Import Complete",
      description: `Imported ${imported} devices. ${failed > 0 ? `${failed} failed.` : ""}`,
    })

    setOpen(false)
    resetState()
  }

  const validCount = parsedData.filter((d) => d.isValid).length
  const invalidCount = parsedData.filter((d) => !d.isValid).length

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        setOpen(o)
        if (!o) resetState()
      }}
    >
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <Upload className="h-4 w-4 mr-2" />
          Import Excel
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-4xl max-h-[90vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileSpreadsheet className="h-5 w-5 text-green-600" />
            Import to Others Inventory
          </DialogTitle>
          <DialogDescription>
            Upload an Excel file with Name, Display IP, Controller IP, Location, and optionally Camera IP columns.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* File Upload */}
          <div className="flex items-center gap-4">
            <input ref={fileInputRef} type="file" accept=".xlsx,.xls" onChange={handleFileChange} className="hidden" />
            <Button variant="outline" onClick={() => fileInputRef.current?.click()}>
              <Upload className="h-4 w-4 mr-2" />
              {file ? "Change File" : "Select Excel File"}
            </Button>
            {file && <span className="text-sm text-muted-foreground">{file.name}</span>}
          </div>

          {/* Column Detection Info */}
          {detectedColumns.length > 0 && (
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>Detected columns: {detectedColumns.join(", ")}</AlertDescription>
            </Alert>
          )}

          {/* Preview Table */}
          {parsedData.length > 0 && (
            <>
              <div className="flex items-center gap-4">
                <Badge variant="default" className="bg-green-600">
                  <CheckCircle className="h-3 w-3 mr-1" />
                  {validCount} Valid
                </Badge>
                {invalidCount > 0 && (
                  <Badge variant="destructive">
                    <AlertCircle className="h-3 w-3 mr-1" />
                    {invalidCount} Invalid
                  </Badge>
                )}
              </div>

              <ScrollArea className="h-[300px] border rounded-md">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Status</TableHead>
                      <TableHead>Name</TableHead>
                      <TableHead>Display IP</TableHead>
                      <TableHead>Controller IP</TableHead>
                      <TableHead>Location</TableHead>
                      <TableHead>Camera IP</TableHead>
                      <TableHead>Errors</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {parsedData.map((device, index) => (
                      <TableRow key={index} className={!device.isValid ? "bg-destructive/10" : ""}>
                        <TableCell>
                          {device.isValid ? (
                            <CheckCircle className="h-4 w-4 text-green-600" />
                          ) : (
                            <AlertCircle className="h-4 w-4 text-destructive" />
                          )}
                        </TableCell>
                        <TableCell>{device.name || "-"}</TableCell>
                        <TableCell className="font-mono">{device.displayIp || "-"}</TableCell>
                        <TableCell className="font-mono">{device.controllerIp || "-"}</TableCell>
                        <TableCell>{device.location || "-"}</TableCell>
                        <TableCell className="font-mono">{device.cameraIp || "-"}</TableCell>
                        <TableCell className="text-destructive text-xs">{device.errors.join(", ")}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </ScrollArea>
            </>
          )}
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => {
              setOpen(false)
              resetState()
            }}
          >
            Cancel
          </Button>
          <Button onClick={handleImport} disabled={validCount === 0 || importing}>
            {importing ? "Importing..." : `Import ${validCount} Devices`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
