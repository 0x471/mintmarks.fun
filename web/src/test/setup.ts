import '@testing-library/jest-dom'
import { vi } from 'vitest'
import { Buffer } from 'buffer'

// Mock environment variables
Object.defineProperty(import.meta, 'env', {
  value: {
        VITE_GOOGLE_CLIENT_ID: 'test-client-id',
  },
})

// Mock localStorage
const localStorageMock = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn(),
  clear: vi.fn(),
  length: 0,
  key: vi.fn(),
}
Object.defineProperty(window, 'localStorage', {
  value: localStorageMock,
  writable: true,
})

// Mock fetch
if (typeof globalThis.fetch === 'undefined') {
  (globalThis as any).fetch = vi.fn() as typeof fetch
}

// Mock Buffer
if (typeof globalThis.Buffer === 'undefined') {
  (globalThis as any).Buffer = Buffer
}
