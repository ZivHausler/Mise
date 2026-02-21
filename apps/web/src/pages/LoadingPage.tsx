import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '@/store/auth';
import { Logo } from '@/components/Logo';

const POLL_INTERVAL_MS = 2000;
const MIN_DISPLAY_MS = 3000;
const SLOW_THRESHOLD_MS = 4000;
const VERY_SLOW_THRESHOLD_MS = 10000;

export default function LoadingPage() {
  const navigate = useNavigate();
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const hasStore = useAuthStore((s) => s.hasStore);

  const [elapsed, setElapsed] = useState(0);
  const startRef = useRef(Date.now());
  const doneRef = useRef(false);

  useEffect(() => {
    if (!isAuthenticated) {
      navigate('/login', { replace: true });
      return;
    }

    const tick = setInterval(() => {
      setElapsed(Date.now() - startRef.current);
    }, 500);

    async function ping() {
      try {
        const res = await fetch('/health', { signal: AbortSignal.timeout(5000) });
        if (res.ok && !doneRef.current) {
          doneRef.current = true;
          clearInterval(tick);
          const remaining = MIN_DISPLAY_MS - (Date.now() - startRef.current);
          setTimeout(
            () => navigate(hasStore ? '/' : '/store-setup', { replace: true }),
            Math.max(0, remaining),
          );
        }
      } catch {
        // server not ready yet — will retry
      }
    }

    ping();
    const poll = setInterval(ping, POLL_INTERVAL_MS);

    return () => {
      clearInterval(tick);
      clearInterval(poll);
    };
  }, [navigate, isAuthenticated, hasStore]);

  const isSlow = elapsed > SLOW_THRESHOLD_MS;
  const isVerySlow = elapsed > VERY_SLOW_THRESHOLD_MS;

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-primary-50 gap-8 p-4">
      <Logo className="h-24 text-[#c8a96e]" />

      <div className="flex flex-col items-center gap-4">
        {/* Spinner */}
        <div className="relative h-10 w-10">
          <div className="absolute inset-0 rounded-full border-2 border-primary-100" />
          <div className="absolute inset-0 animate-spin rounded-full border-2 border-transparent border-t-[#c8a96e]" />
        </div>

        {/* Status message */}
        <p
          className={`text-body-sm text-center transition-opacity duration-500 ${isSlow ? 'opacity-100' : 'opacity-0'}`}
        >
          {isVerySlow ? (
            <span className="text-neutral-400">Still starting up — almost there...</span>
          ) : (
            <span className="text-neutral-400">Starting up the kitchen...</span>
          )}
        </p>
      </div>
    </div>
  );
}
