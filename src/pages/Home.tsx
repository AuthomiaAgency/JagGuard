import { Link } from 'react-router-dom';
import { Eye, PawPrint, Skull, Car, PackageX, AlertTriangle } from 'lucide-react';
import Header from '../components/Header';

const reportTypes = [
  { id: 'avistamiento', title: 'Avistamiento', icon: Eye, color: 'text-blue-500', bg: 'bg-blue-500/10' },
  { id: 'huella', title: 'Huella', icon: PawPrint, color: 'text-orange-500', bg: 'bg-orange-500/10' },
  { id: 'depredacion', title: 'Depredación', icon: Skull, color: 'text-red-500', bg: 'bg-red-500/10' },
  { id: 'atropellamiento', title: 'Atropellamiento de Fauna', icon: Car, color: 'text-slate-500', bg: 'bg-slate-500/10' },
  { id: 'trafico', title: 'Tráfico de Especies', icon: PackageX, color: 'text-yellow-500', bg: 'bg-yellow-500/10' },
  { id: 'matanza', title: 'Matanza por Retaliación', icon: AlertTriangle, color: 'text-purple-500', bg: 'bg-purple-500/10' },
];

export default function Home({ user }: { user: any }) {
  return (
    <div className="flex flex-col w-full max-w-md mx-auto pb-24 min-h-screen bg-background-light dark:bg-background-dark">
      <Header />

      <div className="px-5 pt-6 pb-2">
        <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-1">Reportar Evento</h2>
        <p className="text-slate-500 dark:text-slate-400 text-sm">Selecciona una categoría para registrar actividad en el campo.</p>
      </div>

      <div className="p-5 grid grid-cols-2 gap-4">
        {reportTypes.map((type) => (
          <Link
            key={type.id}
            to={`/report/${type.id}`}
            className="group relative flex flex-col items-center justify-center gap-4 bg-white dark:bg-surface-dark p-6 rounded-2xl border border-slate-200 dark:border-surface-lighter hover:border-primary/50 transition-all active:scale-95 shadow-sm"
          >
            <div className={`${type.bg} p-4 rounded-full group-hover:scale-110 transition-transform ${type.color}`}>
              <type.icon className="w-8 h-8" strokeWidth={2} />
            </div>
            <span className="font-semibold text-slate-900 dark:text-white text-center text-sm">{type.title}</span>
          </Link>
        ))}
      </div>
    </div>
  );
}
