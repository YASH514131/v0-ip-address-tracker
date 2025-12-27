"use client"

import * as React from "react"
import { Trash2, AlertTriangle } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Label } from "@/components/ui/label"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { useStore } from "@/lib/store"
import { useToast } from "@/hooks/use-toast"

interface DeleteOptionsDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

type DeleteType = "vlan" | "iprange" | "all"

export function DeleteOptionsDialog({ open, onOpenChange }: DeleteOptionsDialogProps) {
  const [deleteType, setDeleteType] = React.useState<DeleteType>("vlan")
  const [selectedVlanId, setSelectedVlanId] = React.useState<string>("")
  const [selectedRangeId, setSelectedRangeId] = React.useState<string>("")
  const [confirmOpen, setConfirmOpen] = React.useState(false)

  const { vlans, ipRanges, devices, ipAddresses, deleteVlan, deleteIpRange, clearAllData } = useStore()
  const { toast } = useToast()

  const resetForm = () => {
    setDeleteType("vlan")
    setSelectedVlanId("")
    setSelectedRangeId("")
  }

  const handleClose = () => {
    onOpenChange(false)
    resetForm()
  }

  const getDeleteDescription = (): string => {
    switch (deleteType) {
      case "vlan": {
        const vlan = vlans.find((v) => v.id === selectedVlanId)
        if (!vlan) return ""
        const vlanDevices = devices.filter((d) => d.vlanId === selectedVlanId)
        const vlanIps = ipAddresses.filter((ip) => ip.vlanId === selectedVlanId)
        return `This will DELETE VLAN ${vlan.vlanId} (${vlan.name}) along with ${vlanDevices.length} devices and ${vlanIps.length} IP addresses associated with this VLAN.`
      }
      case "iprange": {
        const range = ipRanges.find((r) => r.id === selectedRangeId)
        if (!range) return ""
        const rangeIps = ipAddresses.filter((ip) => ip.rangeId === selectedRangeId)
        const assignedCount = rangeIps.filter((ip) => ip.status === "assigned").length
        return `This will DELETE IP range "${range.name}" (${range.startIp} - ${range.endIp}) with ${rangeIps.length} IPs and ${assignedCount} associated devices.`
      }
      case "all":
        return `This will permanently delete ALL data: ${devices.length} devices, ${ipAddresses.length} IP addresses, ${ipRanges.length} IP ranges, and ${vlans.length} VLANs.`
      default:
        return ""
    }
  }

  const handleDelete = () => {
    switch (deleteType) {
      case "vlan": {
        const vlan = vlans.find((v) => v.id === selectedVlanId)
        deleteVlan(selectedVlanId)
        toast({
          title: "VLAN Deleted",
          description: `VLAN ${vlan?.vlanId} (${vlan?.name}) has been deleted.`,
        })
        break
      }
      case "iprange": {
        const range = ipRanges.find((r) => r.id === selectedRangeId)
        deleteIpRange(selectedRangeId)
        toast({
          title: "IP Range Deleted",
          description: `IP range "${range?.name}" has been deleted.`,
        })
        break
      }
      case "all":
        clearAllData()
        toast({
          title: "All Data Cleared",
          description: "All devices, IPs, ranges, and VLANs have been deleted.",
        })
        break
    }
    setConfirmOpen(false)
    handleClose()
  }

  const canProceed = (): boolean => {
    switch (deleteType) {
      case "vlan":
        return !!selectedVlanId
      case "iprange":
        return !!selectedRangeId
      case "all":
        return true
      default:
        return false
    }
  }

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-destructive">
              <Trash2 className="h-5 w-5" />
              Delete Data
            </DialogTitle>
            <DialogDescription>Choose what data you want to delete from the system.</DialogDescription>
          </DialogHeader>

          <div className="space-y-6 py-4">
            <RadioGroup
              value={deleteType}
              onValueChange={(v) => {
                setDeleteType(v as DeleteType)
                setSelectedVlanId("")
                setSelectedRangeId("")
              }}
              className="space-y-3"
            >
              <div className="flex items-center space-x-3 p-3 rounded-lg border hover:bg-muted/50 cursor-pointer">
                <RadioGroupItem value="vlan" id="delete-vlan" />
                <Label htmlFor="delete-vlan" className="flex-1 cursor-pointer">
                  <div className="font-medium">Delete Specific VLAN</div>
                  <div className="text-sm text-muted-foreground">Remove a VLAN and unassign its devices/IPs</div>
                </Label>
              </div>

              <div className="flex items-center space-x-3 p-3 rounded-lg border hover:bg-muted/50 cursor-pointer">
                <RadioGroupItem value="iprange" id="delete-iprange" />
                <Label htmlFor="delete-iprange" className="flex-1 cursor-pointer">
                  <div className="font-medium">Delete Specific IP Range</div>
                  <div className="text-sm text-muted-foreground">Remove an IP range and its addresses</div>
                </Label>
              </div>

              <div className="flex items-center space-x-3 p-3 rounded-lg border border-destructive/50 hover:bg-destructive/10 cursor-pointer">
                <RadioGroupItem value="all" id="delete-all" />
                <Label htmlFor="delete-all" className="flex-1 cursor-pointer">
                  <div className="font-medium text-destructive">Delete All Data</div>
                  <div className="text-sm text-muted-foreground">Permanently remove everything</div>
                </Label>
              </div>
            </RadioGroup>

            {deleteType === "vlan" && (
              <div className="space-y-2">
                <Label>Select VLAN to Delete</Label>
                <Select value={selectedVlanId} onValueChange={setSelectedVlanId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Choose a VLAN..." />
                  </SelectTrigger>
                  <SelectContent>
                    {vlans.length === 0 ? (
                      <SelectItem value="none" disabled>
                        No VLANs available
                      </SelectItem>
                    ) : (
                      vlans.map((vlan) => (
                        <SelectItem key={vlan.id} value={vlan.id}>
                          VLAN {vlan.vlanId} - {vlan.name}
                        </SelectItem>
                      ))
                    )}
                  </SelectContent>
                </Select>
              </div>
            )}

            {deleteType === "iprange" && (
              <div className="space-y-2">
                <Label>Select IP Range to Delete</Label>
                <Select value={selectedRangeId} onValueChange={setSelectedRangeId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Choose an IP range..." />
                  </SelectTrigger>
                  <SelectContent>
                    {ipRanges.length === 0 ? (
                      <SelectItem value="none" disabled>
                        No IP ranges available
                      </SelectItem>
                    ) : (
                      ipRanges.map((range) => (
                        <SelectItem key={range.id} value={range.id}>
                          {range.name} ({range.startIp} - {range.endIp})
                        </SelectItem>
                      ))
                    )}
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={handleClose}>
              Cancel
            </Button>
            <Button type="button" variant="destructive" onClick={() => setConfirmOpen(true)} disabled={!canProceed()}>
              Continue
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-destructive" />
              Confirm Deletion
            </AlertDialogTitle>
            <AlertDialogDescription>{getDeleteDescription()}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete Permanently
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
