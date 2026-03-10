import React from 'react';
import { useTranslation } from 'react-i18next';
import { CreditCard } from 'lucide-react';
import { cn } from '@/utils/cn';

interface PaymentMethodSelectorProps {
  selectedMethod: 'payplus' | 'paypal';
  onSelect: (method: 'payplus' | 'paypal') => void;
  disabled?: boolean;
}

const METHODS = [
  { value: 'payplus' as const, labelKey: 'subscription.payment.creditCard', Icon: CreditCard },
  { value: 'paypal' as const, labelKey: 'subscription.payment.paypal', Icon: PayPalIcon },
];

function PayPalIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="currentColor"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path d="M7.076 21.337H2.47a.641.641 0 0 1-.633-.74L4.944 2.892A.859.859 0 0 1 5.79 2.2h6.15c2.04 0 3.48.458 4.279 1.362.364.41.594.853.702 1.357.115.533.118 1.17.01 1.948l-.01.06v.5l.39.22a2.76 2.76 0 0 1 .791.667c.327.396.538.897.627 1.486.092.605.061 1.305-.091 2.085-.177.9-.464 1.684-.853 2.33a4.72 4.72 0 0 1-1.348 1.467 5.046 5.046 0 0 1-1.817.806c-.676.168-1.433.253-2.25.253h-.535a1.614 1.614 0 0 0-1.595 1.362l-.04.22-.675 4.271-.031.158a.157.157 0 0 1-.155.132H7.076Z" />
      <path
        d="M18.283 7.888c-.014.09-.03.182-.047.276-.614 3.15-2.717 4.238-5.403 4.238h-1.367a.664.664 0 0 0-.656.562l-.7 4.436-.198 1.258a.35.35 0 0 0 .345.404h2.424a.582.582 0 0 0 .575-.49l.024-.123.455-2.886.029-.159a.582.582 0 0 1 .575-.491h.363c2.346 0 4.183-.953 4.72-3.71.225-1.152.108-2.114-.486-2.79a2.313 2.313 0 0 0-.653-.525Z"
        opacity={0.7}
      />
    </svg>
  );
}

export const PaymentMethodSelector = React.memo(function PaymentMethodSelector({
  selectedMethod,
  onSelect,
  disabled,
}: PaymentMethodSelectorProps) {
  const { t } = useTranslation();

  return (
    <div className="flex flex-col gap-3 w-full">
      <p className="text-body-sm font-medium text-neutral-600">
        {t('subscription.payment.chooseMethod')}
      </p>
      {METHODS.map(({ value, labelKey, Icon }) => {
        const isSelected = selectedMethod === value;
        return (
          <button
            key={value}
            type="button"
            disabled={disabled}
            onClick={() => onSelect(value)}
            className={cn(
              'flex items-center gap-3 rounded-xl border-2 p-4 transition-all',
              isSelected
                ? 'border-primary-500 bg-primary-50 ring-1 ring-primary-200'
                : 'border-neutral-200 bg-white hover:border-neutral-300',
              disabled && 'opacity-50 cursor-not-allowed',
            )}
          >
            <Icon className={cn('h-5 w-5 shrink-0', isSelected ? 'text-primary-600' : 'text-neutral-500')} />
            <span className={cn('flex-1 text-start text-body-sm font-medium', isSelected ? 'text-primary-700' : 'text-neutral-700')}>
              {t(labelKey)}
            </span>
            <div
              className={cn(
                'h-5 w-5 shrink-0 rounded-full border-2 transition-all flex items-center justify-center',
                isSelected ? 'border-primary-500 bg-primary-500' : 'border-neutral-300 bg-white',
              )}
            >
              {isSelected && <div className="h-2 w-2 rounded-full bg-white" />}
            </div>
          </button>
        );
      })}
    </div>
  );
});
