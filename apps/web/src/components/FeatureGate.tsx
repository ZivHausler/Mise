import React from 'react';
import { Navigate } from 'react-router-dom';
import { useFeatureFlags } from '@/api/hooks';
import { PageLoading } from '@/components/Feedback';

interface FeatureGateProps {
  /** The feature flag key to check (must match a key from /features endpoint) */
  featureFlag: string;
  children: React.ReactNode;
}

/**
 * Route-level gate that checks feature flags.
 * If the feature is disabled (tier too low), redirects to dashboard.
 * Shows a loading spinner while feature flags are being fetched.
 */
export const FeatureGate = React.memo(function FeatureGate({ featureFlag, children }: FeatureGateProps) {
  const { data: flags, isLoading } = useFeatureFlags();

  if (isLoading) return <PageLoading />;

  const isEnabled = flags?.[featureFlag as keyof typeof flags];

  if (!isEnabled) return <Navigate to="/" replace />;

  return <>{children}</>;
});
