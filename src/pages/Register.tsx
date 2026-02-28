import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { auth, db } from '../lib/firebase';
import { createUserWithEmailAndPassword, updateProfile } from 'firebase/auth';
import { doc, setDoc } from 'firebase/firestore';
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

export default function Register({ onLogin }: { onLogin: (user: any) => void }) {
  const [registerMethod, setRegisterMethod] = useState<'email' | 'phone'>('email');
  const [name, setName] = useState('');
  const [contact, setContact] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  
  const [countryCode, setCountryCode] = useState('+591');
  const [phoneNumber, setPhoneNumber] = useState('');

  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();

  const handleEmailRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!acceptedTerms) {
      toast.error('Debes aceptar los Términos y Condiciones para continuar.');
      return;
    }
    setIsLoading(true);
    try {
      // Create user in Firebase Auth
      const userCredential = await createUserWithEmailAndPassword(auth, contact, password);
      const firebaseUser = userCredential.user;

      // Update profile with name
      await updateProfile(firebaseUser, {
        displayName: name,
        photoURL: `https://api.dicebear.com/7.x/avataaars/svg?seed=${firebaseUser.uid}`
      });

      const userData = {
        id: firebaseUser.uid,
        name: name,
        contact: contact,
        role: 'user',
        points: 0,
        avatar: `https://api.dicebear.com/7.x/avataaars/svg?seed=${firebaseUser.uid}`,
        createdAt: new Date().toISOString()
      };

      // Save additional user data to Firestore
      await setDoc(doc(db, 'users', firebaseUser.uid), userData);

      localStorage.setItem('coex5_user', JSON.stringify(userData));
      onLogin(userData);
      toast.success('Cuenta creada exitosamente');
      navigate('/');
    } catch (error: any) {
      console.error('Registration error:', error);
      let errorMessage = 'Error al registrar';
      if (error.code === 'auth/email-already-in-use') {
        errorMessage = 'El correo ya está registrado';
      } else if (error.code === 'auth/weak-password') {
        errorMessage = 'La contraseña debe tener al menos 6 caracteres';
      } else if (error.code === 'auth/invalid-email') {
        errorMessage = 'El correo no es válido';
      }
      toast.error(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  const handlePhoneRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!acceptedTerms) {
      toast.error('Debes aceptar los Términos y Condiciones para continuar.');
      return;
    }
    if (!name.trim()) {
      toast.error('Por favor ingresa tu nombre completo');
      return;
    }
    if (!phoneNumber) {
      toast.error('Ingresa un número de teléfono válido');
      return;
    }
    setIsLoading(true);
    try {
      const fullNumber = `${countryCode}${phoneNumber.replace(/\s+/g, '')}`;
      const fakeEmail = `${fullNumber.replace('+', '')}@coex5.local`;
      
      const userCredential = await createUserWithEmailAndPassword(auth, fakeEmail, 'Coex5_Phone_Auth_2024!');
      const firebaseUser = userCredential.user;

      // Update profile with name
      await updateProfile(firebaseUser, {
        displayName: name,
        photoURL: `https://api.dicebear.com/7.x/avataaars/svg?seed=${firebaseUser.uid}`
      });

      const userData = {
        id: firebaseUser.uid,
        name: name,
        contact: fullNumber,
        role: 'user',
        points: 0,
        avatar: `https://api.dicebear.com/7.x/avataaars/svg?seed=${firebaseUser.uid}`,
        createdAt: new Date().toISOString()
      };

      // Save additional user data to Firestore
      await setDoc(doc(db, 'users', firebaseUser.uid), userData);

      localStorage.setItem('coex5_user', JSON.stringify(userData));
      onLogin(userData);
      toast.success('Cuenta creada exitosamente');
      navigate('/');
    } catch (error: any) {
      console.error(error);
      if (error.code === 'auth/email-already-in-use') {
        toast.error('Este número ya está registrado');
      } else {
        toast.error('Error al registrar número');
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex flex-col min-h-screen bg-background-dark text-white p-6">
      <div className="flex-1 flex flex-col justify-center max-w-sm mx-auto w-full">
        <div className="flex justify-center mb-8">
          <img src="https://copilot.microsoft.com/th/id/BCO.d0bf4f92-6766-431d-a514-33b392ff865c.png" alt="Coex5.0 Logo" className="h-20 w-auto object-contain" />
        </div>
        
        <h1 className="text-3xl font-bold mb-2 text-center text-primary">Crear Cuenta</h1>
        <p className="text-slate-400 text-center mb-8">Únete a la red de protección ganadera y de fauna.</p>

        <div className="flex bg-surface-dark p-1 rounded-xl mb-6">
          <button 
            onClick={() => setRegisterMethod('email')}
            className={`flex-1 py-2 text-sm font-bold rounded-lg transition-colors flex items-center justify-center gap-2 ${registerMethod === 'email' ? 'bg-surface-lighter text-primary shadow-sm' : 'text-slate-500 hover:text-slate-300'}`}
          >
            <Mail className="w-4 h-4" /> Correo
          </button>
          <button 
            onClick={() => setRegisterMethod('phone')}
            className={`flex-1 py-2 text-sm font-bold rounded-lg transition-colors flex items-center justify-center gap-2 ${registerMethod === 'phone' ? 'bg-surface-lighter text-primary shadow-sm' : 'text-slate-500 hover:text-slate-300'}`}
          >
            <Phone className="w-4 h-4" /> Teléfono
          </button>
        </div>

        {registerMethod === 'email' ? (
          <form onSubmit={handleEmailRegister} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1">Nombre Completo</label>
              <input 
                type="text" 
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full bg-surface-dark border border-surface-lighter rounded-xl px-4 py-3 text-white focus:ring-2 focus:ring-primary focus:border-transparent transition-all"
                placeholder="Ej: Juan Pérez"
                required
              />
            </div>
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

            <div className="flex items-start gap-3 mt-6 bg-surface-dark/50 p-4 rounded-xl border border-surface-lighter">
              <div className="flex items-center h-5">
                <input
                  id="terms-email"
                  type="checkbox"
                  checked={acceptedTerms}
                  onChange={(e) => setAcceptedTerms(e.target.checked)}
                  className="w-5 h-5 bg-surface-dark border-surface-lighter rounded text-primary focus:ring-primary focus:ring-offset-background-dark"
                />
              </div>
              <label htmlFor="terms-email" className="text-xs text-slate-400 leading-relaxed">
                He leído y acepto los <span className="text-primary font-semibold">Términos y Condiciones</span> y la <span className="text-primary font-semibold">Política de Privacidad</span>. Autorizo el uso de mi información exclusivamente para el registro y gestión de reportes en la plataforma Coex5.0.
              </label>
            </div>
            
            <button 
              type="submit" 
              disabled={isLoading || !acceptedTerms}
              className="w-full bg-primary hover:bg-primary-dark text-white font-bold py-3.5 rounded-xl mt-6 transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? 'Registrando...' : 'Registrarse'}
            </button>
          </form>
        ) : (
          <div className="space-y-4">
            <form onSubmit={handlePhoneRegister} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1">Nombre Completo</label>
                <input 
                  type="text" 
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full bg-surface-dark border border-surface-lighter rounded-xl px-4 py-3 text-white focus:ring-2 focus:ring-primary focus:border-transparent transition-all"
                  placeholder="Ej: Juan Pérez"
                  required
                />
              </div>
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

              <div className="flex items-start gap-3 mt-6 bg-surface-dark/50 p-4 rounded-xl border border-surface-lighter">
                <div className="flex items-center h-5">
                  <input
                    id="terms-phone"
                    type="checkbox"
                    checked={acceptedTerms}
                    onChange={(e) => setAcceptedTerms(e.target.checked)}
                    className="w-5 h-5 bg-surface-dark border-surface-lighter rounded text-primary focus:ring-primary focus:ring-offset-background-dark"
                  />
                </div>
                <label htmlFor="terms-phone" className="text-xs text-slate-400 leading-relaxed">
                  He leído y acepto los <span className="text-primary font-semibold">Términos y Condiciones</span> y la <span className="text-primary font-semibold">Política de Privacidad</span>.
                </label>
              </div>
              
              <button 
                type="submit" 
                disabled={isLoading || !phoneNumber || !acceptedTerms || !name}
                className="w-full bg-primary hover:bg-primary-dark text-white font-bold py-3.5 rounded-xl mt-6 transition-all active:scale-95 disabled:opacity-70 flex items-center justify-center gap-2"
              >
                {isLoading ? 'Registrando...' : 'Registrarse'} <ArrowRight className="w-4 h-4" />
              </button>
            </form>
          </div>
        )}

        <p className="text-center text-slate-400 mt-8 text-sm">
          ¿Ya tienes cuenta? <Link to="/login" className="text-primary font-semibold hover:underline">Inicia sesión</Link>
        </p>
      </div>
    </div>
  );
}
