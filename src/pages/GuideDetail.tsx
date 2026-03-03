import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { ArrowLeft, Download, CheckCircle, WifiOff, BookOpen, Video, Play, ExternalLink, FileText, Share2, MessageCircle, X, User, LogIn } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import toast from 'react-hot-toast';
import localforage from 'localforage';
import { db } from '../lib/firebase';
import { doc, getDoc, collection, addDoc } from 'firebase/firestore';
import { useLanguage } from '../contexts/LanguageContext';
import Header from '../components/Header';

export default function GuideDetail({ user }: { user: any }) {
  const { guideId } = useParams();
  const navigate = useNavigate();
  const { t } = useLanguage();
  
  const [guide, setGuide] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [isSaved, setIsSaved] = useState(false);
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  
  const [showContactForm, setShowContactForm] = useState(false);
  const [contactQuery, setContactQuery] = useState('');
  const [isSendingContact, setIsSendingContact] = useState(false);

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    const fetchGuide = async () => {
      if (!guideId) return;

      try {
        // 1. Check if saved offline first
        const savedGuides = await localforage.getItem('saved_guides') as any[] || [];
        const savedGuide = savedGuides.find(g => g.id === guideId);
        
        if (savedGuide) {
          setGuide(savedGuide);
          setIsSaved(true);
          setLoading(false);
          return;
        }

        // 2. If not saved, try to fetch from Firestore if online
        if (navigator.onLine) {
          const docRef = doc(db, 'guides', guideId);
          const docSnap = await getDoc(docRef);
          
          if (docSnap.exists()) {
            setGuide({ id: docSnap.id, ...docSnap.data() });
          } else {
            toast.error('Guía no encontrada');
            navigate('/learn');
          }
        } else {
          // 3. If offline and not saved, try to find in cached_guides
          const cachedGuides = await localforage.getItem('cached_guides') as any[] || [];
          const cachedGuide = cachedGuides.find(g => g.id === guideId);
          
          if (cachedGuide) {
            setGuide(cachedGuide);
          } else {
            toast.error('No se puede cargar la guía sin conexión');
          }
        }
      } catch (error) {
        console.error('Error fetching guide:', error);
        toast.error('Error al cargar la guía');
      } finally {
        setLoading(false);
      }
    };

    fetchGuide();

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [guideId, navigate]);

  const handleSaveOffline = async () => {
    if (!guide) return;
    
    try {
      const currentSaved = await localforage.getItem('saved_guides') as any[] || [];
      
      if (isSaved) {
        const newSaved = currentSaved.filter(g => g.id !== guide.id);
        await localforage.setItem('saved_guides', newSaved);
        setIsSaved(false);
        toast.success(t('learn.removed_success'));
      } else {
        const newSaved = [...currentSaved, guide];
        await localforage.setItem('saved_guides', newSaved);
        setIsSaved(true);
        toast.success(t('learn.saved_success'));
      }
    } catch (error) {
      toast.error('Error al guardar');
    }
  };

  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: guide.title,
          text: `Mira este artículo de Coex5.0: ${guide.title}`,
          url: window.location.href,
        });
      } catch (error) {
        console.log('Error sharing', error);
      }
    } else {
      // Fallback to clipboard
      navigator.clipboard.writeText(window.location.href);
      toast.success('Enlace copiado al portapapeles');
    }
  };

  const handleContactSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) {
      toast.error('Debes iniciar sesión para contactar a un especialista');
      navigate('/login');
      return;
    }
    
    if (!contactQuery.trim()) return;
    setIsSendingContact(true);
    
    try {
      if (isOnline) {
        await addDoc(collection(db, 'messages'), {
          user_id: user.id || 'anonymous',
          user_name: user.name || 'Usuario',
          user_contact: user.contact || user.email || 'Sin contacto',
          reference: guide.title,
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
          reference: guide.title,
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

  if (loading) {
    return <div className="min-h-screen bg-background-light dark:bg-background-dark flex items-center justify-center text-primary">Cargando...</div>;
  }

  if (!guide) {
    return <div className="min-h-screen bg-background-light dark:bg-background-dark flex items-center justify-center text-slate-500">Guía no encontrada</div>;
  }

  return (
    <div className="flex flex-col min-h-screen bg-background-light dark:bg-background-dark pb-24">
      {/* Custom Header for Guide Detail */}
      <header className="sticky top-0 z-40 bg-white/95 dark:bg-surface-dark/95 backdrop-blur-md border-b border-slate-200 dark:border-surface-lighter px-5 py-4 flex items-center gap-4">
        <button 
          onClick={() => navigate(-1)}
          className="p-2 -ml-2 rounded-full hover:bg-slate-100 dark:hover:bg-surface-lighter transition-colors text-slate-600 dark:text-slate-300"
        >
          <ArrowLeft className="w-6 h-6" />
        </button>
        <h1 className="text-lg font-bold text-slate-900 dark:text-white line-clamp-1 flex-1">{guide.title}</h1>
        
        {!user ? (
          <Link to="/login" className="text-sm font-bold text-primary hover:underline flex items-center gap-1">
            <LogIn className="w-4 h-4" /> Ingresar
          </Link>
        ) : (
          <button 
            onClick={handleSaveOffline}
            className={`p-2 rounded-full transition-colors ${isSaved ? 'text-green-500 bg-green-50 dark:bg-green-500/10' : 'text-slate-400 hover:bg-slate-100 dark:hover:bg-surface-lighter'}`}
          >
            {isSaved ? <CheckCircle className="w-6 h-6" /> : <Download className="w-6 h-6" />}
          </button>
        )}
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

        {guide.image_url && (
          <div className="w-full h-48 rounded-2xl overflow-hidden relative shadow-sm bg-slate-200 dark:bg-slate-800 flex items-center justify-center">
            {(!isOnline && !isSaved) ? (
              <div className="text-slate-400 flex flex-col items-center">
                <WifiOff className="w-8 h-8 mb-2 opacity-50" />
                <span className="text-xs font-medium">Imagen no disponible sin conexión</span>
              </div>
            ) : (
              <>
                <img src={guide.image_url} alt={guide.title} className="w-full h-full object-cover" />
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent"></div>
                <div className="absolute bottom-4 left-4 right-4">
                  <span className="inline-block px-2 py-1 bg-primary text-white text-[10px] font-bold uppercase tracking-wider rounded mb-2">
                    {guide.video_url ? 'Video' : 'Artículo'} • {guide.read_time || 5} min
                  </span>
                  <h2 className="text-xl font-bold text-white leading-tight mb-1">{guide.title}</h2>
                  {guide.subtitle && (
                    <p className="text-sm text-slate-200 line-clamp-2">{guide.subtitle}</p>
                  )}
                </div>
              </>
            )}
          </div>
        )}

        <div className="bg-white dark:bg-surface-dark rounded-2xl p-6 border border-slate-200 dark:border-surface-lighter shadow-sm">
          <div 
            className="prose-custom mb-8"
            dangerouslySetInnerHTML={{ __html: guide.content }}
          />
          
          {(guide.video_url || guide.image_url || (guide.files && guide.files.length > 0)) && (
            <div className="space-y-6 mt-10 pt-10 border-t border-slate-100 dark:border-slate-800">
              <h3 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <BookOpen className="w-5 h-5 text-primary" /> {t('learn.attachments')}
              </h3>
              
              <div className="grid grid-cols-1 gap-4">
                {/* Video Resource */}
                {guide.video_url && (
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
                        <p className="text-xs text-slate-500 truncate max-w-[200px]">{guide.video_url}</p>
                      </div>
                      <a 
                        href={guide.video_url} 
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
                {guide.files?.map((file: any, index: number) => (
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
            onClick={() => {
              if (!user) {
                toast.error('Inicia sesión para consultar');
                navigate('/login');
              } else {
                setShowContactForm(true);
              }
            }}
            className="flex items-center justify-center gap-2 bg-primary hover:bg-primary-dark text-white py-4 rounded-2xl font-bold text-sm transition-all shadow-lg shadow-primary/20 active:scale-95"
          >
            <MessageCircle className="w-4 h-4" /> {t('learn.consult')}
          </button>
        </div>

        {/* Contact Form Modal */}
        <AnimatePresence>
          {showContactForm && user && (
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
                        {guide.title}
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
