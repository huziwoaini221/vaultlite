const PBKDF2_ITERATIONS = 600000
const KEY_LENGTH = 256
const SALT_LENGTH = 32
const NONCE_LENGTH = 12

function encodeBase64(buf: ArrayBuffer): string {
  return btoa(String.fromCharCode(...new Uint8Array(buf)))
}

function decodeBase64(str: string): ArrayBuffer {
  return Uint8Array.from(atob(str), c => c.charCodeAt(0)).buffer
}

async function deriveKey(password: string, salt: Uint8Array): Promise<CryptoKey> {
  const enc = new TextEncoder()
  const keyMaterial = await crypto.subtle.importKey(
    'raw', enc.encode(password), 'PBKDF2', false, ['deriveKey']
  )
  return crypto.subtle.deriveKey(
    { name: 'PBKDF2', salt: salt as BufferSource, iterations: PBKDF2_ITERATIONS, hash: 'SHA-256' } as Pbkdf2Params,
    keyMaterial,
    { name: 'AES-GCM', length: KEY_LENGTH },
    false,
    ['encrypt', 'decrypt']
  )
}

export async function encryptVault(plaintext: string, password: string): Promise<string> {
  const salt = crypto.getRandomValues(new Uint8Array(SALT_LENGTH))
  const nonce = crypto.getRandomValues(new Uint8Array(NONCE_LENGTH))
  const key = await deriveKey(password, salt)
  const enc = new TextEncoder()
  const encrypted = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv: nonce },
    key,
    enc.encode(plaintext)
  )
  const buf = new Uint8Array(encrypted)
  const tag = buf.slice(buf.length - 16)
  const ciphertext = buf.slice(0, buf.length - 16)
  return JSON.stringify({
    salt: encodeBase64(salt.buffer),
    nonce: encodeBase64(nonce.buffer),
    ciphertext: encodeBase64(ciphertext.buffer),
    tag: encodeBase64(tag.buffer),
    iterations: PBKDF2_ITERATIONS,
  })
}

export async function decryptVault(encryptedJson: string, password: string): Promise<string> {
  const data = JSON.parse(encryptedJson)
  const salt = new Uint8Array(decodeBase64(data.salt))
  const nonce = new Uint8Array(decodeBase64(data.nonce))
  const ciphertext = new Uint8Array(decodeBase64(data.ciphertext))
  const tag = new Uint8Array(decodeBase64(data.tag))
  const combined = new Uint8Array(ciphertext.length + tag.length)
  combined.set(ciphertext, 0)
  combined.set(tag, ciphertext.length)
  const key = await deriveKey(password, salt)
  const decrypted = await crypto.subtle.decrypt(
    { name: 'AES-GCM', iv: nonce },
    key,
    combined
  )
  return new TextDecoder().decode(decrypted)
}

export async function hashVault(vaultJson: string): Promise<string> {
  const enc = new TextEncoder()
  const hash = await crypto.subtle.digest('SHA-256', enc.encode(vaultJson))
  return encodeBase64(hash)
}
