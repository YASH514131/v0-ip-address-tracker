"use client"

import { create } from "zustand"
import { persist, createJSONStorage } from "zustand/middleware"
import type { Device, IPAddress, IPRange, IPStatus, AppState, VLAN } from "./types"
import { generateIpRange } from "./ip-utils"

// Generate a simple unique ID
function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
}

const browserStorage = {
  getItem: (name: string): string | null => {
    if (typeof window === "undefined") return null
    return localStorage.getItem(name)
  },
  setItem: (name: string, value: string): void => {
    if (typeof window === "undefined") return
    localStorage.setItem(name, value)
  },
  removeItem: (name: string): void => {
    if (typeof window === "undefined") return
    localStorage.removeItem(name)
  },
}

interface StoreState extends AppState {
  // Device actions
  addDevice: (device: Omit<Device, "id" | "createdAt" | "updatedAt" | "assignedAt">) => {
    success: boolean
    error?: string
  }
  updateDevice: (id: string, updates: Partial<Omit<Device, "id" | "createdAt">>) => { success: boolean; error?: string }
  deleteDevice: (id: string) => void

  // IP Range actions
  addIpRange: (range: Omit<IPRange, "id" | "createdAt">) => { success: boolean; error?: string; count?: number }
  deleteIpRange: (id: string) => void

  // IP Address actions
  updateIpStatus: (id: string, status: IPStatus) => void
  assignIpToDevice: (ipId: string, deviceId: string) => { success: boolean; error?: string }
  unassignIp: (ipId: string) => void

  addManualIp: (address: string, vlanId: string | null) => { success: boolean; error?: string; ipId?: string }

  addVlan: (vlan: Omit<VLAN, "id" | "createdAt" | "updatedAt">) => { success: boolean; error?: string }
  updateVlan: (id: string, updates: Partial<Omit<VLAN, "id" | "createdAt">>) => { success: boolean; error?: string }
  deleteVlan: (id: string) => void

  bulkImportDevices: (devices: Array<{ name: string; location: string; ipAddress: string; vlanId?: string }>) => {
    success: boolean
    imported: number
    skipped: number
    errors: string[]
  }

  // Utility
  getDeviceById: (id: string) => Device | undefined
  getIpsByRange: (rangeId: string) => IPAddress[]
  getAvailableIps: () => IPAddress[]
  getVlanById: (id: string) => VLAN | undefined
  clearAllData: () => void
}

