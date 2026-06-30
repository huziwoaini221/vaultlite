import type { SyncStatus } from '../../types'
import { uploadVault } from '../../services/github'
import { encryptVault, hashVault } from '../crypto'
import { setSetting, getSetting } from '../../storage/indexeddb'
import { debounce } from '../../utils/debounce'

let onStatusChange: ((status: SyncStatus) => void) | null = null
let currentStatus: SyncStatus = 'inactive'
export let lastError = ''

export function setStatusCallback(cb: (status: SyncStatus) => void) {
  onStatusChange = cb
}

function updateStatus(status: SyncStatus, errorMsg = '') {
  currentStatus = status
  lastError = errorMsg
  onStatusChange?.(status)
}

export function getCurrentStatus(): SyncStatus {
  return currentStatus
}

async function doBackup() {
  const token = await getSetting<string>('githubToken')
  if (!token) { console.log('backup: no token'); return }
  try {
    updateStatus('pending')
    const vaultJson = localStorage.getItem('vaultlite_plain')
    if (!vaultJson) { console.log('backup: no vaultJson'); return }
    let entries: unknown[] = []
    try { entries = JSON.parse(vaultJson).entries || [] } catch {}
    if (entries.length === 0) { console.log('backup: empty vault, skipping'); return }
    const hash = await hashVault(vaultJson)
    const lastHash = await getSetting<string>('lastBackupHash')
    if (hash === lastHash) {
      updateStatus('synced')
      return
    }
    const password = sessionStorage.getItem('vaultlite_master_password')
    if (!password) throw new Error('No master password in session')
    const encrypted = await encryptVault(vaultJson, password)
    await uploadVault(token, encrypted, 'Auto backup via VaultLite')
    await setSetting('lastBackupHash', hash)
    updateStatus('synced')
  } catch (e) {
    console.error('backup failed:', e)
    updateStatus('failed', (e as Error).message)
  }
}

export const triggerBackup = debounce(doBackup, 30000)

export async function syncNow() {
  await doBackup()
}

export async function restoreFromGitHub(token: string, password: string): Promise<string> {
  const { downloadVault, downloadVaultAtRef, getVaultCommits } = await import('../../services/github')
  const { setSetting } = await import('../../storage/indexeddb')
  try {
    const encrypted = await downloadVault(token)
    const { decryptVault } = await import('../crypto')
    const plaintext = await decryptVault(encrypted, password)
    const data = JSON.parse(plaintext)
    if (data.githubToken && data.githubToken !== token) {
      await setSetting('githubToken', data.githubToken)
    }
    if (data.entries && data.entries.length === 0) {
      const commits = await getVaultCommits(token)
      if (commits.length > 1) {
        const prevEncrypted = await downloadVaultAtRef(token, commits[1])
        const prevPlain = await decryptVault(prevEncrypted, password)
        const prevData = JSON.parse(prevPlain)
        if (prevData.githubToken) {
          await setSetting('githubToken', prevData.githubToken)
        }
        return prevPlain
      }
    }
    return plaintext
  } catch (err) {
    throw new Error(`Restore failed: ${(err as Error).message}`)
  }
}
