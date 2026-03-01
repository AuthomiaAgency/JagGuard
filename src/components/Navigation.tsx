import { Link, useLocation } from 'react-router-dom';
import { Home, BookOpen, User, BarChart3, Edit3 } from 'lucide-react';
import { clsx } from 'clsx';

export default function Navigation({ user }: { user: any }) {
  const location = useLocation();
  const path = location.pathname;

  const isAdmin = user?.role === 'admin';

  return (
    <nav className="fixed bottom-0 left-0 w-full bg-white/95 dark:bg-[#151923]/95 backdrop-blur-lg border-t border-slate-200 dark:border-surface-lighter pb-safe pt-2 px-6 z-50">
      <div className="flex justify-between items-center max-w-md mx-auto h-16 pb-2">
        {!isAdmin && (
          <Link to="/" className={clsx("flex flex-col items-center justify-center gap-1 w-16 transition-colors", path === '/' ? "text-primary" : "text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300")}>
            <div className={clsx("p-1.5 rounded-full px-4", path === '/' && "bg-primary/10 dark:bg-primary/20")}>
              <Home className="w-6 h-6" />
            </div>
            <span className="text-[10px] font-bold tracking-wide">Reportar</span>
          </Link>
        )}
        
        {isAdmin ? (
          <>
            <Link to="/admin" className={clsx("flex flex-col items-center justify-center gap-1 w-16 transition-colors", path === '/admin' ? "text-primary" : "text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300")}>
              <div className={clsx("p-1.5 rounded-full px-4", path === '/admin' && "bg-primary/10 dark:bg-primary/20")}>
                <BarChart3 className="w-6 h-6" />
              </div>
              <span className="text-[10px] font-bold tracking-wide">Dashboard</span>
            </Link>
            <Link to="/admin/editor" className={clsx("flex flex-col items-center justify-center gap-1 w-16 transition-colors", path === '/admin/editor' ? "text-primary" : "text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300")}>
              <div className={clsx("p-1.5 rounded-full px-4", path === '/admin/editor' && "bg-primary/10 dark:bg-primary/20")}>
                <Edit3 className="w-6 h-6" />
              </div>
              <span className="text-[10px] font-bold tracking-wide">Editor</span>
            </Link>
          </>
        ) : (
          <Link to="/learn" className={clsx("flex flex-col items-center justify-center gap-1 w-16 transition-colors", path === '/learn' ? "text-primary" : "text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300")}>
            <div className={clsx("p-1.5 rounded-full px-4", path === '/learn' && "bg-primary/10 dark:bg-primary/20")}>
              <BookOpen className="w-6 h-6" />
            </div>
            <span className="text-[10px] font-bold tracking-wide text-center leading-tight">Aprender</span>
          </Link>
        )}

        <Link to="/profile" className={clsx("flex flex-col items-center justify-center gap-1 w-16 transition-colors", path === '/profile' ? "text-primary" : "text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300")}>
          <div className={clsx("p-1.5 rounded-full px-4", path === '/profile' && "bg-primary/10 dark:bg-primary/20")}>
            <User className="w-6 h-6" />
          </div>
          <span className="text-[10px] font-bold tracking-wide">Perfil</span>
        </Link>
      </div>
    </nav>
  );
}
