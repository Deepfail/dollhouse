import { DatingSimShell } from '@/components/DatingSimShell';
import { Toaster } from '@/components/ui/sonner';
import { logger } from '@/lib/logger';
import { initStorage } from '@/storage/init';
import { useEffect, useState } from 'react';

function LoadingScreen({ message }: { message: string }) {
  return (
    <div className="flex h-screen w-full items-center justify-center bg-[#0f0f15] text-white">
      <div className="text-center">
        <div className="mx-auto mb-4 h-12 w-12 animate-spin rounded-full border-b-2 border-[#ff1372]" />
        <p className="text-sm text-white/60">{message}</p>
      </div>
    </div>
  );
}

function ErrorScreen({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <div className="flex h-screen w-full items-center justify-center bg-[#0f0f15] text-white">
      <div className="max-w-md space-y-5 text-center">
        <h1 className="text-2xl font-semibold">Storage failed to initialize</h1>
        <p className="text-sm text-white/60">{message}</p>
        <button
          type="button"
          onClick={onRetry}
          className="rounded-xl bg-[#ff1372] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[#ff1372]/90"
        >
          Try again
        </button>
      </div>
    </div>
  );
}

export default function App() {
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading');
  const [errorMessage, setErrorMessage] = useState<string>('Something went wrong while preparing your house data.');
  const [retryToken, setRetryToken] = useState(0);

  useEffect(() => {
    let cancelled = false;

    const bootstrap = async () => {
      setStatus('loading');
      try {
        logger.log('🔧 Bootstrapping storage for dating sim shell');
        await initStorage();
        if (!cancelled) {
          setStatus('ready');
        }
      } catch (error) {
        logger.error('❌ Storage initialization failed', error);
        if (!cancelled) {
          const message = error instanceof Error ? error.message : 'Unknown error.';
          setErrorMessage(message || 'Unknown error.');
          setStatus('error');
        }
      }
    };

    void bootstrap();

    return () => {
      cancelled = true;
    };
  }, [retryToken]);

  if (status === 'loading') {
    return <LoadingScreen message="Warming the roster and syncing the rooms…" />;
  }

  if (status === 'error') {
    return (
      <ErrorScreen
        message={errorMessage}
        onRetry={() => setRetryToken((token) => token + 1)}
      />
    );
  }

  return (
    <>
      <DatingSimShell />
      <Toaster />
    </>
  );
}