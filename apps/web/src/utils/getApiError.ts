import i18n from '@/i18n/config';

export function getApiErrorMessage(error: unknown, fallbackKey: string): string {
  const errData = (error as any)?.response?.data?.error;
  const code = errData?.code;
  const message = errData?.message;

  // Check if the message itself is a translatable key (e.g. from Zod validation)
  if (message && i18n.exists(`apiErrors.${message}`)) {
    return i18n.t(`apiErrors.${message}`);
  }

  if (code && i18n.exists(`apiErrors.${code}`)) {
    return i18n.t(`apiErrors.${code}`);
  }
  return i18n.t(fallbackKey);
}

export function getApiErrorCode(error: unknown): string | undefined {
  return (error as any)?.response?.data?.error?.code;
}

export function getApiErrorData(error: unknown): unknown {
  return (error as any)?.response?.data?.error?.data;
}