export const useStore = create<StoreState>()(
  persist(
    (set, get) => ({
      devices: [],
      ipAddresses: [],
      ipRanges: [],
      vlans: [],

      // Device Management
      addDevice: (deviceData) => {
        const state = get()

        if (deviceData.macAddress) {
          const macExists = state.devices.some(
            (d) => d.macAddress && d.macAddress.toLowerCase() === deviceData.macAddress!.toLowerCase(),
          )
          if (macExists) {
            return { success: false, error: "A device with this MAC address already exists" }
          }
        }

        // Validate assigned IP if provided
        if (deviceData.assignedIp) {
          const ip = state.ipAddresses.find((ip) => ip.address === deviceData.assignedIp)
          if (!ip) {
            return { success: false, error: "The specified IP address is not in any managed range" }
          }
          if (ip.status === "assigned" && ip.deviceId) {
            return { success: false, error: "This IP address is already assigned to another device" }
          }
        }

        const now = new Date()
        const newDevice: Device = {
          ...deviceData,
          id: generateId(),
          createdAt: now,
          updatedAt: now,
          assignedAt: deviceData.assignedIp ? now : null,
        }

        set((state) => {
          const newState: Partial<StoreState> = { devices: [...state.devices, newDevice] }

          // Update IP status if assigned
          if (deviceData.assignedIp) {
            newState.ipAddresses = state.ipAddresses.map((ip) =>
              ip.address === deviceData.assignedIp
                ? { ...ip, status: "assigned" as IPStatus, deviceId: newDevice.id, updatedAt: now, assignedAt: now }
                : ip,
            )
          }

          return newState as StoreState
        })

        return { success: true }
      },

      updateDevice: (id, updates) => {
        const state = get()
        const existingDevice = state.devices.find((d) => d.id === id)

        if (!existingDevice) {
          return { success: false, error: "Device not found" }
        }

        if (updates.macAddress && updates.macAddress !== existingDevice.macAddress) {
          const macExists = state.devices.some(
            (d) => d.id !== id && d.macAddress && d.macAddress.toLowerCase() === updates.macAddress!.toLowerCase(),
          )
          if (macExists) {
            return { success: false, error: "A device with this MAC address already exists" }
          }
        }

        // Handle IP assignment changes
        const oldIp = existingDevice.assignedIp
        const newIp = updates.assignedIp

        if (newIp && newIp !== oldIp) {
          const ip = state.ipAddresses.find((ip) => ip.address === newIp)
          if (!ip) {
            return { success: false, error: "The specified IP address is not in any managed range" }
          }
          if (ip.status === "assigned" && ip.deviceId && ip.deviceId !== id) {
            return { success: false, error: "This IP address is already assigned to another device" }
          }
        }

        set((state) => {
          let ipAddresses = [...state.ipAddresses]
          const now = new Date()

          // Unassign old IP - clear assignedAt
          if (oldIp && oldIp !== newIp) {
            ipAddresses = ipAddresses.map((ip) =>
              ip.address === oldIp
                ? { ...ip, status: "available" as IPStatus, deviceId: null, updatedAt: now, assignedAt: null }
                : ip,
            )
          }

          // Assign new IP - set assignedAt
          if (newIp && newIp !== oldIp) {
            ipAddresses = ipAddresses.map((ip) =>
              ip.address === newIp
                ? { ...ip, status: "assigned" as IPStatus, deviceId: id, updatedAt: now, assignedAt: now }
                : ip,
            )
          }

          const deviceUpdates = {
            ...updates,
            updatedAt: now,
            assignedAt: newIp && newIp !== oldIp ? now : newIp === null ? null : existingDevice.assignedAt,
          }

          return {
            devices: state.devices.map((d) => (d.id === id ? { ...d, ...deviceUpdates } : d)),
            ipAddresses,
          }
        })

        return { success: true }
      },

      deleteDevice: (id) => {
        set((state) => ({
          devices: state.devices.filter((d) => d.id !== id),
          ipAddresses: state.ipAddresses.map((ip) =>
            ip.deviceId === id
              ? { ...ip, status: "available" as IPStatus, deviceId: null, updatedAt: new Date(), assignedAt: null }
              : ip,
          ),
        }))
      },

      // IP Range Management
      addIpRange: (rangeData) => {
        const state = get()

        // Generate IPs in range
        const ips = generateIpRange(rangeData.startIp, rangeData.endIp)

        // Check for overlapping IPs
        const existingIps = new Set(state.ipAddresses.map((ip) => ip.address))
        const duplicates = ips.filter((ip) => existingIps.has(ip))

        if (duplicates.length > 0) {
          return {
            success: false,
            error: `${duplicates.length} IP addresses already exist in other ranges: ${duplicates.slice(0, 3).join(", ")}${duplicates.length > 3 ? "..." : ""}`,
          }
        }

        const rangeId = generateId()
        const newRange: IPRange = {
          ...rangeData,
          id: rangeId,
          createdAt: new Date(),
        }

        const newIps: IPAddress[] = ips.map((address) => ({
          id: generateId(),
          address,
          status: "available" as IPStatus,
          deviceId: null,
          rangeId,
          vlanId: rangeData.vlanId || null,
          createdAt: new Date(),
          updatedAt: new Date(),
        }))

        set((state) => ({
          ipRanges: [...state.ipRanges, newRange],
          ipAddresses: [...state.ipAddresses, ...newIps],
        }))

        return { success: true, count: ips.length }
      },

      deleteIpRange: (id) => {
        set((state) => {
          // Get IPs that will be deleted
          const ipsToDelete = state.ipAddresses.filter((ip) => ip.rangeId === id)
          const affectedDeviceIds = new Set(ipsToDelete.filter((ip) => ip.deviceId).map((ip) => ip.deviceId!))

          return {
            ipRanges: state.ipRanges.filter((r) => r.id !== id),
            ipAddresses: state.ipAddresses.filter((ip) => ip.rangeId !== id),
            devices: state.devices.map((d) =>
              affectedDeviceIds.has(d.id) ? { ...d, assignedIp: null, updatedAt: new Date() } : d,
            ),
          }
        })
      },

      // IP Address Management
      updateIpStatus: (id, status) => {
        set((state) => ({
          ipAddresses: state.ipAddresses.map((ip) =>
            ip.id === id
              ? {
                  ...ip,
                  status,
                  deviceId: status === "available" ? null : ip.deviceId,
                  updatedAt: new Date(),
                }
              : ip,
          ),
        }))
      },

      assignIpToDevice: (ipId, deviceId) => {
        const state = get()
        const ip = state.ipAddresses.find((ip) => ip.id === ipId)
        const device = state.devices.find((d) => d.id === deviceId)

        if (!ip || !device) {
          return { success: false, error: "IP or Device not found" }
        }

        if (ip.status === "assigned" && ip.deviceId && ip.deviceId !== deviceId) {
          return { success: false, error: "IP is already assigned to another device" }
        }

        set((state) => {
          const now = new Date()
          // Unassign any previous IP from the device - clear assignedAt
          let ipAddresses = state.ipAddresses.map((existingIp) =>
            existingIp.deviceId === deviceId && existingIp.id !== ipId
              ? { ...existingIp, status: "available" as IPStatus, deviceId: null, updatedAt: now, assignedAt: null }
              : existingIp,
          )

          // Assign the new IP - set assignedAt
          ipAddresses = ipAddresses.map((existingIp) =>
            existingIp.id === ipId
              ? { ...existingIp, status: "assigned" as IPStatus, deviceId, updatedAt: now, assignedAt: now }
              : existingIp,
          )

          return {
            ipAddresses,
            devices: state.devices.map((d) =>
              d.id === deviceId ? { ...d, assignedIp: ip.address, updatedAt: now, assignedAt: now } : d,
            ),
          }
        })

        return { success: true }
      },

      unassignIp: (ipId) => {
        set((state) => {
          const ip = state.ipAddresses.find((ip) => ip.id === ipId)
          if (!ip || !ip.deviceId) return state
          const now = new Date()

          return {
            ipAddresses: state.ipAddresses.map((existingIp) =>
              existingIp.id === ipId
                ? { ...existingIp, status: "available" as IPStatus, deviceId: null, updatedAt: now, assignedAt: null }
                : existingIp,
            ),
            devices: state.devices.map((d) =>
              d.id === ip.deviceId ? { ...d, assignedIp: null, updatedAt: now, assignedAt: null } : d,
            ),
          }
        })
      },

      addManualIp: (address, vlanId) => {
        const state = get()

        // Check if IP already exists
        const existingIp = state.ipAddresses.find((ip) => ip.address === address)
        if (existingIp) {
          return { success: true, ipId: existingIp.id } // Return existing IP ID
        }

        const newIp: IPAddress = {
          id: generateId(),
          address,
          status: "available" as IPStatus,
          deviceId: null,
          rangeId: "manual",
          vlanId,
          createdAt: new Date(),
          updatedAt: new Date(),
          assignedAt: null,
        }

        set((state) => ({
          ipAddresses: [...state.ipAddresses, newIp],
        }))

        return { success: true, ipId: newIp.id }
      },

      addVlan: (vlanData) => {
        const state = get()

        // Check for duplicate VLAN ID
        const vlanIdExists = state.vlans.some((v) => v.vlanId === vlanData.vlanId)
        if (vlanIdExists) {
          return { success: false, error: `VLAN ${vlanData.vlanId} already exists` }
        }

        const newVlan: VLAN = {
          ...vlanData,
          id: generateId(),
          createdAt: new Date(),
          updatedAt: new Date(),
        }

        set((state) => ({
          vlans: [...state.vlans, newVlan],
        }))

        return { success: true }
      },

      updateVlan: (id, updates) => {
        const state = get()
        const existingVlan = state.vlans.find((v) => v.id === id)

        if (!existingVlan) {
          return { success: false, error: "VLAN not found" }
        }

        // Check for duplicate VLAN ID if changing
        if (updates.vlanId && updates.vlanId !== existingVlan.vlanId) {
          const vlanIdExists = state.vlans.some((v) => v.id !== id && v.vlanId === updates.vlanId)
          if (vlanIdExists) {
            return { success: false, error: `VLAN ${updates.vlanId} already exists` }
          }
        }

        set((state) => ({
          vlans: state.vlans.map((v) => (v.id === id ? { ...v, ...updates, updatedAt: new Date() } : v)),
        }))

        return { success: true }
      },

      deleteVlan: (id) => {
        set((state) => ({
          vlans: state.vlans.filter((v) => v.id !== id),
          // Remove VLAN reference from devices and IPs
          devices: state.devices.map((d) => (d.vlanId === id ? { ...d, vlanId: null, updatedAt: new Date() } : d)),
          ipAddresses: state.ipAddresses.map((ip) =>
            ip.vlanId === id ? { ...ip, vlanId: null, updatedAt: new Date() } : ip,
          ),
          ipRanges: state.ipRanges.map((r) => (r.vlanId === id ? { ...r, vlanId: null } : r)),
        }))
      },

      bulkImportDevices: (importData) => {
        const state = get()
        let imported = 0
        let skipped = 0
        const errors: string[] = []
        const devicesToAdd: Device[] = []
        const now = new Date()

        for (const item of importData) {
          // Skip if IP already assigned
          const existingDevice = state.devices.find(
            (d) => d.assignedIp === item.ipAddress || d.name.toLowerCase() === item.name.toLowerCase(),
          )

          if (existingDevice) {
            skipped++
            errors.push(`Skipped: Device "${item.name}" or IP ${item.ipAddress} already exists`)
            continue
          }

          const deviceId = generateId()
          const newDevice: Device = {
            id: deviceId,
            name: item.name,
            type: "other",
            location: item.location,
            vlanId: item.vlanId || null,
            macAddress: null,
            assignedIp: item.ipAddress,
            switchIp: null,
            notes: "",
            createdAt: now,
            updatedAt: now,
            assignedAt: now,
          }

          devicesToAdd.push(newDevice)
          imported++
        }

        if (devicesToAdd.length > 0) {
          set((state) => {
            const ipAddresses = [...state.ipAddresses]

            // Create manual IPs for any that don't exist and update assignments
            for (const device of devicesToAdd) {
              if (device.assignedIp) {
                const existingIpIndex = ipAddresses.findIndex((ip) => ip.address === device.assignedIp)
                if (existingIpIndex >= 0) {
                  ipAddresses[existingIpIndex] = {
                    ...ipAddresses[existingIpIndex],
                    status: "assigned",
                    deviceId: device.id,
                    updatedAt: now,
                    assignedAt: now,
                  }
                } else {
                  // Add new IP entry with assignedAt
                  ipAddresses.push({
                    id: generateId(),
                    address: device.assignedIp,
                    status: "assigned",
                    deviceId: device.id,
                    rangeId: "manual-import",
                    vlanId: device.vlanId,
                    createdAt: now,
                    updatedAt: now,
                    assignedAt: now,
                  })
                }
              }
            }

            return {
              devices: [...state.devices, ...devicesToAdd],
              ipAddresses,
            }
          })
        }

        return { success: true, imported, skipped, errors }
      },

      // Utilities
      getDeviceById: (id) => get().devices.find((d) => d.id === id),
      getIpsByRange: (rangeId) => get().ipAddresses.filter((ip) => ip.rangeId === rangeId),
      getAvailableIps: () => get().ipAddresses.filter((ip) => ip.status === "available"),
      getVlanById: (id) => get().vlans.find((v) => v.id === id),

      clearAllData: () => set({ devices: [], ipAddresses: [], ipRanges: [], vlans: [] }),
    }),
    {
      name: "ip-manager-storage-v4",
      storage: createJSONStorage(() => browserStorage),
      version: 4,
      migrate: (persistedState, version) => {
        // Return persisted state as-is, it will be merged with defaults
        return persistedState as StoreState
      },
      // Custom serialization for Date objects
      serialize: (state) =>
        JSON.stringify(state, (key, value) => {
          if (value instanceof Date) return value.toISOString()
          return value
        }),
      deserialize: (str) => {
        const parsed = JSON.parse(str)
        // Convert date strings back to Date objects
        const convertDates = (obj: Record<string, unknown>): Record<string, unknown> => {
          for (const key in obj) {
            const value = obj[key]
            if (typeof value === "string" && /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(value)) {
              obj[key] = new Date(value)
            } else if (typeof value === "object" && value !== null) {
              convertDates(value as Record<string, unknown>)
            }
          }
          return obj
        }
        return convertDates(parsed) as typeof parsed
      },
    },
  ),
)
