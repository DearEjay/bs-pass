const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export interface ValidationResult {
  valid: boolean
  error?: string
}

export function isValidEmail(email: string): boolean {
  return Boolean(email) && EMAIL_RE.test(email.trim())
}

export function validateEmail(email: string): ValidationResult {
  if (!email.trim()) return { valid: false, error: 'Email is required' }
  if (!EMAIL_RE.test(email.trim())) return { valid: false, error: 'Invalid email address' }
  return { valid: true }
}

export function validatePassword(password: string): ValidationResult {
  if (!password) return { valid: false, error: 'Password is required' }
  if (password.length < 8) return { valid: false, error: 'Password must be at least 8 characters' }
  return { valid: true }
}

export function validateDisplayName(name: string): ValidationResult {
  if (!name.trim()) return { valid: false, error: 'Display name is required' }
  if (name.trim().length > 100) return { valid: false, error: 'Display name must be 100 characters or fewer' }
  return { valid: true }
}

export function validateLoginForm(email: string, password: string): ValidationResult {
  const emailResult = validateEmail(email)
  if (!emailResult.valid) return emailResult
  const passwordResult = validatePassword(password)
  if (!passwordResult.valid) return passwordResult
  return { valid: true }
}

export function validateSignupForm(
  displayName: string,
  email: string,
  password: string,
): ValidationResult {
  const nameResult = validateDisplayName(displayName)
  if (!nameResult.valid) return nameResult
  const emailResult = validateEmail(email)
  if (!emailResult.valid) return emailResult
  const passwordResult = validatePassword(password)
  if (!passwordResult.valid) return passwordResult
  return { valid: true }
}
