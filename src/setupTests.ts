import '@testing-library/jest-dom';
import { vi } from 'vitest';

// Mock browser extension APIs
(global as typeof globalThis & { browser: unknown }).browser = {
  runtime: {
    sendMessage: vi.fn(),
    onMessage: {
      addListener: vi.fn(),
      removeListener: vi.fn(),
    },
  },
};