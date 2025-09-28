import { DesktopShell } from '@/components/DesktopShell';
import { Toaster } from '@/components/ui/sonner';
import './main.css';

function App() {
  return (
    <div className="h-screen bg-background">
      <DesktopShell />
      <Toaster />
    </div>
  );
}

export default App;