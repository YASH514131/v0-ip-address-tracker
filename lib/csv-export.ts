import type { Device, IPAddress, IPRange, VLAN } from "./types"

export function exportDevicesToCsv(devices: Device[], ipAddresses: IPAddress[], vlans: VLAN[]): string {
  const headers = ["Name", "Location", "VLAN", "IP Address", "MAC Address", "Type", "Notes", "Created At"]
  const vlanMap = new Map(vlans.map((v) => [v.id, `VLAN ${v.vlanId} - ${v.name}`]))

  const rows = devices.map((device) => {
    return [
      escapeCsvField(device.name),
      escapeCsvField(device.location),
      escapeCsvField(device.vlanId ? vlanMap.get(device.vlanId) || "" : ""),
      escapeCsvField(device.assignedIp || ""),
      escapeCsvField(device.macAddress || ""),
      escapeCsvField(device.type),
      escapeCsvField(device.notes),
      escapeCsvField(device.createdAt.toISOString()),
    ].join(",")
  })

  return [headers.join(","), ...rows].join("\n")
}

export function exportIpsToCsv(ipAddresses: IPAddress[], devices: Device[], ranges: IPRange[], vlans: VLAN[]): string {
  const headers = ["IP Address", "Status", "Device Name", "Location", "VLAN", "Range Name", "Created At"]

  const deviceMap = new Map(devices.map((d) => [d.id, { name: d.name, location: d.location }]))
  const rangeMap = new Map(ranges.map((r) => [r.id, r.name]))
  const vlanMap = new Map(vlans.map((v) => [v.id, `VLAN ${v.vlanId} - ${v.name}`]))

  const rows = ipAddresses.map((ip) => {
    const device = ip.deviceId ? deviceMap.get(ip.deviceId) : null
    return [
      escapeCsvField(ip.address),
      escapeCsvField(ip.status),
      escapeCsvField(device?.name || ""),
      escapeCsvField(device?.location || ""),
      escapeCsvField(ip.vlanId ? vlanMap.get(ip.vlanId) || "" : ""),
      escapeCsvField(rangeMap.get(ip.rangeId) || "Manual"),
      escapeCsvField(ip.createdAt.toISOString()),
    ].join(",")
  })

  return [headers.join(","), ...rows].join("\n")
}

// Helper to escape CSV fields
function escapeCsvField(field: string): string {
  if (field.includes(",") || field.includes('"') || field.includes("\n")) {
    return `"${field.replace(/"/g, '""')}"`
  }
  return field
}

// Trigger download
export function downloadCsv(content: string, filename: string): void {
  const blob = new Blob([content], { type: "text/csv;charset=utf-8;" })
  const url = URL.createObjectURL(blob)
  const link = document.createElement("a")
  link.href = url
  link.download = filename
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}
