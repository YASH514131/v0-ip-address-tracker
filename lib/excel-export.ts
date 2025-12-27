import * as XLSX from "xlsx"
import type { Device, IPAddress, IPRange, VLAN } from "./types"

function downloadWorkbook(workbook: XLSX.WorkBook, filename: string): void {
  const excelBuffer = XLSX.write(workbook, { bookType: "xlsx", type: "array" })
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

function formatDate(date: Date | string | null | undefined): string {
  if (!date) return ""
  const dateObj = typeof date === "string" ? new Date(date) : date
  if (isNaN(dateObj.getTime())) return ""

  const year = dateObj.getFullYear()
  const month = String(dateObj.getMonth() + 1).padStart(2, "0")
  const day = String(dateObj.getDate()).padStart(2, "0")
  return `${year}-${month}-${day}`
}

function formatTime(date: Date | string | null | undefined): string {
  if (!date) return ""
  const dateObj = typeof date === "string" ? new Date(date) : date
  if (isNaN(dateObj.getTime())) return ""

  let hours = dateObj.getHours()
  const minutes = String(dateObj.getMinutes()).padStart(2, "0")
  const ampm = hours >= 12 ? "pm" : "am"
  hours = hours % 12
  hours = hours ? hours : 12
  return `${hours}:${minutes}${ampm}`
}

/**
 * Export devices to Excel (.xlsx) format
 * Includes device details with resolved VLAN names
 */
export function exportDevicesToExcel(devices: Device[], ipAddresses: IPAddress[], vlans: VLAN[]): void {
  const vlanMap = new Map(vlans.map((v) => [v.id, `VLAN ${v.vlanId} - ${v.name}`]))

  const data = devices.map((device) => ({
    "Device Name": device.name,
    Location: device.location,
    VLAN: device.vlanId ? vlanMap.get(device.vlanId) || "" : "",
    "IP Address": device.assignedIp || "",
    "Switch IP": device.switchIp || "",
    "MAC Address": device.macAddress || "",
    Type: device.type,
    Notes: device.notes,
    "Assigned Date": formatDate(device.assignedAt),
    "Assigned Time": formatTime(device.assignedAt),
  }))

  const workbook = XLSX.utils.book_new()
  const worksheet = XLSX.utils.json_to_sheet(data)

  worksheet["!cols"] = [
    { wch: 25 }, // Device Name
    { wch: 20 }, // Location
    { wch: 20 }, // VLAN
    { wch: 15 }, // IP Address
    { wch: 15 }, // Switch IP
    { wch: 18 }, // MAC Address
    { wch: 12 }, // Type
    { wch: 30 }, // Notes
    { wch: 14 }, // Assigned Date
    { wch: 12 }, // Assigned Time
  ]

  XLSX.utils.book_append_sheet(workbook, worksheet, "Devices")
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
      "Assigned Date": formatDate(ip.assignedAt),
      "Assigned Time": formatTime(ip.assignedAt),
    }
  })

  const workbook = XLSX.utils.book_new()
  const worksheet = XLSX.utils.json_to_sheet(data)

  worksheet["!cols"] = [
    { wch: 15 }, // IP Address
    { wch: 12 }, // Status
    { wch: 25 }, // Device Name
    { wch: 20 }, // Location
    { wch: 15 }, // Switch IP
    { wch: 20 }, // VLAN
    { wch: 20 }, // Range Name
    { wch: 14 }, // Assigned Date
    { wch: 12 }, // Assigned Time
  ]

  XLSX.utils.book_append_sheet(workbook, worksheet, "IP Addresses")
  const filename = `ip-addresses-${new Date().toISOString().split("T")[0]}.xlsx`
  downloadWorkbook(workbook, filename)
}

export interface FilteredExportItem {
  ipAddress: string
  deviceName: string
  location: string
  vlanName: string
  status: string
  assignedAt: Date | string | null
  switchIp: string
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
    "Assigned Date": formatDate(item.assignedAt),
    "Assigned Time": formatTime(item.assignedAt),
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
    { wch: 14 }, // Assigned Date
    { wch: 12 }, // Assigned Time
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

  const workbook = XLSX.utils.book_new()

  const devicesData = devices.map((device) => ({
    "Device Name": device.name,
    Location: device.location,
    VLAN: device.vlanId ? vlanMap.get(device.vlanId) || "" : "",
    "IP Address": device.assignedIp || "",
    "Switch IP": device.switchIp || "",
    "MAC Address": device.macAddress || "",
    Type: device.type,
    Notes: device.notes,
    "Assigned Date": formatDate(device.assignedAt),
    "Assigned Time": formatTime(device.assignedAt),
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
    { wch: 14 },
    { wch: 12 },
  ]
  XLSX.utils.book_append_sheet(workbook, devicesSheet, "Devices")

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
      "Assigned Date": formatDate(ip.assignedAt),
      "Assigned Time": formatTime(ip.assignedAt),
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
    { wch: 14 },
    { wch: 12 },
  ]
  XLSX.utils.book_append_sheet(workbook, ipsSheet, "IP Addresses")

  // Sheet 3: VLANs (unchanged)
  const vlansData = vlans.map((vlan) => ({
    "VLAN ID": vlan.vlanId,
    Name: vlan.name,
    Description: vlan.description,
  }))
  const vlansSheet = XLSX.utils.json_to_sheet(vlansData)
  vlansSheet["!cols"] = [{ wch: 10 }, { wch: 20 }, { wch: 30 }]
  XLSX.utils.book_append_sheet(workbook, vlansSheet, "VLANs")

  const filename = `network-inventory-${new Date().toISOString().split("T")[0]}.xlsx`
  downloadWorkbook(workbook, filename)
}
