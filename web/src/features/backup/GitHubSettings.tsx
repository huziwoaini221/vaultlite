import { useState, useEffect } from 'react'
import { getSetting, setSetting } from '../../storage/indexeddb'
import { testToken, type GitHubUser } from '../../services/github'
import { syncNow } from './index'

export default function GitHubSettings({ onClose, onConnected }: { onClose: () => void; onConnected: () => void }) {
  const [token, setToken] = useState('')
  const [savedToken, setSavedToken] = useState('')
  const [user, setUser] = useState<GitHubUser | null>(null)
  const [testing, setTesting] = useState(false)
  const [msg, setMsg] = useState('')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    getSetting<string>('githubToken').then(t => {
      if (t) {
        setSavedToken(t)
        setToken(t)
        testToken(t).then(u => setUser(u)).catch(() => {})
      }
    })
  }, [])

  async function handleTest(): Promise<GitHubUser | null> {
    if (!token.trim()) return null
    setTesting(true)
    setMsg('')
    try {
      const u = await testToken(token.trim())
      setUser(u)
      setMsg(`Connected as ${u.login}`)
      return u
    } catch (err) {
      setUser(null)
      setMsg(`Token invalid: ${(err as Error).message}`)
      return null
    } finally {
      setTesting(false)
    }
  }

  async function handleSave() {
    setSaving(true)
    const u = await handleTest()
    if (!u) { setSaving(false); return }
    await setSetting('githubToken', token.trim())
    setSavedToken(token.trim())
    setMsg('Token saved! Triggering first backup...')
    setTimeout(async () => {
      await syncNow()
      onConnected()
    }, 500)
    setSaving(false)
  }

  async function handleRemove() {
    await setSetting('githubToken', '')
    await setSetting('lastBackupHash', '')
    setToken('')
    setSavedToken('')
    setUser(null)
    setMsg('GitHub disconnected.')
    onConnected()
  }

  return (
    <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100 }}>
      <div style={{ background: '#fff', borderRadius: 12, padding: 24, width: 440, maxWidth: '90vw', boxShadow: '0 8px 32px rgba(0,0,0,0.15)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
          <h2 style={{ fontSize: 18, margin: 0 }}>GitHub Backup Settings</h2>
          <button onClick={onClose} style={{ padding: '4px 10px', borderRadius: 4, border: '1px solid #ddd', background: '#fff', cursor: 'pointer', fontSize: 14 }}>x</button>
        </div>

        <div style={{ fontSize: 13, color: '#666', marginBottom: 16, lineHeight: 1.5 }}>
          VaultLite automatically backs up your encrypted vault to a private GitHub repository.
          Create a <a href="https://github.com/settings/tokens" target="_blank" rel="noopener noreferrer" style={{ color: '#3182ce' }}>Personal Access Token</a> with <code style={{ background: '#f0f0f0', padding: '1px 4px', borderRadius: 3 }}>repo</code> or <code style={{ background: '#f0f0f0', padding: '1px 4px', borderRadius: 3 }}>Contents: Read and write</code> scope.
        </div>

        <label style={{ display: 'block', fontSize: 13, fontWeight: 500, marginBottom: 4 }}>GitHub Personal Access Token</label>
        <input
          type="password"
          value={token}
          onChange={e => setToken(e.target.value)}
          placeholder="github_pat_xxxxxxxx or ghp_xxxxxxxx"
          style={{ width: '100%', padding: '10px 12px', borderRadius: 6, border: '1px solid #ddd', fontSize: 14, boxSizing: 'border-box', marginBottom: 8 }}
        />

        {user && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 12px', background: '#f0fff4', borderRadius: 6, marginBottom: 8, fontSize: 13 }}>
            <span style={{ fontWeight: 600 }}>✓</span>
            <span>Connected as <strong>{user.login}</strong></span>
          </div>
        )}

        {msg && (
          <div style={{ padding: '8px 12px', borderRadius: 6, marginBottom: 8, fontSize: 13, background: msg.includes('invalid') || msg.includes('fail') ? '#fff5f5' : '#f0fff4', color: msg.includes('invalid') || msg.includes('fail') ? '#c53030' : '#276749' }}>
            {msg}
          </div>
        )}

        <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 16 }}>
          <button onClick={handleTest} disabled={!token.trim() || testing} style={{ padding: '8px 16px', borderRadius: 6, border: '1px solid #ddd', background: '#fff', cursor: 'pointer', fontSize: 14, opacity: !token.trim() || testing ? 0.5 : 1 }}>
            {testing ? 'Testing...' : 'Test Connection'}
          </button>
          {savedToken ? (
            <button onClick={handleRemove} style={{ padding: '8px 16px', borderRadius: 6, border: '1px solid #e53e3e', color: '#e53e3e', background: '#fff', cursor: 'pointer', fontSize: 14 }}>
              Disconnect
            </button>
          ) : (
            <button onClick={handleSave} disabled={!token.trim() || saving} style={{ padding: '8px 16px', borderRadius: 6, border: 'none', background: !token.trim() || saving ? '#ccc' : '#1a1a2e', color: '#fff', cursor: 'pointer', fontSize: 14 }}>
              {saving ? 'Saving...' : 'Save & Backup'}
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
