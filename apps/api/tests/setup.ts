import { vi } from 'vitest';

// ---------------------------------------------------------------------------
// Global mock: prevent any real emails from being sent during tests.
// This mocks the Resend SDK so that no test can accidentally send emails,
// even if individual test files forget to mock the email module.
// ---------------------------------------------------------------------------
vi.mock('resend', () => {
  const send = vi.fn().mockResolvedValue({ data: { id: 'mock-email-id' }, error: null });
  return {
    Resend: vi.fn().mockImplementation(() => ({
      emails: { send },
    })),
  };
});
