import { useState, useEffect } from 'react';
import { Settings, LogOut, ChevronRight, Award, Shield, User, Globe, Moon, Lock, Mail, FileText, ArrowLeft, HelpCircle, Camera, CheckCircle2, PawPrint, Cat, Search } from 'lucide-react';
import toast from 'react-hot-toast';
import { useNavigate } from 'react-router-dom';
import Header from '../components/Header';
import { db, auth } from '../lib/firebase';
import { collection, query, where, getDocs, orderBy, updateDoc, doc, addDoc } from 'firebase/firestore';
import { updatePassword, updateProfile } from 'firebase/auth';
import { useLanguage } from '../contexts/LanguageContext';

const RURAL_AVATARS = [
  { id: 'avatar1', url: 'https://api.dicebear.com/7.x/notionists-neutral/svg?seed=Felix' },
  { id: 'avatar2', url: 'https://api.dicebear.com/7.x/notionists-neutral/svg?seed=Aneka' },
  { id: 'avatar3', url: 'https://api.dicebear.com/7.x/notionists-neutral/svg?seed=Jude' },
  { id: 'avatar4', url: 'https://api.dicebear.com/7.x/notionists-neutral/svg?seed=Avery' },
  { id: 'avatar5', url: 'https://api.dicebear.com/7.x/notionists-neutral/svg?seed=Emery' },
  { id: 'avatar6', url: 'https://api.dicebear.com/7.x/notionists-neutral/svg?seed=Brooklynn' },
];

