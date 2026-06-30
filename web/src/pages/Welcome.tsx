import { useState } from 'react'
import { encryptVault } from '../features/crypto'
import { setSetting } from '../storage/indexeddb'

interface Props {
  onInit: () => void
}

export default function Welcome({ onInit }: Props) {
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    if (password.length < 8) {
      setError('Master password must be at least 8 characters')
      return
    }
    if (password !== confirm) {
      setError('Passwords do not match')
      return
    }
    setLoading(true)
    try {
      const emptyVault = JSON.stringify({ entries: [] })
      const encrypted = await encryptVault(emptyVault, password)
      localStorage.setItem('vaultlite_encrypted', encrypted)
      sessionStorage.setItem('vaultlite_master_password', password)
      await setSetting('autoBackup', true)
      await setSetting('lastBackupHash', '')
      onInit()
    } catch {
      setError('Initialization failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{ maxWidth: 400, margin: '100px auto', padding: '0 20px' }}>
      <h1 style={{ fontSize: 28, marginBottom: 8 }}>VaultLite</h1>
      <p style={{ color: '#666', marginBottom: 24 }}>
        Local-first password vault with GitHub backup
      </p>
      <form onSubmit={handleSubmit}>
        <div style={{ marginBottom: 16 }}>
          <label style={{ display: 'block', marginBottom: 4, fontSize: 14, fontWeight: 500 }}>
            Create Master Password
          </label>
          <input
            type="password"
            value={password}
            onChange={e => setPassword(e.target.value)}
            placeholder="At least 8 characters"
            style={{ width: '100%', padding: '10px 12px', borderRadius: 6, border: '1px solid #ddd', fontSize: 16, boxSizing: 'border-box' }}
            autoFocus
          />
        </div>
        <div style={{ marginBottom: 16 }}>
          <label style={{ display: 'block', marginBottom: 4, fontSize: 14, fontWeight: 500 }}>
            Confirm Master Password
          </label>
          <input
            type="password"
            value={confirm}
            onChange={e => setConfirm(e.target.value)}
            placeholder="Re-enter password"
            style={{ width: '100%', padding: '10px 12px', borderRadius: 6, border: '1px solid #ddd', fontSize: 16, boxSizing: 'border-box' }}
          />
        </div>
        {error && <p style={{ color: '#e53e3e', fontSize: 14, marginBottom: 12 }}>{error}</p>}
        <button
          type="submit"
          disabled={loading}
          style={{ width: '100%', padding: '12px', borderRadius: 6, border: 'none', background: '#1a1a2e', color: '#fff', fontSize: 16, cursor: 'pointer', opacity: loading ? 0.6 : 1 }}
        >
          {loading ? 'Initializing...' : 'Initialize Vault'}
        </button>
      </form>
    </div>
  )
}
