import { useState } from 'react'
import { decryptVault } from '../features/crypto'

interface Props {
  onUnlock: (password: string) => void
}

export default function Unlock({ onUnlock }: Props) {
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const encrypted = localStorage.getItem('vaultlite_encrypted')
      if (!encrypted) throw new Error('No vault found')
      await decryptVault(encrypted, password)
      sessionStorage.setItem('vaultlite_master_password', password)
      onUnlock(password)
    } catch {
      setError('Incorrect master password')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{ maxWidth: 400, margin: '100px auto', padding: '0 20px' }}>
      <h1 style={{ fontSize: 28, marginBottom: 8 }}>VaultLite</h1>
      <p style={{ color: '#666', marginBottom: 24 }}>Enter your master password to unlock</p>
      <form onSubmit={handleSubmit}>
        <div style={{ marginBottom: 16 }}>
          <input
            type="password"
            value={password}
            onChange={e => setPassword(e.target.value)}
            placeholder="Master password"
            style={{ width: '100%', padding: '10px 12px', borderRadius: 6, border: '1px solid #ddd', fontSize: 16, boxSizing: 'border-box' }}
            autoFocus
          />
        </div>
        {error && <p style={{ color: '#e53e3e', fontSize: 14, marginBottom: 12 }}>{error}</p>}
        <button
          type="submit"
          disabled={loading}
          style={{ width: '100%', padding: '12px', borderRadius: 6, border: 'none', background: '#1a1a2e', color: '#fff', fontSize: 16, cursor: 'pointer', opacity: loading ? 0.6 : 1 }}
        >
          {loading ? 'Unlocking...' : 'Unlock'}
        </button>
      </form>
    </div>
  )
}
