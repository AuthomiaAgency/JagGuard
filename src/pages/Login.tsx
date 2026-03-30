import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { auth, db } from '../lib/firebase';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { doc, getDoc, collection, query, where, getDocs } from 'firebase/firestore';
import { Mail, ArrowRight, Eye, EyeOff, User, Sun, Moon, Phone } from 'lucide-react';

export default function Login({ onLogin }: { onLogin: (user: any, isNewUser?: boolean) => void }) {
  const [input, setInput] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
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

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    
    let emailToUse = input.trim();
    const isPhone = /^[0-9+]+$/.test(emailToUse); // Simple check: only digits and +

    if (isPhone) {
      try {
        const usersRef = collection(db, "users");
        // Try to find user by phone
        // 1. Exact match (e.g. +51999999999)
        let q = query(usersRef, where("phone", "==", emailToUse));
        let querySnapshot = await getDocs(q);

        // 2. If not found and no +, try adding +51 (Peru default)
        if (querySnapshot.empty && !emailToUse.startsWith('+')) {
           q = query(usersRef, where("phone", "==", `+51${emailToUse}`));
           querySnapshot = await getDocs(q);
        }
        
        // 3. If still not found, maybe check the old 'contact' field if it was a phone number
        if (querySnapshot.empty) {
           q = query(usersRef, where("contact", "==", emailToUse));
           querySnapshot = await getDocs(q);
        }

        if (!querySnapshot.empty) {
          const userDoc = querySnapshot.docs[0].data();
          if (userDoc.email) {
            emailToUse = userDoc.email;
          } else if (userDoc.contact && userDoc.contact.includes('@')) {
             emailToUse = userDoc.contact;
          } else {
             // Fallback for old phone-only auth users who might have a fake email constructed
             // If we can't find an email field, we might need to reconstruct the fake email
             // But usually we stored it in 'contact' or 'email' in the past?
             // In the old code: `fakeEmail = ${fullNumber.replace('+', '')}@coex5.local`
             // Let's try to construct it if we found the user but no email field.
             const phone = userDoc.phone || userDoc.contact;
             if (phone) {
                emailToUse = `${phone.replace('+', '')}@coex5.local`;
             }
          }
        } else {
           // Phone not found in Firestore. 
           // It might be a legacy user who is in Auth but not Firestore (unlikely given the app flow).
           // Or simply invalid number.
           // We will proceed with the input as is, maybe Auth handles it (unlikely for phone number in email field).
           // But let's try constructing the fake email just in case it's a legacy phone auth user
           // who hasn't been migrated or found.
           if (!emailToUse.includes('@')) {
               // Assume it might be a legacy phone login attempt
               // Try to format it.
               let phoneClean = emailToUse.replace('+', '');
               if (!emailToUse.startsWith('+') && emailToUse.length === 9) {
                   phoneClean = `51${emailToUse}`; // Default Peru
               }
               emailToUse = `${phoneClean}@coex5.local`;
           }
        }
      } catch (err) {
        console.error("Error searching user by phone", err);
        // Continue and try to login with input as email, or fail.
      }
    }

    try {
      const userCredential = await signInWithEmailAndPassword(auth, emailToUse, password);
      
      // Fetch user data from Firestore
      let userData;
      try {
        const userDoc = await getDoc(doc(db, 'users', userCredential.user.uid));
        if (userDoc.exists()) {
          userData = { id: userCredential.user.uid, ...userDoc.data() };
        } else {
          throw new Error("Document does not exist");
        }
      } catch (firestoreError) {
        console.warn("Firestore read failed, using fallback data", firestoreError);
        userData = {
          id: userCredential.user.uid,
          name: userCredential.user.displayName || 'Usuario',
          contact: userCredential.user.email,
          role: 'user',
          points: 0,
          avatar: userCredential.user.photoURL || `https://api.dicebear.com/7.x/notionists-neutral/svg?seed=${userCredential.user.uid}`
        };
      }
      
      const adminEmails = [
        'admin@labsnatural.com',
        'authomia.agency@gmail.com',
        'usuario@gmail.com',
        'luiseduardocerron.ec@gmail.com',
        'cerronbarrial@gmail.com'
      ];

      if (userCredential.user.email && adminEmails.includes(userCredential.user.email.toLowerCase())) {
        userData.role = 'admin';
        // Force update the role in Firestore so the user is truly an admin in the database
        try {
          const { setDoc } = await import('firebase/firestore');
          await setDoc(doc(db, 'users', userCredential.user.uid), { role: 'admin' }, { merge: true });
        } catch (e) {
          console.error("Could not update admin role in Firestore", e);
        }
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
      if (error.code === 'auth/invalid-credential' || error.code === 'auth/user-not-found' || error.code === 'auth/wrong-password' || error.code === 'auth/invalid-email') {
        errorMessage = 'Credenciales incorrectas. Verifica tu correo/teléfono y contraseña.';
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
        
        <h1 className="text-4xl font-black mb-3 text-center text-slate-900 dark:text-white tracking-tight">Bienvenido</h1>
        <p className="text-slate-500 dark:text-slate-400 text-center mb-10 text-lg font-medium">Inicia sesión para continuar.</p>

        <form onSubmit={handleLogin} className="space-y-6 bg-white dark:bg-surface-dark p-8 rounded-[2rem] shadow-xl border border-slate-100 dark:border-surface-lighter">
          <div>
            <label className="block text-base font-bold text-slate-700 dark:text-slate-200 mb-2 ml-1">Correo o Teléfono</label>
            <div className="relative group">
              <User className="absolute left-4 top-1/2 -translate-y-1/2 w-6 h-6 text-slate-400 group-focus-within:text-primary transition-colors" />
              <input 
                type="text" 
                value={input}
                onChange={(e) => setInput(e.target.value)}
                className="w-full bg-slate-50 dark:bg-black/20 border-2 border-slate-100 dark:border-surface-lighter rounded-2xl pl-12 pr-4 py-4 text-lg text-slate-900 dark:text-white placeholder:text-slate-400 focus:ring-0 focus:border-primary transition-all font-medium"
                placeholder="Ingresa tu usuario..."
                required
              />
            </div>
          </div>
          <div>
            <label className="block text-base font-bold text-slate-700 dark:text-slate-200 mb-2 ml-1">Contraseña</label>
            <div className="relative group">
              <input 
                type={showPassword ? "text" : "password"} 
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full bg-slate-50 dark:bg-black/20 border-2 border-slate-100 dark:border-surface-lighter rounded-2xl pl-4 pr-12 py-4 text-lg text-slate-900 dark:text-white placeholder:text-slate-400 focus:ring-0 focus:border-primary transition-all font-medium"
                placeholder="Tu contraseña..."
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
          
          <button 
            type="submit" 
            disabled={isLoading}
            className="w-full bg-primary hover:bg-emerald-600 text-white font-bold text-lg py-4 rounded-2xl mt-4 transition-all active:scale-95 disabled:opacity-70 flex items-center justify-center gap-3 shadow-lg shadow-primary/20 hover:shadow-primary/40"
          >
            {isLoading ? 'Iniciando...' : 'Iniciar Sesión'} <ArrowRight className="w-5 h-5" />
          </button>
        </form>

        <p className="text-center text-slate-500 dark:text-slate-400 mt-10 text-base font-medium">
          ¿No tienes una cuenta? <Link to="/register" className="text-primary font-bold hover:text-emerald-600 transition-colors ml-1">Regístrate aquí</Link>
        </p>
      </div>
    </div>
  );
}
