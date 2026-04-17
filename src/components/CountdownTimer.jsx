import { useState, useEffect } from 'react'

/**
 * CountdownTimer — shows a live ticking countdown to expiry.
 * Goes red + pulsing when under 24 hours.
 */
export default function CountdownTimer({ expiresAt }) {
  const [timeLeft, setTimeLeft] = useState('')
  const [urgent, setUrgent] = useState(false)
  const [expired, setExpired] = useState(false)

  useEffect(() => {
    const tick = () => {
      const diff = new Date(expiresAt) - new Date()
      if (diff <= 0) {
        setExpired(true)
        setTimeLeft('EXPIRED')
        return
      }
      const d = Math.floor(diff / 86400000)
      const h = Math.floor((diff % 86400000) / 3600000)
      const m = Math.floor((diff % 3600000) / 60000)
      setUrgent(diff < 86400000) // under 24h = urgent red
      setTimeLeft(d > 0 ? `${d}d ${h}h left` : `${h}h ${m}m left`)
    }

    tick()
    const id = setInterval(tick, 60000) // update every 60s
    return () => clearInterval(id)
  }, [expiresAt])

  const badgeBaseClass =
    'inline-flex items-center gap-1.5 px-2 py-1 border-[4px] text-[10px] sm:text-xs font-black uppercase tracking-wide'

  if (expired) {
    return (
      <span
        className={badgeBaseClass}
        style={{
          background: 'var(--surface-muted)',
          color: 'var(--text-muted)',
          borderColor: 'var(--border-main)',
          boxShadow: '4px 4px 0px 0px var(--shadow-hard)',
        }}
      >
        ⌛ Expired
      </span>
    )
  }

  return (
    <span
      className={`${badgeBaseClass} ${urgent ? 'animate-pulse-fast' : ''}`}
      style={{
        background: urgent ? '#FF2D55' : 'var(--price-bg)',
        color: urgent ? '#FFFFFF' : 'var(--price-text)',
        borderColor: 'var(--border-main)',
        boxShadow: urgent
          ? '6px 6px 0px 0px var(--shadow-hard)'
          : '4px 4px 0px 0px var(--shadow-hard)',
      }}
    >
      {urgent ? '🚨' : '⏱'} {timeLeft}
    </span>
  )
}
