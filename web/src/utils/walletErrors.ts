/**
 * Wallet error handling utility
 * 
 * Provides consistent error messages for CDP wallet operations
 * Based on AuthContext error handling pattern
 */
export function handleWalletError(error: unknown): string {
  const errorMessage = error instanceof Error ? error.message : 'Unknown error'
  
  // Project ID errors
  if (errorMessage.includes('project') || errorMessage.includes('Project ID')) {
    return 'CDP Project ID is missing or invalid. Please check your .env file.'
  }
  
  // Domain/CORS errors
  if (errorMessage.includes('domain') || errorMessage.includes('CORS')) {
    return 'Domain not authorized. Please add this domain to CDP Portal.'
  }
  
  // Already authenticated errors
  if (errorMessage.includes('already authenticated') || errorMessage.includes('already signed in')) {
    return 'You are already signed in. Please refresh the page.'
  }
  
  // OTP errors
  if (errorMessage.includes('invalid') || errorMessage.includes('expired')) {
    return 'Invalid or expired verification code. Please try again.'
  }
  
  // Network errors
  if (errorMessage.includes('network') || errorMessage.includes('fetch')) {
    return 'Network error. Please check your internet connection and try again.'
  }
  
  // Default error message
  return errorMessage || 'Failed to connect wallet. Please try again.'
}

