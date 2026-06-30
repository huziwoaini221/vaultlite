export interface StrengthResult {
  score: number
  level: 'Weak' | 'Medium' | 'Strong' | 'Very Strong'
  entropy: number
  length: number
  hasUppercase: boolean
  hasLowercase: boolean
  hasDigits: boolean
  hasSymbols: boolean
}

function calculateEntropy(password: string): number {
  let pool = 0
  if (/[a-z]/.test(password)) pool += 26
  if (/[A-Z]/.test(password)) pool += 26
  if (/[0-9]/.test(password)) pool += 10
  if (/[^a-zA-Z0-9]/.test(password)) pool += 33
  return pool > 0 ? password.length * Math.log2(pool) : 0
}

export function checkStrength(password: string): StrengthResult {
  const entropy = calculateEntropy(password)
  const length = password.length
  const hasUppercase = /[A-Z]/.test(password)
  const hasLowercase = /[a-z]/.test(password)
  const hasDigits = /[0-9]/.test(password)
  const hasSymbols = /[^a-zA-Z0-9]/.test(password)

  let score = 0
  if (length >= 8) score += 20
  if (length >= 12) score += 15
  if (length >= 16) score += 15
  if (hasUppercase && hasLowercase) score += 15
  if (hasDigits) score += 10
  if (hasSymbols) score += 15
  if (entropy > 60) score += 10

  score = Math.min(100, score)

  let level: StrengthResult['level'] = 'Weak'
  if (score >= 80) level = 'Very Strong'
  else if (score >= 60) level = 'Strong'
  else if (score >= 40) level = 'Medium'

  return { score, level, entropy: Math.round(entropy), length, hasUppercase, hasLowercase, hasDigits, hasSymbols }
}
