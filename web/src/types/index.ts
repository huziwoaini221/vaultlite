export interface VaultEntry {
  id: string
  title: string
  username: string
  password: string
  url: string
  note: string
  tags: string[]
  totpSecret: string
  createdAt: string
  updatedAt: string
}

export interface VaultData {
  entries: VaultEntry[]
}

export interface VaultSettings {
  autoBackup: boolean
  lastBackupHash: string
  githubToken: string
  githubRepo: string
}

export interface EncryptedVault {
  nonce: string
  ciphertext: string
  salt: string
  iterations: number
}

export type SyncStatus = 'synced' | 'pending' | 'failed' | 'inactive'
