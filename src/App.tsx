import { Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { useEffect, useState } from 'react';
import localforage from 'localforage';
import toast from 'react-hot-toast';
import { db, auth } from './lib/firebase';
import { collection, addDoc, updateDoc, doc, increment, getDoc } from 'firebase/firestore';
import { onAuthStateChanged } from 'firebase/auth';

// Pages
import Onboarding from './pages/Onboarding';
import Home from './pages/Home';
import ReportForm from './pages/ReportForm';
import Learn from './pages/Learn';
import Profile from './pages/Profile';
import AdminDashboard from './pages/admin/Dashboard';
import Navigation from './components/Navigation';
import Login from './pages/Login';
import Register from './pages/Register';

export default function App() {
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [user, setUser] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const location = useLocation();

  useEffect(() => {
    // Initialize theme
    const theme = localStorage.getItem('coex5_theme') || 'light';
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
    
    // Initial load from local storage for immediate UI feedback
    const savedUser = localStorage.getItem('coex5_user');
    if (savedUser) {
      setUser(JSON.parse(savedUser));
    }

    // Listen for Firebase Auth state changes
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        try {
          const userDoc = await getDoc(doc(db, 'users', firebaseUser.uid));
          if (userDoc.exists()) {
            const userData = { id: firebaseUser.uid, ...userDoc.data() } as any;
            
            // Force admin role for specific email
            if (firebaseUser.email === 'authomia.agency@gmail.com' && userData.role !== 'admin') {
              await updateDoc(doc(db, 'users', firebaseUser.uid), { role: 'admin' });
              userData.role = 'admin';
            }

            setUser(userData);
            localStorage.setItem('coex5_user', JSON.stringify(userData));
          }
        } catch (error: any) {
          console.warn("Error fetching user data (likely permission issue), using fallback:", error.message);
          // Fallback to local storage if available
          const savedUser = localStorage.getItem('coex5_user');
          if (savedUser) {
             let parsedUser = JSON.parse(savedUser);
             // Force admin role for specific email even in fallback
             if (firebaseUser.email === 'authomia.agency@gmail.com' && parsedUser.role !== 'admin') {
                parsedUser.role = 'admin';
             }
             setUser(parsedUser);
          } else {
             // If no local data, create a basic user object from auth
             const basicUser = {
               id: firebaseUser.uid,
               name: firebaseUser.displayName || 'Usuario',
               contact: firebaseUser.email || firebaseUser.phoneNumber || '',
               role: firebaseUser.email === 'authomia.agency@gmail.com' ? 'admin' : 'user',
               points: 0,
               avatar: firebaseUser.photoURL || `https://api.dicebear.com/7.x/notionists-neutral/svg?seed=${firebaseUser.uid}`
             };
             setUser(basicUser);
             localStorage.setItem('coex5_user', JSON.stringify(basicUser));
          }
        }
      } else {
        // Only clear if we explicitly want to enforce firebase session, 
        // but for offline support we might want to keep the local user?
        // For now, let's clear it to ensure security if the session is invalid.
        // However, this might disrupt offline usage if the token expires.
        // Let's assume if offline, onAuthStateChanged might not fire or we handle it gracefully.
        if (navigator.onLine) {
             setUser(null);
             localStorage.removeItem('coex5_user');
        }
      }
      setIsLoading(false);
    });

    return () => unsubscribe();
  }, []);

  useEffect(() => {
    const syncOfflineReports = async () => {
      if (navigator.onLine) {
        const offlineReports: any[] = await localforage.getItem('offline_reports') || [];
        if (offlineReports.length > 0) {
          let successCount = 0;
          const remainingReports: any[] = [];

          for (const report of offlineReports) {
            try {
              // Upload image to Firebase Storage if it's a base64 string
              // REMOVED: Storage integration removed as per user request.
              // Images are stored directly as base64 strings in Firestore.
              
              const finalReportData = { ...report, photo_url: report.photo_url };
              
              // Clean up data before sending
              const { id, ...dataToSend } = finalReportData;

              await addDoc(collection(db, 'reports'), dataToSend);
              
              // Update user points
              if (report.user_id) {
                 try {
                   const userRef = doc(db, 'users', report.user_id);
                   await updateDoc(userRef, {
                     points: increment(10)
                   });
                 } catch (firestoreError) {
                   console.warn("Could not update points in Firestore during sync", firestoreError);
                 }
              }

              successCount++;
            } catch (e) {
              console.error('Error syncing report', e);
              remainingReports.push(report); // Keep failed reports to try again later
            }
          }
          
          if (remainingReports.length > 0) {
             await localforage.setItem('offline_reports', remainingReports);
          } else {
             await localforage.removeItem('offline_reports');
          }

          if (successCount > 0) {
            toast.success(`${successCount} reportes guardados sin conexión han sido sincronizados.`);
            
            // Update local user points if user is logged in
            const currentUser = localStorage.getItem('coex5_user');
            if (currentUser) {
                const parsedUser = JSON.parse(currentUser);
                parsedUser.points = (parsedUser.points || 0) + (successCount * 10);
                localStorage.setItem('coex5_user', JSON.stringify(parsedUser));
                setUser(parsedUser);
            }
          }
        }
      }
    };

    window.addEventListener('online', syncOfflineReports);
    // Try syncing on mount if online
    if (navigator.onLine) {
        syncOfflineReports();
    }
    
    return () => window.removeEventListener('online', syncOfflineReports);
  }, []);

  const handleLogin = (userData: any, isNewUser?: boolean) => {
    setUser(userData);
    if (isNewUser) {
      setShowOnboarding(true);
    }
  };

  if (isLoading) return <div className="min-h-screen bg-background-light dark:bg-background-dark flex items-center justify-center text-primary">Cargando...</div>;

  if (showOnboarding) {
    return <Onboarding onFinish={() => setShowOnboarding(false)} />;
  }

  const isAuthPage = location.pathname === '/login' || location.pathname === '/register';
  const isReportPage = location.pathname.startsWith('/report/');

  return (
    <div className="flex flex-col min-h-screen bg-background-light dark:bg-background-dark text-slate-900 dark:text-slate-100 transition-colors duration-300">
      <main className="flex-1 overflow-y-auto no-scrollbar relative">
        <Routes>
          <Route path="/login" element={!user ? <Login onLogin={handleLogin} /> : <Navigate to={user.role === 'admin' ? '/admin' : '/'} />} />
          <Route path="/register" element={!user ? <Register onLogin={handleLogin} /> : <Navigate to="/" />} />
          
          {/* Protected User Routes */}
          <Route path="/" element={user ? (user.role === 'admin' ? <Navigate to="/admin" /> : <Home user={user} />) : <Navigate to="/login" />} />
          <Route path="/report/:type" element={user ? <ReportForm user={user} /> : <Navigate to="/login" />} />
          <Route path="/learn" element={user ? <Learn user={user} /> : <Navigate to="/login" />} />
          <Route path="/profile" element={user ? <Profile user={user} setUser={setUser} onReplayOnboarding={() => setShowOnboarding(true)} /> : <Navigate to="/login" />} />
          
          {/* Protected Admin Routes */}
          <Route path="/admin/*" element={user?.role === 'admin' ? <AdminDashboard user={user} setUser={setUser} /> : <Navigate to="/login" />} />
          
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>
      
      {user && !isAuthPage && !isReportPage && <Navigation user={user} />}
      
      <Toaster position="top-center" toastOptions={{
        style: {
          background: document.documentElement.classList.contains('dark') ? '#252A36' : '#fff',
          color: document.documentElement.classList.contains('dark') ? '#fff' : '#0f172a',
          borderRadius: '12px',
          border: '1px solid rgba(148, 163, 184, 0.2)'
        }
      }} />
    </div>
  );
}
