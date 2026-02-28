import { useState, useEffect } from 'react';
import { Settings, LogOut, ChevronRight, Award, Shield, User, Globe, Moon, Lock, Mail, FileText, ArrowLeft, HelpCircle, Camera } from 'lucide-react';
import toast from 'react-hot-toast';
import { useNavigate } from 'react-router-dom';
import Header from '../components/Header';
import { db, auth } from '../lib/firebase';
import { collection, query, where, getDocs, orderBy, updateDoc, doc, addDoc } from 'firebase/firestore';
import { updatePassword, updateProfile } from 'firebase/auth';

const RURAL_AVATARS = [
  { id: 'farmer1', url: 'https://api.dicebear.com/7.x/avataaars/svg?seed=farmer1&accessories=kurt&clothes=overall&facialHair=beardMedium' },
  { id: 'farmer2', url: 'https://api.dicebear.com/7.x/avataaars/svg?seed=farmer2&accessories=round&clothes=shirtCrewNeck&top=hat' },
  { id: 'farmer3', url: 'https://api.dicebear.com/7.x/avataaars/svg?seed=farmer3&clothes=collarAndSweater&top=shortHairShortWaved' },
  { id: 'farmer4', url: 'https://api.dicebear.com/7.x/avataaars/svg?seed=farmer4&accessories=sunglasses&clothes=graphicShirt&top=hijab' },
  { id: 'farmer5', url: 'https://api.dicebear.com/7.x/avataaars/svg?seed=farmer5&clothes=hoodie&top=turban' },
  { id: 'farmer6', url: 'https://api.dicebear.com/7.x/avataaars/svg?seed=farmer6&clothes=blazerAndShirt&top=longHairStraight' },
];

