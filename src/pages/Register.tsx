import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { auth, db } from '../lib/firebase';
import { createUserWithEmailAndPassword, updateProfile, signInWithPhoneNumber, ConfirmationResult, RecaptchaVerifier, EmailAuthProvider, linkWithCredential } from 'firebase/auth';
import { doc, setDoc } from 'firebase/firestore';
import { Phone, Mail, ArrowRight, CheckCircle2, Eye, EyeOff } from 'lucide-react';

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
  const [registerMethod, setRegisterMethod] = useState<'email' | 'phone'>('email');
  const [name, setName] = useState('');
  const [contact, setContact] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  
  const [countryCode, setCountryCode] = useState('+51');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [verificationCode, setVerificationCode] = useState('');
  const [confirmationResult, setConfirmationResult] = useState<ConfirmationResult | null>(null);

  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    if (!(window as any).recaptchaVerifierRegister) {
      try {
        (window as any).recaptchaVerifierRegister = new RecaptchaVerifier(auth, 'recaptcha-container-register', {
          'size': 'invisible',
          'callback': (response: any) => {
            // reCAPTCHA solved
          },
          'expired-callback': () => {
            // Response expired
          }
        });
      } catch (error) {
        console.error("Error initializing recaptcha", error);
      }
    }

    return () => {
      if ((window as any).recaptchaVerifierRegister) {
        try {
          (window as any).recaptchaVerifierRegister.clear();
          (window as any).recaptchaVerifierRegister = null;
        } catch (error) {
          console.error("Error clearing recaptcha", error);
        }
      }
    };
  }, []);

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

  const handleSendSMS = async (e: React.FormEvent) => {
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
      const appVerifier = (window as any).recaptchaVerifierRegister;
      const confirmation = await signInWithPhoneNumber(auth, fullNumber, appVerifier);
      setConfirmationResult(confirmation);
      toast.success('SMS enviado. Revisa tu teléfono.');
    } catch (error: any) {
      console.error(error);
      toast.error('Error al enviar SMS: ' + error.message);
      if ((window as any).recaptchaVerifierRegister) {
        (window as any).recaptchaVerifierRegister.render().then((widgetId: any) => {
          (window as any).grecaptcha.reset(widgetId);
        });
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerifyCode = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!confirmationResult) return;
    setIsLoading(true);
    try {
      const result = await confirmationResult.confirm(verificationCode);
      const firebaseUser = result.user;

      const fullNumber = `${countryCode}${phoneNumber.replace(/\s+/g, '')}`;
      const fakeEmail = `${fullNumber.replace('+', '')}@coex5.local`;
      const credential = EmailAuthProvider.credential(fakeEmail, 'Coex5_Phone_Auth_2024!');

      try {
        await linkWithCredential(firebaseUser, credential);
      } catch (linkError: any) {
        if (linkError.code !== 'auth/credential-already-in-use' && linkError.code !== 'auth/email-already-in-use') {
           console.error("Error linking credential", linkError);
        }
      }

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
      try {
        await setDoc(doc(db, 'users', firebaseUser.uid), userData);
      } catch (firestoreError) {
        console.warn("Could not save to Firestore, using local data", firestoreError);
      }

      localStorage.setItem('coex5_user', JSON.stringify(userData));
      onLogin(userData, true);
      toast.success('Cuenta creada exitosamente');
      navigate('/');
    } catch (error) {
      toast.error('Código incorrecto o expirado');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex flex-col min-h-screen bg-background-dark text-white p-6">
      <div id="recaptcha-container-register"></div>
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
            {!confirmationResult ? (
              <form onSubmit={handleSendSMS} className="space-y-4">
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
                      className="bg-surface-dark border border-surface-lighter rounded-xl px-2 py-3 text-white focus:ring-2 focus:ring-primary focus:border-transparent transition-all appearance-none cursor-pointer w-[100px] shrink-0 text-center"
                    >
                      {COUNTRIES.map(c => (
                        <option key={c.code} value={c.code}>{c.flag} {c.code}</option>
                      ))}
                    </select>
                    <input 
                      type="tel" 
                      value={phoneNumber}
                      onChange={(e) => setPhoneNumber(e.target.value)}
                      className="flex-1 bg-surface-dark border border-surface-lighter rounded-xl px-4 py-3 text-white focus:ring-2 focus:ring-primary focus:border-transparent transition-all min-w-0"
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
                  {isLoading ? 'Enviando...' : 'Enviar SMS de Verificación'} <ArrowRight className="w-4 h-4" />
                </button>
              </form>
            ) : (
              <form onSubmit={handleVerifyCode} className="space-y-4">
                <div className="bg-green-500/10 border border-green-500/20 p-3 rounded-xl flex items-start gap-3 mb-4">
                  <CheckCircle2 className="w-5 h-5 text-green-500 shrink-0 mt-0.5" />
                  <p className="text-sm text-green-400">SMS enviado a {countryCode} {phoneNumber}. Ingresa el código de 6 dígitos.</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-1">Código de Verificación</label>
                  <input 
                    type="text" 
                    value={verificationCode}
                    onChange={(e) => setVerificationCode(e.target.value)}
                    className="w-full bg-surface-dark border border-surface-lighter rounded-xl px-4 py-3 text-white focus:ring-2 focus:ring-primary focus:border-transparent transition-all text-center tracking-widest text-xl font-mono"
                    placeholder="123456"
                    maxLength={6}
                    required
                  />
                </div>
                <button 
                  type="submit" 
                  disabled={isLoading || verificationCode.length !== 6}
                  className="w-full bg-primary hover:bg-primary-dark text-white font-bold py-3.5 rounded-xl mt-6 transition-all active:scale-95 disabled:opacity-70"
                >
                  {isLoading ? 'Verificando...' : 'Verificar y Registrarse'}
                </button>
                <button 
                  type="button"
                  onClick={() => setConfirmationResult(null)}
                  className="w-full text-slate-400 text-sm hover:text-white transition-colors mt-2"
                >
                  Cambiar número de teléfono
                </button>
              </form>
            )}
          </div>
        )}

        <p className="text-center text-slate-400 mt-8 text-sm">
          ¿Ya tienes cuenta? <Link to="/login" className="text-primary font-semibold hover:underline">Inicia sesión</Link>
        </p>
      </div>
    </div>
  );
}
