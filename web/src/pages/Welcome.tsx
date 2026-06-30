import { useState } from 'react'
import { encryptVault } from '../features/crypto'
import { setSetting } from '../storage/indexeddb'
import { restoreFromGitHub } from '../features/backup'

interface Props {
  onInit: () => void
}

export default function Welcome({ onInit }: Props) {
  const [mode, setMode] = useState<'new' | 'restore'>('new')
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [githubUser, setGithubUser] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleNew(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    if (password.length < 8) { setError('Master password must be at least 8 characters'); return }
    if (password !== confirm) { setError('Passwords do not match'); return }
    setLoading(true)
    try {
      const emptyVault = JSON.stringify({ entries: [] })
      const encrypted = await encryptVault(emptyVault, password)
      localStorage.setItem('vaultlite_encrypted', encrypted)
      localStorage.setItem('vaultlite_plain', emptyVault)
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

  async function handleRestore(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    if (password.length < 8) { setError('Master password must be at least 8 characters'); return }
    if (!githubUser.trim()) { setError('Enter your GitHub username'); return }
    setLoading(true)
    try {
      const plain = await restoreFromGitHub(githubUser.trim(), password)
      const data = JSON.parse(plain)
      if (!data.entries || !Array.isArray(data.entries)) throw new Error('Invalid vault data')
      const vault = JSON.stringify(data)
      const encrypted = await encryptVault(vault, password)
      localStorage.setItem('vaultlite_encrypted', encrypted)
      localStorage.setItem('vaultlite_plain', vault)
      sessionStorage.setItem('vaultlite_master_password', password)
      if (data.githubToken) {
        await setSetting('githubToken', data.githubToken)
      }
      await setSetting('autoBackup', true)
      await setSetting('lastBackupHash', '')
      onInit()
    } catch (err) {
      setError(`Restore failed: ${(err as Error).message}`)
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

      <div style={{ display: 'flex', gap: 8, marginBottom: 20 }}>
        <button onClick={() => setMode('new')} style={{ flex: 1, padding: '8px', borderRadius: 6, border: mode === 'new' ? '2px solid #1a1a2e' : '1px solid #ddd', background: mode === 'new' ? '#f0f0f5' : '#fff', cursor: 'pointer', fontSize: 14, fontWeight: mode === 'new' ? 600 : 400 }}>
          New Vault
        </button>
        <button onClick={() => setMode('restore')} style={{ flex: 1, padding: '8px', borderRadius: 6, border: mode === 'restore' ? '2px solid #3182ce' : '1px solid #ddd', background: mode === 'restore' ? '#ebf5ff' : '#fff', cursor: 'pointer', fontSize: 14, fontWeight: mode === 'restore' ? 600 : 400 }}>
          Restore from GitHub
        </button>
      </div>

      <form onSubmit={mode === 'new' ? handleNew : handleRestore}>
        <div style={{ marginBottom: 16 }}>
          <label style={{ display: 'block', marginBottom: 4, fontSize: 14, fontWeight: 500 }}>
            Master Password
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

        {mode === 'new' && (
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
        )}

        {mode === 'restore' && (
          <div style={{ marginBottom: 16 }}>
            <label style={{ display: 'block', marginBottom: 4, fontSize: 14, fontWeight: 500 }}>
              GitHub Username
            </label>
            <input
              type="text"
              value={githubUser}
              onChange={e => setGithubUser(e.target.value)}
              placeholder="e.g. huziwoaini221"
              style={{ width: '100%', padding: '10px 12px', borderRadius: 6, border: '1px solid #ddd', fontSize: 16, boxSizing: 'border-box' }}
            />
            <p style={{ fontSize: 12, color: '#888', marginTop: 4 }}>
              Your vaultlite-backup repo must be public. Token will be restored automatically.
            </p>
          </div>
        )}

        {error && <p style={{ color: '#e53e3e', fontSize: 14, marginBottom: 12 }}>{error}</p>}

        <button
          type="submit"
          disabled={loading}
          style={{ width: '100%', padding: '12px', borderRadius: 6, border: 'none', background: mode === 'restore' ? '#3182ce' : '#1a1a2e', color: '#fff', fontSize: 16, cursor: 'pointer', opacity: loading ? 0.6 : 1 }}
        >
          {loading ? 'Processing...' : mode === 'new' ? 'Initialize Vault' : 'Restore Vault'}
        </button>
      </form>
    </div>
  )
}
