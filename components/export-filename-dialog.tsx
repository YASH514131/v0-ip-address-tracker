"use client"

import * as React from "react"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

interface ExportFilenameDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  defaultFilename: string
  onConfirm: (filename: string) => void
  title?: string
  description?: string
}

export function ExportFilenameDialog({
  open,
  onOpenChange,
  defaultFilename,
  onConfirm,
  title = "Export to Excel",
  description = "Enter a filename for your export",
}: ExportFilenameDialogProps) {
  const [filename, setFilename] = React.useState(defaultFilename)

  React.useEffect(() => {
    if (open) {
      setFilename(defaultFilename)
    }
  }, [open, defaultFilename])

  const handleConfirm = () => {
    // Remove .xlsx extension if user added it, we'll add it ourselves
    let cleanFilename = filename.trim()
    if (cleanFilename.toLowerCase().endsWith(".xlsx")) {
      cleanFilename = cleanFilename.slice(0, -5)
    }
    if (cleanFilename.toLowerCase().endsWith(".xls")) {
      cleanFilename = cleanFilename.slice(0, -4)
    }
    // Replace invalid filename characters
    cleanFilename = cleanFilename.replace(/[<>:"/\\|?*]/g, "-")

    if (cleanFilename.length === 0) {
      cleanFilename = defaultFilename.replace(".xlsx", "")
    }

    onConfirm(cleanFilename + ".xlsx")
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="filename">Filename</Label>
            <div className="flex items-center gap-2">
              <Input
                id="filename"
                value={filename.replace(".xlsx", "")}
                onChange={(e) => setFilename(e.target.value)}
                placeholder="Enter filename"
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    handleConfirm()
                  }
                }}
              />
              <span className="text-sm text-muted-foreground">.xlsx</span>
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleConfirm}>Export</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
