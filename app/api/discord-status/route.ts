import { NextResponse } from 'next/server'

const DISCORD_ID = '499751229291757578'
const validStatuses = new Set(['online', 'idle', 'dnd', 'offline'])

export const dynamic = 'force-dynamic'

export async function GET() {
  let status: string | null = null

  try {
    const response = await fetch(`https://api.lanyard.rest/v1/users/${DISCORD_ID}`, {
      cache: 'no-store',
      signal: AbortSignal.timeout(5000),
    })

    if (response.ok) {
      const result = await response.json()
      const value = result?.data?.discord_status
      if (typeof value === 'string' && validStatuses.has(value)) {
        status = value
      }
    }
  } catch {
    // Lanyard can be unavailable; an unknown status should not look offline.
  }

  return NextResponse.json({ status }, { headers: { 'Cache-Control': 'no-store' } })
}
