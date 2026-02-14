import React, { useId } from 'react';
import { cn } from '@/utils/cn';
import { ErrorText, InfoText } from './Typography';

interface FieldWrapperProps {
  label?: string;
  error?: string;
  hint?: string;
  required?: boolean;
  children: React.ReactNode;
  htmlFor?: string;
  className?: string;
}

export const FieldWrapper = React.memo(function FieldWrapper({
  label,
  error,
  hint,
  required,
  children,
  htmlFor,
  className,
}: FieldWrapperProps) {
  return (
    <div className={cn('flex flex-col gap-1', className)}>
      {label && (
        <label htmlFor={htmlFor} className="text-body-sm font-semibold text-neutral-700">
          {label}
          {required && <span className="text-error ms-0.5">*</span>}
        </label>
      )}
      {children}
      {hint && !error && <InfoText>{hint}</InfoText>}
      {error && <ErrorText>{error}</ErrorText>}
    </div>
  );
});

const inputBase =
  'w-full rounded-md border bg-white px-3 text-body text-neutral-900 placeholder:text-neutral-400 transition-colors duration-fast focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20 focus:outline-none disabled:bg-neutral-100 disabled:text-neutral-400 disabled:cursor-not-allowed';

const inputError = 'border-error bg-error-light';
const inputDefault = 'border-neutral-200 hover:border-neutral-300';

interface TextInputProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'size'> {
  label?: string;
  error?: string;
  hint?: string;
  size?: 'sm' | 'md' | 'lg';
  icon?: React.ReactNode;
}

const sizeClasses = { sm: 'h-8 text-body-sm', md: 'h-10', lg: 'h-12' };

export const TextInput = React.memo(function TextInput({
  label,
  error,
  hint,
  required,
  size = 'md',
  icon,
  className,
  ...props
}: TextInputProps) {
  const id = useId();
  return (
    <FieldWrapper label={label} error={error} hint={hint} required={required} htmlFor={id} className={className}>
      <div className="relative">
        {icon && (
          <span className="absolute inset-y-0 start-0 flex items-center ps-3 text-neutral-400">
            {icon}
          </span>
        )}
        <input
          id={id}
          className={cn(inputBase, sizeClasses[size], error ? inputError : inputDefault, icon && 'ps-10')}
          {...props}
        />
      </div>
    </FieldWrapper>
  );
});

interface TextAreaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  error?: string;
  hint?: string;
}

export const TextArea = React.memo(function TextArea({
  label,
  error,
  hint,
  required,
  className,
  ...props
}: TextAreaProps) {
  const id = useId();
  return (
    <FieldWrapper label={label} error={error} hint={hint} required={required} htmlFor={id} className={className}>
      <textarea
        id={id}
        className={cn(inputBase, 'min-h-[80px] py-2', error ? inputError : inputDefault)}
        {...props}
      />
    </FieldWrapper>
  );
});

interface SelectOption {
  value: string;
  label: string;
}

interface SelectProps extends Omit<React.SelectHTMLAttributes<HTMLSelectElement>, 'size'> {
  label?: string;
  error?: string;
  hint?: string;
  options: SelectOption[];
  placeholder?: string;
  size?: 'sm' | 'md' | 'lg';
}

export const Select = React.memo(function Select({
  label,
  error,
  hint,
  required,
  options,
  placeholder,
  size = 'md',
  className,
  ...props
}: SelectProps) {
  const id = useId();
  return (
    <FieldWrapper label={label} error={error} hint={hint} required={required} htmlFor={id} className={className}>
      <select
        id={id}
        className={cn(inputBase, sizeClasses[size], error ? inputError : inputDefault, 'cursor-pointer')}
        {...props}
      >
        {placeholder && (
          <option value="" disabled>
            {placeholder}
          </option>
        )}
        {options.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
    </FieldWrapper>
  );
});

interface CheckboxProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'type'> {
  label: string;
}

export const Checkbox = React.memo(function Checkbox({ label, className, ...props }: CheckboxProps) {
  const id = useId();
  return (
    <div className={cn('flex items-center gap-2', className)}>
      <input
        id={id}
        type="checkbox"
        className="h-4 w-4 rounded border-neutral-300 text-primary-500 focus:ring-primary-500"
        {...props}
      />
      <label htmlFor={id} className="text-body-sm text-neutral-700 cursor-pointer">
        {label}
      </label>
    </div>
  );
});

interface ToggleProps {
  label: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
  disabled?: boolean;
}

export const Toggle = React.memo(function Toggle({ label, checked, onChange, disabled }: ToggleProps) {
  return (
    <label className={cn('flex items-center gap-3 cursor-pointer', disabled && 'opacity-50 cursor-not-allowed')}>
      <button
        role="switch"
        aria-checked={checked}
        disabled={disabled}
        onClick={() => onChange(!checked)}
        className={cn(
          'relative inline-flex h-6 w-11 shrink-0 rounded-full border-2 border-transparent transition-colors duration-normal',
          checked ? 'bg-primary-500' : 'bg-neutral-300'
        )}
      >
        <span
          className={cn(
            'pointer-events-none inline-block h-5 w-5 rounded-full bg-white shadow-sm transition-transform duration-normal',
            checked ? 'translate-x-5 rtl:-translate-x-5' : 'translate-x-0'
          )}
        />
      </button>
      <span className="text-body-sm text-neutral-700">{label}</span>
    </label>
  );
});

interface NumberInputProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'type' | 'onChange' | 'size'> {
  label?: string;
  error?: string;
  hint?: string;
  value: number | '';
  onChange: (value: number | '') => void;
  size?: 'sm' | 'md' | 'lg';
}

export const NumberInput = React.memo(function NumberInput({
  label,
  error,
  hint,
  required,
  value,
  onChange,
  size = 'md',
  className,
  ...props
}: NumberInputProps) {
  const id = useId();
  return (
    <FieldWrapper label={label} error={error} hint={hint} required={required} htmlFor={id} className={className}>
      <input
        id={id}
        type="number"
        dir="ltr"
        value={value}
        onChange={(e) => {
          const v = e.target.value;
          onChange(v === '' ? '' : Number(v));
        }}
        className={cn(inputBase, sizeClasses[size], error ? inputError : inputDefault, 'font-mono')}
        {...props}
      />
    </FieldWrapper>
  );
});

interface DatePickerProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'type' | 'size'> {
  label?: string;
  error?: string;
  hint?: string;
  size?: 'sm' | 'md' | 'lg';
}

export const DatePicker = React.memo(function DatePicker({
  label,
  error,
  hint,
  required,
  size = 'md',
  className,
  ...props
}: DatePickerProps) {
  const id = useId();
  return (
    <FieldWrapper label={label} error={error} hint={hint} required={required} htmlFor={id} className={className}>
      <input
        id={id}
        type="date"
        dir="ltr"
        className={cn(inputBase, sizeClasses[size], error ? inputError : inputDefault)}
        {...props}
      />
    </FieldWrapper>
  );
});
