"use client"

import * as React from "react"
import { Search, MoreHorizontal, Pencil, Trash2, X } from "lucide-react"
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
import { DEVICE_TYPE_LABELS, type DeviceType, type Device } from "@/lib/types"
import { DeviceDialog } from "./device-dialog"
import { useToast } from "@/hooks/use-toast"

export function DeviceTable() {
  const [search, setSearch] = React.useState("")
  const [typeFilter, setTypeFilter] = React.useState<DeviceType | "all">("all")
  const [deleteDevice, setDeleteDevice] = React.useState<Device | null>(null)

  const { devices, deleteDevice: removeDevice } = useStore()
  const { toast } = useToast()

  const filteredDevices = React.useMemo(() => {
    return devices.filter((device) => {
      // Search filter
      if (search) {
        const searchLower = search.toLowerCase()
        const matchesName = device.name.toLowerCase().includes(searchLower)
        const matchesMac = device.macAddress.toLowerCase().includes(searchLower)
        const matchesIp = device.assignedIp?.includes(search)
        if (!matchesName && !matchesMac && !matchesIp) return false
      }

      // Type filter
      if (typeFilter !== "all" && device.type !== typeFilter) return false

      return true
    })
  }, [devices, search, typeFilter])

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
    setTypeFilter("all")
  }

  const hasFilters = search || typeFilter !== "all"

  return (
    <>
      <Card>
        <CardHeader className="pb-4">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <CardTitle className="text-lg">Devices</CardTitle>
            <DeviceDialog />
          </div>
        </CardHeader>
        <CardContent>
          {/* Filters */}
          <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search name, MAC, or IP..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9"
              />
            </div>
            <div className="flex gap-2">
              <Select value={typeFilter} onValueChange={(v) => setTypeFilter(v as DeviceType | "all")}>
                <SelectTrigger className="w-[150px]">
                  <SelectValue placeholder="Type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Types</SelectItem>
                  {Object.entries(DEVICE_TYPE_LABELS).map(([value, label]) => (
                    <SelectItem key={value} value={value}>
                      {label}
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

          {/* Table */}
          <div className="rounded-lg border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Device</TableHead>
                  <TableHead className="hidden sm:table-cell">Type</TableHead>
                  <TableHead className="hidden md:table-cell">MAC Address</TableHead>
                  <TableHead>IP Address</TableHead>
                  <TableHead className="w-[50px]"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredDevices.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="h-24 text-center text-muted-foreground">
                      {devices.length === 0
                        ? "No devices added yet. Add a device to get started."
                        : "No devices match your filters."}
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredDevices.map((device) => (
                    <TableRow key={device.id}>
                      <TableCell>
                        <div>
                          <div className="font-medium">{device.name}</div>
                          {device.notes && (
                            <div className="text-xs text-muted-foreground truncate max-w-[200px]">{device.notes}</div>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="hidden sm:table-cell">
                        <Badge variant="secondary">{DEVICE_TYPE_LABELS[device.type]}</Badge>
                      </TableCell>
                      <TableCell className="hidden md:table-cell font-mono text-sm text-muted-foreground">
                        {device.macAddress}
                      </TableCell>
                      <TableCell className="font-mono text-sm">
                        {device.assignedIp || <span className="text-muted-foreground">Not assigned</span>}
                      </TableCell>
                      <TableCell>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DeviceDialog
                              device={device}
                              trigger={
                                <DropdownMenuItem onSelect={(e) => e.preventDefault()}>
                                  <Pencil className="mr-2 h-4 w-4" />
                                  Edit
                                </DropdownMenuItem>
                              }
                            />
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                              onClick={() => setDeleteDevice(device)}
                              className="text-destructive focus:text-destructive"
                            >
                              <Trash2 className="mr-2 h-4 w-4" />
                              Delete
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={!!deleteDevice} onOpenChange={(open) => !open && setDeleteDevice(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Device?</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{deleteDevice?.name}"?
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
