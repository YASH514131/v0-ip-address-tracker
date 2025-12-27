"use client"

import * as React from "react"
import { Plus } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useStore } from "@/lib/store"
import { useToast } from "@/hooks/use-toast"
import { isValidIp } from "@/lib/ip-utils"
import type { OtherDevice } from "@/lib/types"

interface OtherDeviceDialogProps {
  device?: OtherDevice
  trigger?: React.ReactNode
}

export function OtherDeviceDialog({ device, trigger }: OtherDeviceDialogProps) {
  const [open, setOpen] = React.useState(false)
  const [name, setName] = React.useState("")
  const [displayIp, setDisplayIp] = React.useState("")
  const [controllerIp, setControllerIp] = React.useState("")
  const [location, setLocation] = React.useState("")
  const [cameraIp, setCameraIp] = React.useState("")
  const [errors, setErrors] = React.useState<Record<string, string>>({})

  const { addOtherDevice, updateOtherDevice } = useStore()
  const { toast } = useToast()
  const isEdit = !!device

  React.useEffect(() => {
    if (open && device) {
      setName(device.name)
      setDisplayIp(device.displayIp)
      setControllerIp(device.controllerIp)
      setLocation(device.location)
      setCameraIp(device.cameraIp || "")
      setErrors({})
    } else if (open) {
      setName("")
      setDisplayIp("")
      setControllerIp("")
      setLocation("")
      setCameraIp("")
      setErrors({})
    }
  }, [open, device])

  const validate = () => {
    const newErrors: Record<string, string> = {}

    if (!name.trim()) {
      newErrors.name = "Name is required"
    }

    if (!displayIp.trim()) {
      newErrors.displayIp = "Display IP is required"
    } else if (!isValidIp(displayIp)) {
      newErrors.displayIp = "Invalid IP address format"
    }

    if (!controllerIp.trim()) {
      newErrors.controllerIp = "Controller IP is required"
    } else if (!isValidIp(controllerIp)) {
      newErrors.controllerIp = "Invalid IP address format"
    }

    if (!location.trim()) {
      newErrors.location = "Location is required"
    }

    if (cameraIp.trim() && !isValidIp(cameraIp)) {
      newErrors.cameraIp = "Invalid IP address format"
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()

    if (!validate()) return

    const deviceData = {
      name: name.trim(),
      displayIp: displayIp.trim(),
      controllerIp: controllerIp.trim(),
      location: location.trim(),
      cameraIp: cameraIp.trim(),
    }

    let result
    if (isEdit) {
      result = updateOtherDevice(device.id, deviceData)
    } else {
      result = addOtherDevice(deviceData)
    }

    if (result.success) {
      toast({
        title: isEdit ? "Device Updated" : "Device Added",
        description: `${name} has been ${isEdit ? "updated" : "added"} successfully`,
      })
      setOpen(false)
    } else {
      toast({
        title: "Error",
        description: result.error,
        variant: "destructive",
      })
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <Button size="sm">
            <Plus className="h-4 w-4 mr-2" />
            Add Device
          </Button>
        )}
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{isEdit ? "Edit Device" : "Add New Device"}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Name *</Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g., Display Panel 1"
            />
            {errors.name && <p className="text-sm text-destructive">{errors.name}</p>}
          </div>

          <div className="space-y-2">
            <Label htmlFor="displayIp">Display IP *</Label>
            <Input
              id="displayIp"
              value={displayIp}
              onChange={(e) => setDisplayIp(e.target.value)}
              placeholder="e.g., 192.168.10.50"
            />
            {errors.displayIp && <p className="text-sm text-destructive">{errors.displayIp}</p>}
          </div>

          <div className="space-y-2">
            <Label htmlFor="controllerIp">Controller IP *</Label>
            <Input
              id="controllerIp"
              value={controllerIp}
              onChange={(e) => setControllerIp(e.target.value)}
              placeholder="e.g., 192.168.10.1"
            />
            {errors.controllerIp && <p className="text-sm text-destructive">{errors.controllerIp}</p>}
          </div>

          <div className="space-y-2">
            <Label htmlFor="location">Location *</Label>
            <Input
              id="location"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              placeholder="e.g., Lobby Floor 1"
            />
            {errors.location && <p className="text-sm text-destructive">{errors.location}</p>}
          </div>

          <div className="space-y-2">
            <Label htmlFor="cameraIp">Camera IP (Optional)</Label>
            <Input
              id="cameraIp"
              value={cameraIp}
              onChange={(e) => setCameraIp(e.target.value)}
              placeholder="e.g., 192.168.10.100"
            />
            {errors.cameraIp && <p className="text-sm text-destructive">{errors.cameraIp}</p>}
          </div>

          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button type="submit">{isEdit ? "Update" : "Add"} Device</Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
