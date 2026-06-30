import { useState } from 'react'
import { generatePassword } from './index'
import PasswordChecker from '../checker/PasswordChecker'

interface Props {
  onSelect: (password: string) => void
}

export default function PasswordGenerator({ onSelect }: Props) {
  const [length, setLength] = useState(24)
  const [uppercase, setUppercase] = useState(true)
  const [lowercase, setLowercase] = useState(true)
  const [digits, setDigits] = useState(true)
  const [symbols, setSymbols] = useState(true)
  const [excludeAmbiguous, setExcludeAmbiguous] = useState(true)
  const [password, setPassword] = useState('')

  function generate() {
    const pw = generatePassword({ length, uppercase, lowercase, digits, symbols, excludeAmbiguous })
    setPassword(pw)
  }

  return (
    <div>
      <div style={{ display: 'flex', gap: 16, alignItems: 'center', marginBottom: 12 }}>
        <label style={{ fontSize: 13 }}>
          Length: {length}
          <input type="range" min={8} max={64} value={length} onChange={e => setLength(Number(e.target.value))} style={{ marginLeft: 8, verticalAlign: 'middle' }} />
        </label>
        <label style={{ fontSize: 13 }}><input type="checkbox" checked={uppercase} onChange={e => setUppercase(e.target.checked)} /> A-Z</label>
        <label style={{ fontSize: 13 }}><input type="checkbox" checked={lowercase} onChange={e => setLowercase(e.target.checked)} /> a-z</label>
        <label style={{ fontSize: 13 }}><input type="checkbox" checked={digits} onChange={e => setDigits(e.target.checked)} /> 0-9</label>
        <label style={{ fontSize: 13 }}><input type="checkbox" checked={symbols} onChange={e => setSymbols(e.target.checked)} /> !@#</label>
        <label style={{ fontSize: 13 }}><input type="checkbox" checked={excludeAmbiguous} onChange={e => setExcludeAmbiguous(e.target.checked)} /> No ambig</label>
      </div>
      <button onClick={generate} style={{ padding: '6px 16px', borderRadius: 6, border: 'none', background: '#1a1a2e', color: '#fff', cursor: 'pointer', fontSize: 13 }}>
        Generate
      </button>
      {password && (
        <div style={{ marginTop: 8, padding: '8px 12px', background: '#fff', border: '1px solid #ddd', borderRadius: 6, fontFamily: 'monospace', fontSize: 14 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span>{password}</span>
            <div style={{ display: 'flex', gap: 4 }}>
              <button onClick={() => navigator.clipboard.writeText(password)} style={smBtn}>Copy</button>
              <button onClick={() => onSelect(password)} style={smBtn}>Use</button>
            </div>
          </div>
          <PasswordChecker password={password} />
        </div>
      )}
    </div>
  )
}

const smBtn: React.CSSProperties = {
  padding: '3px 8px', borderRadius: 4, border: '1px solid #ddd', background: '#fff', cursor: 'pointer', fontSize: 12,
}
