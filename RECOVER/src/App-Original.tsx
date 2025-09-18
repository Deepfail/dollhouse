import { QueryClientProvider } from '@tanstack/react-query';
import { DesktopShell } from '@/components/DesktopShell';
import { Toaster } from '@/components/ui/sonner';
import { queryClient } from '@/lib/query';
import './main.css';

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <div className="h-screen bg-background">
        <DesktopShell />
        <Toaster />
      </div>
    </QueryClientProvider>
  );
}

export default App;