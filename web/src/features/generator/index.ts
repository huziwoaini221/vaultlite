interface GeneratorOptions {
  length: number
  uppercase: boolean
  lowercase: boolean
  digits: boolean
  symbols: boolean
  excludeAmbiguous: boolean
}

const AMBIGUOUS = 'il1Lo0O'
const UPPERCASE = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'
const LOWERCASE = 'abcdefghijklmnopqrstuvwxyz'
const DIGITS = '0123456789'
const SYMBOLS = '!@#$%^&*()_+-=[]{}|;:,.<>?'

function shuffleArray(arr: string[]): string[] {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]]
  }
  return arr
}

export function generatePassword(options: GeneratorOptions): string {
  let chars = ''
  if (options.uppercase) chars += UPPERCASE
  if (options.lowercase) chars += LOWERCASE
  if (options.digits) chars += DIGITS
  if (options.symbols) chars += SYMBOLS
  if (options.excludeAmbiguous) {
    chars = chars.split('').filter(c => !AMBIGUOUS.includes(c)).join('')
  }
  if (!chars) return ''

  const required: string[] = []
  if (options.uppercase) required.push(UPPERCASE[Math.floor(Math.random() * UPPERCASE.length)])
  if (options.lowercase) required.push(LOWERCASE[Math.floor(Math.random() * LOWERCASE.length)])
  if (options.digits) required.push(DIGITS[Math.floor(Math.random() * DIGITS.length)])
  if (options.symbols) required.push(SYMBOLS[Math.floor(Math.random() * SYMBOLS.length)])

  const remaining = options.length - required.length
  for (let i = 0; i < remaining; i++) {
    required.push(chars[Math.floor(Math.random() * chars.length)])
  }

  return shuffleArray(required).join('')
}
