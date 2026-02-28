import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Wifi, WifiOff } from 'lucide-react';

export default function Header() {
  const [isOnline, setIsOnline] = useState(navigator.onLine);

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  return (
    <header className="sticky top-0 z-40 bg-white/80 dark:bg-background-dark/80 backdrop-blur-md border-b border-slate-200 dark:border-surface-lighter px-6 py-4 flex items-center justify-between">
      <Link to="/" className="flex items-center gap-2">
        <img src="https://copilot.microsoft.com/th/id/BCO.d0bf4f92-6766-431d-a514-33b392ff865c.png" alt="Coex5.0 Logo" className="h-8 w-auto object-contain" />
      </Link>
      <div className={`flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full border transition-colors ${isOnline ? 'bg-green-50 text-green-600 border-green-200 dark:bg-green-500/10 dark:text-green-400 dark:border-green-500/20' : 'bg-red-50 text-red-600 border-red-200 dark:bg-red-500/10 dark:text-red-400 dark:border-red-500/20'}`}>
        {isOnline ? <Wifi className="w-3 h-3" /> : <WifiOff className="w-3 h-3" />}
        {isOnline ? 'Conectado' : 'Sin conexión'}
      </div>
    </header>
  );
}
