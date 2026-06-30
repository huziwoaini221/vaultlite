import { useMemo } from 'react'
import { checkStrength } from './index'

interface Props {
  password: string
}

export default function PasswordChecker({ password }: Props) {
  const result = useMemo(() => checkStrength(password), [password])

  if (!password) return null

  const colors: Record<string, string> = {
    Weak: '#e53e3e',
    Medium: '#d69e2e',
    Strong: '#3182ce',
    'Very Strong': '#38a169',
  }

  return (
    <div style={{ fontSize: 13, padding: '8px 0' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
        <div style={{ flex: 1, height: 6, background: '#e2e8f0', borderRadius: 3, overflow: 'hidden' }}>
          <div style={{ width: `${result.score}%`, height: '100%', background: colors[result.level], borderRadius: 3, transition: 'width 0.2s' }} />
        </div>
        <span style={{ fontWeight: 600, color: colors[result.level], minWidth: 80, textAlign: 'right' }}>
          {result.level} ({result.score})
        </span>
      </div>
      <div style={{ color: '#666', display: 'flex', gap: 16 }}>
        <span>Entropy: {result.entropy} bits</span>
        <span>Length: {result.length}</span>
        <span>{result.hasUppercase ? 'A-Z' : ''} {result.hasLowercase ? 'a-z' : ''} {result.hasDigits ? '0-9' : ''} {result.hasSymbols ? '!@#' : ''}</span>
      </div>
    </div>
  )
}
