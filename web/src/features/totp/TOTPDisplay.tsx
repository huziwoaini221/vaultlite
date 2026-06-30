import { useState, useEffect } from 'react'
import { generateTOTP, type TOTPResult } from './index'

interface Props {
  secret: string
}

export default function TOTPDisplay({ secret }: Props) {
  const [result, setResult] = useState<TOTPResult | null>(null)

  useEffect(() => {
    async function tick() {
      setResult(await generateTOTP(secret))
    }
    tick()
    const interval = setInterval(tick, 1000)
    return () => clearInterval(interval)
  }, [secret])

  if (!result) return null

  const color = result.remaining <= 5 ? '#e53e3e' : result.remaining <= 10 ? '#d69e2e' : '#38a169'

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
      <span style={{ fontFamily: 'monospace', fontSize: 20, fontWeight: 700, letterSpacing: 2, color }}>
        {result.code}
      </span>
      <div style={{ width: 32, height: 32, position: 'relative' }}>
        <svg width="32" height="32" viewBox="0 0 32 32">
          <circle cx="16" cy="16" r="14" fill="none" stroke="#e2e8f0" strokeWidth="3" />
          <circle
            cx="16" cy="16" r="14"
            fill="none" stroke={color} strokeWidth="3"
            strokeDasharray="88"
            strokeDashoffset={88 * (1 - result.progress)}
            transform="rotate(-90 16 16)"
            style={{ transition: 'stroke-dashoffset 1s linear' }}
          />
        </svg>
      </div>
    </div>
  )
}
