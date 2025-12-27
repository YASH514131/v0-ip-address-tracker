import * as XLSX from "xlsx"
import type { Device, IPAddress, IPRange, VLAN } from "./types"

function downloadWorkbook(workbook: XLSX.WorkBook, filename: string): void {
  // Write to array buffer (browser compatible)
  const excelBuffer = XLSX.write(workbook, { bookType: "xlsx", type: "array" })

  // Create blob and trigger download
  const blob = new Blob([excelBuffer], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  })
  const url = URL.createObjectURL(blob)
  const link = document.createElement("a")
  link.href = url
  link.download = filename
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}

function formatDateTime(date: Date | null | undefined): string {
  if (!date) return ""
  return date.toLocaleString("en-US", {
    year: "numeric",
    month: "short",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  })
}

/**
 * Export devices to Excel (.xlsx) format
 * Includes device details with resolved VLAN names
 */
export function exportDevicesToExcel(devices: Device[], ipAddresses: IPAddress[], vlans: VLAN[]): void {
  const vlanMap = new Map(vlans.map((v) => [v.id, `VLAN ${v.vlanId} - ${v.name}`]))

  // Prepare data rows with headers - Added Switch IP column
  const data = devices.map((device) => ({
    "Device Name": device.name,
    Location: device.location,
    VLAN: device.vlanId ? vlanMap.get(device.vlanId) || "" : "",
    "IP Address": device.assignedIp || "",
    "Switch IP": device.switchIp || "",
    "MAC Address": device.macAddress || "",
    Type: device.type,
    Notes: device.notes,
    "Assigned At": formatDateTime(device.assignedAt),
    "Created At": device.createdAt.toISOString().split("T")[0],
  }))

  // Create workbook and worksheet
  const workbook = XLSX.utils.book_new()
  const worksheet = XLSX.utils.json_to_sheet(data)

  // Set column widths for better readability - Added Switch IP column
  worksheet["!cols"] = [
    { wch: 25 }, // Device Name
    { wch: 20 }, // Location
    { wch: 20 }, // VLAN
    { wch: 15 }, // IP Address
    { wch: 15 }, // Switch IP
    { wch: 18 }, // MAC Address
    { wch: 12 }, // Type
    { wch: 30 }, // Notes
    { wch: 20 }, // Assigned At
    { wch: 12 }, // Created At
  ]

  XLSX.utils.book_append_sheet(workbook, worksheet, "Devices")

  // Generate filename with current date
  const filename = `devices-${new Date().toISOString().split("T")[0]}.xlsx`

  downloadWorkbook(workbook, filename)
}

/**
 * Export IP addresses to Excel (.xlsx) format
 * Includes IP details with resolved device names, locations, and VLAN info
 */
export function exportIpsToExcel(ipAddresses: IPAddress[], devices: Device[], ranges: IPRange[], vlans: VLAN[]): void {
  const deviceMap = new Map(devices.map((d) => [d.id, { name: d.name, location: d.location, switchIp: d.switchIp }]))
  const rangeMap = new Map(ranges.map((r) => [r.id, r.name]))
  const vlanMap = new Map(vlans.map((v) => [v.id, `VLAN ${v.vlanId} - ${v.name}`]))

  // Prepare data rows with headers - Added Switch IP column
  const data = ipAddresses.map((ip) => {
    const device = ip.deviceId ? deviceMap.get(ip.deviceId) : null
    return {
      "IP Address": ip.address,
      Status: ip.status.charAt(0).toUpperCase() + ip.status.slice(1),
      "Device Name": device?.name || "",
      Location: device?.location || "",
      "Switch IP": device?.switchIp || "",
      VLAN: ip.vlanId ? vlanMap.get(ip.vlanId) || "" : "",
      "Range Name": rangeMap.get(ip.rangeId) || "Manual",
      "Assigned At": formatDateTime(ip.assignedAt),
      "Created At": ip.createdAt.toISOString().split("T")[0],
    }
  })

  // Create workbook and worksheet
  const workbook = XLSX.utils.book_new()
  const worksheet = XLSX.utils.json_to_sheet(data)

  // Set column widths for better readability - Added Switch IP column
  worksheet["!cols"] = [
    { wch: 15 }, // IP Address
    { wch: 12 }, // Status
    { wch: 25 }, // Device Name
    { wch: 20 }, // Location
    { wch: 15 }, // Switch IP
    { wch: 20 }, // VLAN
    { wch: 20 }, // Range Name
    { wch: 20 }, // Assigned At
    { wch: 12 }, // Created At
  ]

  XLSX.utils.book_append_sheet(workbook, worksheet, "IP Addresses")

  // Generate filename with current date
  const filename = `ip-addresses-${new Date().toISOString().split("T")[0]}.xlsx`

  downloadWorkbook(workbook, filename)
}

export interface FilteredExportItem {
  ipAddress: string
  deviceName: string
  location: string
  vlanName: string
  status: string
  assignedAt: Date | null
  switchIp: string
  createdAt: Date | null | undefined // Added createdAt field
}

