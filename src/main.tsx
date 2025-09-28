import { QueryClientProvider } from '@tanstack/react-query';
import { createRoot } from 'react-dom/client';
import { ErrorBoundary } from "react-error-boundary";

import App from './App-New.tsx';
import { ErrorFallback } from './ErrorFallback.tsx';
import { queryClient } from './lib/query';

import "./index.css";
import "./main.css";

createRoot(document.getElementById('root')!).render(
  <ErrorBoundary FallbackComponent={ErrorFallback}>
    <QueryClientProvider client={queryClient}>
      <App />
    </QueryClientProvider>
   </ErrorBoundary>
)
