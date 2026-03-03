import React, { useState, useEffect } from 'react';
import { Search, BookOpen, PlayCircle, FileText, ChevronRight, ArrowLeft, Download, CheckCircle, PawPrint, Shield, Eye, AlertTriangle, Info, Map, Camera, Leaf, Zap, Heart, Share2, MessageCircle, WifiOff, X, ExternalLink, Play, Video } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import toast from 'react-hot-toast';
import localforage from 'localforage';
import Header from '../components/Header';
import { db } from '../lib/firebase';
import { collection, getDocs, query, orderBy, addDoc } from 'firebase/firestore';
import { useLanguage } from '../contexts/LanguageContext';

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
  const { t } = useLanguage();
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
      } catch (error: any) {
        console.warn('Error fetching guides:', error.message);
        setGroups([]);
        setGuides([]);
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
        toast.success(t('learn.removed_success'));
      } else {
        const newSaved = [...currentSaved, guide];
        await localforage.setItem('saved_guides', newSaved);
        setSavedGuides(newSaved);
        toast.success(t('learn.saved_success'));
      }
    } catch (error) {
      toast.error('Error');
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

  const handleContactSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!contactQuery.trim()) return;
    setIsSendingContact(true);
    
    try {
      if (isOnline) {
        await addDoc(collection(db, 'messages'), {
          user_id: user.id || 'anonymous',
          user_name: user.name || 'Usuario',
          user_contact: user.contact || user.email || 'Sin contacto',
          reference: selectedGuide.title,
          message: contactQuery,
          status: 'unread',
          created_at: new Date().toISOString()
        });
        toast.success('Tu consulta ha sido enviada. En las próximas horas se contactará un especialista contigo.');
      } else {
        // Save offline
        const offlineMessages = await localforage.getItem('offline_messages') as any[] || [];
        offlineMessages.push({
          user_id: user.id || 'anonymous',
          user_name: user.name || 'Usuario',
          user_contact: user.contact || user.email || 'Sin contacto',
          reference: selectedGuide.title,
          message: contactQuery,
          status: 'unread',
          created_at: new Date().toISOString()
        });
        await localforage.setItem('offline_messages', offlineMessages);
        toast.success('Consulta guardada sin conexión. Se enviará cuando recuperes la señal.');
      }
      
      setShowContactForm(false);
      setContactQuery('');
    } catch (error) {
      console.error("Error sending message", error);
      toast.error('Error al enviar la consulta. Intenta nuevamente.');
    } finally {
      setIsSendingContact(false);
    }
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
              className="prose-custom mb-8"
              dangerouslySetInnerHTML={{ __html: selectedGuide.content }}
            />
            
            {(selectedGuide.video_url || selectedGuide.image_url || (selectedGuide.files && selectedGuide.files.length > 0)) && (
              <div className="space-y-6 mt-10 pt-10 border-t border-slate-100 dark:border-slate-800">
                <h3 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <BookOpen className="w-5 h-5 text-primary" /> {t('learn.attachments')}
                </h3>
                
                <div className="grid grid-cols-1 gap-4">
                  {/* Video Resource */}
                  {selectedGuide.video_url && (
                    <div className="bg-slate-50 dark:bg-surface-lighter rounded-2xl overflow-hidden border border-slate-200 dark:border-slate-700 group">
                      <div className="aspect-video bg-black flex items-center justify-center relative">
                        <Video className="w-12 h-12 text-white/20" />
                        <div className="absolute inset-0 flex items-center justify-center bg-black/40 group-hover:bg-black/20 transition-colors">
                          <div className="w-14 h-14 bg-primary text-white rounded-full flex items-center justify-center shadow-xl shadow-primary/30 transform group-hover:scale-110 transition-transform">
                            <Play className="w-6 h-6 fill-current" />
                          </div>
                        </div>
                      </div>
                      <div className="p-4 flex items-center justify-between">
                        <div>
                          <p className="font-bold text-slate-900 dark:text-white text-sm">{t('learn.video')}</p>
                          <p className="text-xs text-slate-500 truncate max-w-[200px]">{selectedGuide.video_url}</p>
                        </div>
                        <a 
                          href={selectedGuide.video_url} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="bg-white dark:bg-surface-dark p-2 rounded-lg shadow-sm border border-slate-200 dark:border-slate-700 text-primary"
                        >
                          <ExternalLink className="w-4 h-4" />
                        </a>
                      </div>
                    </div>
                  )}

                  {/* Files Resources */}
                  {selectedGuide.files?.map((file: any, index: number) => (
                    <a 
                      key={index}
                      href={file.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-4 p-4 bg-white dark:bg-surface-lighter rounded-2xl border border-slate-200 dark:border-slate-700 hover:border-primary transition-all hover:shadow-md group"
                    >
                      <div className="w-12 h-12 bg-blue-50 dark:bg-blue-500/10 rounded-xl flex items-center justify-center text-blue-600 dark:text-blue-400 group-hover:scale-110 transition-transform">
                        <FileText className="w-6 h-6" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-bold text-slate-900 dark:text-white text-sm truncate">{file.name || `${t('learn.file')} ${index + 1}`}</p>
                        <p className="text-[10px] text-slate-500 uppercase tracking-widest font-bold">{file.type || 'PDF / DOC'}</p>
                      </div>
                      <div className="w-8 h-8 rounded-full bg-slate-50 dark:bg-surface-dark flex items-center justify-center text-slate-400 group-hover:text-primary transition-colors">
                        <Download className="w-4 h-4" />
                      </div>
                    </a>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Action Buttons */}
          <div className="grid grid-cols-2 gap-4 p-6 pt-0">
            <button 
              onClick={handleShare}
              className="flex items-center justify-center gap-2 bg-slate-100 dark:bg-surface-lighter hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 py-4 rounded-2xl font-bold text-sm transition-all active:scale-95"
            >
              <Share2 className="w-4 h-4" /> {t('learn.share')}
            </button>
            <button 
              onClick={() => setShowContactForm(true)}
              className="flex items-center justify-center gap-2 bg-primary hover:bg-primary-dark text-white py-4 rounded-2xl font-bold text-sm transition-all shadow-lg shadow-primary/20 active:scale-95"
            >
              <MessageCircle className="w-4 h-4" /> {t('learn.consult')}
            </button>
          </div>

          {/* Contact Form Modal */}
          <AnimatePresence>
            {showContactForm && (
              <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 z-[100] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4"
              >
                <motion.div 
                  initial={{ scale: 0.9, opacity: 0, y: 20 }}
                  animate={{ scale: 1, opacity: 1, y: 0 }}
                  exit={{ scale: 0.9, opacity: 0, y: 20 }}
                  className="bg-white dark:bg-surface-dark w-full max-w-md rounded-[32px] overflow-hidden shadow-2xl flex flex-col max-h-[90vh]"
                >
                  <div className="p-6 border-b border-slate-100 dark:border-surface-lighter flex items-center justify-between">
                    <h3 className="font-bold text-slate-900 dark:text-white flex items-center gap-2 text-lg">
                      <MessageCircle className="w-6 h-6 text-primary" /> {t('learn.contact_specialist')}
                    </h3>
                    <button onClick={() => setShowContactForm(false)} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-2 rounded-full hover:bg-slate-100 dark:hover:bg-surface-lighter transition-colors">
                      <X className="w-6 h-6" />
                    </button>
                  </div>
                  <div className="p-6 overflow-y-auto no-scrollbar pb-10">
                    <form onSubmit={handleContactSubmit} className="space-y-5">
                      <div>
                        <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em] mb-2">{t('learn.your_name')}</label>
                        <input type="text" value={user?.name || ''} disabled className="w-full bg-slate-50 dark:bg-background-dark border border-slate-200 dark:border-slate-700 rounded-2xl px-5 py-4 text-sm text-slate-500 dark:text-slate-400 cursor-not-allowed font-medium" />
                      </div>
                      <div>
                        <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em] mb-2">{t('learn.contact_info')}</label>
                        <input type="text" value={user?.contact || ''} disabled className="w-full bg-slate-50 dark:bg-background-dark border border-slate-200 dark:border-slate-700 rounded-2xl px-5 py-4 text-sm text-slate-500 dark:text-slate-400 cursor-not-allowed font-medium" />
                      </div>
                      <div>
                        <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em] mb-2">{t('learn.reference')}</label>
                        <div className="w-full bg-slate-50 dark:bg-background-dark border border-slate-200 dark:border-slate-700 rounded-2xl px-5 py-4 text-sm text-slate-500 dark:text-slate-400 font-medium truncate">
                          {selectedGuide.title}
                        </div>
                      </div>
                      <div>
                        <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em] mb-2">{t('learn.query_label')}</label>
                        <textarea 
                          required
                          value={contactQuery}
                          onChange={(e) => setContactQuery(e.target.value)}
                          placeholder={t('learn.query_placeholder')}
                          className="w-full bg-white dark:bg-surface-dark border border-slate-200 dark:border-slate-700 rounded-2xl px-5 py-4 text-sm text-slate-900 dark:text-white focus:ring-2 focus:ring-primary focus:border-transparent outline-none min-h-[120px] resize-none transition-all"
                        />
                      </div>
                      <button 
                        type="submit" 
                        disabled={isSendingContact || !contactQuery.trim()}
                        className="w-full bg-primary hover:bg-primary-dark text-white font-black py-4 rounded-2xl transition-all shadow-xl shadow-primary/30 disabled:opacity-50 active:scale-[0.98] mt-2"
                      >
                        {isSendingContact ? t('learn.sending') : t('learn.send_query')}
                      </button>
                    </form>
                  </div>
                </motion.div>
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
              <p>{isOfflineGroup ? t('learn.no_saved') : t('learn.no_guides')}</p>
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
                      <span className="flex items-center gap-1"><BookOpen className="w-3 h-3" /> {t('learn.read_time', { time: guide.read_time || 5 })}</span>
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
          <h1 className="text-3xl font-black text-transparent bg-clip-text bg-gradient-to-r from-primary to-emerald-400 leading-tight">
            {t('learn.title')}
          </h1>
          <p className="text-slate-500 dark:text-slate-400 text-sm mt-2">{t('learn.subtitle')}</p>
        </motion.div>

        <div className="relative mb-8">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
          <input 
            type="text" 
            placeholder={t('learn.search_placeholder')} 
            className="w-full bg-white dark:bg-surface-dark border border-slate-200 dark:border-surface-lighter rounded-xl py-3 pl-10 pr-4 text-sm text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all shadow-sm"
          />
        </div>

        <section>
          <h2 className="text-lg font-bold text-slate-900 dark:text-white mb-4">{t('learn.categories')}</h2>
          {isLoading ? (
            <div className="flex justify-center py-8">
              <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-3">
              {/* Offline Category */}
              <div 
                onClick={() => setSelectedGroup({ id: 'offline', title: t('learn.saved_offline'), name: t('learn.saved_offline') })}
                className="flex items-center justify-between p-4 bg-green-50 dark:bg-green-500/10 rounded-xl border border-green-200 dark:border-green-500/20 hover:border-green-400 transition-colors cursor-pointer group shadow-sm"
              >
                <div className="flex items-center gap-4">
                  <div className="bg-green-100 dark:bg-green-500/20 p-3 rounded-lg text-green-600 dark:text-green-400">
                    <Download className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-sm text-green-900 dark:text-green-100">{t('learn.saved_offline')}</h3>
                    <p className="text-xs text-green-700 dark:text-green-300 mt-0.5">{t('learn.saved_count', { count: savedGuides.length })}</p>
                  </div>
                </div>
                <ChevronRight className="w-5 h-5 text-green-500/50 group-hover:text-green-500 transition-colors" />
              </div>

              {groups.length === 0 ? (
                <div className="text-center py-12 text-slate-500 dark:text-slate-400 bg-white dark:bg-surface-dark rounded-2xl border border-dashed border-slate-300 dark:border-slate-700 mt-4">
                  <BookOpen className="w-12 h-12 mx-auto mb-4 opacity-20" />
                  <p className="text-sm">{t('learn.no_guides')}</p>
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
