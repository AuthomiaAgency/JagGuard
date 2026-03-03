import { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ArrowRight, WifiOff, MapPin, Camera, Star, Eye, PawPrint, Skull, CheckCircle } from 'lucide-react';
import { useLanguage } from '../contexts/LanguageContext';

export default function Onboarding({ onFinish }: { onFinish: () => void }) {
  const [currentSlide, setCurrentSlide] = useState(0);
  const { t } = useLanguage();

  const slides = [
    {
      id: 1,
      title: t('onboarding.slide3_title'),
      description: t('onboarding.slide3_desc'),
      visual: (
        <div className="relative w-full h-full bg-slate-100 dark:bg-slate-800 rounded-3xl overflow-hidden border border-slate-200 dark:border-slate-700 shadow-inner flex flex-col items-center justify-center p-6">
          <motion.div 
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="absolute top-6 right-6 flex items-center gap-2 bg-red-100 dark:bg-red-500/20 text-red-600 dark:text-red-400 px-3 py-1.5 rounded-full text-xs font-bold border border-red-200 dark:border-red-500/30"
          >
            <WifiOff className="w-3.5 h-3.5" /> {t('onboarding.offline_label')}
          </motion.div>
          
          <motion.div 
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ delay: 0.5 }}
            className="w-full bg-white dark:bg-surface-dark rounded-2xl p-5 shadow-lg border border-slate-200 dark:border-surface-lighter mt-8"
          >
            <div className="flex items-center gap-4 mb-4">
              <div className="w-10 h-10 rounded-full bg-orange-100 dark:bg-orange-500/20 flex items-center justify-center text-orange-500">
                <PawPrint className="w-5 h-5" />
              </div>
              <div className="flex-1 space-y-2">
                <div className="h-3 w-24 bg-slate-200 dark:bg-slate-700 rounded-full"></div>
                <div className="h-2 w-16 bg-slate-200 dark:bg-slate-700 rounded-full"></div>
              </div>
            </div>
            <div className="flex items-center justify-between mt-4 pt-4 border-t border-slate-100 dark:border-surface-lighter">
              <span className="text-xs font-medium text-slate-500">{t('onboarding.saved_label')}</span>
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ delay: 1, type: "spring" }}
              >
                <CheckCircle className="w-5 h-5 text-emerald-500" />
              </motion.div>
            </div>
          </motion.div>
        </div>
      )
    },
    {
      id: 3,
      title: t('onboarding.slide2_title'),
      description: t('onboarding.slide2_desc'),
      visual: (
        <div className="relative w-full h-full bg-slate-100 dark:bg-slate-800 rounded-3xl overflow-hidden border border-slate-200 dark:border-slate-700 shadow-inner">
          <div className="absolute inset-0 opacity-60 bg-[url('https://images.unsplash.com/photo-1524661135-423995f22d0b?q=80&w=400&auto=format&fit=crop')] bg-cover bg-center"></div>
          <div className="absolute inset-0 bg-black/30"></div>
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 flex flex-col items-center">
            <motion.div 
              animate={{ y: [0, -10, 0] }}
              transition={{ repeat: Infinity, duration: 2, ease: "easeInOut" }}
              className="w-16 h-16 bg-primary text-white rounded-full flex items-center justify-center shadow-xl shadow-primary/40 border-4 border-white/20"
            >
              <MapPin className="w-8 h-8" />
            </motion.div>
            <motion.div 
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5 }}
              className="mt-4 bg-white/90 dark:bg-surface-dark/90 backdrop-blur-md px-4 py-2 rounded-xl shadow-lg border border-white/20 text-xs font-mono font-bold text-slate-800 dark:text-white"
            >
              -12.0464, -77.0428
            </motion.div>
          </div>
          <motion.div 
            initial={{ y: 100 }}
            animate={{ y: 0 }}
            transition={{ delay: 0.8, type: "spring" }}
            className="absolute bottom-6 left-6 right-6 bg-white dark:bg-surface-dark p-4 rounded-2xl shadow-xl border border-slate-200 dark:border-surface-lighter flex items-center gap-4"
          >
            <div className="w-12 h-12 bg-slate-100 dark:bg-slate-800 rounded-xl flex items-center justify-center text-slate-400">
              <Camera className="w-6 h-6" />
            </div>
            <div className="flex-1 space-y-2">
              <div className="h-2.5 w-24 bg-slate-200 dark:bg-slate-700 rounded-full"></div>
              <div className="h-2 w-16 bg-slate-200 dark:bg-slate-700 rounded-full"></div>
            </div>
          </motion.div>
        </div>
      )
    },
    {
      id: 2,
      title: t('onboarding.slide1_title'),
      description: t('onboarding.slide1_desc'),
      visual: (
        <div className="relative w-full h-full bg-slate-100 dark:bg-slate-800 rounded-3xl overflow-hidden border border-slate-200 dark:border-slate-700 shadow-inner p-6 flex flex-col justify-center">
          <div className="grid grid-cols-2 gap-4">
            <motion.div 
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ delay: 0.2 }}
              className="bg-white dark:bg-surface-dark p-4 rounded-2xl border border-slate-200 dark:border-surface-lighter flex flex-col items-center gap-3 shadow-sm"
            >
              <div className="bg-blue-500/10 p-3 rounded-full text-blue-500"><Eye className="w-6 h-6" /></div>
              <div className="h-2 w-16 bg-slate-200 dark:bg-slate-700 rounded-full"></div>
            </motion.div>
            <motion.div 
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1.1, opacity: 1 }}
              transition={{ delay: 0.4, type: "spring" }}
              className="bg-white dark:bg-surface-dark p-4 rounded-2xl border border-primary/50 flex flex-col items-center gap-3 shadow-md ring-4 ring-primary/10 z-10"
            >
              <div className="bg-orange-500/10 p-3 rounded-full text-orange-500"><PawPrint className="w-6 h-6" /></div>
              <div className="h-2 w-12 bg-slate-200 dark:bg-slate-700 rounded-full"></div>
            </motion.div>
            <motion.div 
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ delay: 0.6 }}
              className="bg-white dark:bg-surface-dark p-4 rounded-2xl border border-slate-200 dark:border-surface-lighter flex flex-col items-center gap-3 shadow-sm"
            >
              <div className="bg-red-500/10 p-3 rounded-full text-red-500"><Skull className="w-6 h-6" /></div>
              <div className="h-2 w-16 bg-slate-200 dark:bg-slate-700 rounded-full"></div>
            </motion.div>
            <motion.div 
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ delay: 0.8 }}
              className="bg-white dark:bg-surface-dark p-4 rounded-2xl border border-slate-200 dark:border-surface-lighter flex flex-col items-center gap-3 shadow-sm"
            >
              <div className="bg-slate-500/10 p-3 rounded-full text-slate-500"><Camera className="w-6 h-6" /></div>
              <div className="h-2 w-14 bg-slate-200 dark:bg-slate-700 rounded-full"></div>
            </motion.div>
          </div>
          <div className="absolute inset-0 bg-gradient-to-t from-slate-100 dark:from-slate-800 via-transparent to-transparent pointer-events-none"></div>
        </div>
      )
    },
    {
      id: 4,
      title: t('onboarding.slide4_title'),
      description: t('onboarding.slide4_desc'),
      visual: (
        <div className="relative w-full h-full bg-slate-100 dark:bg-slate-800 rounded-3xl overflow-hidden border border-slate-200 dark:border-slate-700 shadow-inner p-6 flex flex-col items-center justify-center">
          <motion.div 
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.2 }}
            className="w-full bg-white dark:bg-surface-dark rounded-2xl p-6 shadow-lg border border-slate-200 dark:border-surface-lighter text-center relative overflow-hidden"
          >
            <div className="absolute top-0 left-0 w-full h-1.5 bg-gradient-to-r from-primary to-emerald-400"></div>
            <motion.div 
              animate={{ rotate: [0, 10, -10, 0] }}
              transition={{ repeat: Infinity, duration: 4, repeatDelay: 1 }}
              className="w-16 h-16 bg-emerald-100 dark:bg-emerald-500/20 text-emerald-500 rounded-full flex items-center justify-center mx-auto mb-4"
            >
              <Star className="w-8 h-8 fill-current" />
            </motion.div>
            <h3 className="text-3xl font-black text-slate-900 dark:text-white mb-2">120 <span className="text-sm text-slate-500 font-medium">{t('onboarding.points_label')}</span></h3>
            <div className="w-full bg-slate-100 dark:bg-slate-800 rounded-full h-3 mb-4 overflow-hidden">
              <motion.div 
                initial={{ width: 0 }}
                animate={{ width: '80%' }}
                transition={{ delay: 0.8, duration: 1 }}
                className="bg-emerald-500 h-3 rounded-full"
              ></motion.div>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mb-5 font-medium">
              {t('profile.redeem_missing', { points: 30 })}
            </p>
            <div className="w-full py-3 bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 rounded-xl text-xs font-bold border border-emerald-200 dark:border-emerald-500/20 uppercase tracking-wide">
              {t('onboarding.reward_label')}
            </div>
          </motion.div>
        </div>
      )
    }
  ];

  const nextSlide = () => {
    if (currentSlide === slides.length - 1) {
      onFinish();
    } else {
      setCurrentSlide(s => s + 1);
    }
  };

  return (
    <div className="flex flex-col h-screen w-full max-w-md mx-auto bg-background-light dark:bg-background-dark overflow-hidden relative">
      <div className="absolute top-4 right-6 z-20 mt-8">
        <button onClick={onFinish} className="text-sm font-medium text-slate-500 hover:text-primary transition-colors">
          {t('onboarding.skip')}
        </button>
      </div>

      <div className="flex-1 flex flex-col items-center justify-center px-6 relative pt-12">
        <AnimatePresence mode="wait">
          <motion.div
            key={currentSlide}
            initial={{ opacity: 0, x: 50 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -50 }}
            transition={{ duration: 0.4, ease: "circOut" }}
            className="flex flex-col items-center text-center w-full h-full justify-center"
          >
            <div className="w-full aspect-square max-w-[320px] mb-10">
              {slides[currentSlide].visual}
            </div>
            <h1 className="text-3xl font-black tracking-tight text-slate-900 dark:text-white leading-tight whitespace-pre-line mb-4">
              {slides[currentSlide].title}
            </h1>
            <p className="text-base text-slate-600 dark:text-slate-400 px-4 leading-relaxed">
              {slides[currentSlide].description}
            </p>
          </motion.div>
        </AnimatePresence>
      </div>

      <div className="w-full px-6 pb-12 pt-4 flex flex-col items-center gap-8">
        <div className="flex gap-3">
          {slides.map((_, i) => (
            <div
              key={i}
              className={`h-2 rounded-full transition-all duration-500 ${i === currentSlide ? 'w-10 bg-primary' : 'w-2.5 bg-slate-300 dark:bg-slate-700'}`}
            />
          ))}
        </div>
        <button
          onClick={nextSlide}
          className="w-full flex items-center justify-center rounded-2xl h-16 bg-primary hover:bg-primary-dark text-white text-lg font-bold shadow-xl shadow-primary/20 transition-all active:scale-95"
        >
          <span>{currentSlide === slides.length - 1 ? t('onboarding.start') : t('onboarding.next')}</span>
          <ArrowRight className="ml-2 w-6 h-6" />
        </button>
      </div>
    </div>
  );
}
