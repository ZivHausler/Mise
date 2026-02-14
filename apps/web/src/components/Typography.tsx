import React from 'react';
import { cn } from '@/utils/cn';

type TypographyElement = 'h1' | 'h2' | 'h3' | 'h4' | 'h5' | 'h6' | 'p' | 'span' | 'label';

interface TypographyProps {
  children: React.ReactNode;
  className?: string;
  as?: TypographyElement;
}

export const Title = React.memo(function Title({ children, className, as: Tag = 'h1' }: TypographyProps) {
  return <Tag className={cn('font-heading text-h1 text-neutral-800 md:text-h1', className)}>{children}</Tag>;
});

export const Subtitle = React.memo(function Subtitle({ children, className, as: Tag = 'h2' }: TypographyProps) {
  return <Tag className={cn('font-heading text-h2 text-neutral-700', className)}>{children}</Tag>;
});

export const SectionTitle = React.memo(function SectionTitle({ children, className, as: Tag = 'h3' }: TypographyProps) {
  return <Tag className={cn('font-heading text-h3 text-neutral-800', className)}>{children}</Tag>;
});

export const Paragraph = React.memo(function Paragraph({ children, className, as: Tag = 'p' }: TypographyProps) {
  return <Tag className={cn('font-body text-body text-neutral-600', className)}>{children}</Tag>;
});

export const Label = React.memo(function Label({ children, className, as: Tag = 'label' }: TypographyProps & { htmlFor?: string }) {
  return <Tag className={cn('font-body text-body-sm font-semibold text-neutral-700', className)}>{children}</Tag>;
});

export const ErrorText = React.memo(function ErrorText({ children, className }: Omit<TypographyProps, 'as'>) {
  return <span className={cn('font-body text-caption text-error', className)}>{children}</span>;
});

export const InfoText = React.memo(function InfoText({ children, className }: Omit<TypographyProps, 'as'>) {
  return <span className={cn('font-body text-caption text-neutral-400', className)}>{children}</span>;
});

export const Caption = React.memo(function Caption({ children, className }: Omit<TypographyProps, 'as'>) {
  return <span className={cn('font-body text-caption text-neutral-500', className)}>{children}</span>;
});
