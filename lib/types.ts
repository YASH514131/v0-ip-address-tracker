// Core types for the IP Address, Device, and VLAN Management System

export type IPStatus = "available" | "assigned" | "reserved"

export type DeviceType =
  | "pc"
  | "laptop"
  | "phone"
  | "tablet"
  | "server"
  | "router"
  | "switch"
  | "printer"
  | "camera"
  | "iot"
  | "other"

export interface VLAN {
  id: string
  vlanId: number // e.g., 10, 20, 30
  name: string
  description: string
  createdAt: Date
  updatedAt: Date
}

export interface Device {
  id: string
  name: string
  type: DeviceType
  location: string // Required location field
  vlanId: string | null // Reference to VLAN
  macAddress: string | null // Now optional
  assignedIp: string | null
  switchIp: string | null // Added optional switch IP field
  notes: string
  createdAt: Date
  updatedAt: Date
  assignedAt: Date | null // Added timestamp for when device was assigned to an IP
}

export interface IPAddress {
  id: string
  address: string
  status: IPStatus
  deviceId: string | null
  rangeId: string
  vlanId: string | null
  createdAt: Date
  updatedAt: Date
  assignedAt: Date | null // Added timestamp for when IP was assigned to a device
}

export interface IPRange {
  id: string
  name: string
  startIp: string
  endIp: string
  cidr: string | null
  vlanId: string | null
  createdAt: Date
}

export interface AppState {
  devices: Device[]
  ipAddresses: IPAddress[]
  ipRanges: IPRange[]
  vlans: VLAN[]
}

export const DEVICE_TYPE_LABELS: Record<DeviceType, string> = {
  pc: "Desktop PC",
  laptop: "Laptop",
  phone: "Phone",
  tablet: "Tablet",
  server: "Server",
  router: "Router",
  switch: "Switch",
  printer: "Printer",
  camera: "Camera",
  iot: "IoT Device",
  other: "Other",
}

export const STATUS_COLORS: Record<IPStatus, { bg: string; text: string; dot: string }> = {
  available: { bg: "bg-emerald-500/10", text: "text-emerald-600 dark:text-emerald-400", dot: "bg-emerald-500" },
  assigned: { bg: "bg-sky-500/10", text: "text-sky-600 dark:text-sky-400", dot: "bg-sky-500" },
  reserved: { bg: "bg-amber-500/10", text: "text-amber-600 dark:text-amber-400", dot: "bg-amber-500" },
}

export const VLAN_COLORS = [
  { bg: "bg-violet-500/10", text: "text-violet-600 dark:text-violet-400", border: "border-violet-500/30" },
  { bg: "bg-cyan-500/10", text: "text-cyan-600 dark:text-cyan-400", border: "border-cyan-500/30" },
  { bg: "bg-rose-500/10", text: "text-rose-600 dark:text-rose-400", border: "border-rose-500/30" },
  { bg: "bg-orange-500/10", text: "text-orange-600 dark:text-orange-400", border: "border-orange-500/30" },
  { bg: "bg-teal-500/10", text: "text-teal-600 dark:text-teal-400", border: "border-teal-500/30" },
  { bg: "bg-indigo-500/10", text: "text-indigo-600 dark:text-indigo-400", border: "border-indigo-500/30" },
]
