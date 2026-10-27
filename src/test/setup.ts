import '@testing-library/jest-dom/vitest'
import { cleanup } from '@testing-library/react'
import { afterEach, vi } from 'vitest'

afterEach(() => {
  cleanup()
  vi.clearAllMocks()
})

Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: vi.fn().mockImplementation((query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })),
})

class ObserverMock {
  observe = vi.fn()
  unobserve = vi.fn()
  disconnect = vi.fn()
  takeRecords = vi.fn(() => [])
}

Object.defineProperty(window, 'ResizeObserver', {
  writable: true,
  value: ObserverMock,
})

Object.defineProperty(window, 'IntersectionObserver', {
  writable: true,
  value: ObserverMock,
})

if (!URL.createObjectURL) {
  URL.createObjectURL = vi.fn(() => 'blob:mock')
}

if (!URL.revokeObjectURL) {
  URL.revokeObjectURL = vi.fn()
}
