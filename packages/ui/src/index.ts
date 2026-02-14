// Shared UI component type interfaces
// These define the contract for design system components

export interface ButtonProps {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger' | 'link';
  size?: 'sm' | 'md' | 'lg';
  loading?: boolean;
  disabled?: boolean;
  icon?: string;
}

export interface ModalProps {
  size?: 'sm' | 'md' | 'lg' | 'full';
  variant?: 'alert' | 'confirm' | 'form' | 'custom';
  open: boolean;
  onClose: () => void;
  onConfirm?: () => void;
  onCancel?: () => void;
}

export interface TextInputProps {
  label?: string;
  error?: string;
  hint?: string;
  required?: boolean;
}

export type BadgeVariant = 'info' | 'success' | 'warning' | 'error' | 'neutral';
