import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { auth, db } from '../lib/firebase';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { Phone, Mail, ArrowRight, Eye, EyeOff } from 'lucide-react';

const COUNTRIES = [
  { code: '+591', name: 'Bolivia', flag: '🇧🇴' },
  { code: '+51', name: 'Perú', flag: '🇵🇪' },
  { code: '+55', name: 'Brasil', flag: '🇧🇷' },
  { code: '+57', name: 'Colombia', flag: '🇨🇴' },
  { code: '+54', name: 'Argentina', flag: '🇦🇷' },
  { code: '+56', name: 'Chile', flag: '🇨🇱' },
  { code: '+52', name: 'México', flag: '🇲🇽' },
];

export default function Login({ onLogin }: { onLogin: (user: any) => void }) {
  const [loginMethod, setLoginMethod] = useState<'email' | 'phone'>('email');
  const [contact, setContact] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  
  const [countryCode, setCountryCode] = useState('+591');
  const [phoneNumber, setPhoneNumber] = useState('');
  
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();

  const handleEmailLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      const userCredential = await signInWithEmailAndPassword(auth, contact, password);
      
      // Fetch user data from Firestore
      const userDoc = await getDoc(doc(db, 'users', userCredential.user.uid));
      let userData;
      
      if (userDoc.exists()) {
        userData = { id: userCredential.user.uid, ...userDoc.data() };
      } else {
        // Fallback if document doesn't exist for some reason
        userData = {
          id: userCredential.user.uid,
          name: userCredential.user.displayName || 'Usuario',
          contact: userCredential.user.email,
          role: 'user',
          points: 0,
          avatar: userCredential.user.photoURL || `https://api.dicebear.com/7.x/avataaars/svg?seed=${userCredential.user.uid}`
        };
      }
      
      if (userCredential.user.email === 'admin@labsnatural.com' || userCredential.user.email === 'authomia.agency@gmail.com') {
        userData.role = 'admin';
      }

      localStorage.setItem('coex5_user', JSON.stringify(userData));
      onLogin(userData);
      
      if (userData.role === 'admin') {
        navigate('/admin');
      } else {
        navigate('/');
      }
      toast.success('¡Bienvenido de nuevo!');
    } catch (error: any) {
      console.error('Login error:', error);
      let errorMessage = 'Error al iniciar sesión';
      if (error.code === 'auth/invalid-credential' || error.code === 'auth/user-not-found' || error.code === 'auth/wrong-password') {
        errorMessage = 'Correo o contraseña incorrectos';
      }
      toast.error(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  const handlePhoneLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!phoneNumber) {
      toast.error('Ingresa un número de teléfono válido');
      return;
    }
    setIsLoading(true);
    try {
      const fullNumber = `${countryCode}${phoneNumber.replace(/\s+/g, '')}`;
      const fakeEmail = `${fullNumber.replace('+', '')}@coex5.local`;
      
      // Attempt to sign in with the fake email
      const userCredential = await signInWithEmailAndPassword(auth, fakeEmail, 'Coex5_Phone_Auth_2024!');
      
      // Fetch user data from Firestore
      const userDoc = await getDoc(doc(db, 'users', userCredential.user.uid));
      let userData;
      if (userDoc.exists()) {
        userData = { id: userCredential.user.uid, ...userDoc.data() };
      } else {
        // Fallback if document doesn't exist for some reason
        userData = {
          id: userCredential.user.uid,
          name: 'Usuario',
          contact: fullNumber,
          role: 'user',
          points: 0,
          avatar: `https://api.dicebear.com/7.x/avataaars/svg?seed=${userCredential.user.uid}`
        };
      }

      localStorage.setItem('coex5_user', JSON.stringify(userData));
      onLogin(userData);
      toast.success('¡Sesión iniciada correctamente!');
      navigate('/');
    } catch (error: any) {
      console.error(error);
      toast.error('Número no registrado o incorrecto');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex flex-col min-h-screen bg-background-dark text-white p-6">
      <div className="flex-1 flex flex-col justify-center max-w-sm mx-auto w-full">
        <div className="flex justify-center mb-8">
          <img src="https://copilot.microsoft.com/th/id/BCO.d0bf4f92-6766-431d-a514-33b392ff865c.png" alt="Coex5.0 Logo" className="h-24 w-auto object-contain" />
        </div>
        
        <h1 className="text-3xl font-bold mb-2 text-center text-primary">Bienvenido</h1>
        <p className="text-slate-400 text-center mb-8">Inicia sesión para continuar protegiendo el ecosistema.</p>

        <div className="flex bg-surface-dark p-1 rounded-xl mb-6">
          <button 
            onClick={() => setLoginMethod('email')}
            className={`flex-1 py-2 text-sm font-bold rounded-lg transition-colors flex items-center justify-center gap-2 ${loginMethod === 'email' ? 'bg-surface-lighter text-primary shadow-sm' : 'text-slate-500 hover:text-slate-300'}`}
          >
            <Mail className="w-4 h-4" /> Correo
          </button>
          <button 
            onClick={() => setLoginMethod('phone')}
            className={`flex-1 py-2 text-sm font-bold rounded-lg transition-colors flex items-center justify-center gap-2 ${loginMethod === 'phone' ? 'bg-surface-lighter text-primary shadow-sm' : 'text-slate-500 hover:text-slate-300'}`}
          >
            <Phone className="w-4 h-4" /> Teléfono
          </button>
        </div>

        {loginMethod === 'email' ? (
          <form onSubmit={handleEmailLogin} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1">Correo Electrónico</label>
              <input 
                type="email" 
                value={contact}
                onChange={(e) => setContact(e.target.value)}
                className="w-full bg-surface-dark border border-surface-lighter rounded-xl px-4 py-3 text-white focus:ring-2 focus:ring-primary focus:border-transparent transition-all"
                placeholder="Ej: luiscb@gmail.com"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1">Contraseña</label>
              <div className="relative">
                <input 
                  type={showPassword ? "text" : "password"} 
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full bg-surface-dark border border-surface-lighter rounded-xl px-4 py-3 text-white focus:ring-2 focus:ring-primary focus:border-transparent transition-all pr-12"
                  placeholder="••••••••"
                  required
                />
                <button 
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200 p-1"
                >
                  {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
            </div>
            
            <button 
              type="submit" 
              disabled={isLoading}
              className="w-full bg-primary hover:bg-primary-dark text-white font-bold py-3.5 rounded-xl mt-6 transition-all active:scale-95 disabled:opacity-70 flex items-center justify-center gap-2"
            >
              {isLoading ? 'Iniciando...' : 'Iniciar Sesión'}
            </button>
          </form>
        ) : (
          <div className="space-y-4">
            <form onSubmit={handlePhoneLogin} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1">Número de Teléfono</label>
                <div className="flex gap-2">
                  <select 
                    value={countryCode}
                    onChange={(e) => setCountryCode(e.target.value)}
                    className="bg-surface-dark border border-surface-lighter rounded-xl px-3 py-3 text-white focus:ring-2 focus:ring-primary focus:border-transparent transition-all appearance-none cursor-pointer"
                  >
                    {COUNTRIES.map(c => (
                      <option key={c.code} value={c.code}>{c.flag} {c.code}</option>
                    ))}
                  </select>
                  <input 
                    type="tel" 
                    value={phoneNumber}
                    onChange={(e) => setPhoneNumber(e.target.value)}
                    className="flex-1 bg-surface-dark border border-surface-lighter rounded-xl px-4 py-3 text-white focus:ring-2 focus:ring-primary focus:border-transparent transition-all"
                    placeholder="71234567"
                    required
                  />
                </div>
              </div>
              
              <button 
                type="submit" 
                disabled={isLoading || !phoneNumber}
                className="w-full bg-primary hover:bg-primary-dark text-white font-bold py-3.5 rounded-xl mt-6 transition-all active:scale-95 disabled:opacity-70 flex items-center justify-center gap-2"
              >
                {isLoading ? 'Iniciando...' : 'Iniciar Sesión'} <ArrowRight className="w-4 h-4" />
              </button>
            </form>
          </div>
        )}

        <p className="text-center text-slate-400 mt-8 text-sm">
          ¿No tienes una cuenta? <Link to="/register" className="text-primary font-semibold hover:underline">Regístrate aquí</Link>
        </p>
      </div>
    </div>
  );
}
