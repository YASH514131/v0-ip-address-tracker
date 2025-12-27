// API route for reading and writing data to disk
// GET: Read data from disk
// POST: Write data to disk

import { NextResponse } from "next/server"
import { readDataFile, writeDataFile } from "@/lib/data-file"

// GET: Read data from disk
export async function GET() {
  try {
    const data = await readDataFile()
    return NextResponse.json(data)
  } catch (error) {
    console.error("Error reading data file:", error)
    return NextResponse.json({ error: "Failed to read data" }, { status: 500 })
  }
}

// POST: Write data to disk
export async function POST(request: Request) {
  try {
    const data = await request.json()
    await writeDataFile(data)
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Error writing data file:", error)
    return NextResponse.json({ error: "Failed to write data" }, { status: 500 })
  }
}