export default function Profile({ user, setUser, onReplayOnboarding }: { user: any, setUser: any, onReplayOnboarding: () => void }) {
  const navigate = useNavigate();
  const [isRedeeming, setIsRedeeming] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [reportsCount, setReportsCount] = useState(0);
  const [history, setHistory] = useState<any[]>([]);

  // Settings Modals State
  const [showNameChange, setShowNameChange] = useState(false);
  const [showPasswordChange, setShowPasswordChange] = useState(false);
  const [showAvatarChange, setShowAvatarChange] = useState(false);
  const [newName, setNewName] = useState(user?.name || '');
  const [passwords, setPasswords] = useState({ current: '', new: '', confirm: '' });
  
  // Theme & Language State
  const [isDarkMode, setIsDarkMode] = useState(document.documentElement.classList.contains('dark'));
  const [language, setLanguage] = useState('es');

  const isAdmin = user?.role === 'admin';

  useEffect(() => {
    if (user?.id) {
      const fetchHistory = async () => {
        try {
          const reportsRef = collection(db, 'reports');
          // Assuming user.id is stored as user_id in reports
          const q = query(reportsRef, where('user_id', '==', user.id), orderBy('created_at', 'desc'));
          const querySnapshot = await getDocs(q);
          const reports = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
          
          // Filter for last 30 days
          const thirtyDaysAgo = new Date();
          thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
          const recentReports = reports.filter((r: any) => new Date(r.created_at) >= thirtyDaysAgo);
          
          setHistory(recentReports);
          setReportsCount(recentReports.length);
        } catch (error) {
          console.error("Error fetching history", error);
        }
      };
      fetchHistory();
    }
  }, [user?.id]);

  const progress = Math.min(((user?.points || 0) / 150) * 100, 100);

  const handleRedeem = async () => {
    if ((user?.points || 0) < 150) return;
    setIsRedeeming(true);
    try {
      // Create a redemption request in Firestore
      await addDoc(collection(db, 'redemptions'), {
        user_id: user.id,
        user_name: user.name,
        points: user.points,
        status: 'pending',
        created_at: new Date().toISOString()
      });

      // Deduct points locally and in Firestore
      const newPoints = user.points - 150;
      const userRef = doc(db, 'users', user.id);
      await updateDoc(userRef, { points: newPoints });

      const updatedUser = { ...user, points: newPoints };
      setUser(updatedUser);
      localStorage.setItem('coex5_user', JSON.stringify(updatedUser));
      
      toast.success('¡Solicitud de canje enviada! Nos contactaremos pronto.');
    } catch (error) {
      console.error("Error redeeming", error);
      toast.error('Error al canjear');
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

  const handleSaveAvatar = async (avatarUrl: string) => {
    try {
      const userRef = doc(db, 'users', user.id);
      await updateDoc(userRef, { avatar: avatarUrl });

      const updatedUser = { ...user, avatar: avatarUrl };
      setUser(updatedUser);
      localStorage.setItem('coex5_user', JSON.stringify(updatedUser));
      setShowAvatarChange(false);
      toast.success('Avatar actualizado');
    } catch (error) {
      console.error("Error updating avatar", error);
      toast.error('Error al actualizar avatar');
    }
  };

  const handleSaveName = async () => {
    if (newName.trim() === '') {
      toast.error('El nombre no puede estar vacío');
      return;
    }
    const lastChange = localStorage.getItem('coex5_name_change');
    if (lastChange) {
      const timeDiff = Date.now() - parseInt(lastChange);
      if (timeDiff < 24 * 60 * 60 * 1000) {
        toast.error('Solo puedes cambiar tu nombre una vez cada 24 horas.');
        return;
      }
    }
    
    try {
      const userRef = doc(db, 'users', user.id);
      await updateDoc(userRef, { name: newName });
      
      if (auth.currentUser) {
        await updateProfile(auth.currentUser, { displayName: newName });
      }

      const updatedUser = { ...user, name: newName };
      setUser(updatedUser);
      localStorage.setItem('coex5_user', JSON.stringify(updatedUser));
      localStorage.setItem('coex5_name_change', Date.now().toString());
      setShowNameChange(false);
      toast.success('Nombre actualizado correctamente');
    } catch (error) {
      console.error("Error updating name", error);
      toast.error('Error al actualizar nombre');
    }
  };

  const handleSavePassword = async () => {
    if (!passwords.new || !passwords.confirm) {
      toast.error('Completa los campos de nueva contraseña');
      return;
    }
    if (passwords.new !== passwords.confirm) {
      toast.error('Las contraseñas nuevas no coinciden');
      return;
    }
    if (passwords.new.length < 6) {
      toast.error('La nueva contraseña debe tener al menos 6 caracteres');
      return;
    }
    
    try {
      if (auth.currentUser) {
        await updatePassword(auth.currentUser, passwords.new);
        toast.success('Contraseña actualizada correctamente');
        setShowPasswordChange(false);
        setPasswords({ current: '', new: '', confirm: '' });
      } else {
        toast.error('No hay sesión activa para cambiar contraseña');
      }
    } catch (error) {
      console.error("Error updating password", error);
      toast.error('Error al actualizar contraseña. Es posible que debas volver a iniciar sesión.');
    }
  };

  if (!user) return null;

  return (
    <div className="flex flex-col min-h-screen bg-background-light dark:bg-background-dark pb-24 transition-colors duration-300">
      <Header />

      <div className="p-6">
        {/* Profile Header */}
        <div className="flex flex-col items-center text-center mb-8">
          <div className="relative mb-4 group cursor-pointer" onClick={() => setShowAvatarChange(true)}>
            <div className="h-24 w-24 rounded-full bg-slate-200 dark:bg-slate-700 flex items-center justify-center overflow-hidden border-4 border-white dark:border-background-dark shadow-xl relative">
              <img src={user.avatar?.includes('http') ? user.avatar : `https://api.dicebear.com/7.x/avataaars/svg?seed=${user.avatar || user.name}`} alt="Avatar" className="w-full h-full object-cover" />
              <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                <Camera className="w-6 h-6 text-white" />
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
                  <span className="font-bold text-lg">Mis Puntos</span>
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
                  {user.points >= 150 ? '¡Meta alcanzada!' : `Faltan ${150 - user.points} puntos`}
                </p>
                <button 
                  onClick={handleRedeem}
                  disabled={user.points < 150 || isRedeeming}
                  className="bg-white text-primary px-4 py-2 rounded-xl text-sm font-bold shadow-sm hover:bg-slate-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isRedeeming ? 'Procesando...' : 'Canjear'}
                </button>
              </div>
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
              <p className="text-slate-500 dark:text-slate-400 text-sm font-medium mb-1">Reportes Realizados (30 días)</p>
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
              <span className="font-medium text-slate-900 dark:text-white">Configuración</span>
            </div>
            <ChevronRight className="w-5 h-5 text-slate-400" />
          </button>
          
          <button onClick={onReplayOnboarding} className="w-full flex items-center justify-between p-4 bg-white dark:bg-surface-dark rounded-2xl border border-slate-200 dark:border-surface-lighter hover:border-slate-300 dark:hover:border-slate-600 transition-colors">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-slate-100 dark:bg-slate-800 rounded-lg text-slate-600 dark:text-slate-300">
                <HelpCircle className="w-5 h-5" />
              </div>
              <span className="font-medium text-slate-900 dark:text-white">Ver Tutorial</span>
            </div>
            <ChevronRight className="w-5 h-5 text-slate-400" />
          </button>

          <button onClick={handleLogout} className="w-full flex items-center justify-between p-4 bg-white dark:bg-surface-dark rounded-2xl border border-slate-200 dark:border-surface-lighter hover:border-red-200 dark:hover:border-red-900/50 transition-colors group">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-red-50 dark:bg-red-500/10 rounded-lg text-red-500">
                <LogOut className="w-5 h-5" />
              </div>
              <span className="font-medium text-red-600 dark:text-red-500">Cerrar Sesión</span>
            </div>
          </button>
        </div>

        {/* Support Footer */}
        <div className="mt-12 text-center">
          <p className="text-xs text-slate-500 dark:text-slate-400 flex items-center justify-center gap-1">
            <Mail className="w-3 h-3" /> Soporte: luiscbwwf@gmail.com
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
            <h1 className="text-lg font-bold text-slate-900 dark:text-white">Últimos 30 días</h1>
          </header>
          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            {history.length === 0 ? (
              <p className="text-center text-slate-500 mt-10">No hay reportes recientes.</p>
            ) : (
              history.map(item => (
                <div key={item.id} className="bg-white dark:bg-surface-dark p-4 rounded-2xl border border-slate-200 dark:border-surface-lighter flex justify-between items-center">
                  <div>
                    <p className="font-bold text-slate-900 dark:text-white capitalize">{item.type.replace('-', ' ')}</p>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                      {new Date(item.created_at).toLocaleDateString()}
                    </p>
                  </div>
                  <div className="text-2xl">{item.animal === 'jaguar' ? '🐆' : item.animal === 'puma' ? '🐈' : '🐾'}</div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* Settings Modal */}
      {showSettings && (
        <div className="fixed inset-0 z-50 bg-background-light dark:bg-background-dark flex flex-col">
          <header className="px-4 py-4 border-b border-slate-200 dark:border-surface-lighter flex items-center gap-3">
            <button onClick={() => setShowSettings(false)} className="p-2 -ml-2 rounded-full hover:bg-slate-200 dark:hover:bg-surface-dark transition-colors">
              <ArrowLeft className="w-5 h-5 text-slate-900 dark:text-white" />
            </button>
            <h1 className="text-lg font-bold text-slate-900 dark:text-white">Configuración</h1>
          </header>
          <div className="flex-1 overflow-y-auto p-4 space-y-6">
            
            <section>
              <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">Cuenta</h3>
              <div className="bg-white dark:bg-surface-dark rounded-2xl border border-slate-200 dark:border-surface-lighter overflow-hidden divide-y divide-slate-200 dark:divide-surface-lighter">
                <div onClick={() => setShowNameChange(true)} className="p-4 flex items-center justify-between cursor-pointer hover:bg-slate-50 dark:hover:bg-surface-lighter transition-colors">
                  <div className="flex items-center gap-3">
                    <User className="w-5 h-5 text-slate-400" />
                    <span className="text-sm font-medium text-slate-900 dark:text-white">Cambiar Nombre</span>
                  </div>
                  <ChevronRight className="w-4 h-4 text-slate-400" />
                </div>
                {user?.contact?.includes('@') && !user?.contact?.includes('@coex5.local') && (
                  <div onClick={() => setShowPasswordChange(true)} className="p-4 flex items-center justify-between cursor-pointer hover:bg-slate-50 dark:hover:bg-surface-lighter transition-colors">
                    <div className="flex items-center gap-3">
                      <Lock className="w-5 h-5 text-slate-400" />
                      <span className="text-sm font-medium text-slate-900 dark:text-white">Cambiar Contraseña</span>
                    </div>
                    <ChevronRight className="w-4 h-4 text-slate-400" />
                  </div>
                )}
              </div>
            </section>

            <section>
              <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">Preferencias</h3>
              <div className="bg-white dark:bg-surface-dark rounded-2xl border border-slate-200 dark:border-surface-lighter overflow-hidden divide-y divide-slate-200 dark:divide-surface-lighter">
                <div className="p-4 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Moon className="w-5 h-5 text-slate-400" />
                    <span className="text-sm font-medium text-slate-900 dark:text-white">Tema Oscuro</span>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input type="checkbox" className="sr-only peer" checked={isDarkMode} onChange={toggleTheme} />
                    <div className="w-11 h-6 bg-slate-200 dark:bg-slate-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
                  </label>
                </div>
                <div className="p-4 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Globe className="w-5 h-5 text-slate-400" />
                    <span className="text-sm font-medium text-slate-900 dark:text-white">Idioma</span>
                  </div>
                  <span className="text-sm text-slate-500">Español</span>
                </div>
              </div>
            </section>
          </div>
        </div>
      )}

      {/* Avatar Change Modal */}
      {showAvatarChange && (
        <div className="fixed inset-0 z-[60] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-surface-dark w-full max-w-md rounded-3xl overflow-hidden shadow-2xl">
            <div className="p-5 border-b border-slate-200 dark:border-surface-lighter flex items-center justify-between">
              <h3 className="font-bold text-slate-900 dark:text-white">Elige tu Avatar</h3>
              <button onClick={() => setShowAvatarChange(false)} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200">
                <ArrowLeft className="w-5 h-5" />
              </button>
            </div>
            <div className="p-5 grid grid-cols-3 gap-4">
              {RURAL_AVATARS.map((avatar) => (
                <button 
                  key={avatar.id}
                  onClick={() => handleSaveAvatar(avatar.url)}
                  className="aspect-square rounded-full overflow-hidden border-2 border-transparent hover:border-primary hover:scale-105 transition-all bg-slate-100 dark:bg-slate-800"
                >
                  <img src={avatar.url} alt="Avatar Option" className="w-full h-full object-cover" />
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Name Change Modal */}
      {showNameChange && (
        <div className="fixed inset-0 z-[60] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-surface-dark w-full max-w-sm rounded-3xl overflow-hidden shadow-2xl p-6">
            <h3 className="font-bold text-slate-900 dark:text-white mb-4">Cambiar Nombre</h3>
            <input 
              type="text" 
              value={newName} 
              onChange={(e) => setNewName(e.target.value)} 
              className="w-full bg-slate-50 dark:bg-surface-lighter border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 text-sm text-slate-900 dark:text-white mb-4 outline-none focus:ring-2 focus:ring-primary"
              placeholder="Tu nuevo nombre"
            />
            <div className="flex gap-3">
              <button onClick={() => setShowNameChange(false)} className="flex-1 py-3 rounded-xl text-slate-500 font-bold text-sm bg-slate-100 dark:bg-slate-800">Cancelar</button>
              <button onClick={handleSaveName} className="flex-1 py-3 rounded-xl text-white font-bold text-sm bg-primary hover:bg-primary-dark">Guardar</button>
            </div>
          </div>
        </div>
      )}

      {/* Password Change Modal */}
      {showPasswordChange && (
        <div className="fixed inset-0 z-[60] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-surface-dark w-full max-w-sm rounded-3xl overflow-hidden shadow-2xl p-6">
            <h3 className="font-bold text-slate-900 dark:text-white mb-4">Cambiar Contraseña</h3>
            <div className="space-y-3 mb-4">
              <input 
                type="password" 
                value={passwords.new} 
                onChange={(e) => setPasswords({...passwords, new: e.target.value})} 
                className="w-full bg-slate-50 dark:bg-surface-lighter border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 text-sm text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-primary"
                placeholder="Nueva contraseña"
              />
              <input 
                type="password" 
                value={passwords.confirm} 
                onChange={(e) => setPasswords({...passwords, confirm: e.target.value})} 
                className="w-full bg-slate-50 dark:bg-surface-lighter border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 text-sm text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-primary"
                placeholder="Confirmar nueva contraseña"
              />
            </div>
            <div className="flex gap-3">
              <button onClick={() => setShowPasswordChange(false)} className="flex-1 py-3 rounded-xl text-slate-500 font-bold text-sm bg-slate-100 dark:bg-slate-800">Cancelar</button>
              <button onClick={handleSavePassword} className="flex-1 py-3 rounded-xl text-white font-bold text-sm bg-primary hover:bg-primary-dark">Guardar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
