import { useEffect, useCallback, useRef, useState } from 'react';

declare global {
  interface Window {
    google?: {
      accounts: {
        id: {
          initialize: (config: {
            client_id: string;
            callback: (response: { credential: string }) => void;
            auto_select?: boolean;
          }) => void;
          renderButton: (
            element: HTMLElement,
            config: {
              type?: string;
              theme?: string;
              size?: string;
              text?: string;
              width?: number;
            },
          ) => void;
          prompt: () => void;
        };
      };
    };
  }
}

// @ts-ignore - Vite injects env at build time
const GOOGLE_CLIENT_ID: string = import.meta.env.VITE_GOOGLE_CLIENT_ID || '';

export function useGoogleAuth(onCredential: (idToken: string) => void) {
  const callbackRef = useRef(onCredential);
  callbackRef.current = onCredential;
  const [scriptLoaded, setScriptLoaded] = useState(!!window.google);

  useEffect(() => {
    if (!GOOGLE_CLIENT_ID) return;
    if (window.google) {
      window.google.accounts.id.initialize({
        client_id: GOOGLE_CLIENT_ID,
        callback: (response) => callbackRef.current(response.credential),
      });
      setScriptLoaded(true);
      return;
    }

    const existing = document.querySelector('script[src="https://accounts.google.com/gsi/client"]');
    if (existing) {
      existing.addEventListener('load', () => {
        window.google?.accounts.id.initialize({
          client_id: GOOGLE_CLIENT_ID,
          callback: (response) => callbackRef.current(response.credential),
        });
        setScriptLoaded(true);
      });
      return;
    }

    const script = document.createElement('script');
    script.src = 'https://accounts.google.com/gsi/client';
    script.async = true;
    script.defer = true;
    script.onload = () => {
      window.google?.accounts.id.initialize({
        client_id: GOOGLE_CLIENT_ID,
        callback: (response) => callbackRef.current(response.credential),
      });
      setScriptLoaded(true);
    };
    document.head.appendChild(script);
  }, []);

  const renderButton = useCallback(
    (element: HTMLElement | null) => {
      if (!element || !window.google) return;
      window.google.accounts.id.renderButton(element, {
        type: 'standard',
        theme: 'outline',
        size: 'large',
        text: 'signin_with',
        width: Math.min(element.offsetWidth, 400),
      });
    },
    // re-create when script loads so callers get a working function
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [scriptLoaded],
  );

  return { renderButton, isAvailable: !!GOOGLE_CLIENT_ID && scriptLoaded };
}
