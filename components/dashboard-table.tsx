"use client"

import * as React from "react"
import { Search, X, ArrowUpDown, MoreHorizontal, Pencil, Trash2, FileSpreadsheet } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
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
import { STATUS_COLORS, VLAN_COLORS, type IPStatus, type Device } from "@/lib/types"
import { DeviceDialog } from "./device-dialog"
import { useToast } from "@/hooks/use-toast"
import { exportFilteredToExcel } from "@/lib/excel-export"

type SortField = "ip" | "device" | "location" | "vlan" | "status" | "assignedAt" | "switchIp"
type SortDirection = "asc" | "desc"

export function DashboardTable() {
  const [search, setSearch] = React.useState("")
  const [statusFilter, setStatusFilter] = React.useState<IPStatus | "all">("all")
  const [vlanFilter, setVlanFilter] = React.useState<string>("all")
  const [sortField, setSortField] = React.useState<SortField>("ip")
  const [sortDirection, setSortDirection] = React.useState<SortDirection>("asc")
  const [deleteDevice, setDeleteDevice] = React.useState<Device | null>(null)

  const { devices, ipAddresses, vlans, deleteDevice: removeDevice, updateIpStatus, unassignIp } = useStore()
  const { toast } = useToast()

  const dashboardData = React.useMemo(() => {
    const assignedData = devices
      .filter((device) => device.assignedIp)
      .map((device) => {
        const ip = ipAddresses.find((ip) => ip.address === device.assignedIp)
        const vlan = device.vlanId ? vlans.find((v) => v.id === device.vlanId) : null
        return {
          id: device.id,
          ipAddress: device.assignedIp!,
          deviceName: device.name,
          location: device.location,
          vlan,
          vlanId: device.vlanId,
          status: ip?.status || ("assigned" as IPStatus),
          device,
          ipId: ip?.id,
          assignedAt: device.assignedAt || ip?.assignedAt || null,
          switchIp: device.switchIp || null,
          createdAt: device.createdAt, // Added device creation timestamp
        }
      })

    const unassignedIps = ipAddresses
      .filter((ip) => !ip.deviceId)
      .map((ip) => {
        const vlan = ip.vlanId ? vlans.find((v) => v.id === ip.vlanId) : null
        return {
          id: ip.id,
          ipAddress: ip.address,
          deviceName: "",
          location: "",
          vlan,
          vlanId: ip.vlanId,
          status: ip.status,
          device: null,
          ipId: ip.id,
          assignedAt: ip.assignedAt,
          switchIp: null,
          createdAt: ip.createdAt, // IP creation timestamp for unassigned IPs
        }
      })

    return [...assignedData, ...unassignedIps]
  }, [devices, ipAddresses, vlans])

  const filteredData = React.useMemo(() => {
    let result = dashboardData

    if (search) {
      const searchLower = search.toLowerCase()
      result = result.filter(
        (item) =>
          item.ipAddress.includes(search) ||
          item.deviceName.toLowerCase().includes(searchLower) ||
          item.location.toLowerCase().includes(searchLower) ||
          (item.switchIp && item.switchIp.includes(search)),
      )
    }

    if (statusFilter !== "all") {
      result = result.filter((item) => item.status === statusFilter)
    }

    if (vlanFilter !== "all") {
      result = result.filter((item) => item.vlanId === vlanFilter)
    }

    result.sort((a, b) => {
      let comparison = 0
      switch (sortField) {
        case "ip":
          comparison = a.ipAddress.localeCompare(b.ipAddress, undefined, { numeric: true })
          break
        case "device":
          comparison = a.deviceName.localeCompare(b.deviceName)
          break
        case "location":
          comparison = a.location.localeCompare(b.location)
          break
        case "vlan":
          comparison = (a.vlan?.vlanId || 0) - (b.vlan?.vlanId || 0)
          break
        case "status":
          comparison = a.status.localeCompare(b.status)
          break
        case "assignedAt":
          const aAssignedTime = a.assignedAt?.getTime() || 0
          const bAssignedTime = b.assignedAt?.getTime() || 0
          comparison = aAssignedTime - bAssignedTime
          break
        case "switchIp":
          comparison = (a.switchIp || "").localeCompare(b.switchIp || "", undefined, { numeric: true })
          break
        case "createdAt":
          const aCreatedTime = a.createdAt?.getTime() || 0
          const bCreatedTime = b.createdAt?.getTime() || 0
          comparison = aCreatedTime - bCreatedTime
          break
      }
      return sortDirection === "asc" ? comparison : -comparison
    })

    return result
  }, [dashboardData, search, statusFilter, vlanFilter, sortField, sortDirection])

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === "asc" ? "desc" : "asc")
    } else {
      setSortField(field)
      setSortDirection("asc")
    }
  }

  const handleDelete = () => {
    if (deleteDevice) {
      removeDevice(deleteDevice.id)
      toast({
        title: "Device Deleted",
        description: `"${deleteDevice.name}" has been removed`,
      })
      setDeleteDevice(null)
    }
  }

  const clearFilters = () => {
    setSearch("")
    setStatusFilter("all")
    setVlanFilter("all")
  }

  const hasFilters = search || statusFilter !== "all" || vlanFilter !== "all"

  const getVlanColor = (index: number) => VLAN_COLORS[index % VLAN_COLORS.length]

  const handleExportFiltered = () => {
    const filterParts: string[] = []
    if (statusFilter !== "all") filterParts.push(statusFilter)
    if (vlanFilter !== "all") {
      const vlan = vlans.find((v) => v.id === vlanFilter)
      if (vlan) filterParts.push(`vlan${vlan.vlanId}`)
    }
    if (search) filterParts.push("search")
    const filterDescription = filterParts.length > 0 ? filterParts.join("-") : "all"

    const exportData = filteredData.map((item) => ({
      ipAddress: item.ipAddress,
      deviceName: item.deviceName,
      location: item.location,
      vlanName: item.vlan ? `VLAN ${item.vlan.vlanId} - ${item.vlan.name}` : "",
      status: item.status,
      assignedAt: item.assignedAt,
      switchIp: item.switchIp || "",
      createdAt: item.createdAt, // Include creation date in export
    }))

    exportFilteredToExcel(exportData, filterDescription)
    toast({
      title: "Export Complete",
      description: `Exported ${filteredData.length} filtered records to Excel`,
    })
  }

  const formatDateTime = (date: Date | string | null | undefined) => {
    if (!date) return "-"
    // Convert string to Date if needed (localStorage stores dates as strings)
    const dateObj = typeof date === "string" ? new Date(date) : date
    if (isNaN(dateObj.getTime())) return "-"

    const year = dateObj.getFullYear()
    const month = String(dateObj.getMonth() + 1).padStart(2, "0")
    const day = String(dateObj.getDate()).padStart(2, "0")
    let hours = dateObj.getHours()
    const minutes = String(dateObj.getMinutes()).padStart(2, "0")
    const ampm = hours >= 12 ? "pm" : "am"
    hours = hours % 12
    hours = hours ? hours : 12
    return `${year}-${month}-${day} ${hours}:${minutes}${ampm}`
  }

  const SortButton = ({ field, children }: { field: SortField; children: React.ReactNode }) => (
    <Button variant="ghost" size="sm" className="-ml-3 h-8 gap-1" onClick={() => handleSort(field)}>
      {children}
      <ArrowUpDown className="h-3 w-3" />
    </Button>
  )

  return (
    <>
      <Card>
        <CardHeader className="pb-4">
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg">Network Inventory</CardTitle>
            <Button
              variant="outline"
              size="sm"
              onClick={handleExportFiltered}
              disabled={filteredData.length === 0}
              className="gap-2 bg-transparent"
            >
              <FileSpreadsheet className="h-4 w-4" />
              Export Filtered ({filteredData.length})
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {/* Filters */}
          <div className="mb-4 flex flex-col gap-3 lg:flex-row lg:items-center">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search IP, device, location, or switch IP..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9"
              />
            </div>
            <div className="flex flex-wrap gap-2">
              <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as IPStatus | "all")}>
                <SelectTrigger className="w-[140px]">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="available">Available</SelectItem>
                  <SelectItem value="assigned">Assigned</SelectItem>
                  <SelectItem value="reserved">Reserved</SelectItem>
                </SelectContent>
              </Select>
              <Select value={vlanFilter} onValueChange={setVlanFilter}>
                <SelectTrigger className="w-[160px]">
                  <SelectValue placeholder="VLAN" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All VLANs</SelectItem>
                  {vlans.map((vlan) => (
                    <SelectItem key={vlan.id} value={vlan.id}>
                      VLAN {vlan.vlanId} - {vlan.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {hasFilters && (
                <Button variant="ghost" size="icon" onClick={clearFilters}>
                  <X className="h-4 w-4" />
                </Button>
              )}
            </div>
          </div>

          <div className="rounded-lg border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>
                    <SortButton field="ip">IP Address</SortButton>
                  </TableHead>
                  <TableHead>
                    <SortButton field="device">Device Name</SortButton>
                  </TableHead>
                  <TableHead className="hidden sm:table-cell">
                    <SortButton field="location">Location</SortButton>
                  </TableHead>
                  <TableHead className="hidden md:table-cell">
                    <SortButton field="vlan">VLAN</SortButton>
                  </TableHead>
                  <TableHead className="hidden lg:table-cell">
                    <SortButton field="switchIp">Switch IP</SortButton>
                  </TableHead>
                  <TableHead>
                    <SortButton field="status">Status</SortButton>
                  </TableHead>
                  <TableHead className="hidden lg:table-cell">
                    <SortButton field="assignedAt">Assigned At</SortButton>
                  </TableHead>
                  <TableHead className="w-[50px]"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredData.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="h-24 text-center text-muted-foreground">
                      {dashboardData.length === 0
                        ? "No data yet. Add devices or IP ranges to get started."
                        : "No results match your filters."}
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredData.slice(0, 100).map((item) => {
                    const colors = STATUS_COLORS[item.status]
                    const vlanIndex = vlans.findIndex((v) => v.id === item.vlanId)
                    const vlanColor = vlanIndex >= 0 ? getVlanColor(vlanIndex) : null

                    return (
                      <TableRow key={`${item.id}-${item.ipAddress}`}>
                        <TableCell className="font-mono text-sm">{item.ipAddress}</TableCell>
                        <TableCell>{item.deviceName || <span className="text-muted-foreground">-</span>}</TableCell>
                        <TableCell className="hidden sm:table-cell">
                          {item.location || <span className="text-muted-foreground">-</span>}
                        </TableCell>
                        <TableCell className="hidden md:table-cell">
                          {item.vlan ? (
                            <Badge
                              variant="outline"
                              className={`${vlanColor?.bg} ${vlanColor?.text} ${vlanColor?.border} border`}
                            >
                              VLAN {item.vlan.vlanId}
                            </Badge>
                          ) : (
                            <span className="text-muted-foreground">-</span>
                          )}
                        </TableCell>
                        <TableCell className="hidden lg:table-cell font-mono text-sm">
                          {item.switchIp || <span className="text-muted-foreground">-</span>}
                        </TableCell>
                        <TableCell>
                          <Badge className={`${colors.bg} ${colors.text} border-0 gap-1.5`}>
                            <span className={`h-1.5 w-1.5 rounded-full ${colors.dot}`} />
                            {item.status}
                          </Badge>
                        </TableCell>
                        <TableCell className="hidden lg:table-cell text-sm text-muted-foreground">
                          {formatDateTime(item.assignedAt)}
                        </TableCell>
                        <TableCell>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon" className="h-8 w-8">
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              {item.device ? (
                                <>
                                  <DeviceDialog
                                    device={item.device}
                                    trigger={
                                      <DropdownMenuItem onSelect={(e) => e.preventDefault()}>
                                        <Pencil className="mr-2 h-4 w-4" />
                                        Edit Device
                                      </DropdownMenuItem>
                                    }
                                  />
                                  <DropdownMenuSeparator />
                                  <DropdownMenuItem
                                    onClick={() => setDeleteDevice(item.device)}
                                    className="text-destructive focus:text-destructive"
                                  >
                                    <Trash2 className="mr-2 h-4 w-4" />
                                    Delete Device
                                  </DropdownMenuItem>
                                </>
                              ) : (
                                <>
                                  <DropdownMenuItem
                                    onClick={() => item.ipId && updateIpStatus(item.ipId, "available")}
                                    disabled={item.status === "available"}
                                  >
                                    Mark Available
                                  </DropdownMenuItem>
                                  <DropdownMenuItem
                                    onClick={() => item.ipId && updateIpStatus(item.ipId, "reserved")}
                                    disabled={item.status === "reserved"}
                                  >
                                    Mark Reserved
                                  </DropdownMenuItem>
                                </>
                              )}
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>
                    )
                  })
                )}
              </TableBody>
            </Table>
            {filteredData.length > 100 && (
              <div className="border-t px-4 py-2 text-center text-sm text-muted-foreground">
                Showing 100 of {filteredData.length} results. Use filters to narrow down.
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={!!deleteDevice} onOpenChange={(open) => !open && setDeleteDevice(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Device?</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete &quot;{deleteDevice?.name}&quot;?
              {deleteDevice?.assignedIp && " Its assigned IP will become available."}
              This action cannot be undone.
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
    </>
  )
}
