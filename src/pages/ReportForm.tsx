import React, { useState, useRef, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Camera, MapPin, Send, ArrowLeft, CheckCircle2, AlertCircle, HelpCircle, Upload } from 'lucide-react';
import toast from 'react-hot-toast';
import localforage from 'localforage';
import Header from '../components/Header';
import { MapContainer, TileLayer, Marker, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { db, storage } from '../lib/firebase';
import { collection, addDoc, updateDoc, doc, increment } from 'firebase/firestore';
import { ref, uploadString, getDownloadURL, uploadBytesResumable } from 'firebase/storage';

// Fix Leaflet icon issue
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

const animals = [
  { id: 'jaguar', name: 'Jaguar', icon: '🐆' },
  { id: 'puma', name: 'Puma', icon: '🐈' },
  { id: 'otros', name: 'Otros', icon: '🐾' },
  { id: 'desconocido', name: 'No estoy seguro', icon: '❓' },
];

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

export default function ReportForm({ user }: { user: any }) {
  const { type } = useParams();
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [step, setStep] = useState(1); // 1: Animal, 2: Photo & Location
  const [animal, setAnimal] = useState('');
  const [photo, setPhoto] = useState<string | null>(null);
  const [photoBlob, setPhotoBlob] = useState<Blob | null>(null);
  const [location, setLocation] = useState<{ lat: number, lng: number } | null>(null);
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const mapRef = useRef<L.Map | null>(null);

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
          if (mapRef.current) {
            mapRef.current.setView([newLoc.lat, newLoc.lng], 15);
          }
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

  const compressImage = (file: File): Promise<{ preview: string, blob: Blob }> => {
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = (event) => {
        const img = new Image();
        img.src = event.target?.result as string;
        img.onload = () => {
          const canvas = document.createElement('canvas');
          const MAX_WIDTH = 800;
          const MAX_HEIGHT = 800;
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
          
          const preview = canvas.toDataURL('image/jpeg', 0.4);
          
          canvas.toBlob((blob) => {
            if (blob) {
              resolve({ preview, blob });
            } else {
               // Fallback if toBlob fails (rare)
               resolve({ preview, blob: file }); 
            }
          }, 'image/jpeg', 0.4);
        };
      };
    });
  };

  const handlePhotoCapture = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const { preview, blob } = await compressImage(file);
      setPhoto(preview);
      setPhotoBlob(blob);
    }
  };

  const [loadingText, setLoadingText] = useState('');

  const handleOfflineSave = async (data: any) => {
    try {
      setLoadingText('Guardando en dispositivo...');
      const offlineReports: any[] = await localforage.getItem('offline_reports') || [];
      offlineReports.push(data);
      await localforage.setItem('offline_reports', offlineReports);
      toast.success('Guardado sin conexión. Se enviará cuando mejore la red.');
      navigate('/');
    } catch (err) {
      console.error("Error saving offline:", err);
      toast.error('Error al guardar el reporte localmente.');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!animal || !photo || !location) {
      toast.error('Por favor completa todos los campos requeridos');
      return;
    }

    setIsSubmitting(true);
    setLoadingText('Procesando datos...');

    const reportData = {
      user_id: user.id,
      type,
      animal,
      notes,
      lat: location.lat,
      lng: location.lng,
      photo_url: photo, // Initially base64, will be updated if online
      anonymous: 0,
      status: 'pending',
      created_at: new Date().toISOString()
    };

    try {
      if (isOnline) {
        setLoadingText('Subiendo evidencia (0%)...');
        // Upload image to Firebase Storage
        const storageRef = ref(storage, `reports/${user.id}/${Date.now()}.jpg`);
        
        let downloadURL = '';
        
        if (photoBlob) {
            const uploadTask = uploadBytesResumable(storageRef, photoBlob);
            
            await new Promise<void>((resolve, reject) => {
                uploadTask.on('state_changed', 
                    (snapshot) => {
                        const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
                        setLoadingText(`Subiendo evidencia (${Math.round(progress)}%)...`);
                    }, 
                    (error) => {
                        if (error.code === 'storage/retry-limit-exceeded' || error.code === 'storage/canceled') {
                             reject(new Error('STORAGE_RETRY_LIMIT'));
                        } else {
                             reject(error);
                        }
                    }, 
                    async () => {
                        downloadURL = await getDownloadURL(uploadTask.snapshot.ref);
                        resolve();
                    }
                );
            });
        } else {
             // Fallback for base64 if blob is missing
             await uploadString(storageRef, photo, 'data_url');
             downloadURL = await getDownloadURL(storageRef);
        }
        
        setLoadingText('Guardando reporte...');
        // Update report data with real URL
        const finalReportData = { ...reportData, photo_url: downloadURL };

        // Save to Firestore
        try {
            await addDoc(collection(db, 'reports'), finalReportData);
        } catch (dbError: any) {
            if (dbError.code === 'permission-denied') {
                throw new Error('No tienes permisos para enviar reportes. Contacta al administrador.');
            }
            throw dbError;
        }
        
        // Update user points
        try {
          const userRef = doc(db, 'users', user.id);
          await updateDoc(userRef, {
            points: increment(10)
          });
        } catch (firestoreError) {
          console.warn("Could not update points in Firestore, updating locally", firestoreError);
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
      
      if (error.message === 'STORAGE_RETRY_LIMIT' || error.code === 'storage/retry-limit-exceeded') {
        console.warn("Storage retry limit exceeded, falling back to offline save.");
        await handleOfflineSave(reportData);
        return;
      }

      toast.error(error.message || 'Error al enviar el reporte. Intenta nuevamente.');
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
      <div className="flex flex-col min-h-screen bg-background-light dark:bg-background-dark text-slate-900 dark:text-white p-6 items-center justify-center">
        <div className="bg-white dark:bg-surface-dark p-8 rounded-3xl max-w-sm w-full text-center border border-slate-200 dark:border-surface-lighter shadow-2xl relative overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-green-400 to-emerald-600"></div>
          <div className="w-20 h-20 bg-green-50 dark:bg-green-500/20 rounded-full flex items-center justify-center mx-auto mb-6">
            <CheckCircle2 className="w-10 h-10 text-green-500" />
          </div>
          <h2 className="text-2xl font-black text-slate-900 dark:text-white mb-4">¡Gracias por tu reporte!</h2>
          <p className="text-slate-500 dark:text-slate-400 mb-8 leading-relaxed">
            Tu contribución es vital. Con este reporte estás fortaleciendo nuestro ecosistema y ayudando a proteger la naturaleza y a tu comunidad.
          </p>
          <div className="bg-slate-50 dark:bg-surface-lighter p-4 rounded-2xl mb-8 flex items-center justify-center gap-3 border border-slate-200 dark:border-slate-700">
            <div className="w-10 h-10 bg-primary/10 dark:bg-primary/20 rounded-full flex items-center justify-center">
              <span className="text-primary font-bold text-lg">+10</span>
            </div>
            <p className="text-sm font-bold text-slate-700 dark:text-slate-300">Puntos añadidos a tu perfil</p>
          </div>
          <button 
            onClick={handleCloseSuccess}
            className="w-full bg-primary hover:bg-primary-dark text-white font-bold py-4 rounded-xl transition-all active:scale-95 shadow-lg shadow-primary/20"
          >
            Volver al Inicio
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-screen bg-background-light dark:bg-background-dark">
      <Header />
      
      <div className="flex items-center gap-3 px-4 py-4 border-b border-slate-200 dark:border-surface-lighter">
        <button onClick={() => step === 2 ? setStep(1) : navigate(-1)} className="p-2 -ml-2 rounded-full hover:bg-slate-200 dark:hover:bg-surface-dark transition-colors">
          <ArrowLeft className="w-5 h-5 text-slate-900 dark:text-white" />
        </button>
        <h1 className="text-lg font-bold text-slate-900 dark:text-white capitalize">
          Reporte de {type?.replace('-', ' ')}
        </h1>
      </div>

      <div className="flex-1 p-5 overflow-y-auto pb-24">
        {!isOnline && (
          <div className="bg-yellow-50 dark:bg-yellow-500/10 border border-yellow-200 dark:border-yellow-500/20 rounded-xl p-3 mb-6 flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-yellow-600 dark:text-yellow-500 shrink-0 mt-0.5" />
            <p className="text-sm text-yellow-800 dark:text-yellow-200">
              Estás sin conexión. El reporte se guardará y se enviará automáticamente cuando recuperes la señal.
            </p>
          </div>
        )}

        {step === 1 && (
          <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="text-center mb-8">
              <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-2">Identificación</h2>
              <p className="text-primary font-semibold text-sm tracking-widest uppercase">Animal Involucrado</p>
            </div>

            <div className="grid gap-4">
              {animals.map((a) => (
                <button
                  key={a.id}
                  onClick={() => { setAnimal(a.id); setStep(2); }}
                  className={`flex items-center gap-4 p-5 rounded-2xl border-2 transition-all ${
                    animal === a.id 
                      ? 'border-primary bg-primary/5 dark:bg-primary/10' 
                      : 'border-slate-200 dark:border-surface-lighter bg-white dark:bg-surface-dark hover:border-primary/50'
                  }`}
                >
                  <span className="text-4xl">{a.icon}</span>
                  <span className="text-lg font-bold text-slate-900 dark:text-white">{a.name}</span>
                </button>
              ))}
            </div>
          </div>
        )}

        {step === 2 && (
          <form onSubmit={handleSubmit} className="space-y-8 animate-in fade-in slide-in-from-right-4 duration-500">
            
            {/* Validation Summary */}
            <div className="bg-primary/5 dark:bg-primary/10 border border-primary/20 rounded-2xl p-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center text-xl">
                  {animals.find(a => a.id === animal)?.icon}
                </div>
                <div>
                  <p className="text-xs text-slate-500 dark:text-slate-400 uppercase font-bold tracking-wider">Reportando</p>
                  <p className="font-bold text-slate-900 dark:text-white capitalize">{type?.replace('-', ' ')} de {animals.find(a => a.id === animal)?.name}</p>
                </div>
              </div>
              <CheckCircle2 className="w-6 h-6 text-primary" />
            </div>

            {/* Photo Section */}
            <section>
              <h3 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider mb-3">Evidencia Fotográfica</h3>
              {type === 'huella' && (
                <div className="mb-3 bg-blue-50 dark:bg-blue-500/10 p-3 rounded-lg flex items-start gap-2 border border-blue-100 dark:border-blue-500/20">
                  <HelpCircle className="w-5 h-5 text-blue-500 shrink-0" />
                  <p className="text-xs text-blue-800 dark:text-blue-200">
                    Para huellas o rastros, coloca tu mano (puño) o un objeto conocido cerca de la huella como referencia de tamaño antes de tomar la foto.
                  </p>
                </div>
              )}
              
              <div 
                onClick={() => fileInputRef.current?.click()}
                className={`relative aspect-[4/3] rounded-3xl border-2 overflow-hidden cursor-pointer transition-all flex flex-col items-center justify-center gap-3 group ${
                  photo 
                    ? 'border-primary shadow-lg shadow-primary/20' 
                    : 'border-dashed border-slate-300 dark:border-surface-lighter hover:border-primary/50 bg-slate-50 dark:bg-surface-dark'
                }`}
              >
                {photo ? (
                  <>
                    <img src={photo} alt="Evidencia" className="w-full h-full object-cover" />
                    <div className="absolute inset-0 bg-black/50 flex flex-col items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                      <div className="bg-white/20 backdrop-blur-md p-3 rounded-full mb-2">
                        <Camera className="w-6 h-6 text-white" />
                      </div>
                      <p className="text-white font-medium text-sm">Tocar para cambiar foto</p>
                    </div>
                  </>
                ) : (
                  <>
                    {/* Viewfinder UI */}
                    <div className="absolute inset-4 border-2 border-slate-200 dark:border-slate-700 rounded-2xl pointer-events-none">
                      <div className="absolute top-0 left-0 w-8 h-8 border-t-4 border-l-4 border-primary rounded-tl-xl -mt-1 -ml-1"></div>
                      <div className="absolute top-0 right-0 w-8 h-8 border-t-4 border-r-4 border-primary rounded-tr-xl -mt-1 -mr-1"></div>
                      <div className="absolute bottom-0 left-0 w-8 h-8 border-b-4 border-l-4 border-primary rounded-bl-xl -mb-1 -ml-1"></div>
                      <div className="absolute bottom-0 right-0 w-8 h-8 border-b-4 border-r-4 border-primary rounded-br-xl -mb-1 -mr-1"></div>
                    </div>
                    
                    <div className="p-4 bg-primary rounded-full text-white shadow-lg shadow-primary/30 flex items-center justify-center relative z-10">
                      <Camera className="w-8 h-8" />
                    </div>
                    <div className="text-center relative z-10">
                      <p className="font-bold text-slate-900 dark:text-white text-lg">Tomar Foto</p>
                      <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 flex items-center justify-center gap-1">
                        <Upload className="w-3 h-3" /> o subir desde galería
                      </p>
                    </div>
                  </>
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
              <h3 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider mb-3">Ubicación del Evento</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mb-3">Tu ubicación actual se ha detectado automáticamente. Puedes mover el mapa y tocar para ajustar el punto exacto.</p>
              
              <div className="bg-white dark:bg-surface-dark border border-slate-200 dark:border-surface-lighter rounded-2xl overflow-hidden shadow-sm relative z-0">
                {location ? (
                  <div className="h-64 w-full relative">
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
                    </MapContainer>
                    <div className="absolute bottom-4 left-4 right-4 bg-white/90 dark:bg-surface-dark/90 backdrop-blur-md p-3 rounded-xl border border-slate-200 dark:border-surface-lighter shadow-lg z-[1000] flex items-center gap-3">
                      <MapPin className="w-5 h-5 text-primary shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-bold text-slate-900 dark:text-white truncate">Ubicación Seleccionada</p>
                        <p className="text-[10px] text-slate-500 dark:text-slate-400 font-mono truncate">
                          {location.lat.toFixed(5)}, {location.lng.toFixed(5)}
                        </p>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="h-64 w-full flex flex-col items-center justify-center bg-slate-50 dark:bg-surface-lighter">
                    <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin mb-3"></div>
                    <p className="text-sm text-slate-500 dark:text-slate-400 font-medium">Obteniendo ubicación GPS...</p>
                  </div>
                )}
              </div>
            </section>

            {/* Description Section */}
            <section>
              <h3 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider mb-3">Descripción (Opcional)</h3>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Añade detalles adicionales que consideres importantes..."
                className="w-full bg-white dark:bg-surface-dark border border-slate-200 dark:border-surface-lighter rounded-2xl px-4 py-3 text-slate-900 dark:text-white focus:ring-2 focus:ring-primary focus:border-transparent transition-all min-h-[100px] resize-none"
              />
            </section>

            <button
              type="submit"
              disabled={isSubmitting || !photo || !location}
              className="w-full bg-primary hover:bg-primary-dark text-white font-bold py-4 rounded-2xl flex items-center justify-center gap-2 transition-all active:scale-95 disabled:opacity-50 disabled:active:scale-100 shadow-lg shadow-primary/25"
            >
              {isSubmitting ? (
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                  <span>{loadingText || 'Enviando...'}</span>
                </div>
              ) : (
                <>
                  <Send className="w-5 h-5" />
                  Enviar Reporte
                </>
              )}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
