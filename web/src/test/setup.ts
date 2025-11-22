import '@testing-library/jest-dom'

// Mock environment variables
Object.defineProperty(window, 'import', {
  value: {
    meta: {
      env: {
        VITE_GOOGLE_CLIENT_ID: 'test-client-id',
      },
    },
  },
})

// Mock localStorage
const localStorageMock = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn(),
  clear: vi.fn(),
}
global.localStorage = localStorageMock as any

// Mock fetch
global.fetch = vi.fn()

// Mock Buffer
global.Buffer = require('buffer').Buffer
