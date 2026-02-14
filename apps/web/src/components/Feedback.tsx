import React from 'react';
import { CheckCircle, XCircle, AlertTriangle, Info, X } from 'lucide-react';
import { cn } from '@/utils/cn';
import { useToastStore, type Toast as ToastType } from '@/store/toast';

// Spinner
interface SpinnerProps {
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

const spinnerSizes = { sm: 'h-4 w-4', md: 'h-6 w-6', lg: 'h-10 w-10' };

export const Spinner = React.memo(function Spinner({ size = 'md', className }: SpinnerProps) {
  return (
    <svg
      className={cn('animate-spin text-primary-500', spinnerSizes[size], className)}
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 24 24"
    >
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path
        className="opacity-75"
        fill="currentColor"
        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
      />
    </svg>
  );
});

// Page Loading
export const PageLoading = React.memo(function PageLoading() {
  return (
    <div className="flex min-h-[50vh] items-center justify-center">
      <div className="flex flex-col items-center gap-3">
        <Spinner size="lg" />
        <p className="text-body-sm text-neutral-500">Loading...</p>
      </div>
    </div>
  );
});

// Skeleton
interface SkeletonProps {
  className?: string;
}

export const Skeleton = React.memo(function Skeleton({ className }: SkeletonProps) {
  return (
    <div className={cn('relative overflow-hidden rounded-md bg-neutral-200', className)}>
      <div className="absolute inset-0 animate-shimmer bg-gradient-to-r from-transparent via-neutral-100 to-transparent" />
    </div>
  );
});

// Toast
const toastIcons = {
  success: CheckCircle,
  error: XCircle,
  warning: AlertTriangle,
  info: Info,
};

const toastStyles = {
  success: 'border-success bg-success-light',
  error: 'border-error bg-error-light',
  warning: 'border-warning bg-warning-light',
  info: 'border-info bg-info-light',
};

const ToastItem = React.memo(function ToastItem({ toast }: { toast: ToastType }) {
  const removeToast = useToastStore((s) => s.removeToast);
  const Icon = toastIcons[toast.variant];

  return (
    <div
      className={cn(
        'flex items-start gap-3 rounded-lg border-s-4 p-4 shadow-md animate-slide-in',
        toastStyles[toast.variant]
      )}
    >
      <Icon className="h-5 w-5 shrink-0 mt-0.5" />
      <p className="flex-1 text-body-sm text-neutral-800">{toast.message}</p>
      <button
        onClick={() => removeToast(toast.id)}
        className="shrink-0 rounded p-0.5 text-neutral-400 hover:text-neutral-600"
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  );
});

export const ToastContainer = React.memo(function ToastContainer() {
  const toasts = useToastStore((s) => s.toasts);

  if (toasts.length === 0) return null;

  return (
    <div className="fixed top-4 end-4 z-toast flex w-full max-w-[360px] flex-col gap-2">
      {toasts.map((toast) => (
        <ToastItem key={toast.id} toast={toast} />
      ))}
    </div>
  );
});
