// Server-side utility to read/write data to a JSON file on disk
// This file is used by API routes to persist data locally

import { promises as fs } from "fs"
import path from "path"

// Data file path - stored in the project root as 'data/ip-manager-data.json'
const DATA_DIR = path.join(process.cwd(), "data")
const DATA_FILE = path.join(DATA_DIR, "ip-manager-data.json")

// Default empty state structure
const DEFAULT_STATE = {
  state: {
    devices: [],
    ipAddresses: [],
    ipRanges: [],
    vlans: [],
  },
  version: 1,
}

// Ensure data directory exists
async function ensureDataDir() {
  try {
    await fs.access(DATA_DIR)
  } catch {
    await fs.mkdir(DATA_DIR, { recursive: true })
  }
}

// Read data from disk
export async function readDataFile() {
  try {
    await ensureDataDir()
    const data = await fs.readFile(DATA_FILE, "utf-8")
    return JSON.parse(data)
  } catch (error) {
    // If file doesn't exist, return default state
    if ((error as NodeJS.ErrnoException).code === "ENOENT") {
      return DEFAULT_STATE
    }
    throw error
  }
}

// Write data to disk
export async function writeDataFile(data: unknown) {
  await ensureDataDir()
  await fs.writeFile(DATA_FILE, JSON.stringify(data, null, 2), "utf-8")
}
