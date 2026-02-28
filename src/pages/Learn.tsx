import React, { useState, useEffect } from 'react';
import { Search, BookOpen, PlayCircle, FileText, ChevronRight, ArrowLeft, Download, CheckCircle, PawPrint, Shield, Eye, AlertTriangle, Info, Map, Camera, Leaf, Zap, Heart, Share2, MessageCircle, WifiOff } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import toast from 'react-hot-toast';
import localforage from 'localforage';
import Header from '../components/Header';
import { db } from '../lib/firebase';
import { collection, getDocs, query, orderBy } from 'firebase/firestore';

// Map of available icons for groups
const iconMap: Record<string, any> = {
  paw: PawPrint,
  shield: Shield,
  eye: Eye,
  alert: AlertTriangle,
  info: Info,
  map: Map,
  camera: Camera,
  leaf: Leaf,
  zap: Zap,
  heart: Heart,
  book: BookOpen,
  file: FileText
};

export default function Learn({ user }: { user: any }) {
  const [groups, setGroups] = useState<any[]>([]);
  const [guides, setGuides] = useState<any[]>([]);
  const [savedGuides, setSavedGuides] = useState<any[]>([]);
  const [selectedGroup, setSelectedGroup] = useState<any>(null);
  const [selectedGuide, setSelectedGuide] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [showContactForm, setShowContactForm] = useState(false);
  const [contactQuery, setContactQuery] = useState('');
  const [isSendingContact, setIsSendingContact] = useState(false);

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    const fetchContent = async () => {
      try {
        const saved = await localforage.getItem('saved_guides') as any[];
        if (saved) setSavedGuides(saved);

        if (navigator.onLine) {
          // Fetch Groups
          const groupsRef = collection(db, 'groups');
          const groupsSnapshot = await getDocs(groupsRef);
          const fetchedGroups = groupsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

          // Fetch Guides
          const guidesRef = collection(db, 'guides');
          const guidesSnapshot = await getDocs(guidesRef);
          const fetchedGuides = guidesSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

          setGroups(fetchedGroups);
          setGuides(fetchedGuides);
          
          await localforage.setItem('cached_groups', fetchedGroups);
          await localforage.setItem('cached_guides', fetchedGuides);
        } else {
          const cachedGroups = await localforage.getItem('cached_groups') as any[];
          const cachedGuides = await localforage.getItem('cached_guides') as any[];
          if (cachedGroups) setGroups(cachedGroups);
          if (cachedGuides) setGuides(cachedGuides);
        }
      } catch (error) {
        console.error('Error fetching guides', error);
      } finally {
        setIsLoading(false);
      }
    };
    fetchContent();

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const handleSaveOffline = async (guide: any, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    try {
      const currentSaved = await localforage.getItem('saved_guides') as any[] || [];
      const isAlreadySaved = currentSaved.some(g => g.id === guide.id);
      
      if (isAlreadySaved) {
        const newSaved = currentSaved.filter(g => g.id !== guide.id);
        await localforage.setItem('saved_guides', newSaved);
        setSavedGuides(newSaved);
        toast.success('Eliminado de descargas');
      } else {
        const newSaved = [...currentSaved, guide];
        await localforage.setItem('saved_guides', newSaved);
        setSavedGuides(newSaved);
        toast.success('Guardado para ver sin conexión');
      }
    } catch (error) {
      toast.error('Error al guardar');
    }
  };

  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: selectedGuide.title,
          text: `Mira este artículo de Coex5.0: ${selectedGuide.title}`,
          url: window.location.href,
        });
      } catch (error) {
        console.log('Error sharing', error);
      }
    } else {
      toast.error('Tu dispositivo no soporta compartir directamente.');
    }
  };

  const handleContactSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!contactQuery.trim()) return;
    setIsSendingContact(true);
    setTimeout(() => {
      setIsSendingContact(false);
      setShowContactForm(false);
      setContactQuery('');
      toast.success('Tu consulta ha sido enviada. En las próximas horas se contactará un especialista contigo.');
    }, 1500);
  };

  const isGuideSaved = (id: string) => savedGuides.some(g => g.id === id);

  if (selectedGuide) {
    const isSaved = isGuideSaved(selectedGuide.id);
    
    return (
      <div className="flex flex-col min-h-screen bg-background-light dark:bg-background-dark pb-24">
        <header className="sticky top-0 z-40 bg-white/95 dark:bg-surface-dark/95 backdrop-blur-md border-b border-slate-200 dark:border-surface-lighter px-5 py-4 flex items-center gap-4">
          <button 
            onClick={() => setSelectedGuide(null)}
            className="p-2 -ml-2 rounded-full hover:bg-slate-100 dark:hover:bg-surface-lighter transition-colors text-slate-600 dark:text-slate-300"
          >
            <ArrowLeft className="w-6 h-6" />
          </button>
          <h1 className="text-lg font-bold text-slate-900 dark:text-white line-clamp-1 flex-1">{selectedGuide.title}</h1>
          <button 
            onClick={() => handleSaveOffline(selectedGuide)}
            className={`p-2 rounded-full transition-colors ${isSaved ? 'text-green-500 bg-green-50 dark:bg-green-500/10' : 'text-slate-400 hover:bg-slate-100 dark:hover:bg-surface-lighter'}`}
          >
            {isSaved ? <CheckCircle className="w-6 h-6" /> : <Download className="w-6 h-6" />}
          </button>
        </header>

        <main className="p-5 space-y-6">
          {!isOnline && !isSaved && (
            <div className="bg-yellow-50 dark:bg-yellow-500/10 border border-yellow-200 dark:border-yellow-500/20 rounded-xl p-4 flex items-start gap-3">
              <WifiOff className="w-5 h-5 text-yellow-600 dark:text-yellow-500 shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-bold text-yellow-800 dark:text-yellow-200">Sin conexión a Internet</p>
                <p className="text-xs text-yellow-700 dark:text-yellow-300 mt-1">Estás viendo una versión en caché. Las imágenes y videos podrían no cargar hasta que recuperes la conexión.</p>
              </div>
            </div>
          )}

          {selectedGuide.image_url && (
            <div className="w-full h-48 rounded-2xl overflow-hidden relative shadow-sm bg-slate-200 dark:bg-slate-800 flex items-center justify-center">
              {(!isOnline && !isSaved) ? (
                <div className="text-slate-400 flex flex-col items-center">
                  <WifiOff className="w-8 h-8 mb-2 opacity-50" />
                  <span className="text-xs font-medium">Imagen no disponible sin conexión</span>
                </div>
              ) : (
                <>
                  <img src={selectedGuide.image_url} alt={selectedGuide.title} className="w-full h-full object-cover" />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent"></div>
                  <div className="absolute bottom-4 left-4 right-4">
                    <span className="inline-block px-2 py-1 bg-primary text-white text-[10px] font-bold uppercase tracking-wider rounded mb-2">
                      {selectedGuide.video_url ? 'Video' : 'Artículo'} • {selectedGuide.read_time || 5} min
                    </span>
                    <h2 className="text-xl font-bold text-white leading-tight mb-1">{selectedGuide.title}</h2>
                    {selectedGuide.subtitle && (
                      <p className="text-sm text-slate-200 line-clamp-2">{selectedGuide.subtitle}</p>
                    )}
                  </div>
                </>
              )}
            </div>
          )}

          <div className="bg-white dark:bg-surface-dark rounded-2xl p-6 border border-slate-200 dark:border-surface-lighter shadow-sm">
            <div 
              className="prose dark:prose-invert prose-sm max-w-none prose-headings:font-bold prose-h2:text-primary prose-a:text-primary prose-img:rounded-xl"
              dangerouslySetInnerHTML={{ __html: selectedGuide.content }}
            />
          </div>

          {/* Action Buttons */}
          <div className="grid grid-cols-2 gap-3 pt-4">
            <button 
              onClick={handleShare}
              className="flex items-center justify-center gap-2 bg-slate-100 dark:bg-surface-lighter hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 py-3.5 rounded-xl font-bold text-sm transition-colors"
            >
              <Share2 className="w-4 h-4" /> Compartir
            </button>
            <button 
              onClick={() => setShowContactForm(true)}
              className="flex items-center justify-center gap-2 bg-primary hover:bg-primary-dark text-white py-3.5 rounded-xl font-bold text-sm transition-colors shadow-lg shadow-primary/20"
            >
              <MessageCircle className="w-4 h-4" /> Consultar
            </button>
          </div>

          {/* Contact Form Modal */}
          <AnimatePresence>
            {showContactForm && (
              <motion.div 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 20 }}
                className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4"
              >
                <div className="bg-white dark:bg-surface-dark w-full sm:max-w-md rounded-t-3xl sm:rounded-3xl overflow-hidden shadow-2xl flex flex-col max-h-[90vh]">
                  <div className="p-5 border-b border-slate-200 dark:border-surface-lighter flex items-center justify-between bg-slate-50 dark:bg-surface-lighter">
                    <h3 className="font-bold text-slate-900 dark:text-white flex items-center gap-2">
                      <MessageCircle className="w-5 h-5 text-primary" /> Contactar Especialista
                    </h3>
                    <button onClick={() => setShowContactForm(false)} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1">
                      <ArrowLeft className="w-5 h-5" />
                    </button>
                  </div>
                  <div className="p-5 overflow-y-auto">
                    <form onSubmit={handleContactSubmit} className="space-y-4">
                      <div>
                        <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">Tu Nombre</label>
                        <input type="text" value={user?.name || ''} disabled className="w-full bg-slate-100 dark:bg-background-dark border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 text-sm text-slate-500 dark:text-slate-400 cursor-not-allowed" />
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">Contacto</label>
                        <input type="text" value={user?.contact || ''} disabled className="w-full bg-slate-100 dark:bg-background-dark border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 text-sm text-slate-500 dark:text-slate-400 cursor-not-allowed" />
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">Referencia</label>
                        <input type="text" value={selectedGuide.title} disabled className="w-full bg-slate-100 dark:bg-background-dark border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 text-sm text-slate-500 dark:text-slate-400 cursor-not-allowed" />
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">¿Cuál es tu consulta?</label>
                        <textarea 
                          required
                          value={contactQuery}
                          onChange={(e) => setContactQuery(e.target.value)}
                          placeholder="Escribe tu duda aquí..."
                          className="w-full bg-white dark:bg-surface-dark border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 text-sm text-slate-900 dark:text-white focus:ring-2 focus:ring-primary focus:border-transparent outline-none min-h-[100px] resize-none"
                        />
                      </div>
                      <button 
                        type="submit" 
                        disabled={isSendingContact || !contactQuery.trim()}
                        className="w-full bg-primary hover:bg-primary-dark text-white font-bold py-3.5 rounded-xl transition-all shadow-lg shadow-primary/20 disabled:opacity-50"
                      >
                        {isSendingContact ? 'Enviando...' : 'Enviar Consulta'}
                      </button>
                    </form>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </main>
      </div>
    );
  }

  if (selectedGroup) {
    const isOfflineGroup = selectedGroup.id === 'offline';
    // Filter guides by group name (assuming group_id stores name or ID)
    const groupGuides = isOfflineGroup 
      ? savedGuides 
      : guides.filter(g => g.group === selectedGroup.name || g.group_id === selectedGroup.id);
    
    return (
      <div className="flex flex-col min-h-screen bg-background-light dark:bg-background-dark pb-24">
        <header className="sticky top-0 z-40 bg-white/95 dark:bg-surface-dark/95 backdrop-blur-md border-b border-slate-200 dark:border-surface-lighter px-5 py-4 flex items-center gap-4">
          <button 
            onClick={() => setSelectedGroup(null)}
            className="p-2 -ml-2 rounded-full hover:bg-slate-100 dark:hover:bg-surface-lighter transition-colors text-slate-600 dark:text-slate-300"
          >
            <ArrowLeft className="w-6 h-6" />
          </button>
          <h1 className="text-lg font-bold text-slate-900 dark:text-white line-clamp-1 flex-1">{selectedGroup.name || selectedGroup.title}</h1>
        </header>

        <main className="p-5 space-y-4">
          {groupGuides.length === 0 ? (
            <div className="text-center py-12 text-slate-500 dark:text-slate-400">
              <BookOpen className="w-12 h-12 mx-auto mb-4 opacity-20" />
              <p>{isOfflineGroup ? 'No tienes publicaciones guardadas.' : 'Aún no hay publicaciones en esta categoría.'}</p>
            </div>
          ) : (
            groupGuides.map(guide => {
              const isSaved = isGuideSaved(guide.id);
              return (
                <div 
                  key={guide.id}
                  onClick={() => setSelectedGuide(guide)}
                  className="bg-white dark:bg-surface-dark rounded-2xl p-4 border border-slate-200 dark:border-surface-lighter shadow-sm flex items-center gap-4 cursor-pointer hover:border-primary/50 transition-colors group relative overflow-hidden"
                >
                  {guide.image_url ? (
                    <div className="w-20 h-20 rounded-xl overflow-hidden shrink-0 bg-slate-200 dark:bg-slate-800 flex items-center justify-center">
                      {(!isOnline && !isSaved) ? (
                        <WifiOff className="w-6 h-6 text-slate-400 opacity-50" />
                      ) : (
                        <img src={guide.image_url} alt={guide.title} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" />
                      )}
                    </div>
                  ) : (
                    <div className="w-20 h-20 rounded-xl bg-slate-100 dark:bg-surface-lighter flex items-center justify-center shrink-0 text-slate-400">
                      <FileText className="w-8 h-8" />
                    </div>
                  )}
                  <div className="flex-1 pr-8">
                    <h3 className="font-bold text-slate-900 dark:text-white text-sm line-clamp-2 mb-1 group-hover:text-primary transition-colors">{guide.title}</h3>
                    {guide.subtitle && (
                      <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-1 mb-1.5">{guide.subtitle}</p>
                    )}
                    <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
                      <span className="flex items-center gap-1"><BookOpen className="w-3 h-3" /> {guide.read_time || 5} min</span>
                    </div>
                  </div>
                  
                  {/* Download Button on the right */}
                  <button 
                    onClick={(e) => handleSaveOffline(guide, e)}
                    className={`absolute right-4 top-1/2 -translate-y-1/2 p-2 rounded-full transition-all ${
                      isSaved 
                        ? 'text-green-500 bg-green-50 dark:bg-green-500/10' 
                        : 'text-slate-300 dark:text-slate-600 hover:text-primary hover:bg-primary/10'
                    }`}
                  >
                    {isSaved ? <CheckCircle className="w-5 h-5" /> : <Download className="w-5 h-5" />}
                  </button>
                </div>
              );
            })
          )}
        </main>
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-screen bg-background-light dark:bg-background-dark pb-24">
      <Header />
      <div className="px-5 py-6">
        <motion.div 
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: "easeOut" }}
          className="mb-6"
        >
          <h1 className="text-3xl font-black text-transparent bg-clip-text bg-gradient-to-r from-primary to-orange-500 leading-tight">
            Contenido de calidad<br/>de Coex5.0
          </h1>
          <p className="text-slate-500 dark:text-slate-400 text-sm mt-2">Aprende sobre prevención, rastros y normativas.</p>
        </motion.div>

        <div className="relative mb-8">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
          <input 
            type="text" 
            placeholder="Buscar guías, videos, consejos..." 
            className="w-full bg-white dark:bg-surface-dark border border-slate-200 dark:border-surface-lighter rounded-xl py-3 pl-10 pr-4 text-sm text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all shadow-sm"
          />
        </div>

        <section>
          <h2 className="text-lg font-bold text-slate-900 dark:text-white mb-4">Categorías</h2>
          {isLoading ? (
            <div className="flex justify-center py-8">
              <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-3">
              {/* Offline Category */}
              <div 
                onClick={() => setSelectedGroup({ id: 'offline', title: 'Guardados (Offline)', name: 'Guardados (Offline)' })}
                className="flex items-center justify-between p-4 bg-green-50 dark:bg-green-500/10 rounded-xl border border-green-200 dark:border-green-500/20 hover:border-green-400 transition-colors cursor-pointer group shadow-sm"
              >
                <div className="flex items-center gap-4">
                  <div className="bg-green-100 dark:bg-green-500/20 p-3 rounded-lg text-green-600 dark:text-green-400">
                    <Download className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-sm text-green-900 dark:text-green-100">Guardados (Offline)</h3>
                    <p className="text-xs text-green-700 dark:text-green-300 mt-0.5">{savedGuides.length} publicaciones</p>
                  </div>
                </div>
                <ChevronRight className="w-5 h-5 text-green-500/50 group-hover:text-green-500 transition-colors" />
              </div>

              {groups.length === 0 ? (
                <div className="text-center py-12 text-slate-500 dark:text-slate-400 bg-white dark:bg-surface-dark rounded-2xl border border-dashed border-slate-300 dark:border-slate-700 mt-4">
                  <BookOpen className="w-12 h-12 mx-auto mb-4 opacity-20" />
                  <p className="text-sm">No hay categorías disponibles por ahora.</p>
                </div>
              ) : (
                groups.map((cat) => {
                  const Icon = iconMap[cat.icon] || BookOpen;
                  const count = guides.filter(g => g.group === cat.name || g.group_id === cat.id).length;
                  return (
                    <div 
                      key={cat.id} 
                      onClick={() => setSelectedGroup(cat)}
                      className="flex items-center justify-between p-4 bg-white dark:bg-surface-dark rounded-xl border border-slate-200 dark:border-surface-lighter hover:border-primary/30 transition-colors cursor-pointer group shadow-sm"
                    >
                      <div className="flex items-center gap-4">
                        <div className="bg-slate-100 dark:bg-surface-lighter p-3 rounded-lg text-slate-500 dark:text-slate-400 group-hover:bg-primary/10 group-hover:text-primary transition-colors">
                          <Icon className="w-6 h-6" />
                        </div>
                        <div>
                          <h3 className="font-semibold text-sm text-slate-900 dark:text-white">{cat.name || cat.title}</h3>
                          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">{count} publicaciones</p>
                        </div>
                      </div>
                      <ChevronRight className="w-5 h-5 text-slate-300 dark:text-slate-600 group-hover:text-primary transition-colors" />
                    </div>
                  );
                })
              )}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
