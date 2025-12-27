"use client"

import * as React from "react"
import { Plus } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useStore } from "@/lib/store"
import { isValidMac, formatMac, isValidIp } from "@/lib/ip-utils"
import { DEVICE_TYPE_LABELS, type Device, type DeviceType } from "@/lib/types"
import { useToast } from "@/hooks/use-toast"

interface DeviceDialogProps {
  device?: Device
  trigger?: React.ReactNode
}

export function DeviceDialog({ device, trigger }: DeviceDialogProps) {
  const [open, setOpen] = React.useState(false)
  const [name, setName] = React.useState(device?.name || "")
  const [location, setLocation] = React.useState(device?.location || "")
  const [type, setType] = React.useState<DeviceType>(device?.type || "other")
  const [vlanId, setVlanId] = React.useState(device?.vlanId || "none")
  const [macAddress, setMacAddress] = React.useState(device?.macAddress || "")
  const [assignedIp, setAssignedIp] = React.useState(device?.assignedIp || "")
  const [manualIp, setManualIp] = React.useState("")
  const [useManualIp, setUseManualIp] = React.useState(false)
  const [switchIp, setSwitchIp] = React.useState(device?.switchIp || "")
  const [notes, setNotes] = React.useState(device?.notes || "")
  const [error, setError] = React.useState("")

  const { addDevice, updateDevice, ipAddresses, vlans } = useStore()
  const { toast } = useToast()

  const isEdit = !!device
  const availableIps = ipAddresses.filter(
    (ip) => ip.status === "available" || (device && ip.address === device.assignedIp),
  )

  const resetForm = () => {
    if (device) {
      setName(device.name)
      setLocation(device.location)
      setType(device.type)
      setVlanId(device.vlanId || "none")
      setMacAddress(device.macAddress || "")
      setAssignedIp(device.assignedIp || "")
      setManualIp("")
      setUseManualIp(false)
      setSwitchIp(device.switchIp || "")
      setNotes(device.notes)
    } else {
      setName("")
      setLocation("")
      setType("other")
      setVlanId("none")
      setMacAddress("")
      setAssignedIp("")
      setManualIp("")
      setUseManualIp(false)
      setSwitchIp("")
      setNotes("")
    }
    setError("")
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setError("")

    if (!name.trim()) {
      setError("Device name is required")
      return
    }

    if (!location.trim()) {
      setError("Location is required")
      return
    }

    // Determine IP to use
    let finalIp: string | null = null
    if (useManualIp && manualIp) {
      if (!isValidIp(manualIp)) {
        setError("Invalid IP address format")
        return
      }
      // Check if IP is already assigned to another device
      const existingIp = ipAddresses.find((ip) => ip.address === manualIp)
      if (existingIp && existingIp.status === "assigned" && existingIp.deviceId !== device?.id) {
        setError("This IP address is already assigned to another device")
        return
      }
      finalIp = manualIp
    } else if (assignedIp && assignedIp !== "none") {
      finalIp = assignedIp
    }

    let formattedMac: string | null = null
    if (macAddress.trim()) {
      if (!isValidMac(macAddress)) {
        setError("Invalid MAC address format. Example: AA:BB:CC:DD:EE:FF")
        return
      }
      formattedMac = formatMac(macAddress)
    }

    let formattedSwitchIp: string | null = null
    if (switchIp.trim()) {
      if (!isValidIp(switchIp)) {
        setError("Invalid Switch IP address format")
        return
      }
      formattedSwitchIp = switchIp.trim()
    }

    const deviceData = {
      name: name.trim(),
      location: location.trim(),
      type,
      vlanId: vlanId !== "none" ? vlanId : null,
      macAddress: formattedMac,
      assignedIp: finalIp,
      switchIp: formattedSwitchIp,
      notes: notes.trim(),
    }

    if (isEdit) {
      const result = updateDevice(device.id, deviceData)
      if (result.success) {
        toast({
          title: "Device Updated",
          description: `"${name}" has been updated`,
        })
        setOpen(false)
      } else {
        setError(result.error || "Failed to update device")
      }
    } else {
      const result = addDevice(deviceData)
      if (result.success) {
        toast({
          title: "Device Added",
          description: `"${name}" has been added to your inventory`,
        })
        resetForm()
        setOpen(false)
      } else {
        setError(result.error || "Failed to add device")
      }
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        setOpen(v)
        if (!v) resetForm()
      }}
    >
      <DialogTrigger asChild>
        {trigger || (
          <Button size="sm" className="gap-2">
            <Plus className="h-4 w-4" />
            Add Device
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEdit ? "Edit Device" : "Add Device"}</DialogTitle>
          <DialogDescription>
            {isEdit ? "Update device information" : "Add a new device to your network inventory"}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="device-name">Device Name *</Label>
              <Input
                id="device-name"
                placeholder="e.g., Main Server, John's Laptop"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="device-location">Location *</Label>
              <Input
                id="device-location"
                placeholder="e.g., Server Room, Building A"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="device-vlan">VLAN *</Label>
              <Select value={vlanId} onValueChange={setVlanId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select VLAN" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">No VLAN</SelectItem>
                  {vlans.map((vlan) => (
                    <SelectItem key={vlan.id} value={vlan.id}>
                      VLAN {vlan.vlanId} - {vlan.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {vlans.length === 0 && (
                <p className="text-xs text-muted-foreground">No VLANs defined. Add a VLAN first.</p>
              )}
            </div>

            {/* IP Address Selection */}
            <div className="space-y-2">
              <Label>IP Address *</Label>
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <input
                    type="radio"
                    id="use-select"
                    checked={!useManualIp}
                    onChange={() => setUseManualIp(false)}
                    className="h-4 w-4"
                  />
                  <Label htmlFor="use-select" className="font-normal">
                    Select from available
                  </Label>
                </div>
                {!useManualIp && (
                  <Select value={assignedIp} onValueChange={setAssignedIp}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select an available IP" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">None</SelectItem>
                      {availableIps.map((ip) => (
                        <SelectItem key={ip.id} value={ip.address}>
                          {ip.address}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
                <div className="flex items-center gap-2">
                  <input
                    type="radio"
                    id="use-manual"
                    checked={useManualIp}
                    onChange={() => setUseManualIp(true)}
                    className="h-4 w-4"
                  />
                  <Label htmlFor="use-manual" className="font-normal">
                    Enter manually
                  </Label>
                </div>
                {useManualIp && (
                  <Input
                    placeholder="e.g., 192.168.1.100"
                    value={manualIp}
                    onChange={(e) => setManualIp(e.target.value)}
                  />
                )}
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="device-type">Device Type</Label>
              <Select value={type} onValueChange={(v) => setType(v as DeviceType)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(DEVICE_TYPE_LABELS).map(([value, label]) => (
                    <SelectItem key={value} value={value}>
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="switch-ip">Switch IP (Optional)</Label>
              <Input
                id="switch-ip"
                placeholder="e.g., 192.168.1.1"
                value={switchIp}
                onChange={(e) => setSwitchIp(e.target.value)}
              />
              <p className="text-xs text-muted-foreground">
                IP address of the network switch this device is connected to
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="mac-address">MAC Address (Optional)</Label>
              <Input
                id="mac-address"
                placeholder="AA:BB:CC:DD:EE:FF"
                value={macAddress}
                onChange={(e) => setMacAddress(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="notes">Notes (Optional)</Label>
              <Textarea
                id="notes"
                placeholder="Any additional notes..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={2}
              />
            </div>

            {error && <p className="text-sm text-destructive">{error}</p>}
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button type="submit">{isEdit ? "Save Changes" : "Add Device"}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