export default function Profile({ user, setUser, onReplayOnboarding }: { user: any, setUser: any, onReplayOnboarding: () => void }) {
  const navigate = useNavigate();
  const { t, setLanguage: setAppLanguage } = useLanguage();
  const [isRedeeming, setIsRedeeming] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [reportsCount, setReportsCount] = useState(0);
  const [history, setHistory] = useState<any[]>([]);

  // Settings Modals State
  const [showPasswordChange, setShowPasswordChange] = useState(false);
  const [newName, setNewName] = useState(user?.name || '');
  const [tempAvatar, setTempAvatar] = useState(user?.avatar || '');
  const [tempLanguage, setTempLanguage] = useState(localStorage.getItem('coex5_language') || 'es');
  const [passwords, setPasswords] = useState({ current: '', new: '', confirm: '' });
  
  // Theme & Language State
  const [isDarkMode, setIsDarkMode] = useState(document.documentElement.classList.contains('dark'));

  const isAdmin = user?.role === 'admin';

  useEffect(() => {
    if (user?.id) {
      const fetchHistory = async () => {
        try {
          const reportsRef = collection(db, 'reports');
          const q = query(reportsRef, where('user_id', '==', user.id));
          const querySnapshot = await getDocs(q);
          const reports = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
          
          reports.sort((a: any, b: any) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
          
          const thirtyDaysAgo = new Date();
          thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
          const recentReports = reports.filter((r: any) => new Date(r.created_at) >= thirtyDaysAgo);
          
          setHistory(recentReports);
          setReportsCount(recentReports.length);
        } catch (error: any) {
          console.warn("Error fetching history:", error.message);
          setHistory([]);
          setReportsCount(0);
        }
      };
      fetchHistory();
    }
  }, [user?.id]);

  const userPoints = Number(user?.points) || 0;
  const progress = Math.min((userPoints / 150) * 100, 100);

  const [showRedeemConfirm, setShowRedeemConfirm] = useState(false);
  const [showRedeemSuccess, setShowRedeemSuccess] = useState(false);

  const handleRedeemClick = () => {
    if ((user?.points || 0) < 150) return;
    setShowRedeemConfirm(true);
  };

  const confirmRedeem = async () => {
    setIsRedeeming(true);
    try {
      await addDoc(collection(db, 'redemptions'), {
        user_id: user.id,
        user_name: user.name,
        contact: user.contact || user.email,
        points: 150,
        status: 'pending',
        created_at: new Date().toISOString()
      });

      const newPoints = user.points - 150;
      try {
        const userRef = doc(db, 'users', user.id);
        await updateDoc(userRef, { points: newPoints });
      } catch (firestoreError) {
        console.warn("Could not update points in Firestore, updating locally", firestoreError);
      }

      const updatedUser = { ...user, points: newPoints };
      setUser(updatedUser);
      localStorage.setItem('coex5_user', JSON.stringify(updatedUser));
      
      setShowRedeemConfirm(false);
      setShowRedeemSuccess(true);
    } catch (error) {
      console.error("Error redeeming", error);
      toast.error(t('profile.error_redeem'));
    } finally {
      setIsRedeeming(false);
    }
  };

  const handleLogout = async () => {
    try {
      await auth.signOut();
      localStorage.removeItem('coex5_user');
      setUser(null);
      navigate('/login');
    } catch (error) {
      console.error("Error signing out", error);
    }
  };

  const toggleTheme = () => {
    const newTheme = !isDarkMode;
    setIsDarkMode(newTheme);
    if (newTheme) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('coex5_theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('coex5_theme', 'light');
    }
  };

  const handleSaveAll = async () => {
    try {
      if (user.id) {
        try {
          const userRef = doc(db, 'users', user.id);
          await updateDoc(userRef, {
            name: newName,
            avatar: tempAvatar,
          });
        } catch (firestoreError) {
          console.warn("Could not update profile in Firestore, updating locally", firestoreError);
        }
      }

      if (auth.currentUser && newName !== user.name) {
        try {
          await updateProfile(auth.currentUser, { displayName: newName, photoURL: tempAvatar });
        } catch (authError) {
          console.warn("Could not update auth profile", authError);
        }
      }

      const updatedUser = { ...user, name: newName, avatar: tempAvatar };
      setUser(updatedUser);
      localStorage.setItem('coex5_user', JSON.stringify(updatedUser));
      
      setAppLanguage(tempLanguage);

      toast.success(t('profile.success_update'));
      setShowSettings(false);
    } catch (error) {
      console.error("Error saving profile", error);
      toast.error(t('profile.error_update'));
    }
  };

  const handleSavePassword = async () => {
    if (!passwords.new || !passwords.confirm) {
      toast.error(t('profile.error_password_fields'));
      return;
    }
    if (passwords.new !== passwords.confirm) {
      toast.error(t('profile.error_password_match'));
      return;
    }
    if (passwords.new.length < 6) {
      toast.error(t('profile.error_password_length'));
      return;
    }
    
    try {
      if (auth.currentUser) {
        await updatePassword(auth.currentUser, passwords.new);
        toast.success(t('profile.success_password'));
        setShowPasswordChange(false);
        setPasswords({ current: '', new: '', confirm: '' });
      } else {
        toast.error(t('profile.error_no_session'));
      }
    } catch (error) {
      console.error("Error updating password", error);
      toast.error(t('profile.error_password_update'));
    }
  };

  if (!user) return null;

  return (
    <div className="flex flex-col min-h-screen bg-background-light dark:bg-background-dark pb-24 transition-colors duration-300">
      <Header />

      <div className="p-6">
        {/* Profile Header */}
        <div className="flex flex-col items-center text-center mb-8">
          <div className="relative mb-4 group cursor-pointer" onClick={() => setShowSettings(true)}>
            <div className="h-24 w-24 rounded-full bg-slate-200 dark:bg-slate-700 flex items-center justify-center overflow-hidden border-4 border-white dark:border-background-dark shadow-xl relative">
              <img src={user.avatar?.includes('http') ? user.avatar.replace('avataaars', 'notionists-neutral') : `https://api.dicebear.com/7.x/notionists-neutral/svg?seed=${user.avatar || user.name}`} alt="Avatar" className="w-full h-full object-cover" />
              <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                <Settings className="w-6 h-6 text-white" />
              </div>
            </div>
            <div className="absolute bottom-1 right-1 h-5 w-5 rounded-full bg-green-500 border-2 border-white dark:border-background-dark"></div>
          </div>
          <h2 className="text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
            {user.name}
            {isAdmin && <span className="bg-primary/20 text-primary text-[10px] px-2 py-0.5 rounded-full uppercase tracking-wider">Admin</span>}
          </h2>
          <p className="text-slate-500 dark:text-slate-400">{user.contact || user.email}</p>
        </div>

        {/* Dynamic Points Section */}
        {!isAdmin && (
          <div className="bg-gradient-to-br from-primary to-orange-600 rounded-3xl p-6 text-white shadow-xl shadow-primary/20 mb-6 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -mr-10 -mt-10 blur-2xl"></div>
            <div className="relative z-10">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <Award className="w-6 h-6 text-yellow-300" />
                  <span className="font-bold text-lg">{t('profile.my_points')}</span>
                </div>
                <span className="text-2xl font-black">{user.points} <span className="text-sm font-medium opacity-80">/ 150</span></span>
              </div>
              
              <div className="w-full h-3 bg-black/20 rounded-full overflow-hidden mb-4 mt-4">
                <div 
                  className="h-full bg-gradient-to-r from-yellow-300 to-yellow-500 transition-all duration-1000 ease-out"
                  style={{ width: `${progress}%` }}
                ></div>
              </div>
              
              <div className="flex items-center justify-between">
                <p className="text-sm font-medium opacity-90">
                  {user.points >= 150 ? t('profile.goal_reached') : t('profile.points_missing', { points: 150 - user.points })}
                </p>
                <button 
                  onClick={handleRedeemClick}
                  disabled={user.points < 150 || isRedeeming}
                  className="bg-white text-primary px-4 py-2 rounded-xl text-sm font-bold shadow-sm hover:bg-slate-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {t('profile.redeem')}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Redeem Confirmation Modal */}
        {showRedeemConfirm && (
          <div className="fixed inset-0 z-[60] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-white dark:bg-surface-dark w-full max-w-sm rounded-3xl overflow-hidden shadow-2xl p-6 text-center">
              <div className="w-16 h-16 bg-orange-100 dark:bg-orange-500/20 text-orange-500 rounded-full flex items-center justify-center mx-auto mb-4">
                <Award className="w-8 h-8" />
              </div>
              <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-2">{t('profile.confirm_redeem_title')}</h3>
              <p className="text-sm text-slate-500 dark:text-slate-400 mb-6">
                {t('profile.confirm_redeem_desc')}
              </p>
              <div className="flex gap-3">
                <button 
                  onClick={() => setShowRedeemConfirm(false)} 
                  className="flex-1 py-3 rounded-xl text-slate-500 font-bold text-sm bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
                >
                  {t('profile.cancel')}
                </button>
                <button 
                  onClick={confirmRedeem} 
                  disabled={isRedeeming}
                  className="flex-1 py-3 rounded-xl text-white font-bold text-sm bg-primary hover:bg-primary-dark transition-colors disabled:opacity-50"
                >
                  {isRedeeming ? t('profile.processing') : t('profile.yes_redeem')}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Redeem Success Modal */}
        {showRedeemSuccess && (
          <div className="fixed inset-0 z-[60] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-white dark:bg-surface-dark w-full max-w-sm rounded-3xl overflow-hidden shadow-2xl p-6 text-center">
              <div className="w-16 h-16 bg-green-100 dark:bg-green-500/20 text-green-500 rounded-full flex items-center justify-center mx-auto mb-4">
                <Shield className="w-8 h-8" />
              </div>
              <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-2">{t('profile.request_received')}</h3>
              <p className="text-sm text-slate-500 dark:text-slate-400 mb-6">
                {t('profile.request_received_desc')}
              </p>
              <button 
                onClick={() => setShowRedeemSuccess(false)} 
                className="w-full py-3 rounded-xl text-white font-bold text-sm bg-primary hover:bg-primary-dark transition-colors"
              >
                {t('profile.understood')}
              </button>
            </div>
          </div>
        )}

        {/* Reports Stats Block */}
        {!isAdmin && (
          <button 
            onClick={() => setShowHistory(true)}
            className="w-full bg-white dark:bg-surface-dark rounded-3xl p-6 border border-slate-200 dark:border-surface-lighter shadow-sm mb-6 flex items-center justify-between hover:border-primary/50 transition-colors text-left"
          >
            <div>
              <p className="text-slate-500 dark:text-slate-400 text-sm font-medium mb-1">{t('profile.reports_30_days')}</p>
              <p className="text-3xl font-black text-slate-900 dark:text-white">{reportsCount}</p>
            </div>
            <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center text-primary">
              <FileText className="w-6 h-6" />
            </div>
          </button>
        )}

        {/* Actions */}
        <div className="space-y-3">
          <button onClick={() => setShowSettings(true)} className="w-full flex items-center justify-between p-4 bg-white dark:bg-surface-dark rounded-2xl border border-slate-200 dark:border-surface-lighter hover:border-slate-300 dark:hover:border-slate-600 transition-colors">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-slate-100 dark:bg-slate-800 rounded-lg text-slate-600 dark:text-slate-300">
                <Settings className="w-5 h-5" />
              </div>
              <span className="font-medium text-slate-900 dark:text-white">{t('profile.settings')}</span>
            </div>
            <ChevronRight className="w-5 h-5 text-slate-400" />
          </button>
          
          <button onClick={onReplayOnboarding} className="w-full flex items-center justify-between p-4 bg-white dark:bg-surface-dark rounded-2xl border border-slate-200 dark:border-surface-lighter hover:border-slate-300 dark:hover:border-slate-600 transition-colors">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-slate-100 dark:bg-slate-800 rounded-lg text-slate-600 dark:text-slate-300">
                <HelpCircle className="w-5 h-5" />
              </div>
              <span className="font-medium text-slate-900 dark:text-white">{t('profile.tutorial')}</span>
            </div>
            <ChevronRight className="w-5 h-5 text-slate-400" />
          </button>

          <button onClick={handleLogout} className="w-full flex items-center justify-between p-4 bg-white dark:bg-surface-dark rounded-2xl border border-slate-200 dark:border-surface-lighter hover:border-red-200 dark:hover:border-red-900/50 transition-colors group">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-red-50 dark:bg-red-500/10 rounded-lg text-red-500">
                <LogOut className="w-5 h-5" />
              </div>
              <span className="font-medium text-red-600 dark:text-red-500">{t('profile.logout')}</span>
            </div>
          </button>
        </div>

        {/* Support Footer */}
        <div className="mt-12 text-center">
          <p className="text-xs text-slate-500 dark:text-slate-400 flex items-center justify-center gap-1">
            <Mail className="w-3 h-3" /> {t('profile.support')}: luiscbwwf@gmail.com
          </p>
        </div>
      </div>

      {/* History Modal */}
      {showHistory && (
        <div className="fixed inset-0 z-50 bg-background-light dark:bg-background-dark flex flex-col">
          <header className="px-4 py-4 border-b border-slate-200 dark:border-surface-lighter flex items-center gap-3">
            <button onClick={() => setShowHistory(false)} className="p-2 -ml-2 rounded-full hover:bg-slate-200 dark:hover:bg-surface-dark transition-colors">
              <ArrowLeft className="w-5 h-5 text-slate-900 dark:text-white" />
            </button>
            <h1 className="text-lg font-bold text-slate-900 dark:text-white">{t('profile.history_title')}</h1>
          </header>
          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            {history.length === 0 ? (
              <p className="text-center text-slate-500 mt-10">{t('profile.no_reports')}</p>
            ) : (
              history.map(item => (
                <div key={item.id} className="bg-white dark:bg-surface-dark p-4 rounded-2xl border border-slate-200 dark:border-surface-lighter flex justify-between items-center">
                  <div>
                    <p className="font-bold text-slate-900 dark:text-white capitalize">{item.type.replace('-', ' ')}</p>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                      {new Date(item.created_at).toLocaleDateString()}
                    </p>
                  </div>
                  <div className="text-2xl text-primary">
                    {item.animal === 'jaguar' ? <PawPrint className="w-8 h-8" /> : 
                     item.animal === 'puma' ? <Cat className="w-8 h-8" /> : 
                     item.animal === 'otros' ? <Search className="w-8 h-8" /> : 
                     <HelpCircle className="w-8 h-8" />}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* Settings Modal - Unified */}
      {showSettings && (
        <div className="fixed inset-0 z-[60] bg-background-light dark:bg-background-dark flex flex-col animate-in fade-in duration-200">
          <header className="px-5 py-4 border-b border-slate-200 dark:border-surface-lighter flex items-center gap-3 bg-white dark:bg-surface-dark shrink-0">
            <button onClick={() => setShowSettings(false)} className="p-2 -ml-2 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors">
              <ArrowLeft className="w-6 h-6 text-slate-900 dark:text-white" />
            </button>
            <h1 className="text-xl font-bold text-slate-900 dark:text-white">{t('profile.edit_profile')}</h1>
          </header>
          
          <div className="flex-1 overflow-y-auto p-5 space-y-8 pb-32">
            
            {/* Avatar Section */}
            <section>
              <h3 className="text-sm font-bold text-slate-500 uppercase tracking-wider mb-4">{t('profile.avatar')}</h3>
              <div className="flex flex-col items-center">
                <div className="w-32 h-32 rounded-full bg-slate-100 dark:bg-slate-800 border-4 border-primary mb-6 overflow-hidden shadow-xl relative group">
                  <img src={(tempAvatar || user.avatar)?.replace('avataaars', 'notionists-neutral')} alt="Avatar Preview" className="w-full h-full object-cover" />
                  <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                    <Camera className="w-8 h-8 text-white" />
                  </div>
                </div>
                
                <div className="grid grid-cols-4 gap-3 w-full max-w-sm">
                  {RURAL_AVATARS.map((avatar) => (
                    <button 
                      key={avatar.id}
                      onClick={() => setTempAvatar(avatar.url)}
                      className={`aspect-square rounded-full overflow-hidden border-2 transition-all bg-slate-100 dark:bg-slate-800 relative ${tempAvatar === avatar.url ? 'border-primary ring-2 ring-primary/30 scale-110 z-10' : 'border-transparent hover:border-slate-300 dark:hover:border-slate-600 opacity-70 hover:opacity-100'}`}
                    >
                      <img src={avatar.url} alt="Avatar Option" className="w-full h-full object-cover" />
                      {tempAvatar === avatar.url && (
                        <div className="absolute inset-0 bg-primary/20 flex items-center justify-center">
                          <CheckCircle2 className="w-5 h-5 text-white drop-shadow-md" />
                        </div>
                      )}
                    </button>
                  ))}
                </div>
              </div>
            </section>

            {/* Personal Info Section */}
            <section className="space-y-4">
              <h3 className="text-sm font-bold text-slate-500 uppercase tracking-wider">{t('profile.personal_info')}</h3>
              
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-2">{t('profile.full_name')}</label>
                <div className="relative">
                  <User className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                  <input 
                    type="text" 
                    value={newName} 
                    onChange={(e) => setNewName(e.target.value)} 
                    className="w-full bg-white dark:bg-surface-dark border border-slate-200 dark:border-surface-lighter rounded-xl pl-12 pr-4 py-4 text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all shadow-sm"
                    placeholder="Tu nombre"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-2">{t('profile.contact')}</label>
                <div className="relative opacity-70">
                  <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                  <input 
                    type="text" 
                    value={user.contact || user.email} 
                    disabled
                    className="w-full bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl pl-12 pr-4 py-4 text-slate-500 dark:text-slate-400 cursor-not-allowed"
                  />
                </div>
              </div>

              {user?.contact?.includes('@') && !user?.contact?.includes('@coex5.local') && (
                <button 
                  onClick={() => setShowPasswordChange(true)}
                  className="w-full flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors group"
                >
                  <div className="flex items-center gap-3">
                    <Lock className="w-5 h-5 text-slate-400 group-hover:text-primary transition-colors" />
                    <span className="text-sm font-medium text-slate-700 dark:text-slate-300 group-hover:text-primary transition-colors">{t('profile.change_password')}</span>
                  </div>
                  <ChevronRight className="w-4 h-4 text-slate-400" />
                </button>
              )}
            </section>

            {/* Preferences Section */}
            <section className="space-y-4">
              <h3 className="text-sm font-bold text-slate-500 uppercase tracking-wider">{t('profile.preferences')}</h3>
              
              <div className="bg-white dark:bg-surface-dark rounded-2xl border border-slate-200 dark:border-surface-lighter overflow-hidden">
                <div className="p-4 flex items-center justify-between border-b border-slate-200 dark:border-surface-lighter">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-slate-100 dark:bg-slate-800 rounded-lg">
                      <Moon className="w-5 h-5 text-slate-600 dark:text-slate-300" />
                    </div>
                    <span className="font-medium text-slate-900 dark:text-white">{t('profile.dark_mode')}</span>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input type="checkbox" className="sr-only peer" checked={isDarkMode} onChange={toggleTheme} />
                    <div className="w-11 h-6 bg-slate-200 dark:bg-slate-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
                  </label>
                </div>

                <div className="p-4">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="p-2 bg-slate-100 dark:bg-slate-800 rounded-lg">
                      <Globe className="w-5 h-5 text-slate-600 dark:text-slate-300" />
                    </div>
                    <span className="font-medium text-slate-900 dark:text-white">{t('profile.language')}</span>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    {[
                      { code: 'es', name: 'Español' },
                      { code: 'en', name: 'English' },
                      { code: 'pt', name: 'Português' },
                      { code: 'qu', name: 'Quechua' },
                      { code: 'ay', name: 'Aymara' }
                    ].map((lang) => (
                      <button
                        key={lang.code}
                        onClick={() => setTempLanguage(lang.code)}
                        className={`px-3 py-2 rounded-lg text-sm font-medium transition-all flex items-center justify-between ${tempLanguage === lang.code ? 'bg-primary text-white shadow-md' : 'bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700'}`}
                      >
                        {lang.name}
                        {tempLanguage === lang.code && <CheckCircle2 className="w-3 h-3" />}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </section>
          </div>

          <div className="p-5 border-t border-slate-200 dark:border-surface-lighter bg-white dark:bg-surface-dark shrink-0 pb-10">
            <button 
              onClick={handleSaveAll}
              className="w-full bg-primary hover:bg-primary-dark text-white font-bold py-4 rounded-xl transition-all active:scale-95 shadow-lg shadow-primary/20 flex items-center justify-center gap-2"
            >
              <CheckCircle2 className="w-5 h-5" />
              {t('profile.save_changes')}
            </button>
          </div>
        </div>
      )}

      {/* Password Change Modal */}
      {showPasswordChange && (
        <div className="fixed inset-0 z-[60] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-surface-dark w-full max-w-sm rounded-3xl overflow-hidden shadow-2xl p-6">
            <h3 className="font-bold text-slate-900 dark:text-white mb-4">{t('profile.change_password')}</h3>
            <div className="space-y-3 mb-4">
              <input 
                type="password" 
                value={passwords.new} 
                onChange={(e) => setPasswords({...passwords, new: e.target.value})} 
                className="w-full bg-slate-50 dark:bg-surface-lighter border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 text-sm text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-primary"
                placeholder={t('profile.new_password')}
              />
              <input 
                type="password" 
                value={passwords.confirm} 
                onChange={(e) => setPasswords({...passwords, confirm: e.target.value})} 
                className="w-full bg-slate-50 dark:bg-surface-lighter border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 text-sm text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-primary"
                placeholder={t('profile.confirm_password')}
              />
            </div>
            <div className="flex gap-3">
              <button onClick={() => setShowPasswordChange(false)} className="flex-1 py-3 rounded-xl text-slate-500 font-bold text-sm bg-slate-100 dark:bg-slate-800">{t('profile.cancel')}</button>
              <button onClick={handleSavePassword} className="flex-1 py-3 rounded-xl text-white font-bold text-sm bg-primary hover:bg-primary-dark">{t('profile.save')}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