/**
 * Export filtered dashboard data to Excel
 * Only exports the currently visible/filtered results
 */
export function exportFilteredToExcel(data: FilteredExportItem[], filterDescription: string): void {
  const formattedData = data.map((item) => ({
    "IP Address": item.ipAddress,
    "Device Name": item.deviceName || "-",
    Location: item.location || "-",
    "Switch IP": item.switchIp || "-",
    VLAN: item.vlanName || "-",
    Status: item.status.charAt(0).toUpperCase() + item.status.slice(1),
    "Created At": formatDateTime(item.createdAt),
    "Assigned At": formatDateTime(item.assignedAt),
  }))

  const workbook = XLSX.utils.book_new()
  const worksheet = XLSX.utils.json_to_sheet(formattedData)

  worksheet["!cols"] = [
    { wch: 15 }, // IP Address
    { wch: 25 }, // Device Name
    { wch: 20 }, // Location
    { wch: 15 }, // Switch IP
    { wch: 20 }, // VLAN
    { wch: 12 }, // Status
    { wch: 20 }, // Created At
    { wch: 20 }, // Assigned At
  ]

  XLSX.utils.book_append_sheet(workbook, worksheet, "Filtered Results")

  const safeFilterName = filterDescription.toLowerCase().replace(/[^a-z0-9]/g, "-")
  const filename = `ip-inventory-${safeFilterName}-${new Date().toISOString().split("T")[0]}.xlsx`

  downloadWorkbook(workbook, filename)
}

/**
 * Export all data (Devices, IPs, VLANs) to a single Excel file with multiple sheets
 */
export function exportAllToExcel(devices: Device[], ipAddresses: IPAddress[], ranges: IPRange[], vlans: VLAN[]): void {
  const vlanMap = new Map(vlans.map((v) => [v.id, `VLAN ${v.vlanId} - ${v.name}`]))
  const deviceMap = new Map(devices.map((d) => [d.id, { name: d.name, location: d.location, switchIp: d.switchIp }]))
  const rangeMap = new Map(ranges.map((r) => [r.id, r.name]))

  // Create workbook
  const workbook = XLSX.utils.book_new()

  // Sheet 1: Devices - Added Switch IP column
  const devicesData = devices.map((device) => ({
    "Device Name": device.name,
    Location: device.location,
    VLAN: device.vlanId ? vlanMap.get(device.vlanId) || "" : "",
    "IP Address": device.assignedIp || "",
    "Switch IP": device.switchIp || "",
    "MAC Address": device.macAddress || "",
    Type: device.type,
    Notes: device.notes,
    "Assigned At": formatDateTime(device.assignedAt),
    "Created At": device.createdAt.toISOString().split("T")[0],
  }))
  const devicesSheet = XLSX.utils.json_to_sheet(devicesData)
  devicesSheet["!cols"] = [
    { wch: 25 },
    { wch: 20 },
    { wch: 20 },
    { wch: 15 },
    { wch: 15 },
    { wch: 18 },
    { wch: 12 },
    { wch: 30 },
    { wch: 20 },
    { wch: 12 },
  ]
  XLSX.utils.book_append_sheet(workbook, devicesSheet, "Devices")

  // Sheet 2: IP Addresses - Added Switch IP column
  const ipsData = ipAddresses.map((ip) => {
    const device = ip.deviceId ? deviceMap.get(ip.deviceId) : null
    return {
      "IP Address": ip.address,
      Status: ip.status.charAt(0).toUpperCase() + ip.status.slice(1),
      "Device Name": device?.name || "",
      Location: device?.location || "",
      "Switch IP": device?.switchIp || "",
      VLAN: ip.vlanId ? vlanMap.get(ip.vlanId) || "" : "",
      "Range Name": rangeMap.get(ip.rangeId) || "Manual",
      "Assigned At": formatDateTime(ip.assignedAt),
      "Created At": ip.createdAt.toISOString().split("T")[0],
    }
  })
  const ipsSheet = XLSX.utils.json_to_sheet(ipsData)
  ipsSheet["!cols"] = [
    { wch: 15 },
    { wch: 12 },
    { wch: 25 },
    { wch: 20 },
    { wch: 15 },
    { wch: 20 },
    { wch: 20 },
    { wch: 20 },
    { wch: 12 },
  ]
  XLSX.utils.book_append_sheet(workbook, ipsSheet, "IP Addresses")

  // Sheet 3: VLANs
  const vlansData = vlans.map((vlan) => ({
    "VLAN ID": vlan.vlanId,
    Name: vlan.name,
    Description: vlan.description,
    "Created At": vlan.createdAt.toISOString().split("T")[0],
  }))
  const vlansSheet = XLSX.utils.json_to_sheet(vlansData)
  vlansSheet["!cols"] = [{ wch: 10 }, { wch: 20 }, { wch: 30 }, { wch: 12 }]
  XLSX.utils.book_append_sheet(workbook, vlansSheet, "VLANs")

  // Generate filename with current date
  const filename = `network-inventory-${new Date().toISOString().split("T")[0]}.xlsx`

  downloadWorkbook(workbook, filename)
}
