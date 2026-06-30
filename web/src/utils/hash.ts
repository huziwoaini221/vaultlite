import { hashVault } from '../features/crypto'

export async function computeHash(plaintext: string): Promise<string> {
  return hashVault(plaintext)
}
