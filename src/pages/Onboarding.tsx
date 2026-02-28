import { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ArrowRight, WifiOff, MapPin, Camera, Star, Eye, PawPrint, Skull, CheckCircle } from 'lucide-react';

export default function Onboarding({ onFinish }: { onFinish: () => void }) {
  const [currentSlide, setCurrentSlide] = useState(0);

  const nextSlide = () => {
    if (currentSlide === slides.length - 1) {
      onFinish();
    } else {
      setCurrentSlide(s => s + 1);
    }
  };

  const slides = [
    {
      id: 1,
      title: "¿Sin señal?\nNo hay problema.",
      description: "Coex5.0 guarda tus reportes y los envía automáticamente cuando recuperes internet.",
      visual: (
        <div className="relative w-full h-full bg-slate-100 dark:bg-slate-800 rounded-2xl overflow-hidden border border-slate-200 dark:border-slate-700 shadow-inner flex flex-col items-center justify-center p-4">
          <div className="absolute top-3 right-3 flex items-center gap-1 bg-red-100 dark:bg-red-500/20 text-red-600 dark:text-red-400 px-2 py-1 rounded-full text-[10px] font-bold">
            <WifiOff className="w-3 h-3" /> Sin conexión
          </div>
          <div className="w-full bg-white dark:bg-surface-dark rounded-xl p-3 shadow-sm border border-slate-200 dark:border-surface-lighter mt-6">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-8 h-8 rounded-full bg-orange-100 dark:bg-orange-500/20 flex items-center justify-center text-orange-500">
                <PawPrint className="w-4 h-4" />
              </div>
              <div className="flex-1">
                <div className="h-3 w-20 bg-slate-200 dark:bg-slate-700 rounded-full mb-1"></div>
                <div className="h-2 w-12 bg-slate-200 dark:bg-slate-700 rounded-full"></div>
              </div>
            </div>
            <div className="flex items-center justify-between mt-3 pt-2 border-t border-slate-100 dark:border-surface-lighter">
              <span className="text-[10px] text-slate-500">Guardado localmente</span>
              <CheckCircle className="w-4 h-4 text-slate-400" />
            </div>
          </div>
        </div>
      )
    },
    {
      id: 2,
      title: "Reporta en segundos",
      description: "Toca la categoría que mejor describa lo que viste en el campo.",
      visual: (
        <div className="relative w-full h-full bg-slate-100 dark:bg-slate-800 rounded-2xl overflow-hidden border border-slate-200 dark:border-slate-700 shadow-inner p-4 flex flex-col justify-center">
          <div className="grid grid-cols-2 gap-2">
            <div className="bg-white dark:bg-surface-dark p-3 rounded-xl border border-slate-200 dark:border-surface-lighter flex flex-col items-center gap-2 shadow-sm">
              <div className="bg-blue-500/10 p-2 rounded-full text-blue-500"><Eye className="w-5 h-5" /></div>
              <div className="h-2 w-16 bg-slate-200 dark:bg-slate-700 rounded-full"></div>
            </div>
            <div className="bg-white dark:bg-surface-dark p-3 rounded-xl border border-primary/50 flex flex-col items-center gap-2 shadow-sm ring-2 ring-primary/20 scale-105 transition-transform">
              <div className="bg-orange-500/10 p-2 rounded-full text-orange-500"><PawPrint className="w-5 h-5" /></div>
              <div className="h-2 w-12 bg-slate-200 dark:bg-slate-700 rounded-full"></div>
            </div>
            <div className="bg-white dark:bg-surface-dark p-3 rounded-xl border border-slate-200 dark:border-surface-lighter flex flex-col items-center gap-2 shadow-sm">
              <div className="bg-red-500/10 p-2 rounded-full text-red-500"><Skull className="w-5 h-5" /></div>
              <div className="h-2 w-16 bg-slate-200 dark:bg-slate-700 rounded-full"></div>
            </div>
            <div className="bg-white dark:bg-surface-dark p-3 rounded-xl border border-slate-200 dark:border-surface-lighter flex flex-col items-center gap-2 shadow-sm">
              <div className="bg-slate-500/10 p-2 rounded-full text-slate-500"><Camera className="w-5 h-5" /></div>
              <div className="h-2 w-14 bg-slate-200 dark:bg-slate-700 rounded-full"></div>
            </div>
          </div>
          <div className="absolute inset-0 bg-gradient-to-t from-slate-100 dark:from-slate-800 via-transparent to-transparent pointer-events-none"></div>
        </div>
      )
    },
    {
      id: 3,
      title: "Ubicación y Evidencia",
      description: "El GPS se activa solo. Toma una foto clara para validar tu reporte.",
      visual: (
        <div className="relative w-full h-full bg-slate-100 dark:bg-slate-800 rounded-2xl overflow-hidden border border-slate-200 dark:border-slate-700 shadow-inner">
          <div className="absolute inset-0 opacity-50 bg-[url('https://images.unsplash.com/photo-1524661135-423995f22d0b?q=80&w=400&auto=format&fit=crop')] bg-cover bg-center"></div>
          <div className="absolute inset-0 bg-black/20"></div>
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 flex flex-col items-center">
            <div className="w-12 h-12 bg-primary text-white rounded-full flex items-center justify-center shadow-lg shadow-primary/40 animate-bounce">
              <MapPin className="w-6 h-6" />
            </div>
            <div className="mt-2 bg-white/90 dark:bg-surface-dark/90 backdrop-blur-sm px-3 py-1.5 rounded-lg shadow-sm border border-white/20 text-[10px] font-mono font-bold text-slate-800 dark:text-white">
              -12.0464, -77.0428
            </div>
          </div>
          <div className="absolute bottom-4 left-4 right-4 bg-white dark:bg-surface-dark p-3 rounded-xl shadow-lg border border-slate-200 dark:border-surface-lighter flex items-center gap-3">
            <div className="w-10 h-10 bg-slate-100 dark:bg-slate-800 rounded-lg flex items-center justify-center text-slate-400">
              <Camera className="w-5 h-5" />
            </div>
            <div className="flex-1">
              <div className="h-2 w-24 bg-slate-200 dark:bg-slate-700 rounded-full mb-1.5"></div>
              <div className="h-1.5 w-16 bg-slate-200 dark:bg-slate-700 rounded-full"></div>
            </div>
          </div>
        </div>
      )
    },
    {
      id: 4,
      title: "Gana Beneficios",
      description: "Cada reporte verificado te suma 10 puntos. ¡Llega a 150 y el Especialista te dará recompensas para seguir fomentando el cuidado ambiental!",
      visual: (
        <div className="relative w-full h-full bg-slate-100 dark:bg-slate-800 rounded-2xl overflow-hidden border border-slate-200 dark:border-slate-700 shadow-inner p-4 flex flex-col items-center justify-center">
          <div className="w-full bg-white dark:bg-surface-dark rounded-xl p-4 shadow-sm border border-slate-200 dark:border-surface-lighter text-center relative overflow-hidden">
            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-primary to-emerald-400"></div>
            <div className="w-12 h-12 bg-emerald-100 dark:bg-emerald-500/20 text-emerald-500 rounded-full flex items-center justify-center mx-auto mb-2">
              <Star className="w-6 h-6 fill-current" />
            </div>
            <h3 className="text-2xl font-black text-slate-900 dark:text-white mb-1">120 <span className="text-sm text-slate-500 font-medium">pts</span></h3>
            <div className="w-full bg-slate-100 dark:bg-slate-800 rounded-full h-2 mb-2 overflow-hidden">
              <div className="bg-emerald-500 h-2 rounded-full" style={{ width: '80%' }}></div>
            </div>
            <p className="text-[10px] text-slate-500 dark:text-slate-400 mb-4">¡Solo 30 puntos más para tu recompensa!</p>
            <div className="w-full py-2 bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 rounded-lg text-xs font-bold border border-emerald-200 dark:border-emerald-500/20">
              Recompensa del Especialista
            </div>
          </div>
        </div>
      )
    }
  ];

  return (
    <div className="flex flex-col h-screen w-full max-w-md mx-auto bg-background-light dark:bg-background-dark overflow-hidden relative">
      <div className="absolute top-4 right-6 z-20 mt-8">
        <button onClick={onFinish} className="text-sm font-medium text-slate-500 hover:text-primary transition-colors">
          Omitir
        </button>
      </div>

      <div className="flex-1 flex flex-col items-center justify-center px-6 relative pt-12">
        <AnimatePresence mode="wait">
          <motion.div
            key={currentSlide}
            initial={{ opacity: 0, x: 50 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -50 }}
            transition={{ duration: 0.3 }}
            className="flex flex-col items-center text-center w-full h-full justify-center"
          >
            <div className="w-full aspect-square max-w-[280px] mb-8">
              {slides[currentSlide].visual}
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white leading-tight whitespace-pre-line mb-3">
              {slides[currentSlide].title}
            </h1>
            <p className="text-sm text-slate-600 dark:text-slate-400 px-4">
              {slides[currentSlide].description}
            </p>
          </motion.div>
        </AnimatePresence>
      </div>

      <div className="w-full px-6 pb-12 pt-4 flex flex-col items-center gap-6">
        <div className="flex gap-2">
          {slides.map((_, i) => (
            <div
              key={i}
              className={`h-1.5 rounded-full transition-all duration-300 ${i === currentSlide ? 'w-8 bg-primary' : 'w-2 bg-slate-300 dark:bg-slate-700'}`}
            />
          ))}
        </div>
        <button
          onClick={nextSlide}
          className="w-full flex items-center justify-center rounded-xl h-14 bg-primary hover:bg-primary-dark text-white text-lg font-bold shadow-lg shadow-primary/20 transition-all active:scale-95"
        >
          <span>{currentSlide === slides.length - 1 ? 'Empezar ahora' : 'Siguiente'}</span>
          <ArrowRight className="ml-2 w-5 h-5" />
        </button>
      </div>
    </div>
  );
}
