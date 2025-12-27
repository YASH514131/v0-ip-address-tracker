"use client"

import * as React from "react"
import { Download, Pencil, Trash2, Search, MoreHorizontal, Monitor, ArrowLeft } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { useStore } from "@/lib/store"
import { OtherDeviceDialog } from "./other-device-dialog"
import { ExportFilenameDialog } from "./export-filename-dialog"
import { useToast } from "@/hooks/use-toast"
import type { OtherDevice } from "@/lib/types"
import * as XLSX from "xlsx"

interface OthersPageProps {
  onBack: () => void
}

export function OthersPage({ onBack }: OthersPageProps) {
  const [search, setSearch] = React.useState("")
  const [deleteDevice, setDeleteDevice] = React.useState<OtherDevice | null>(null)
  const [exportDialogOpen, setExportDialogOpen] = React.useState(false)
  const { otherDevices, deleteOtherDevice } = useStore()
  const { toast } = useToast()

  // Filter devices based on search
  const filteredDevices = React.useMemo(() => {
    if (!search.trim()) return otherDevices
    const searchLower = search.toLowerCase()
    return otherDevices.filter(
      (device) =>
        device.name.toLowerCase().includes(searchLower) ||
        device.displayIp.toLowerCase().includes(searchLower) ||
        device.controllerIp.toLowerCase().includes(searchLower) ||
        device.location.toLowerCase().includes(searchLower),
    )
  }, [otherDevices, search])

  const formatDateTime = (date: Date | string | null) => {
    if (!date) return { date: "-", time: "-" }
    const dateObj = typeof date === "string" ? new Date(date) : date
    if (isNaN(dateObj.getTime())) return { date: "-", time: "-" }

    const year = dateObj.getFullYear()
    const month = String(dateObj.getMonth() + 1).padStart(2, "0")
    const day = String(dateObj.getDate()).padStart(2, "0")

    let hours = dateObj.getHours()
    const minutes = String(dateObj.getMinutes()).padStart(2, "0")
    const ampm = hours >= 12 ? "pm" : "am"
    hours = hours % 12
    hours = hours ? hours : 12

    return {
      date: `${year}-${month}-${day}`,
      time: `${hours}:${minutes}${ampm}`,
    }
  }

  const handleDelete = () => {
    if (deleteDevice) {
      deleteOtherDevice(deleteDevice.id)
      toast({
        title: "Device Deleted",
        description: `${deleteDevice.name} has been removed`,
      })
      setDeleteDevice(null)
    }
  }

  const handleExport = (filename: string) => {
    const data = filteredDevices.map((device) => {
      const { date, time } = formatDateTime(device.assignedAt)
      return {
        Name: device.name,
        "Display IP": device.displayIp,
        "Controller IP": device.controllerIp,
        Location: device.location,
        Notes: device.notes || "-",
        "Assigned Date": date,
        "Assigned Time": time,
      }
    })

    const workbook = XLSX.utils.book_new()
    const worksheet = XLSX.utils.json_to_sheet(data)
    worksheet["!cols"] = [{ wch: 25 }, { wch: 15 }, { wch: 15 }, { wch: 20 }, { wch: 30 }, { wch: 14 }, { wch: 12 }]
    XLSX.utils.book_append_sheet(workbook, worksheet, "Others")

    const excelBuffer = XLSX.write(workbook, { bookType: "xlsx", type: "array" })
    const blob = new Blob([excelBuffer], {
      type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    })
    const url = URL.createObjectURL(blob)
    const link = document.createElement("a")
    link.href = url
    link.download = filename.endsWith(".xlsx") ? filename : `${filename}.xlsx`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
  }

  return (
    <>
      <div className="space-y-6">
        {/* Header with back button */}
        <div className="flex items-center gap-4">
          <Button variant="outline" size="icon" onClick={onBack}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div className="flex items-center gap-2">
            <Monitor className="h-6 w-6 text-rose-600 dark:text-rose-400" />
            <h1 className="text-2xl font-bold">Others Inventory</h1>
          </div>
        </div>

        {/* Main content card */}
        <Card>
          <CardHeader className="pb-4">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <CardTitle className="text-lg">All Devices ({otherDevices.length})</CardTitle>
              <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2 w-full sm:w-auto">
                <div className="relative w-full sm:w-80">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search by name, IP, or location..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="pl-9"
                  />
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" onClick={() => setExportDialogOpen(true)}>
                    <Download className="h-4 w-4 mr-2" />
                    Export ({filteredDevices.length})
                  </Button>
                  <OtherDeviceDialog />
                </div>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="border rounded-md overflow-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Display IP</TableHead>
                    <TableHead>Controller IP</TableHead>
                    <TableHead>Location</TableHead>
                    <TableHead>Notes</TableHead>
                    <TableHead>Assigned Date</TableHead>
                    <TableHead>Assigned Time</TableHead>
                    <TableHead className="w-[50px]"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredDevices.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={8} className="text-center py-12 text-muted-foreground">
                        {otherDevices.length === 0
                          ? "No devices added yet. Click 'Add Device' to get started."
                          : "No devices match your search."}
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredDevices.map((device) => {
                      const { date, time } = formatDateTime(device.assignedAt)
                      return (
                        <TableRow key={device.id}>
                          <TableCell className="font-medium">{device.name}</TableCell>
                          <TableCell className="font-mono">{device.displayIp}</TableCell>
                          <TableCell className="font-mono">{device.controllerIp}</TableCell>
                          <TableCell>{device.location}</TableCell>
                          <TableCell className="max-w-[200px] truncate">{device.notes || "-"}</TableCell>
                          <TableCell>{date}</TableCell>
                          <TableCell>{time}</TableCell>
                          <TableCell>
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="icon" className="h-8 w-8">
                                  <MoreHorizontal className="h-4 w-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <OtherDeviceDialog
                                  device={device}
                                  trigger={
                                    <DropdownMenuItem onSelect={(e) => e.preventDefault()}>
                                      <Pencil className="h-4 w-4 mr-2" />
                                      Edit
                                    </DropdownMenuItem>
                                  }
                                />
                                <DropdownMenuItem
                                  onClick={() => setDeleteDevice(device)}
                                  className="text-destructive focus:text-destructive"
                                >
                                  <Trash2 className="h-4 w-4 mr-2" />
                                  Delete
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </TableCell>
                        </TableRow>
                      )
                    })
                  )}
                </TableBody>
              </Table>
            </div>

            <div className="flex justify-between items-center pt-4 text-sm text-muted-foreground">
              <span>
                Total: {otherDevices.length} device{otherDevices.length !== 1 ? "s" : ""}
              </span>
              <span>Showing {filteredDevices.length} entries</span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteDevice} onOpenChange={(open) => !open && setDeleteDevice(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Device?</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{deleteDevice?.name}"? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <ExportFilenameDialog
        open={exportDialogOpen}
        onOpenChange={setExportDialogOpen}
        defaultFilename="others-inventory"
        onConfirm={handleExport}
      />
    </>
  )
}
