/**
 * API client for the public storefront endpoints.
 */

import Constants from 'expo-constants';
import { useAuthStore } from '../stores/authStore';

const BASE_URL = Constants.expoConfig?.extra?.apiBaseUrl ?? 'https://mise.co.il/api/public';

/** Server origin for resolving relative asset paths (e.g. /uploads/...) */
export const SERVER_ORIGIN = BASE_URL.replace(/\/api\/public\/?$/, '');

/** Resolve a photo path to a full URL. Absolute URLs pass through unchanged. */
export function resolvePhotoUrl(path: string): string {
  if (path.startsWith('http://') || path.startsWith('https://')) return path;
  return `${SERVER_ORIGIN}${path}`;
}

interface ApiError {
  code: string;
  message: string;
}

export class StorefrontApiError extends Error {
  constructor(
    public statusCode: number,
    public code: string,
    message: string,
  ) {
    super(message);
    this.name = 'StorefrontApiError';
  }
}

async function request<T>(
  path: string,
  options: RequestInit = {},
): Promise<T> {
  const url = `${BASE_URL}${path}`;
  const token = useAuthStore.getState().token;

  const response = await fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
      ...(token && { Authorization: `Bearer ${token}` }),
      ...options.headers,
    },
  });

  const json = await response.json();

  if (!response.ok || !json.success) {
    const error: ApiError = json.error ?? {
      code: 'UNKNOWN',
      message: 'An unexpected error occurred',
    };
    throw new StorefrontApiError(response.status, error.code, error.message);
  }

  return json.data as T;
}

export const api = {
  get: <T>(path: string) => request<T>(path),

  post: <T>(path: string, body: unknown) =>
    request<T>(path, {
      method: 'POST',
      body: JSON.stringify(body),
    }),

  put: <T>(path: string, body: unknown) =>
    request<T>(path, {
      method: 'PUT',
      body: JSON.stringify(body),
    }),
};
