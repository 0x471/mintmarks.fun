import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export async function connectWallet(): Promise<{ address: string }> {
  // Check for window.ethereum
  if (typeof window !== 'undefined' && (window as any).ethereum) {
    try {
      const accounts = await (window as any).ethereum.request({ 
        method: 'eth_requestAccounts' 
      })
      
      if (accounts && accounts.length > 0) {
        return { address: accounts[0] }
      }
    } catch (error) {
      console.error('User denied wallet connection', error)
      throw new Error('User denied wallet connection')
    }
  }
  
  throw new Error('No crypto wallet found. Please install a wallet extension.')
}

