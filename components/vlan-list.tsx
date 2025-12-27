"use client"

import * as React from "react"
import { Pencil, Trash2, Network } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
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
import { useStore } from "@/lib/store"
import { VLAN_COLORS, type VLAN } from "@/lib/types"
import { VlanDialog } from "./vlan-dialog"
import { useToast } from "@/hooks/use-toast"

export function VlanList() {
  const [deleteVlan, setDeleteVlan] = React.useState<VLAN | null>(null)
  const { vlans, devices, ipAddresses, deleteVlan: removeVlan } = useStore()
  const { toast } = useToast()

  const handleDelete = () => {
    if (deleteVlan) {
      removeVlan(deleteVlan.id)
      toast({
        title: "VLAN Deleted",
        description: `VLAN ${deleteVlan.vlanId} has been removed`,
      })
      setDeleteVlan(null)
    }
  }

  const getVlanStats = (vlanId: string) => {
    const deviceCount = devices.filter((d) => d.vlanId === vlanId).length
    const ipCount = ipAddresses.filter((ip) => ip.vlanId === vlanId).length
    return { deviceCount, ipCount }
  }

  const getVlanColor = (index: number) => VLAN_COLORS[index % VLAN_COLORS.length]

  if (vlans.length === 0) {
    return null
  }

  return (
    <>
      <Card>
        <CardHeader className="pb-4">
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg flex items-center gap-2">
              <Network className="h-5 w-5" />
              VLANs
            </CardTitle>
            <VlanDialog />
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {vlans.map((vlan, index) => {
              const { deviceCount, ipCount } = getVlanStats(vlan.id)
              const colors = getVlanColor(index)

              return (
                <div key={vlan.id} className={`rounded-lg border p-4 ${colors.bg} ${colors.border}`}>
                  <div className="flex items-start justify-between">
                    <div>
                      <Badge variant="outline" className={`${colors.text} ${colors.border} mb-2`}>
                        VLAN {vlan.vlanId}
                      </Badge>
                      <h3 className="font-medium">{vlan.name}</h3>
                      {vlan.description && <p className="text-sm text-muted-foreground mt-1">{vlan.description}</p>}
                      <div className="flex gap-3 mt-2 text-xs text-muted-foreground">
                        <span>
                          {deviceCount} device{deviceCount !== 1 ? "s" : ""}
                        </span>
                        <span>
                          {ipCount} IP{ipCount !== 1 ? "s" : ""}
                        </span>
                      </div>
                    </div>
                    <div className="flex gap-1">
                      <VlanDialog
                        vlan={vlan}
                        trigger={
                          <Button variant="ghost" size="icon" className="h-8 w-8">
                            <Pencil className="h-4 w-4" />
                          </Button>
                        }
                      />
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-destructive hover:text-destructive"
                        onClick={() => setDeleteVlan(vlan)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </CardContent>
      </Card>

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteVlan} onOpenChange={(open) => !open && setDeleteVlan(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete VLAN?</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete VLAN {deleteVlan?.vlanId} ({deleteVlan?.name})? Devices and IPs in this
              VLAN will be unassigned but not deleted. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
