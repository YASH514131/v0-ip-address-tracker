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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { useStore } from "@/lib/store"
import { isValidIp, parseCidr, ipToNumber } from "@/lib/ip-utils"
import { useToast } from "@/hooks/use-toast"

interface IpRangeDialogProps {
  trigger?: React.ReactNode
}

function extractVlanFromIp(ip: string): number | null {
  if (!isValidIp(ip)) return null
  const parts = ip.split(".")
  if (parts.length !== 4) return null
  const thirdOctet = Number.parseInt(parts[2], 10)
  if (isNaN(thirdOctet) || thirdOctet < 1 || thirdOctet > 255) return null
  return thirdOctet
}

export function IpRangeDialog({ trigger }: IpRangeDialogProps) {
  const [open, setOpen] = React.useState(false)
  const [inputType, setInputType] = React.useState<"range" | "cidr">("range")
  const [name, setName] = React.useState("")
  const [startIp, setStartIp] = React.useState("")
  const [endIp, setEndIp] = React.useState("")
  const [cidr, setCidr] = React.useState("")
  const [vlanId, setVlanId] = React.useState<string>("none")
  const [error, setError] = React.useState("")
  const [autoDetectedVlan, setAutoDetectedVlan] = React.useState<string | null>(null)

  const { addIpRange, vlans } = useStore()
  const { toast } = useToast()

  const resetForm = () => {
    setName("")
    setStartIp("")
    setEndIp("")
    setCidr("")
    setVlanId("none")
    setError("")
    setAutoDetectedVlan(null)
  }

  const handleStartIpChange = (value: string) => {
    setStartIp(value)
    autoDetectVlan(value)
  }

  const handleCidrChange = (value: string) => {
    setCidr(value)
    // Extract IP from CIDR (e.g., "10.2.20.0/24" -> "10.2.20.0")
    const ip = value.split("/")[0]
    if (ip) {
      autoDetectVlan(ip)
    }
  }

  const autoDetectVlan = (ip: string) => {
    const vlanNumber = extractVlanFromIp(ip)
    if (vlanNumber !== null) {
      // Find matching VLAN by vlanId number
      const matchingVlan = vlans.find((v) => v.vlanId === vlanNumber)
      if (matchingVlan) {
        setVlanId(matchingVlan.id)
        setAutoDetectedVlan(`VLAN ${matchingVlan.vlanId} - ${matchingVlan.name}`)
      } else {
        // No matching VLAN found, but show what we detected
        setAutoDetectedVlan(`VLAN ${vlanNumber} (not created yet)`)
        setVlanId("none")
      }
    } else {
      setAutoDetectedVlan(null)
    }
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setError("")

    let finalStartIp = startIp
    let finalEndIp = endIp
    let finalCidr: string | null = null

    if (inputType === "cidr") {
      const parsed = parseCidr(cidr)
      if (!parsed) {
        setError("Invalid CIDR notation. Example: 192.168.1.0/24")
        return
      }
      finalStartIp = parsed.startIp
      finalEndIp = parsed.endIp
      finalCidr = cidr
    } else {
      if (!isValidIp(startIp)) {
        setError("Invalid start IP address")
        return
      }
      if (!isValidIp(endIp)) {
        setError("Invalid end IP address")
        return
      }
      if (ipToNumber(startIp) > ipToNumber(endIp)) {
        setError("Start IP must be less than or equal to end IP")
        return
      }
    }

    if (!name.trim()) {
      setError("Please enter a name for this range")
      return
    }

    const result = addIpRange({
      name: name.trim(),
      startIp: finalStartIp,
      endIp: finalEndIp,
      cidr: finalCidr,
      vlanId: vlanId !== "none" ? vlanId : null,
    })

    if (result.success) {
      toast({
        title: "IP Range Created",
        description: `Added ${result.count} IP addresses to "${name}"`,
      })
      resetForm()
      setOpen(false)
    } else {
      setError(result.error || "Failed to create IP range")
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
            Add IP Range
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Add IP Range</DialogTitle>
          <DialogDescription>Define a range of IP addresses to manage. Maximum 1024 IPs per range.</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="name">Range Name</Label>
              <Input
                id="name"
                placeholder="e.g., Office Network, Server VLAN"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="range-vlan">Assign to VLAN (Optional)</Label>
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
              {autoDetectedVlan && (
                <p className="text-xs text-green-600 dark:text-green-400">Auto-detected from IP: {autoDetectedVlan}</p>
              )}
            </div>

            <Tabs value={inputType} onValueChange={(v) => setInputType(v as "range" | "cidr")}>
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="range">Start - End</TabsTrigger>
                <TabsTrigger value="cidr">CIDR</TabsTrigger>
              </TabsList>
              <TabsContent value="range" className="space-y-4 mt-4">
                <div className="space-y-2">
                  <Label htmlFor="startIp">Start IP</Label>
                  <Input
                    id="startIp"
                    placeholder="192.168.1.1"
                    value={startIp}
                    onChange={(e) => handleStartIpChange(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="endIp">End IP</Label>
                  <Input
                    id="endIp"
                    placeholder="192.168.1.254"
                    value={endIp}
                    onChange={(e) => setEndIp(e.target.value)}
                  />
                </div>
              </TabsContent>
              <TabsContent value="cidr" className="space-y-4 mt-4">
                <div className="space-y-2">
                  <Label htmlFor="cidr">CIDR Notation</Label>
                  <Input
                    id="cidr"
                    placeholder="192.168.1.0/24"
                    value={cidr}
                    onChange={(e) => handleCidrChange(e.target.value)}
                  />
                  <p className="text-xs text-muted-foreground">Example: 192.168.1.0/24 creates 254 usable addresses</p>
                </div>
              </TabsContent>
            </Tabs>

            {error && <p className="text-sm text-destructive">{error}</p>}
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button type="submit">Create Range</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
