import { useState, useEffect, useCallback, useRef } from 'react'
import type { VaultEntry, SyncStatus } from '../types'
import { getAllEntries, saveEntry, deleteEntry, replaceAllEntries, getSetting } from '../storage/indexeddb'
import { decryptVault, encryptVault } from '../features/crypto'
import { triggerBackup, getCurrentStatus, syncNow, restoreFromGitHub } from '../features/backup'
import PasswordChecker from '../features/checker/PasswordChecker'
import PasswordGenerator from '../features/generator/PasswordGenerator'
import TOTPDisplay from '../features/totp/TOTPDisplay'
import GitHubSettings from '../features/backup/GitHubSettings'

function generateId(): string {
  return crypto.randomUUID()
}

export default function Vault() {
  const [entries, setEntries] = useState<VaultEntry[]>([])
  const [search, setSearch] = useState('')
  const [showForm, setShowForm] = useState(false)
  const [editing, setEditing] = useState<VaultEntry | null>(null)
  const [syncStatus, setSyncStatus] = useState<SyncStatus>('inactive')
  const [showGenerator, setShowGenerator] = useState(false)
  const [showGitHub, setShowGitHub] = useState(false)
  const [importMsg, setImportMsg] = useState('')
  const [syncMsg, setSyncMsg] = useState('')
  const [syncing, setSyncing] = useState(false)
  const [restoring, setRestoring] = useState(false)
  const [syncError, setSyncError] = useState('')
  const importFileRef = useRef<HTMLInputElement>(null)
  const importCsvRef = useRef<HTMLInputElement>(null)

  const loadEntries = useCallback(async () => {
    const entries = await getAllEntries()
    setEntries(entries)
    const pw = sessionStorage.getItem('vaultlite_master_password')
    if (!pw) return
    const token = await getSetting<string>('githubToken')
    const vault: Record<string, unknown> = { entries }
    if (token) vault.githubToken = token
    const plain = JSON.stringify(vault)
    localStorage.setItem('vaultlite_plain', plain)
    const encrypted = localStorage.getItem('vaultlite_encrypted')
    if (!encrypted) {
      const cipher = await encryptVault(plain, pw)
      localStorage.setItem('vaultlite_encrypted', cipher)
    }
  }, [])

  useEffect(() => {
    loadEntries()
    setSyncStatus(getCurrentStatus())
    ;(async () => {
      const { lastError } = await import('../features/backup')
      setSyncError(lastError)
    })()
    const interval = setInterval(async () => {
      setSyncStatus(getCurrentStatus())
      const { lastError } = await import('../features/backup')
      setSyncError(lastError)
    }, 2000)
    return () => clearInterval(interval)
  }, [loadEntries])

  async function persistVault(newEntries: VaultEntry[]) {
    const pw = sessionStorage.getItem('vaultlite_master_password')
    if (!pw) return
    const token = await getSetting<string>('githubToken')
    const vault: Record<string, unknown> = { entries: newEntries }
    if (token) vault.githubToken = token
    const plain = JSON.stringify(vault)
    localStorage.setItem('vaultlite_plain', plain)
    const encrypted = await encryptVault(plain, pw)
    localStorage.setItem('vaultlite_encrypted', encrypted)
    setEntries(newEntries)
    triggerBackup()
  }

  async function handleSave(entry: VaultEntry) {
    await saveEntry(entry)
    const all = await getAllEntries()
    await persistVault(all)
    setShowForm(false)
    setEditing(null)
  }

  async function handleDelete(id: string) {
    await deleteEntry(id)
    const all = await getAllEntries()
    await persistVault(all)
  }

  async function copyToClipboard(text: string) {
    await navigator.clipboard.writeText(text)
  }

  async function handleExport() {
    const encrypted = localStorage.getItem('vaultlite_encrypted')
    if (!encrypted) return
    const blob = new Blob([encrypted], { type: 'application/octet-stream' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'vault.enc'
    a.click()
    URL.revokeObjectURL(url)
  }

  async function handleImportVault(file: File) {
    setImportMsg('')
    try {
      const text = await file.text()
      const pw = sessionStorage.getItem('vaultlite_master_password')
      if (!pw) { setImportMsg('Not authenticated'); return }
      const plain = await decryptVault(text, pw)
      const data = JSON.parse(plain)
      if (!data.entries || !Array.isArray(data.entries)) throw new Error('Invalid vault file')
      for (const entry of data.entries) {
        await saveEntry(entry)
      }
      const all = await getAllEntries()
      await persistVault(all)
      setImportMsg(`Imported ${data.entries.length} entries`)
    } catch (err) {
      setImportMsg(`Import failed: ${(err as Error).message}`)
    }
    if (importFileRef.current) importFileRef.current.value = ''
  }

  function parseBitwardenCsv(text: string): VaultEntry[] {
    const lines = text.trim().split('\n')
    if (lines.length < 2) return []
    const headers = lines[0].split(',').map(h => h.replace(/^"|"$/g, '').trim())
    const result: VaultEntry[] = []
    const now = new Date().toISOString()
    for (let i = 1; i < lines.length; i++) {
      const values: string[] = []
      let current = ''
      let inQuotes = false
      for (const ch of lines[i]) {
        if (ch === '"') { inQuotes = !inQuotes; continue }
        if (ch === ',' && !inQuotes) { values.push(current); current = ''; continue }
        current += ch
      }
      values.push(current)
      const row: Record<string, string> = {}
      headers.forEach((h, idx) => { row[h.toLowerCase()] = values[idx] || '' })
      result.push({
        id: crypto.randomUUID(),
        title: row.name || row.title || row[Object.keys(row)[0]] || '',
        username: row.username || row.user || '',
        password: row.password || '',
        url: row.url || row.uri || '',
        note: row.notes || row.note || '',
        tags: (row.collections || row.folder || '').split('/').filter(Boolean),
        totpSecret: '',
        createdAt: now,
        updatedAt: now,
      })
    }
    return result
  }

  async function handleImportCsv(file: File) {
    setImportMsg('')
    try {
      const text = await file.text()
      const parsed = parseBitwardenCsv(text)
      if (parsed.length === 0) { setImportMsg('No entries found in CSV'); return }
      for (const entry of parsed) {
        await saveEntry(entry)
      }
      const all = await getAllEntries()
      await persistVault(all)
      setImportMsg(`Imported ${parsed.length} entries from Bitwarden CSV`)
    } catch (err) {
      setImportMsg(`CSV import failed: ${(err as Error).message}`)
    }
    if (importCsvRef.current) importCsvRef.current.value = ''
  }

  async function handleRestoreFromGitHub() {
    if (!confirm('This will replace ALL local entries with the vault from GitHub backup. Continue?')) return
    setRestoring(true)
    setSyncMsg('')
    try {
      const token = await getSetting<string>('githubToken')
      if (!token) { setSyncMsg('No GitHub token configured'); return }
      const pw = sessionStorage.getItem('vaultlite_master_password')
      if (!pw) { setSyncMsg('Not authenticated'); return }
      const plain = await restoreFromGitHub(token, pw)
      const data = JSON.parse(plain)
      if (!data.entries || !Array.isArray(data.entries)) throw new Error('Invalid vault data')
      await replaceAllEntries(data.entries)
      const vault: Record<string, unknown> = { entries: data.entries }
      if (data.githubToken) vault.githubToken = data.githubToken
      const newPlain = JSON.stringify(vault)
      localStorage.setItem('vaultlite_plain', newPlain)
      const encrypted = await encryptVault(newPlain, pw)
      localStorage.setItem('vaultlite_encrypted', encrypted)
      setEntries(data.entries)
      let msg = `Restored ${data.entries.length} entries from GitHub backup`
      if (data.githubToken) msg += ' (GitHub token restored)'
      setSyncMsg(msg)
    } catch (err) {
      setSyncMsg(`Restore failed: ${(err as Error).message}`)
    } finally {
      setRestoring(false)
    }
  }

  const filtered = entries.filter(e =>
    e.title.toLowerCase().includes(search.toLowerCase()) ||
    e.username.toLowerCase().includes(search.toLowerCase()) ||
    e.url.toLowerCase().includes(search.toLowerCase()) ||
    e.tags.some(t => t.toLowerCase().includes(search.toLowerCase()))
  )

  const statusColors: Record<SyncStatus, string> = {
    synced: '#38a169', pending: '#d69e2e', failed: '#e53e3e', inactive: '#a0aec0',
  }
  const statusLabels: Record<SyncStatus, string> = {
    synced: 'Synced', pending: 'Waiting...', failed: 'Backup failed', inactive: 'No GitHub',
  }

  return (
    <div style={{ maxWidth: 800, margin: '0 auto', padding: '20px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <div>
          <h1 style={{ fontSize: 24, margin: 0 }}>VaultLite</h1>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 4, fontSize: 13, color: statusColors[syncStatus] }}>
            <span style={{ width: 8, height: 8, borderRadius: '50%', background: statusColors[syncStatus], display: 'inline-block' }} />
            {statusLabels[syncStatus]}
            {syncStatus === 'failed' && syncError && (
              <span title={syncError}>⚠</span>
            )}
          </div>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button onClick={() => { setShowGenerator(true); setShowForm(false) }} style={headerBtn}>Generate</button>
          <button onClick={() => { setShowForm(true); setEditing(null); setShowGenerator(false) }} style={{ ...headerBtn, background: '#1a1a2e', color: '#fff', border: 'none' }}>+ New</button>
          <button onClick={handleExport} style={headerBtn}>Export</button>
          <button onClick={() => importFileRef.current?.click()} style={headerBtn}>Import</button>
          <button onClick={() => importCsvRef.current?.click()} style={headerBtn}>CSV</button>
          <button onClick={() => setShowGitHub(true)} style={{ ...headerBtn, color: '#3182ce' }}>GitHub</button>
          <button onClick={async () => { setSyncing(true); setSyncMsg(''); try { await syncNow(); const s = getCurrentStatus(); if (s === 'synced') setSyncMsg('Sync complete'); else { const { lastError } = await import('../features/backup'); setSyncMsg(lastError || 'Sync failed'); } } catch (e) { setSyncMsg((e as Error).message); } finally { setSyncing(false); } }} disabled={syncing} style={{ ...headerBtn, opacity: syncing ? 0.5 : 1 }}>{syncing ? 'Syncing...' : 'Sync'}</button>
          <button onClick={handleRestoreFromGitHub} disabled={restoring} style={{ ...headerBtn, color: '#e53e3e', opacity: restoring ? 0.5 : 1 }}>{restoring ? 'Restoring...' : 'Restore'}</button>
          <input ref={importFileRef} type="file" accept=".enc" style={{ display: 'none' }} onChange={e => e.target.files?.[0] && handleImportVault(e.target.files[0])} />
          <input ref={importCsvRef} type="file" accept=".csv" style={{ display: 'none' }} onChange={e => e.target.files?.[0] && handleImportCsv(e.target.files[0])} />
        </div>
      </div>

      {syncMsg && (
        <div style={{ marginBottom: 12, padding: '8px 12px', borderRadius: 6, background: syncMsg.includes('fail') || syncMsg.includes('Error') ? '#fff5f5' : '#f0fff4', border: `1px solid ${syncMsg.includes('fail') || syncMsg.includes('Error') ? '#fc8181' : '#68d391'}`, fontSize: 13, color: syncMsg.includes('fail') || syncMsg.includes('Error') ? '#c53030' : '#276749' }}>
          {syncMsg}
          <button onClick={() => setSyncMsg('')} style={{ marginLeft: 12, padding: '2px 6px', border: 'none', background: 'transparent', cursor: 'pointer', fontSize: 13 }}>x</button>
        </div>
      )}

      {importMsg && (
        <div style={{ marginBottom: 12, padding: '8px 12px', borderRadius: 6, background: importMsg.includes('failed') ? '#fff5f5' : '#f0fff4', border: `1px solid ${importMsg.includes('failed') ? '#fc8181' : '#68d391'}`, fontSize: 13, color: importMsg.includes('failed') ? '#c53030' : '#276749' }}>
          {importMsg}
          <button onClick={() => setImportMsg('')} style={{ marginLeft: 12, padding: '2px 6px', border: 'none', background: 'transparent', cursor: 'pointer', fontSize: 13 }}>x</button>
        </div>
      )}

      <input
        type="text" placeholder="Search entries..." value={search} onChange={e => setSearch(e.target.value)}
        style={{ width: '100%', padding: '10px 12px', borderRadius: 6, border: '1px solid #ddd', fontSize: 14, boxSizing: 'border-box', marginBottom: 16 }}
      />

      {showGenerator && (
        <div style={{ marginBottom: 16, padding: 16, border: '1px solid #ddd', borderRadius: 8, background: '#fafafa' }}>
          <PasswordGenerator onSelect={pw => { if (editing) setEditing({ ...editing, password: pw }) }} />
          <button onClick={() => setShowGenerator(false)} style={{ marginTop: 8, padding: '6px 12px', border: '1px solid #ddd', borderRadius: 4, background: '#fff', cursor: 'pointer', fontSize: 13 }}>Close</button>
        </div>
      )}

      {showForm && (
        <EntryForm
          initial={editing}
          onSave={handleSave}
          onCancel={() => { setShowForm(false); setEditing(null) }}
        />
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {filtered.map(entry => (
          <div key={entry.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 16px', border: '1px solid #eee', borderRadius: 8, background: '#fff' }}>
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: 600, fontSize: 14 }}>{entry.title}</div>
              <div style={{ fontSize: 13, color: '#666' }}>{entry.username}</div>
              {entry.url && <div style={{ fontSize: 12, color: '#3182ce' }}>{entry.url}</div>}
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              {entry.totpSecret && <TOTPDisplay secret={entry.totpSecret} />}
              <button onClick={() => copyToClipboard(entry.username)} style={btnStyle} title="Copy username">User</button>
              <button onClick={() => copyToClipboard(entry.password)} style={btnStyle} title="Copy password">Copy</button>
              <button onClick={() => { setEditing(entry); setShowForm(true); setShowGenerator(false) }} style={btnStyle}>Edit</button>
              <button onClick={() => handleDelete(entry.id)} style={{ ...btnStyle, color: '#e53e3e' }}>Del</button>
            </div>
          </div>
        ))}
        {filtered.length === 0 && (
          <p style={{ color: '#999', textAlign: 'center', padding: 40 }}>
            {entries.length === 0 ? 'No entries yet. Click "+ New" to add one.' : 'No matching entries.'}
          </p>
        )}
      </div>
      {showGitHub && (
        <GitHubSettings
          onClose={() => setShowGitHub(false)}
          onConnected={() => {
            setShowGitHub(false)
            loadEntries()
          }}
        />
      )}
    </div>
  )
}

const btnStyle: React.CSSProperties = {
  padding: '4px 8px', borderRadius: 4, border: '1px solid #ddd', background: '#fff', cursor: 'pointer', fontSize: 12,
}
const headerBtn: React.CSSProperties = {
  padding: '8px 16px', borderRadius: 6, border: '1px solid #ddd', background: '#fff', cursor: 'pointer', fontSize: 14,
}

interface EntryFormProps {
  initial: VaultEntry | null
  onSave: (entry: VaultEntry) => Promise<void>
  onCancel: () => void
}

function EntryForm({ initial, onSave, onCancel }: EntryFormProps) {
  const [title, setTitle] = useState(initial?.title || '')
  const [username, setUsername] = useState(initial?.username || '')
  const [password, setPassword] = useState(initial?.password || '')
  const [url, setUrl] = useState(initial?.url || '')
  const [note, setNote] = useState(initial?.note || '')
  const [tags, setTags] = useState(initial?.tags.join(', ') || '')
  const [totpSecret, setTotpSecret] = useState(initial?.totpSecret || '')
  const [saving, setSaving] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    const now = new Date().toISOString()
    const entry: VaultEntry = {
      id: initial?.id || generateId(),
      title, username, password, url, note,
      tags: tags.split(',').map(t => t.trim()).filter(Boolean),
      totpSecret: totpSecret.replace(/\s/g, ''),
      createdAt: initial?.createdAt || now,
      updatedAt: now,
    }
    await onSave(entry)
    setSaving(false)
  }

  return (
    <form onSubmit={handleSubmit} style={{ marginBottom: 16, padding: 16, border: '1px solid #ddd', borderRadius: 8, background: '#fafafa' }}>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
        <input placeholder="Title" value={title} onChange={e => setTitle(e.target.value)} required style={inputStyle} />
        <input placeholder="Username" value={username} onChange={e => setUsername(e.target.value)} style={inputStyle} />
        <input placeholder="Password" value={password} onChange={e => setPassword(e.target.value)} style={inputStyle} />
        <input placeholder="URL" value={url} onChange={e => setUrl(e.target.value)} style={inputStyle} />
        <input placeholder="Tags (comma separated)" value={tags} onChange={e => setTags(e.target.value)} style={inputStyle} />
      </div>
      {password && <div style={{ marginTop: 8 }}><PasswordChecker password={password} /></div>}
      <textarea placeholder="Note" value={note} onChange={e => setNote(e.target.value)} style={{ ...inputStyle, marginTop: 12, minHeight: 60, resize: 'vertical' }} />

      <div style={{ marginTop: 12, borderTop: '1px solid #e2e8f0', paddingTop: 12 }}>
        <div style={{ fontSize: 13, fontWeight: 600, color: '#666', marginBottom: 4 }}>Two-factor authentication (TOTP)</div>
        <input placeholder="TOTP Secret (base32)" value={totpSecret} onChange={e => setTotpSecret(e.target.value)} style={inputStyle} />
        {totpSecret && (
          <div style={{ marginTop: 4 }}>
            <TOTPDisplay secret={totpSecret} />
          </div>
        )}
      </div>

      <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
        <button type="submit" disabled={saving} style={{ padding: '8px 20px', borderRadius: 6, border: 'none', background: '#1a1a2e', color: '#fff', cursor: 'pointer' }}>
          {saving ? 'Saving...' : initial ? 'Update' : 'Create'}
        </button>
        <button type="button" onClick={onCancel} style={{ padding: '8px 20px', borderRadius: 6, border: '1px solid #ddd', background: '#fff', cursor: 'pointer' }}>Cancel</button>
      </div>
    </form>
  )
}

const inputStyle: React.CSSProperties = {
  padding: '8px 12px', borderRadius: 6, border: '1px solid #ddd', fontSize: 14, width: '100%', boxSizing: 'border-box',
}
