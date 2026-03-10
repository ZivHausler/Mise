import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { useTranslation } from 'react-i18next';
import { CheckCircle2, AlertCircle, Plus, ChevronDown } from 'lucide-react';
import { cn } from '@/utils/cn';

export interface IngredientOption {
  id: number;
  name: string;
  unit: string;
}

interface IngredientComboBoxProps {
  ingredients: IngredientOption[];
  value: number | null;
  onChange: (ingredientId: number | null, ingredientName: string | null) => void;
  matchConfidence: number;
  onCreateIngredient: () => void;
  disabled?: boolean;
}

export const IngredientComboBox = React.memo(function IngredientComboBox({
  ingredients,
  value,
  onChange,
  matchConfidence,
  onCreateIngredient,
  disabled,
}: IngredientComboBoxProps) {
  const { t } = useTranslation();
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState(false);
  const [highlightIndex, setHighlightIndex] = useState(-1);
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLUListElement>(null);

  const [dropdownStyle, setDropdownStyle] = useState<React.CSSProperties>({});

  const selected = useMemo(
    () => (value != null ? ingredients.find((i) => i.id === value) : null),
    [value, ingredients],
  );

  const filtered = useMemo(() => {
    if (!query) return ingredients;
    const lower = query.toLowerCase();
    return ingredients.filter(
      (i) => i.name.toLowerCase().includes(lower) || i.unit.toLowerCase().includes(lower),
    );
  }, [query, ingredients]);

  // Close on outside click
  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      const target = e.target as Node;
      if (
        containerRef.current && !containerRef.current.contains(target) &&
        listRef.current && !listRef.current.contains(target)
      ) {
        setOpen(false);
        setQuery('');
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  // Position dropdown relative to input using fixed positioning (portal)
  useEffect(() => {
    if (!open || !containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const spaceBelow = window.innerHeight - rect.bottom;
    const dropUp = spaceBelow < 240 && rect.top > spaceBelow;
    setDropdownStyle({
      width: rect.width,
      left: rect.left,
      ...(dropUp
        ? { bottom: window.innerHeight - rect.top + 4 }
        : { top: rect.bottom + 4 }),
    });
  }, [open]);

  // Scroll highlighted item into view
  useEffect(() => {
    if (highlightIndex < 0 || !listRef.current) return;
    const items = listRef.current.children;
    if (items[highlightIndex]) {
      (items[highlightIndex] as HTMLElement).scrollIntoView({ block: 'nearest' });
    }
  }, [highlightIndex]);

  const handleSelect = useCallback(
    (ingredient: IngredientOption) => {
      onChange(ingredient.id, ingredient.name);
      setOpen(false);
      setQuery('');
      setHighlightIndex(-1);
    },
    [onChange],
  );

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (!open) {
        if (e.key === 'ArrowDown' || e.key === 'Enter') {
          e.preventDefault();
          setOpen(true);
        }
        return;
      }

      const totalItems = filtered.length + 1; // +1 for "create" option
      switch (e.key) {
        case 'ArrowDown':
          e.preventDefault();
          setHighlightIndex((prev) => (prev + 1) % totalItems);
          break;
        case 'ArrowUp':
          e.preventDefault();
          setHighlightIndex((prev) => (prev <= 0 ? totalItems - 1 : prev - 1));
          break;
        case 'Enter':
          e.preventDefault();
          if (highlightIndex >= 0 && highlightIndex < filtered.length && filtered[highlightIndex]) {
            handleSelect(filtered[highlightIndex]!);
          } else if (highlightIndex === filtered.length) {
            onCreateIngredient();
            setOpen(false);
            setQuery('');
          }
          break;
        case 'Escape':
          e.preventDefault();
          setOpen(false);
          setQuery('');
          setHighlightIndex(-1);
          break;
      }
    },
    [open, filtered, highlightIndex, handleSelect, onCreateIngredient],
  );

  const confidenceIcon = useMemo(() => {
    if (value == null) return null;
    if (matchConfidence > 0.8)
      return <CheckCircle2 className="h-4 w-4 shrink-0 text-green-500" />;
    if (matchConfidence >= 0.5)
      return <AlertCircle className="h-4 w-4 shrink-0 text-amber-500" />;
    return null;
  }, [value, matchConfidence]);

  const borderColor = useMemo(() => {
    if (value == null && matchConfidence < 0.5) return 'border-amber-300 hover:border-amber-400';
    if (value != null && matchConfidence > 0.8) return 'border-neutral-200 hover:border-neutral-300';
    if (value != null && matchConfidence >= 0.5) return 'border-amber-200 hover:border-amber-300';
    return 'border-neutral-200 hover:border-neutral-300';
  }, [value, matchConfidence]);

  const displayValue = open ? query : selected?.name ?? '';

  return (
    <div ref={containerRef} className="relative">
      <div
        className={cn(
          'flex items-center gap-1.5 rounded-md border bg-white transition-colors',
          open ? 'border-neutral-300' : borderColor,
          disabled && 'cursor-not-allowed bg-neutral-100 opacity-50',
        )}
      >
        {confidenceIcon && <span className="ms-2">{confidenceIcon}</span>}
        <input
          ref={inputRef}
          type="text"
          dir="auto"
          value={displayValue}
          placeholder={
            value == null
              ? t('inventory.matchedIngredient')
              : undefined
          }
          onChange={(e) => {
            setQuery(e.target.value);
            if (!open) setOpen(true);
            setHighlightIndex(-1);
          }}
          onFocus={() => {
            setOpen(true);
            if (selected) setQuery('');
          }}
          onKeyDown={handleKeyDown}
          disabled={disabled}
          className="h-8 min-w-0 flex-1 bg-transparent px-2 text-body-sm text-neutral-900 placeholder:text-neutral-400 focus:outline-none"
          role="combobox"
          aria-expanded={open}
          aria-haspopup="listbox"
          aria-autocomplete="list"
        />
        <ChevronDown
          className={cn(
            'h-4 w-4 shrink-0 text-neutral-400 transition-transform me-2',
            open && 'rotate-180',
          )}
        />
      </div>

      {open && createPortal(
        <ul
          ref={listRef}
          role="listbox"
          className="fixed z-[9999] max-h-56 overflow-y-auto rounded-lg border border-neutral-200 bg-white py-1 shadow-lg"
          style={dropdownStyle}
        >
          {filtered.length === 0 && (
            <li className="px-3 py-2 text-body-sm text-neutral-400">
              {t('common.noResults')}
            </li>
          )}
          {filtered.map((ingredient, idx) => {
            const isHighlighted = idx === highlightIndex;
            const isSelected = ingredient.id === value;
            return (
              <li
                key={ingredient.id}
                role="option"
                aria-selected={isSelected}
                className={cn(
                  'flex cursor-pointer items-center justify-between px-3 py-2 text-body-sm transition-colors',
                  isHighlighted && 'bg-primary-50',
                  isSelected && !isHighlighted && 'bg-primary-25',
                  !isHighlighted && !isSelected && 'hover:bg-neutral-50',
                )}
                onMouseEnter={() => setHighlightIndex(idx)}
                onClick={() => handleSelect(ingredient)}
              >
                <span className="truncate">{ingredient.name}</span>
                <span className="ms-2 shrink-0 text-xs text-neutral-400">
                  ({t(`common.units.${ingredient.unit}`, ingredient.unit)})
                </span>
              </li>
            );
          })}

          {/* Divider + Create */}
          <li className="border-t border-neutral-100 mt-1 pt-1">
            <button
              type="button"
              className={cn(
                'flex w-full items-center gap-2 px-3 py-2 text-body-sm text-primary-600 transition-colors',
                highlightIndex === filtered.length
                  ? 'bg-primary-50'
                  : 'hover:bg-neutral-50',
              )}
              onMouseEnter={() => setHighlightIndex(filtered.length)}
              onClick={() => {
                onCreateIngredient();
                setOpen(false);
                setQuery('');
              }}
            >
              <Plus className="h-4 w-4" />
              {t('inventory.createIngredient')}
            </button>
          </li>
        </ul>,
        document.body,
      )}
    </div>
  );
});
