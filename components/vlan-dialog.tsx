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
import { useStore } from "@/lib/store"
import { useToast } from "@/hooks/use-toast"
import type { VLAN } from "@/lib/types"

interface VlanDialogProps {
  vlan?: VLAN
  trigger?: React.ReactNode
}

export function VlanDialog({ vlan, trigger }: VlanDialogProps) {
  const [open, setOpen] = React.useState(false)
  const [vlanId, setVlanId] = React.useState(vlan?.vlanId?.toString() || "")
  const [name, setName] = React.useState(vlan?.name || "")
  const [description, setDescription] = React.useState(vlan?.description || "")
  const [error, setError] = React.useState("")

  const { addVlan, updateVlan } = useStore()
  const { toast } = useToast()

  const isEdit = !!vlan

  const resetForm = () => {
    if (vlan) {
      setVlanId(vlan.vlanId.toString())
      setName(vlan.name)
      setDescription(vlan.description)
    } else {
      setVlanId("")
      setName("")
      setDescription("")
    }
    setError("")
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setError("")

    const vlanIdNum = Number.parseInt(vlanId, 10)
    if (Number.isNaN(vlanIdNum) || vlanIdNum < 1 || vlanIdNum > 4094) {
      setError("VLAN ID must be between 1 and 4094")
      return
    }

    if (!name.trim()) {
      setError("VLAN name is required")
      return
    }

    const vlanData = {
      vlanId: vlanIdNum,
      name: name.trim(),
      description: description.trim(),
    }

    if (isEdit) {
      const result = updateVlan(vlan.id, vlanData)
      if (result.success) {
        toast({
          title: "VLAN Updated",
          description: `VLAN ${vlanIdNum} has been updated`,
        })
        setOpen(false)
      } else {
        setError(result.error || "Failed to update VLAN")
      }
    } else {
      const result = addVlan(vlanData)
      if (result.success) {
        toast({
          title: "VLAN Created",
          description: `VLAN ${vlanIdNum} - ${name} has been created`,
        })
        resetForm()
        setOpen(false)
      } else {
        setError(result.error || "Failed to create VLAN")
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
          <Button size="sm" variant="outline" className="gap-2 bg-transparent">
            <Plus className="h-4 w-4" />
            Add VLAN
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{isEdit ? "Edit VLAN" : "Add VLAN"}</DialogTitle>
          <DialogDescription>
            {isEdit ? "Update VLAN configuration" : "Create a new VLAN for network segmentation"}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="vlan-id">VLAN ID</Label>
              <Input
                id="vlan-id"
                type="number"
                placeholder="e.g., 10, 20, 100"
                value={vlanId}
                onChange={(e) => setVlanId(e.target.value)}
                min={1}
                max={4094}
              />
              <p className="text-xs text-muted-foreground">Valid range: 1-4094</p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="vlan-name">Name</Label>
              <Input
                id="vlan-name"
                placeholder="e.g., Office, Cameras, Servers"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="vlan-description">Description (Optional)</Label>
              <Textarea
                id="vlan-description"
                placeholder="Describe the purpose of this VLAN..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={2}
              />
            </div>

            {error && <p className="text-sm text-destructive">{error}</p>}
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button type="submit">{isEdit ? "Save Changes" : "Create VLAN"}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
