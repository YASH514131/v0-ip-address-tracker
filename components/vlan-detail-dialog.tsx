"use client"

import * as React from "react"
import { Download } from "lucide-react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { useStore } from "@/lib/store"
import { STATUS_COLORS, VLAN_COLORS, type VLAN } from "@/lib/types"
import { ExportFilenameDialog } from "./export-filename-dialog"
import * as XLSX from "xlsx"

interface VlanDetailDialogProps {
  vlan: VLAN
  colorIndex: number
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function VlanDetailDialog({ vlan, colorIndex, open, onOpenChange }: VlanDetailDialogProps) {
  const [search, setSearch] = React.useState("")
  const [exportDialogOpen, setExportDialogOpen] = React.useState(false)
  const { devices, ipAddresses } = useStore()
  const colors = VLAN_COLORS[colorIndex % VLAN_COLORS.length]

  // Get all devices and IPs in this VLAN
  const vlanDevices = devices.filter((d) => d.vlanId === vlan.id)
  const vlanIps = ipAddresses.filter((ip) => ip.vlanId === vlan.id)

  // Combine data for table display
  const tableData = React.useMemo(() => {
    const data: Array<{
      ipAddress: string
      deviceName: string
      location: string
      switchIp: string
      status: string
      assignedAt: Date | string | null
    }> = []

    // Add IPs with device info
    vlanIps.forEach((ip) => {
      const device = ip.deviceId ? devices.find((d) => d.id === ip.deviceId) : null
      data.push({
        ipAddress: ip.address,
        deviceName: device?.name || "-",
        location: device?.location || "-",
        switchIp: device?.switchIp || "-",
        status: ip.status,
        assignedAt: ip.assignedAt,
      })
    })

    // Add devices without IPs in the vlan IP list
    vlanDevices.forEach((device) => {
      if (!vlanIps.some((ip) => ip.deviceId === device.id)) {
        data.push({
          ipAddress: device.assignedIp || "-",
          deviceName: device.name,
          location: device.location,
          switchIp: device.switchIp || "-",
          status: device.assignedIp ? "assigned" : "available",
          assignedAt: device.assignedAt,
        })
      }
    })

    return data
  }, [vlanDevices, vlanIps, devices])

  // Filter data based on search
  const filteredData = React.useMemo(() => {
    if (!search.trim()) return tableData
    const searchLower = search.toLowerCase()
    return tableData.filter(
      (item) =>
        item.ipAddress.toLowerCase().includes(searchLower) ||
        item.deviceName.toLowerCase().includes(searchLower) ||
        item.location.toLowerCase().includes(searchLower),
    )
  }, [tableData, search])

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

  const handleExport = (filename: string) => {
    const data = filteredData.map((item) => {
      const { date, time } = formatDateTime(item.assignedAt)
      return {
        "IP Address": item.ipAddress,
        "Device Name": item.deviceName,
        Location: item.location,
        "Switch IP": item.switchIp,
        Status: item.status.charAt(0).toUpperCase() + item.status.slice(1),
        "Assigned Date": date,
        "Assigned Time": time,
      }
    })

    const workbook = XLSX.utils.book_new()
    const worksheet = XLSX.utils.json_to_sheet(data)
    worksheet["!cols"] = [{ wch: 15 }, { wch: 25 }, { wch: 20 }, { wch: 15 }, { wch: 12 }, { wch: 14 }, { wch: 12 }]
    XLSX.utils.book_append_sheet(workbook, worksheet, `VLAN ${vlan.vlanId}`)

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
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-4xl max-h-[80vh] flex flex-col">
          <DialogHeader>
            <div className="flex items-center justify-between">
              <DialogTitle className="flex items-center gap-2">
                <Badge variant="outline" className={`${colors.text} ${colors.border}`}>
                  VLAN {vlan.vlanId}
                </Badge>
                <span>{vlan.name}</span>
              </DialogTitle>
            </div>
            {vlan.description && <p className="text-sm text-muted-foreground">{vlan.description}</p>}
          </DialogHeader>

          <div className="flex items-center gap-2 py-2">
            <Input
              placeholder="Search by IP, device name, or location..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="flex-1"
            />
            <Button variant="outline" size="sm" onClick={() => setExportDialogOpen(true)}>
              <Download className="h-4 w-4 mr-2" />
              Export ({filteredData.length})
            </Button>
          </div>

          <div className="flex-1 overflow-auto border rounded-md">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>IP Address</TableHead>
                  <TableHead>Device Name</TableHead>
                  <TableHead>Location</TableHead>
                  <TableHead>Switch IP</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Assigned Date</TableHead>
                  <TableHead>Assigned Time</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredData.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                      No devices or IPs found in this VLAN
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredData.map((item, index) => {
                    const statusColors =
                      STATUS_COLORS[item.status as keyof typeof STATUS_COLORS] || STATUS_COLORS.available
                    const { date, time } = formatDateTime(item.assignedAt)
                    return (
                      <TableRow key={`${item.ipAddress}-${index}`}>
                        <TableCell className="font-mono">{item.ipAddress}</TableCell>
                        <TableCell>{item.deviceName}</TableCell>
                        <TableCell>{item.location}</TableCell>
                        <TableCell className="font-mono">{item.switchIp}</TableCell>
                        <TableCell>
                          <Badge variant="outline" className={`${statusColors.bg} ${statusColors.text} border-0`}>
                            {item.status.charAt(0).toUpperCase() + item.status.slice(1)}
                          </Badge>
                        </TableCell>
                        <TableCell>{date}</TableCell>
                        <TableCell>{time}</TableCell>
                      </TableRow>
                    )
                  })
                )}
              </TableBody>
            </Table>
          </div>

          <div className="flex justify-between items-center pt-2 text-sm text-muted-foreground">
            <span>
              {vlanDevices.length} device{vlanDevices.length !== 1 ? "s" : ""}, {vlanIps.length} IP
              {vlanIps.length !== 1 ? "s" : ""}
            </span>
            <span>Showing {filteredData.length} entries</span>
          </div>
        </DialogContent>
      </Dialog>

      <ExportFilenameDialog
        open={exportDialogOpen}
        onOpenChange={setExportDialogOpen}
        defaultFilename={`vlan-${vlan.vlanId}-${vlan.name.toLowerCase().replace(/\s+/g, "-")}`}
        onConfirm={handleExport}
      />
    </>
  )
}
