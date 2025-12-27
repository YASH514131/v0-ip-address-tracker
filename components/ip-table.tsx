"use client"

import * as React from "react"
import { Search, MoreHorizontal, X } from "lucide-react"
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
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { useStore } from "@/lib/store"
import { STATUS_COLORS, type IPStatus } from "@/lib/types"
import { IpRangeDialog } from "./ip-range-dialog"

export function IpTable() {
  const [search, setSearch] = React.useState("")
  const [statusFilter, setStatusFilter] = React.useState<IPStatus | "all">("all")
  const [rangeFilter, setRangeFilter] = React.useState<string>("all")

  const { ipAddresses, ipRanges, devices, updateIpStatus, unassignIp, deleteIpRange } = useStore()

  const filteredIps = React.useMemo(() => {
    return ipAddresses.filter((ip) => {
      // Search filter
      if (search) {
        const device = devices.find((d) => d.id === ip.deviceId)
        const searchLower = search.toLowerCase()
        const matchesIp = ip.address.includes(search)
        const matchesDevice = device?.name.toLowerCase().includes(searchLower)
        if (!matchesIp && !matchesDevice) return false
      }

      // Status filter
      if (statusFilter !== "all" && ip.status !== statusFilter) return false

      // Range filter
      if (rangeFilter !== "all" && ip.rangeId !== rangeFilter) return false

      return true
    })
  }, [ipAddresses, devices, search, statusFilter, rangeFilter])

  const getDeviceName = (deviceId: string | null) => {
    if (!deviceId) return null
    return devices.find((d) => d.id === deviceId)?.name
  }

  const getRangeName = (rangeId: string) => {
    return ipRanges.find((r) => r.id === rangeId)?.name || "Unknown"
  }

  const clearFilters = () => {
    setSearch("")
    setStatusFilter("all")
    setRangeFilter("all")
  }

  const hasFilters = search || statusFilter !== "all" || rangeFilter !== "all"

  return (
    <Card>
      <CardHeader className="pb-4">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <CardTitle className="text-lg">IP Addresses</CardTitle>
          <IpRangeDialog />
        </div>
      </CardHeader>
      <CardContent>
        {/* Filters */}
        <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search IP or device name..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>
          <div className="flex gap-2">
            <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as IPStatus | "all")}>
              <SelectTrigger className="w-[130px]">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="available">Available</SelectItem>
                <SelectItem value="assigned">Assigned</SelectItem>
                <SelectItem value="reserved">Reserved</SelectItem>
              </SelectContent>
            </Select>
            <Select value={rangeFilter} onValueChange={setRangeFilter}>
              <SelectTrigger className="w-[150px]">
                <SelectValue placeholder="Range" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Ranges</SelectItem>
                {ipRanges.map((range) => (
                  <SelectItem key={range.id} value={range.id}>
                    {range.name}
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

        {/* IP Ranges Summary */}
        {ipRanges.length > 0 && (
          <div className="mb-4 flex flex-wrap gap-2">
            {ipRanges.map((range) => {
              const rangeIps = ipAddresses.filter((ip) => ip.rangeId === range.id)
              const assigned = rangeIps.filter((ip) => ip.status === "assigned").length
              return (
                <Badge key={range.id} variant="outline" className="gap-2 py-1.5">
                  <span className="font-medium">{range.name}</span>
                  <span className="text-muted-foreground">
                    {range.startIp} - {range.endIp}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    ({assigned}/{rangeIps.length})
                  </span>
                  <button
                    onClick={() => deleteIpRange(range.id)}
                    className="ml-1 text-muted-foreground hover:text-destructive"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </Badge>
              )
            })}
          </div>
        )}

        {/* Table */}
        <div className="rounded-lg border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>IP Address</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="hidden sm:table-cell">Device</TableHead>
                <TableHead className="hidden md:table-cell">Range</TableHead>
                <TableHead className="w-[50px]"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredIps.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="h-24 text-center text-muted-foreground">
                    {ipAddresses.length === 0
                      ? "No IP ranges defined. Add a range to get started."
                      : "No IPs match your filters."}
                  </TableCell>
                </TableRow>
              ) : (
                filteredIps.slice(0, 100).map((ip) => {
                  const colors = STATUS_COLORS[ip.status]
                  const deviceName = getDeviceName(ip.deviceId)
                  return (
                    <TableRow key={ip.id}>
                      <TableCell className="font-mono text-sm">{ip.address}</TableCell>
                      <TableCell>
                        <Badge className={`${colors.bg} ${colors.text} border-0 gap-1.5`}>
                          <span className={`h-1.5 w-1.5 rounded-full ${colors.dot}`} />
                          {ip.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="hidden sm:table-cell">
                        {deviceName || <span className="text-muted-foreground">-</span>}
                      </TableCell>
                      <TableCell className="hidden md:table-cell text-muted-foreground text-sm">
                        {getRangeName(ip.rangeId)}
                      </TableCell>
                      <TableCell>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem
                              onClick={() => updateIpStatus(ip.id, "available")}
                              disabled={ip.status === "available"}
                            >
                              Mark Available
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() => updateIpStatus(ip.id, "reserved")}
                              disabled={ip.status === "reserved"}
                            >
                              Mark Reserved
                            </DropdownMenuItem>
                            {ip.deviceId && (
                              <>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem onClick={() => unassignIp(ip.id)}>Unassign Device</DropdownMenuItem>
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
          {filteredIps.length > 100 && (
            <div className="border-t px-4 py-2 text-center text-sm text-muted-foreground">
              Showing 100 of {filteredIps.length} results. Use filters to narrow down.
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
