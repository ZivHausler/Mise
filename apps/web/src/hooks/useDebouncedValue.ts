import { useState, useEffect, useRef } from 'react';

export function useDebouncedValue<T>(value: T, delay = 500, onChange?: () => void): T {
  const [debounced, setDebounced] = useState(value);
  const isFirst = useRef(true);

  useEffect(() => {
    const timeout = setTimeout(() => {
      setDebounced(value);
      if (!isFirst.current && onChange) onChange();
      isFirst.current = false;
    }, delay);
    return () => clearTimeout(timeout);
  }, [value, delay]);

  return debounced;
}
