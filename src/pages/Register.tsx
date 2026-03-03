import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { auth, db } from '../lib/firebase';
import { createUserWithEmailAndPassword, updateProfile } from 'firebase/auth';
import { doc, setDoc } from 'firebase/firestore';
import { Phone, Mail, ArrowRight, CheckCircle2, Eye, EyeOff, User, Sun, Moon } from 'lucide-react';

const COUNTRIES = [
  { code: '+51', name: 'Perú', flag: '🇵🇪' },
  { code: '+591', name: 'Bolivia', flag: '🇧🇴' },
  { code: '+55', name: 'Brasil', flag: '🇧🇷' },
  { code: '+57', name: 'Colombia', flag: '🇨🇴' },
  { code: '+54', name: 'Argentina', flag: '🇦🇷' },
  { code: '+56', name: 'Chile', flag: '🇨🇱' },
  { code: '+52', name: 'México', flag: '🇲🇽' },
];

export default function Register({ onLogin }: { onLogin: (user: any, isNewUser?: boolean) => void }) {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  
  const [countryCode, setCountryCode] = useState('+51');
  const [phoneNumber, setPhoneNumber] = useState('');

  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isDarkMode, setIsDarkMode] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    // Check initial theme
    const savedTheme = localStorage.getItem('coex5_theme') || 'light';
    setIsDarkMode(savedTheme === 'dark');
    if (savedTheme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, []);

  const toggleTheme = () => {
    const newTheme = !isDarkMode ? 'dark' : 'light';
    setIsDarkMode(!isDarkMode);
    localStorage.setItem('coex5_theme', newTheme);
    if (newTheme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!acceptedTerms) {
      toast.error('Debes aceptar los Términos y Condiciones para continuar.');
      return;
    }
    
    if (!name.trim() || !email.trim() || !phoneNumber.trim()) {
       toast.error('Por favor completa todos los campos');
       return;
    }

    setIsLoading(true);
    try {
      // Create user in Firebase Auth with Email
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const firebaseUser = userCredential.user;

      // Update profile with name
      await updateProfile(firebaseUser, {
        displayName: name,
        photoURL: `https://api.dicebear.com/7.x/notionists-neutral/svg?seed=${firebaseUser.uid}`
      });

      const fullPhoneNumber = `${countryCode}${phoneNumber.replace(/\s+/g, '')}`;

      const userData = {
        id: firebaseUser.uid,
        name: name,
        email: email,
        phone: fullPhoneNumber,
        contact: email, // Keep for compatibility
        role: 'user',
        points: 0,
        avatar: `https://api.dicebear.com/7.x/notionists-neutral/svg?seed=${firebaseUser.uid}`,
        createdAt: new Date().toISOString()
      };

      // Save additional user data to Firestore
      try {
        await setDoc(doc(db, 'users', firebaseUser.uid), userData);
      } catch (firestoreError) {
        console.warn("Could not save to Firestore, using local data", firestoreError);
      }

      localStorage.setItem('coex5_user', JSON.stringify(userData));
      onLogin(userData, true);
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

  return (
    <div className="flex flex-col min-h-screen bg-slate-50 dark:bg-background-dark text-slate-900 dark:text-white p-6 transition-colors duration-300">
      <button 
        onClick={toggleTheme}
        className="absolute top-6 right-6 p-3 rounded-full bg-white dark:bg-surface-dark shadow-md text-slate-600 dark:text-slate-300 hover:text-primary transition-colors"
      >
        {isDarkMode ? <Sun className="w-6 h-6" /> : <Moon className="w-6 h-6" />}
      </button>

      <div className="flex-1 flex flex-col justify-center max-w-md mx-auto w-full">
        <div className="flex justify-center mb-10">
          <img src="https://copilot.microsoft.com/th/id/BCO.d0bf4f92-6766-431d-a514-33b392ff865c.png" alt="Coex5.0 Logo" className="h-28 w-auto object-contain drop-shadow-xl" />
        </div>
        
        <h1 className="text-4xl font-black mb-3 text-center text-slate-900 dark:text-white tracking-tight">Crear Cuenta</h1>
        <p className="text-slate-500 dark:text-slate-400 text-center mb-10 text-lg font-medium">Únete a la red de protección ganadera.</p>

        <form onSubmit={handleRegister} className="space-y-6 bg-white dark:bg-surface-dark p-8 rounded-[2rem] shadow-xl border border-slate-100 dark:border-surface-lighter">
          <div>
            <label className="block text-base font-bold text-slate-700 dark:text-slate-200 mb-2 ml-1">Nombre Completo</label>
            <div className="relative group">
              <User className="absolute left-4 top-1/2 -translate-y-1/2 w-6 h-6 text-slate-400 group-focus-within:text-primary transition-colors" />
              <input 
                type="text" 
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full bg-slate-50 dark:bg-black/20 border-2 border-slate-100 dark:border-surface-lighter rounded-2xl pl-12 pr-4 py-4 text-lg text-slate-900 dark:text-white placeholder:text-slate-400 focus:ring-0 focus:border-primary transition-all font-medium"
                placeholder="Tu nombre..."
                required
              />
            </div>
          </div>

          <div>
            <label className="block text-base font-bold text-slate-700 dark:text-slate-200 mb-2 ml-1">Correo Electrónico</label>
            <div className="relative group">
              <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-6 h-6 text-slate-400 group-focus-within:text-primary transition-colors" />
              <input 
                type="email" 
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full bg-slate-50 dark:bg-black/20 border-2 border-slate-100 dark:border-surface-lighter rounded-2xl pl-12 pr-4 py-4 text-lg text-slate-900 dark:text-white placeholder:text-slate-400 focus:ring-0 focus:border-primary transition-all font-medium"
                placeholder="tucorreo@email.com"
                required
              />
            </div>
          </div>

          <div>
            <label className="block text-base font-bold text-slate-700 dark:text-slate-200 mb-2 ml-1">Número de Teléfono</label>
            <div className="flex gap-3">
              <select 
                value={countryCode}
                onChange={(e) => setCountryCode(e.target.value)}
                className="bg-slate-50 dark:bg-black/20 border-2 border-slate-100 dark:border-surface-lighter rounded-2xl px-3 py-4 text-lg text-slate-900 dark:text-white focus:ring-0 focus:border-primary transition-all appearance-none cursor-pointer w-[110px] shrink-0 text-center font-medium"
              >
                {COUNTRIES.map(c => (
                  <option key={c.code} value={c.code}>{c.flag} {c.code}</option>
                ))}
              </select>
              <div className="relative flex-1 group">
                <Phone className="absolute left-4 top-1/2 -translate-y-1/2 w-6 h-6 text-slate-400 group-focus-within:text-primary transition-colors" />
                <input 
                  type="tel" 
                  value={phoneNumber}
                  onChange={(e) => setPhoneNumber(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-black/20 border-2 border-slate-100 dark:border-surface-lighter rounded-2xl pl-12 pr-4 py-4 text-lg text-slate-900 dark:text-white placeholder:text-slate-400 focus:ring-0 focus:border-primary transition-all font-medium min-w-0"
                  placeholder="999 999 999"
                  required
                />
              </div>
            </div>
            <p className="text-xs font-medium text-slate-400 mt-2 ml-1">
              * Usaremos estos datos para contactarte sobre tus reportes.
            </p>
          </div>

          <div>
            <label className="block text-base font-bold text-slate-700 dark:text-slate-200 mb-2 ml-1">Contraseña</label>
            <div className="relative group">
              <input 
                type={showPassword ? "text" : "password"} 
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full bg-slate-50 dark:bg-black/20 border-2 border-slate-100 dark:border-surface-lighter rounded-2xl pl-4 pr-12 py-4 text-lg text-slate-900 dark:text-white placeholder:text-slate-400 focus:ring-0 focus:border-primary transition-all font-medium"
                placeholder="Crea una contraseña..."
                required
              />
              <button 
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-primary p-1 transition-colors"
              >
                {showPassword ? <EyeOff className="w-6 h-6" /> : <Eye className="w-6 h-6" />}
              </button>
            </div>
          </div>

          <div className="flex items-start gap-3 mt-6 bg-slate-50 dark:bg-surface-dark/50 p-4 rounded-2xl border border-slate-100 dark:border-surface-lighter">
            <div className="flex items-center h-6">
              <input
                id="terms-email"
                type="checkbox"
                checked={acceptedTerms}
                onChange={(e) => setAcceptedTerms(e.target.checked)}
                className="w-5 h-5 bg-white dark:bg-surface-dark border-slate-300 dark:border-surface-lighter rounded text-primary focus:ring-primary focus:ring-offset-0 cursor-pointer"
              />
            </div>
            <label htmlFor="terms-email" className="text-sm text-slate-500 dark:text-slate-400 leading-relaxed cursor-pointer select-none">
              Acepto los <span className="text-primary font-bold hover:underline">Términos y Condiciones</span> y la <span className="text-primary font-bold hover:underline">Política de Privacidad</span>.
            </label>
          </div>
          
          <button 
            type="submit" 
            disabled={isLoading || !acceptedTerms}
            className="w-full bg-primary hover:bg-emerald-600 text-white font-bold text-lg py-4 rounded-2xl mt-6 transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-primary/20 hover:shadow-primary/40"
          >
            {isLoading ? 'Registrando...' : 'Crear Cuenta'}
          </button>
        </form>

        <p className="text-center text-slate-500 dark:text-slate-400 mt-10 text-base font-medium">
          ¿Ya tienes cuenta? <Link to="/login" className="text-primary font-bold hover:text-emerald-600 transition-colors ml-1">Inicia sesión</Link>
        </p>
      </div>
    </div>
  );
}
