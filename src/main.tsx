import { QueryClientProvider } from "@tanstack/react-query";
import { createRoot } from "react-dom/client";
import { ErrorBoundary } from "react-error-boundary";

import App from "./App.tsx";
import { ErrorFallback } from "./ErrorFallback.tsx";
import { queryClient } from "./lib/query";

import "./index.css";
import "./main.css";

// Get root element with better error handling
const rootElement = document.getElementById("root");
if (!rootElement) {
  throw new Error(
    'Failed to find root element. Make sure index.html has a <div id="root"></div> element.'
  );
}

createRoot(rootElement).render(
  <ErrorBoundary FallbackComponent={ErrorFallback}>
    <QueryClientProvider client={queryClient}>
      <App />
    </QueryClientProvider>
  </ErrorBoundary>
);
