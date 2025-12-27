// Utility functions for IP address manipulation

/**
 * Convert an IP address string to a numeric value for comparison
 */
export function ipToNumber(ip: string): number {
  const parts = ip.split(".").map(Number)
  return (parts[0] << 24) + (parts[1] << 16) + (parts[2] << 8) + parts[3]
}

/**
 * Convert a numeric value back to an IP address string
 */
export function numberToIp(num: number): string {
  return [(num >>> 24) & 255, (num >>> 16) & 255, (num >>> 8) & 255, num & 255].join(".")
}

/**
 * Validate an IP address format
 */
export function isValidIp(ip: string): boolean {
  const pattern = /^(\d{1,3}\.){3}\d{1,3}$/
  if (!pattern.test(ip)) return false

  const parts = ip.split(".").map(Number)
  return parts.every((part) => part >= 0 && part <= 255)
}

/**
 * Validate a MAC address format
 */
export function isValidMac(mac: string): boolean {
  const pattern = /^([0-9A-Fa-f]{2}[:-]){5}([0-9A-Fa-f]{2})$/
  return pattern.test(mac)
}

/**
 * Format a MAC address to uppercase with colons
 */
export function formatMac(mac: string): string {
  return mac.replace(/[:-]/g, "").match(/.{2}/g)?.join(":").toUpperCase() || mac
}

/**
 * Generate all IP addresses in a range (start to end inclusive)
 */
export function generateIpRange(startIp: string, endIp: string): string[] {
  const start = ipToNumber(startIp)
  const end = ipToNumber(endIp)
  const ips: string[] = []

  // Limit to prevent excessive generation (max 1024 IPs)
  const count = Math.min(end - start + 1, 1024)

  for (let i = 0; i < count; i++) {
    ips.push(numberToIp(start + i))
  }

  return ips
}

/**
 * Parse CIDR notation and return start/end IPs
 */
export function parseCidr(cidr: string): { startIp: string; endIp: string } | null {
  const match = cidr.match(/^(\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3})\/(\d{1,2})$/)
  if (!match) return null

  const [, ip, prefix] = match
  if (!isValidIp(ip)) return null

  const prefixNum = Number.parseInt(prefix, 10)
  if (prefixNum < 0 || prefixNum > 32) return null

  const ipNum = ipToNumber(ip)
  const mask = prefixNum === 0 ? 0 : ~((1 << (32 - prefixNum)) - 1)
  const network = ipNum & mask
  const broadcast = network | ~mask

  // For usable range, skip network and broadcast addresses
  const startNum = prefixNum <= 30 ? network + 1 : network
  const endNum = prefixNum <= 30 ? broadcast - 1 : broadcast

  return {
    startIp: numberToIp(startNum >>> 0),
    endIp: numberToIp(endNum >>> 0),
  }
}

/**
 * Calculate CIDR from start and end IPs (approximate)
 */
export function calculateCidr(startIp: string, endIp: string): string | null {
  const start = ipToNumber(startIp)
  const end = ipToNumber(endIp)
  const count = end - start + 1

  // Find the closest power of 2
  const bits = Math.ceil(Math.log2(count))
  const prefix = 32 - bits

  if (prefix < 0 || prefix > 32) return null

  return `${startIp}/${prefix}`
}
