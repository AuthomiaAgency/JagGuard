import React, { useState, useRef, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Camera, MapPin, Send, ArrowLeft, CheckCircle2, AlertCircle, HelpCircle, Upload, Locate, X, PawPrint, Cat, Search } from 'lucide-react';
import toast from 'react-hot-toast';
import localforage from 'localforage';
import Header from '../components/Header';
import { MapContainer, TileLayer, Marker, useMapEvents, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { db } from '../lib/firebase';
import { collection, addDoc, updateDoc, doc, increment } from 'firebase/firestore';
import { useLanguage } from '../contexts/LanguageContext';

// Fix Leaflet icon issue
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

function LocationMarker({ position, setPosition }: { position: any, setPosition: any }) {
  const map = useMapEvents({
    click(e) {
      setPosition({ lat: e.latlng.lat, lng: e.latlng.lng });
      map.flyTo(e.latlng, map.getZoom());
    },
  });

  useEffect(() => {
    if (position) {
      map.flyTo(position, map.getZoom());
    }
  }, [position, map]);

  return position === null ? null : (
    <Marker position={position}></Marker>
  );
}

function LocateControl({ setLocation }: { setLocation: (loc: { lat: number, lng: number }) => void }) {
  const map = useMap();

  const handleLocate = () => {
    map.locate().on("locationfound", function (e) {
      setLocation({ lat: e.latlng.lat, lng: e.latlng.lng });
      map.flyTo(e.latlng, map.getZoom());
    });
  };

  return (
    <button
      type="button"
      onClick={handleLocate}
      className="absolute bottom-4 right-4 bg-white dark:bg-surface-dark p-3 rounded-full shadow-lg z-[1000] border border-slate-200 dark:border-surface-lighter hover:bg-slate-50 dark:hover:bg-surface-lighter transition-all active:scale-95"
    >
      <Locate className="w-6 h-6 text-primary" />
    </button>
  );
}

export default function ReportForm({ user }: { user: any }) {
  const { type } = useParams();
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { t } = useLanguage();
  
  const [step, setStep] = useState(1); // 1: Animal, 2: Photo & Location
  const [animal, setAnimal] = useState('');
  const [otherAnimalDetail, setOtherAnimalDetail] = useState('');
  const [showOtherModal, setShowOtherModal] = useState(false);
  const [photo, setPhoto] = useState<string | null>(null);
  const [location, setLocation] = useState<{ lat: number, lng: number } | null>(null);
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const mapRef = useRef<L.Map | null>(null);
  const [loadingText, setLoadingText] = useState('');

  const animals = [
    { id: 'jaguar', name: t('report.jaguar'), icon: PawPrint, description: t('report.jaguar_desc') },
    { id: 'puma', name: t('report.puma'), icon: Cat, description: t('report.puma_desc') },
    { id: 'otros', name: t('report.other'), icon: Search, description: t('report.other_desc') },
    { id: 'desconocido', name: t('report.unknown'), icon: HelpCircle, description: t('report.unknown_desc') },
  ];

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    
    // Get location automatically
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const newLoc = { lat: pos.coords.latitude, lng: pos.coords.longitude };
          setLocation(newLoc);
        },
        (err) => {
          console.error("Error getting location", err);
          // Default to a central location if denied/error (e.g., somewhere in South America)
          setLocation({ lat: -16.290154, lng: -63.588653 });
        },
        { enableHighAccuracy: true, timeout: 5000, maximumAge: 0 }
      );
    } else {
      setLocation({ lat: -16.290154, lng: -63.588653 });
    }

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const compressImage = (file: File): Promise<string> => {
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = (event) => {
        const img = new Image();
        img.src = event.target?.result as string;
        img.onload = () => {
          const canvas = document.createElement('canvas');
          const MAX_WIDTH = 600; // Reduced max width for Firestore limit safety
          const MAX_HEIGHT = 600;
          let width = img.width;
          let height = img.height;

          if (width > height) {
            if (width > MAX_WIDTH) {
              height *= MAX_WIDTH / width;
              width = MAX_WIDTH;
            }
          } else {
            if (height > MAX_HEIGHT) {
              width *= MAX_HEIGHT / height;
              height = MAX_HEIGHT;
            }
          }
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          ctx?.drawImage(img, 0, 0, width, height);
          
          // Aggressive compression for Firestore
          const preview = canvas.toDataURL('image/jpeg', 0.5); 
          resolve(preview);
        };
      };
    });
  };

  const handlePhotoCapture = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const preview = await compressImage(file);
      setPhoto(preview);
    }
  };

  const handleOfflineSave = async (data: any) => {
    try {
      setLoadingText('Guardando en dispositivo...');
      const offlineReports: any[] = await localforage.getItem('offline_reports') || [];
      offlineReports.push(data);
      await localforage.setItem('offline_reports', offlineReports);
      toast.success('Guardado sin conexión. Se enviará cuando mejore la red.');
      setShowSuccessModal(true);
    } catch (err) {
      console.error("Error saving offline:", err);
      toast.error('Error al guardar el reporte localmente.');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!user || !user.id) {
      toast.error('Error de sesión. Por favor vuelve a iniciar sesión.');
      return;
    }

    if (!animal || !photo || !location) {
      toast.error('Por favor completa todos los campos requeridos');
      return;
    }

    setIsSubmitting(true);
    setLoadingText(t('report.sending'));

    const reportData = {
      user_id: user.id,
      user_name: user.name || 'Usuario',
      user_contact: user.contact || user.email || '',
      type,
      animal,
      specific_animal: animal === 'otros' ? otherAnimalDetail : null,
      notes,
      lat: location.lat,
      lng: location.lng,
      photo_url: photo, // Storing Base64 directly
      anonymous: 0,
      status: 'pending',
      created_at: new Date().toISOString()
    };

    try {
      if (isOnline) {
        setLoadingText(t('report.sending'));
        
        // Save directly to Firestore (No Storage)
        try {
            await addDoc(collection(db, 'reports'), reportData);
        } catch (dbError: any) {
            console.error("Firestore error:", dbError);
            if (dbError.code === 'permission-denied') {
                throw new Error('PERMISSION_DENIED');
            }
            // If document is too large or other error, try offline save
            throw dbError;
        }
        
        // Update user points
        try {
          const userRef = doc(db, 'users', user.id);
          await updateDoc(userRef, {
            points: increment(10)
          });
        } catch (firestoreError) {
          console.warn("Could not update points in Firestore", firestoreError);
        }

        // Update local user state points
        const updatedUser = { ...user, points: (user.points || 0) + 10 };
        localStorage.setItem('coex5_user', JSON.stringify(updatedUser));

        setShowSuccessModal(true);
      } else {
        await handleOfflineSave(reportData);
      }
    } catch (error: any) {
      console.error("Error submitting report:", error);
      
      if (error.message === 'PERMISSION_DENIED') {
         toast.error('No tienes permisos para enviar reportes.');
         return;
      }

      // Fallback to offline save for any other error (network, size, etc.)
      console.warn("Submission failed, falling back to offline save.");
      await handleOfflineSave(reportData);
    } finally {
      setIsSubmitting(false);
      setLoadingText('');
    }
  };

  const handleCloseSuccess = () => {
    setShowSuccessModal(false);
    navigate('/');
  };

  if (showSuccessModal) {
    return (
      <div className="fixed inset-0 z-[2000] flex items-center justify-center p-6 bg-slate-900/80 backdrop-blur-sm animate-in fade-in duration-300">
        <div className="bg-white dark:bg-surface-dark p-8 rounded-3xl max-w-sm w-full text-center border border-slate-200 dark:border-surface-lighter shadow-2xl relative overflow-hidden animate-in zoom-in-95 duration-300">
          <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-primary to-secondary"></div>
          <div className="w-20 h-20 bg-green-50 dark:bg-green-500/20 rounded-full flex items-center justify-center mx-auto mb-6 ring-4 ring-green-100 dark:ring-green-500/10">
            <CheckCircle2 className="w-10 h-10 text-green-500" />
          </div>
          <h2 className="text-2xl font-black text-slate-900 dark:text-white mb-4">{t('report.success_title')}</h2>
          <p className="text-slate-500 dark:text-slate-400 mb-8 leading-relaxed">
            {t('report.success_desc')}
          </p>
          <div className="bg-slate-50 dark:bg-surface-lighter p-4 rounded-2xl mb-8 flex items-center justify-center gap-3 border border-slate-200 dark:border-slate-700">
            <div className="w-10 h-10 bg-primary/10 dark:bg-primary/20 rounded-full flex items-center justify-center">
              <span className="text-primary font-bold text-lg">+10</span>
            </div>
            <p className="text-sm font-bold text-slate-700 dark:text-slate-300">Puntos ganados</p>
          </div>
          <button 
            onClick={handleCloseSuccess}
            className="w-full bg-primary hover:bg-primary-dark text-white font-bold py-4 rounded-xl transition-all active:scale-95 shadow-lg shadow-primary/20 hover:shadow-primary/40"
          >
            {t('profile.understood')}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-screen bg-background-light dark:bg-background-dark">
      <Header />
      
      <div className="flex items-center gap-3 px-4 py-4 border-b border-slate-200 dark:border-surface-lighter sticky top-0 bg-background-light/90 dark:bg-background-dark/90 backdrop-blur-md z-50">
        <button onClick={() => step === 2 ? setStep(1) : navigate(-1)} className="p-2 -ml-2 rounded-full hover:bg-slate-100 dark:hover:bg-surface-lighter transition-colors">
          <ArrowLeft className="w-5 h-5 text-slate-900 dark:text-white" />
        </button>
        <h1 className="text-lg font-bold text-slate-900 dark:text-white capitalize">
          {t('report.title')}
        </h1>
      </div>

      <div className="flex-1 p-6 pb-32 max-w-2xl mx-auto w-full">
        {step === 1 && (
          <div className="animate-in fade-in slide-in-from-right-4 duration-500">
            <div className="text-center mb-10">
              <h2 className="text-3xl font-black text-slate-900 dark:text-white mb-2 tracking-tight">{t('report.identification')}</h2>
              <p className="text-slate-500 dark:text-slate-400 text-base font-medium">{t('report.select_animal')}</p>
            </div>

            <div className="grid grid-cols-2 gap-4 sm:gap-6">
              {animals.map((a) => (
                <button
                  key={a.id}
                  onClick={() => { 
                    setAnimal(a.id); 
                    if (a.id === 'otros') {
                      setShowOtherModal(true);
                    } else {
                      setStep(2); 
                    }
                  }}
                  className={`group relative flex flex-col items-center justify-center gap-4 p-8 rounded-[2.5rem] border-2 transition-all duration-300 aspect-[4/5] overflow-hidden shadow-sm hover:shadow-2xl ${
                    animal === a.id 
                      ? 'border-primary bg-primary/5 dark:bg-primary/10 scale-[1.02] shadow-2xl shadow-primary/10 ring-4 ring-primary/20' 
                      : 'border-slate-100 dark:border-surface-lighter bg-white dark:bg-surface-dark hover:border-primary/30 hover:-translate-y-2'
                  }`}
                >
                  <div className={`p-6 rounded-3xl transition-all duration-300 relative z-10 ${
                    animal === a.id 
                      ? 'bg-primary text-white shadow-lg shadow-primary/30 scale-110' 
                      : 'bg-slate-50 dark:bg-slate-800 text-slate-500 dark:text-slate-400 group-hover:bg-primary/10 group-hover:text-primary group-hover:scale-110'
                  }`}>
                    {a.id === 'jaguar' ? (
                      <div className="relative">
                        <PawPrint className="w-12 h-12" strokeWidth={1.5} />
                        <div className="absolute -top-1 -right-1 w-4 h-4 bg-orange-500 rounded-full border-2 border-white dark:border-surface-dark"></div>
                      </div>
                    ) : a.id === 'puma' ? (
                      <div className="relative">
                        <Cat className="w-12 h-12" strokeWidth={1.5} />
                        <div className="absolute -top-1 -right-1 w-4 h-4 bg-yellow-600 rounded-full border-2 border-white dark:border-surface-dark"></div>
                      </div>
                    ) : (
                      <a.icon className="w-12 h-12" strokeWidth={1.5} />
                    )}
                  </div>
                  
                  <div className="text-center w-full relative z-10 flex flex-col items-center justify-center min-h-[3rem]">
                    <span className="block text-xl font-black text-slate-900 dark:text-white mb-1 leading-tight">{a.name}</span>
                    <span className="block text-[10px] uppercase tracking-[0.15em] text-slate-400 dark:text-slate-500 font-black leading-tight">{a.description}</span>
                  </div>
                </button>
              ))}
            </div>

            {/* Other Animal Modal */}
            {showOtherModal && (
              <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200">
                <div className="bg-white dark:bg-surface-dark w-full max-w-sm rounded-3xl overflow-hidden shadow-2xl p-6 animate-in zoom-in-95 duration-200">
                  <div className="flex justify-between items-center mb-4">
                    <h3 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                      <Search className="w-5 h-5 text-primary" />
                      {t('report.specify')}
                    </h3>
                    <button onClick={() => setShowOtherModal(false)} className="p-1 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400">
                      <X className="w-5 h-5" />
                    </button>
                  </div>
                  
                  <div className="mb-6">
                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">{t('report.other_desc')}</label>
                    <input
                      type="text"
                      value={otherAnimalDetail}
                      onChange={(e) => setOtherAnimalDetail(e.target.value)}
                      placeholder={t('report.specify_placeholder')}
                      className="w-full bg-slate-50 dark:bg-background-dark border border-slate-200 dark:border-surface-lighter rounded-xl px-4 py-3 text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all font-medium"
                      autoFocus
                    />
                  </div>

                  <button 
                    onClick={() => {
                      if (otherAnimalDetail.trim()) {
                        setShowOtherModal(false);
                        setStep(2);
                      } else {
                        toast.error(t('report.specify_placeholder'));
                      }
                    }}
                    className="w-full bg-primary hover:bg-primary-dark text-white font-bold py-3 rounded-xl transition-all active:scale-95"
                  >
                    {t('onboarding.next')}
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {step === 2 && (
          <form onSubmit={handleSubmit} className="space-y-8 animate-in fade-in slide-in-from-right-4 duration-500">
            
            {/* Validation Summary */}
            <div className="bg-white dark:bg-surface-dark border border-slate-200 dark:border-surface-lighter rounded-3xl p-5 flex items-center justify-between shadow-sm">
              <div className="flex items-center gap-5">
                <div className="w-16 h-16 rounded-2xl bg-slate-100 dark:bg-surface-lighter flex items-center justify-center text-primary">
                  {(() => {
                    const selected = animals.find(a => a.id === animal);
                    const Icon = selected?.icon || HelpCircle;
                    return <Icon className="w-8 h-8" />;
                  })()}
                </div>
                <div>
                  <p className="text-xs text-slate-500 dark:text-slate-400 uppercase font-bold tracking-wider mb-1">{t('report.reporting')}</p>
                  <p className="font-black text-slate-900 dark:text-white capitalize text-xl">{animals.find(a => a.id === animal)?.name}</p>
                </div>
              </div>
              <button 
                type="button" 
                onClick={() => setStep(1)}
                className="px-4 py-2 rounded-xl bg-slate-100 dark:bg-surface-lighter text-slate-600 dark:text-slate-300 font-bold text-xs hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
              >
                {t('report.change')}
              </button>
            </div>

            {/* Other Animal Input removed from here as it is now a modal in step 1 */}

            {/* Photo Section */}
            <section>
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider flex items-center gap-2">
                  <Camera className="w-4 h-4 text-primary" />
                  {t('report.evidence')}
                </h3>
                {photo && (
                  <button 
                    type="button" 
                    onClick={() => { setPhoto(null); if(fileInputRef.current) fileInputRef.current.value = ''; }}
                    className="text-xs text-red-500 font-bold hover:underline flex items-center gap-1"
                  >
                    <X className="w-3 h-3" /> Eliminar
                  </button>
                )}
              </div>
              
              <div 
                onClick={() => fileInputRef.current?.click()}
                className={`relative aspect-video rounded-3xl border-2 overflow-hidden cursor-pointer transition-all duration-300 group ${
                  photo 
                    ? 'border-transparent shadow-xl' 
                    : 'border-dashed border-slate-300 dark:border-surface-lighter hover:border-primary/50 hover:bg-slate-50 dark:hover:bg-surface-lighter bg-slate-50/50 dark:bg-surface-dark'
                }`}
              >
                {photo ? (
                  <>
                    <img src={photo} alt="Evidencia" className="w-full h-full object-cover" />
                    <div className="absolute inset-0 bg-black/40 flex flex-col items-center justify-center opacity-0 group-hover:opacity-100 transition-all duration-300 backdrop-blur-sm">
                      <Camera className="w-8 h-8 text-white mb-2" />
                      <p className="text-white font-bold text-sm">Cambiar Foto</p>
                    </div>
                  </>
                ) : (
                  <div className="absolute inset-0 flex flex-col items-center justify-center p-6 text-center">
                    <div className="w-16 h-16 bg-primary/10 dark:bg-primary/20 rounded-full flex items-center justify-center mb-4 group-hover:scale-110 transition-transform duration-300">
                      <Camera className="w-8 h-8 text-primary" />
                    </div>
                    <p className="font-bold text-slate-900 dark:text-white text-lg mb-1">{t('report.take_photo')}</p>
                    <p className="text-xs text-slate-500 dark:text-slate-400 max-w-[200px]">
                      {t('report.evidence_desc')}
                    </p>
                  </div>
                )}
              </div>
              <input 
                type="file" 
                ref={fileInputRef} 
                onChange={handlePhotoCapture} 
                accept="image/*" 
                capture="environment"
                className="hidden" 
              />
            </section>

            {/* Location Section */}
            <section>
              <h3 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider mb-4 flex items-center gap-2">
                <MapPin className="w-4 h-4 text-primary" />
                {t('report.location')}
              </h3>
              <div className="h-48 rounded-3xl overflow-hidden border-2 border-slate-200 dark:border-surface-lighter relative shadow-sm">
                {location ? (
                  <MapContainer 
                    center={[location.lat, location.lng]} 
                    zoom={15} 
                    style={{ height: '100%', width: '100%' }}
                    zoomControl={false}
                    ref={mapRef}
                  >
                    <TileLayer
                      url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                      attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                    />
                    <LocationMarker position={location} setPosition={setLocation} />
                    <LocateControl setLocation={setLocation} />
                  </MapContainer>
                ) : (
                  <div className="w-full h-full bg-slate-100 dark:bg-surface-dark flex items-center justify-center text-slate-400">
                    <p className="text-sm font-medium">{t('report.location_desc')}</p>
                  </div>
                )}
              </div>
              {location && (
                <div className="mt-3 flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400 bg-slate-50 dark:bg-surface-lighter p-3 rounded-xl border border-slate-100 dark:border-slate-700">
                  <CheckCircle2 className="w-4 h-4 text-green-500" />
                  <span className="font-mono">{location.lat.toFixed(6)}, {location.lng.toFixed(6)}</span>
                </div>
              )}
            </section>

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full bg-primary hover:bg-primary-dark text-white font-bold py-5 rounded-2xl text-lg shadow-xl shadow-primary/20 transition-all active:scale-95 disabled:opacity-70 disabled:cursor-not-allowed flex items-center justify-center gap-3"
            >
              {isSubmitting ? (
                <>
                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  <span>{loadingText}</span>
                </>
              ) : (
                <>
                  <Send className="w-5 h-5" />
                  <span>{t('report.send')}</span>
                </>
              )}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
