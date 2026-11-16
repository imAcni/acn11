'use client'

import Image from 'next/image'
import { useEffect, useState } from 'react'

const statuses = {
  online: { label: 'online', color: '#23a55a' },
  idle: { label: 'idle', color: '#f0b232' },
  dnd: { label: 'do not disturb', color: '#da3e44' },
  offline: { label: 'offline', color: '#80848e' },
} as const

type DiscordStatus = keyof typeof statuses

function isDiscordStatus(value: unknown): value is DiscordStatus {
  return typeof value === 'string' && value in statuses
}

export function DiscordAvatar() {
  const [status, setStatus] = useState<DiscordStatus | null>(null)

  useEffect(() => {
    let active = true

    async function refreshStatus() {
      try {
        const response = await fetch('/api/discord-status', { cache: 'no-store' })
        const result = await response.json()
        if (active) setStatus(isDiscordStatus(result.status) ? result.status : null)
      } catch {
        if (active) setStatus(null)
      }
    }

    refreshStatus()
    const interval = window.setInterval(refreshStatus, 60_000)
    return () => {
      active = false
      window.clearInterval(interval)
    }
  }, [])

  const label = status ? `Discord: ${statuses[status].label}` : undefined

  return (
    <span className="relative inline-flex h-12 w-12 shrink-0" title={label}>
      <Image
        src="/images/pfp.jpg"
        alt=""
        width={48}
        height={48}
        unoptimized
        className="h-12 w-12 rounded-full object-cover"
      />
      {status && (
        <span
          role="img"
          aria-label={label}
          className="absolute bottom-0 right-0 h-2.5 w-2.5 rounded-full ring-2 ring-white dark:ring-black"
          style={{ backgroundColor: statuses[status].color }}
        >
          {status === 'dnd' && (
            <span
              aria-hidden="true"
              className="absolute left-1/2 top-1/2 h-[2px] w-[8px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-[#2e2334]"
            />
          )}
        </span>
      )}
    </span>
  )
}
