type ToastType = 'success' | 'error' | 'info' | 'warning'

export function useToast() {
  const showToast = (message: string, type: ToastType = 'info') => {
    // Simple console log for now - can be enhanced with a toast library later
    console.log(`[${type.toUpperCase()}] ${message}`)
    
    // Optionally show browser notification or use a toast library
    // For now, we'll just log it
  }

  return {
    showToast
  }
}

