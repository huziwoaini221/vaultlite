const BASE32 = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567'

function base32Decode(s: string): Uint8Array {
  const cleaned = s.replace(/[^A-Za-z2-7]/g, '').toUpperCase()
  const bytes: number[] = []
  let buffer = 0
  let bitsLeft = 0
  for (const ch of cleaned) {
    const val = BASE32.indexOf(ch)
    if (val === -1) continue
    buffer = (buffer << 5) | val
    bitsLeft += 5
    if (bitsLeft >= 8) {
      bitsLeft -= 8
      bytes.push((buffer >> bitsLeft) & 0xff)
    }
  }
  return new Uint8Array(bytes)
}

function intToBytes(value: number): Uint8Array {
  const bytes = new Uint8Array(8)
  const view = new DataView(bytes.buffer)
  view.setBigUint64(0, BigInt(value), false)
  return bytes
}

async function hmacSha1(key: Uint8Array, data: Uint8Array): Promise<Uint8Array> {
  const cryptoKey = await crypto.subtle.importKey(
    'raw', key as BufferSource, { name: 'HMAC', hash: 'SHA-1' }, false, ['sign']
  )
  const sig = await crypto.subtle.sign('HMAC', cryptoKey, data as BufferSource)
  return new Uint8Array(sig)
}

function dynamicTruncate(hs: Uint8Array): number {
  const offset = hs[19] & 0xf
  const code = ((hs[offset] & 0x7f) << 24) |
    ((hs[offset + 1] & 0xff) << 16) |
    ((hs[offset + 2] & 0xff) << 8) |
    (hs[offset + 3] & 0xff)
  return code % 1000000
}

function padCode(code: number): string {
  return String(code).padStart(6, '0')
}

export interface TOTPResult {
  code: string
  remaining: number
  progress: number
}

export async function generateTOTP(secret: string): Promise<TOTPResult> {
  const decoded = base32Decode(secret)
  const now = Math.floor(Date.now() / 1000)
  const counter = Math.floor(now / 30)
  const remaining = 30 - (now % 30)
  const counterBytes = intToBytes(counter)
  const hs = await hmacSha1(decoded, counterBytes)
  const code = dynamicTruncate(hs)
  return {
    code: padCode(code),
    remaining,
    progress: (30 - remaining) / 30,
  }
}

export async function generateTOTPAtTime(secret: string, timestamp: number): Promise<string> {
  const decoded = base32Decode(secret)
  const counter = Math.floor(timestamp / 30)
  const counterBytes = intToBytes(counter)
  const hs = await hmacSha1(decoded, counterBytes)
  return padCode(dynamicTruncate(hs))
}
