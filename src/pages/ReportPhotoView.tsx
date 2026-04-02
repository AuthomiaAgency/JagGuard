import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { ArrowLeft, Loader2, Image as ImageIcon } from 'lucide-react';

export default function ReportPhotoView() {
  const { id } = useParams();
  const [photoUrl, setPhotoUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchPhoto = async () => {
      if (!id) return;
      try {
        const docRef = doc(db, 'reports', id);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          const data = docSnap.data();
          if (data.photo_url) {
            setPhotoUrl(data.photo_url);
          } else {
            setError('Este reporte no tiene foto adjunta.');
          }
        } else {
          setError('Reporte no encontrado.');
        }
      } catch (err) {
        console.error(err);
        setError('Error al cargar la foto. Verifica tus permisos o conexión.');
      } finally {
        setLoading(false);
      }
    };
    fetchPhoto();
  }, [id]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-900 text-white">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-slate-900 text-white p-6 text-center">
        <ImageIcon className="w-16 h-16 text-slate-600 mb-4" />
        <h2 className="text-xl font-bold mb-2">No se pudo cargar la imagen</h2>
        <p className="text-slate-400 mb-6">{error}</p>
        <button onClick={() => window.close()} className="px-6 py-3 bg-primary text-white rounded-xl font-bold">
          Cerrar Pestaña
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black flex flex-col">
      <div className="p-4 flex items-center justify-between bg-gradient-to-b from-black/80 to-transparent absolute top-0 w-full z-10">
        <button onClick={() => window.close()} className="p-2 bg-white/10 backdrop-blur-md rounded-full text-white hover:bg-white/20 transition-colors">
          <ArrowLeft className="w-6 h-6" />
        </button>
        <div className="text-white font-bold text-sm bg-black/50 px-4 py-1.5 rounded-full backdrop-blur-md">
          Evidencia del Reporte
        </div>
      </div>
      <div className="flex-1 flex items-center justify-center p-4 pt-20">
        {photoUrl && (
          <img 
            src={photoUrl} 
            alt="Evidencia del reporte" 
            className="max-w-full max-h-[85vh] object-contain rounded-lg shadow-2xl"
          />
        )}
      </div>
    </div>
  );
}
