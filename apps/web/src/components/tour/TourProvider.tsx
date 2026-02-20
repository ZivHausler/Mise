import React, { useCallback, useMemo } from 'react';
import Joyride, { STATUS, ACTIONS, EVENTS, type CallBackProps, type TooltipRenderProps } from 'react-joyride';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { X } from 'lucide-react';
import { useOnboardingStatus, useCompleteOnboarding } from '@/api/hooks';
import { getDesktopTourSteps, getMobileTourSteps } from './tourSteps';

function TourTooltip({
  continuous,
  index,
  step,
  size,
  backProps,
  closeProps,
  primaryProps,
  skipProps,
  isLastStep,
}: TooltipRenderProps) {
  const { t } = useTranslation();

  return (
    <div className="rounded-xl bg-white shadow-xl w-full" style={{ maxWidth: 334 }} dir={document.documentElement.dir || 'ltr'}>
      {/* Header: step counter + close button */}
      <div className="flex items-center justify-between px-4 pt-3 pb-1">
        <span className="text-body-xs text-neutral-400 font-medium">
          {index + 1}/{size}
        </span>
        <button
          {...closeProps}
          className="rounded p-1 text-neutral-400 hover:bg-neutral-100 hover:text-neutral-600 transition-colors"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      {/* Content */}
      <div className="px-4 pb-2">
        {step.title && (
          <h3 className="text-body-base font-semibold text-neutral-900 mb-1">{step.title}</h3>
        )}
        <p className="text-body-sm text-neutral-600">{step.content}</p>
      </div>

      {/* Footer: buttons */}
      <div className="flex items-center justify-between px-4 pb-4 pt-2">
        <button
          {...skipProps}
          className="text-body-sm text-neutral-400 hover:text-neutral-600 transition-colors"
        >
          {t('tour.skip')}
        </button>
        <div className="flex items-center gap-2">
          {index > 0 && (
            <button
              {...backProps}
              className="rounded-lg px-3 py-1.5 text-body-sm text-neutral-600 hover:bg-neutral-100 transition-colors"
            >
              {t('tour.back')}
            </button>
          )}
          {continuous && (
            <button
              {...primaryProps}
              className="rounded-lg bg-primary-500 px-4 py-1.5 text-body-sm font-medium text-white hover:bg-primary-600 transition-colors"
            >
              {isLastStep ? t('tour.finish') : t('tour.next')}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

export function TourProvider({ children }: { children: React.ReactNode }) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { data: onboarding, isLoading } = useOnboardingStatus();
  const completeOnboarding = useCompleteOnboarding();

  const dir = (document.documentElement.dir || 'ltr') as 'ltr' | 'rtl';
  const isMobile = window.innerWidth < 1024; // matches Tailwind lg breakpoint
  const steps = useMemo(
    () => (isMobile ? getMobileTourSteps(t) : getDesktopTourSteps(t, dir)),
    [t, dir, isMobile],
  );

  const handleCallback = useCallback(
    (data: CallBackProps) => {
      const { status, action, type, step } = data;

      // Navigate to the step's page when the step tooltip is shown
      if (type === EVENTS.STEP_BEFORE) {
        const path = (step.data as { path?: string })?.path;
        if (path && window.location.pathname !== path) {
          navigate(path);
        }
      }

      if (
        status === STATUS.FINISHED ||
        status === STATUS.SKIPPED ||
        (action === ACTIONS.CLOSE && status === STATUS.PAUSED)
      ) {
        completeOnboarding.mutate();
      }
    },
    [completeOnboarding, navigate],
  );

  const shouldRun = !isLoading && onboarding?.completedAt === null;

  return (
    <>
      {children}
      <Joyride
        steps={steps}
        run={shouldRun}
        continuous
        showSkipButton
        disableScrolling
        callback={handleCallback}
        tooltipComponent={TourTooltip}
        styles={{
          options: {
            primaryColor: '#C4823E',
            zIndex: 10000,
          },
        }}
      />
    </>
  );
}
