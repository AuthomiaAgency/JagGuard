import React, { useState, useEffect, useRef } from 'react';
import { Routes, Route } from 'react-router-dom';
import { FileText, Download, CheckCircle, XCircle, Plus, Image as ImageIcon, Eye, AlertTriangle, Info, Map as MapIcon, Camera, Leaf, Zap, Heart, BookOpen, LayoutTemplate, ListOrdered, Copy, PawPrint, Shield, MessageCircle, PlayCircle } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { MapContainer, TileLayer, CircleMarker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import 'leaflet.heat';
import * as XLSX from 'xlsx';
import toast from 'react-hot-toast';
import Header from '../../components/Header';
import { toPng, toBlob } from 'html-to-image';
import ReactQuill from 'react-quill-new';
import 'react-quill-new/dist/quill.snow.css';
import { db } from '../../lib/firebase';
import { collection, getDocs, addDoc, updateDoc, doc, query, orderBy, deleteDoc, increment } from 'firebase/firestore';
import { useLanguage } from '../../contexts/LanguageContext';

const AVAILABLE_ICONS = [
  { id: 'paw', icon: PawPrint, label: 'Huella' },
  { id: 'shield', icon: Shield, label: 'Escudo' },
  { id: 'eye', icon: Eye, label: 'Ojo' },
  { id: 'alert', icon: AlertTriangle, label: 'Alerta' },
  { id: 'info', icon: Info, label: 'Info' },
  { id: 'map', icon: MapIcon, label: 'Mapa' },
  { id: 'camera', icon: Camera, label: 'Cámara' },
  { id: 'leaf', icon: Leaf, label: 'Hoja' },
  { id: 'zap', icon: Zap, label: 'Rayo' },
  { id: 'heart', icon: Heart, label: 'Corazón' },
  { id: 'book', icon: BookOpen, label: 'Libro' },
  { id: 'file', icon: FileText, label: 'Archivo' },
];

function HeatmapLayer({ points }: { points: [number, number, number][] }) {
  const map = useMap();
  useEffect(() => {
    if (!points || points.length === 0) return;
    const heat = (L as any).heatLayer(points, {
      radius: 25,
      blur: 15,
      maxZoom: 17,
      gradient: { 0.4: 'blue', 0.6: 'cyan', 0.7: 'lime', 0.8: 'yellow', 1.0: 'red' }
    }).addTo(map);
    return () => {
      map.removeLayer(heat);
    };
  }, [map, points]);
  return null;
}

function Editor() {
  const { t } = useLanguage();
  const [groups, setGroups] = useState<any[]>([]);
  const [guides, setGuides] = useState<any[]>([]);
  const [activeView, setActiveView] = useState<'groups' | 'guides'>('groups');
  const [isPreviewMode, setIsPreviewMode] = useState(false);

  // Group Form State
  const [editingGroup, setEditingGroup] = useState<any>(null);
  const [groupName, setGroupName] = useState('');
  const [groupIcon, setGroupIcon] = useState('paw');

  // Guide Form State
  const [editingGuide, setEditingGuide] = useState<any>(null);
  const [guideTitle, setGuideTitle] = useState('');
  const [guideSubtitle, setGuideSubtitle] = useState('');
  const [guideContent, setGuideContent] = useState('');
  const [guideGroup, setGuideGroup] = useState('');
  const [guideImage, setGuideImage] = useState('');
  const [guideVideo, setGuideVideo] = useState('');
  const [guideReadTime, setGuideReadTime] = useState(5);
  const [guideFiles, setGuideFiles] = useState<{ name: string, url: string, type: string }[]>([]);

  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const groupsSnapshot = await getDocs(collection(db, 'groups'));
      const fetchedGroups = groupsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setGroups(fetchedGroups);

      const guidesSnapshot = await getDocs(collection(db, 'guides'));
      const fetchedGuides = guidesSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setGuides(fetchedGuides);
    } catch (error) {
      console.error("Error fetching data", error);
    }
  };

  const handleSaveGroup = async () => {
    if (!groupName) {
      toast.error('El nombre del grupo es obligatorio');
      return;
    }

    setIsSaving(true);
    try {
      const groupData = {
        name: groupName,
        icon: groupIcon,
        updated_at: new Date().toISOString()
      };

      if (editingGroup) {
        await updateDoc(doc(db, 'groups', editingGroup.id), groupData);
        toast.success('Grupo actualizado');
      } else {
        await addDoc(collection(db, 'groups'), {
          ...groupData,
          created_at: new Date().toISOString()
        });
        toast.success('Grupo creado');
      }

      setGroupName('');
      setGroupIcon('paw');
      setEditingGroup(null);
      fetchData();
    } catch (error) {
      toast.error('Error al guardar grupo');
    } finally {
      setIsSaving(false);
    }
  };

  const handleSaveGuide = async () => {
    if (!guideTitle || !guideContent || !guideGroup) {
      toast.error('Título, contenido y grupo son obligatorios');
      return;
    }

    setIsSaving(true);
    try {
      const guideData = {
        title: guideTitle,
        subtitle: guideSubtitle,
        content: guideContent,
        group: guideGroup,
        image_url: guideImage,
        video_url: guideVideo,
        read_time: guideReadTime,
        files: guideFiles,
        updated_at: new Date().toISOString()
      };

      if (editingGuide) {
        await updateDoc(doc(db, 'guides', editingGuide.id), guideData);
        toast.success('Publicación actualizada');
      } else {
        await addDoc(collection(db, 'guides'), {
          ...guideData,
          created_at: new Date().toISOString()
        });
        toast.success('Publicación creada');
      }

      resetGuideForm();
      fetchData();
    } catch (error) {
      toast.error('Error al guardar publicación');
    } finally {
      setIsSaving(false);
    }
  };

  const resetGuideForm = () => {
    setEditingGuide(null);
    setGuideTitle('');
    setGuideSubtitle('');
    setGuideContent('');
    setGuideGroup('');
    setGuideImage('');
    setGuideVideo('');
    setGuideReadTime(5);
    setGuideFiles([]);
  };

  const handleEditGroup = (group: any) => {
    setEditingGroup(group);
    setGroupName(group.name);
    setGroupIcon(group.icon);
    setActiveView('groups');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleEditGuide = (guide: any) => {
    setEditingGuide(guide);
    setGuideTitle(guide.title);
    setGuideSubtitle(guide.subtitle || '');
    setGuideContent(guide.content);
    setGuideGroup(guide.group);
    setGuideImage(guide.image_url || '');
    setGuideVideo(guide.video_url || '');
    setGuideReadTime(guide.read_time || 5);
    setGuideFiles(guide.files || []);
    setActiveView('guides');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleDeleteGroup = async (id: string) => {
    if (window.confirm('¿Estás seguro de eliminar este grupo? Las publicaciones asociadas podrían quedar huérfanas.')) {
      try {
        await deleteDoc(doc(db, 'groups', id));
        toast.success('Grupo eliminado');
        fetchData();
      } catch (error) {
        toast.error('Error al eliminar');
      }
    }
  };

  const handleDeleteGuide = async (id: string) => {
    if (window.confirm('¿Estás seguro de eliminar esta publicación?')) {
      try {
        await deleteDoc(doc(db, 'guides', id));
        toast.success('Publicación eliminada');
        fetchData();
      } catch (error) {
        toast.error('Error al eliminar');
      }
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Simulation of file upload - in a real app we'd upload to Storage
      // Here we'll just use a placeholder or base64 if it's small
      const reader = new FileReader();
      reader.onload = (event) => {
        const newFile = {
          name: file.name,
          url: event.target?.result as string,
          type: file.type
        };
        setGuideFiles([...guideFiles, newFile]);
      };
      reader.readAsDataURL(file);
    }
  };

  const removeFile = (index: number) => {
    setGuideFiles(guideFiles.filter((_, i) => i !== index));
  };

  return (
    <div className="p-5 space-y-6 max-w-5xl mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black text-slate-900 dark:text-white uppercase tracking-tight">Editor de Contenidos</h1>
          <p className="text-sm text-slate-500">Gestiona grupos y publicaciones para la sección Aprende.</p>
        </div>
        <div className="flex gap-2 bg-slate-100 dark:bg-slate-800 p-1 rounded-xl">
          <button 
            onClick={() => setActiveView('groups')}
            className={`px-4 py-2 rounded-lg text-xs font-bold transition-all ${activeView === 'groups' ? 'bg-white dark:bg-surface-dark text-primary shadow-sm' : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'}`}
          >
            Grupos
          </button>
          <button 
            onClick={() => setActiveView('guides')}
            className={`px-4 py-2 rounded-lg text-xs font-bold transition-all ${activeView === 'guides' ? 'bg-white dark:bg-surface-dark text-primary shadow-sm' : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'}`}
          >
            Publicaciones
          </button>
        </div>
      </div>

      {activeView === 'groups' ? (
        <div className="grid md:grid-cols-3 gap-6">
          {/* Group Form */}
          <div className="md:col-span-1 space-y-4">
            <div className="bg-white dark:bg-surface-dark p-6 rounded-3xl border border-slate-200 dark:border-surface-lighter shadow-sm space-y-4">
              <h2 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <LayoutTemplate className="w-5 h-5 text-primary" />
                {editingGroup ? 'Editar Grupo' : 'Nuevo Grupo'}
              </h2>
              
              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1.5">Nombre del Grupo</label>
                <input 
                  type="text" 
                  value={groupName}
                  onChange={(e) => setGroupName(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-black/20 border border-slate-200 dark:border-surface-lighter rounded-xl px-4 py-3 text-sm text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-primary transition-all"
                  placeholder="Ej: Prevención de Ataques"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1.5">Icono Representativo</label>
                <div className="grid grid-cols-4 gap-2">
                  {AVAILABLE_ICONS.map(i => (
                    <button 
                      key={i.id}
                      onClick={() => setGroupIcon(i.id)}
                      className={`p-2.5 rounded-xl border transition-all flex items-center justify-center ${groupIcon === i.id ? 'bg-primary text-white border-primary shadow-md shadow-primary/20' : 'bg-slate-50 dark:bg-slate-800 text-slate-400 border-slate-200 dark:border-slate-700 hover:border-slate-300'}`}
                      title={i.label}
                    >
                      <i.icon className="w-5 h-5" />
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex gap-2 pt-2">
                {editingGroup && (
                  <button 
                    onClick={() => { setEditingGroup(null); setGroupName(''); setGroupIcon('paw'); }}
                    className="flex-1 py-3 rounded-xl text-xs font-bold text-slate-500 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 transition-colors"
                  >
                    Cancelar
                  </button>
                )}
                <button 
                  onClick={handleSaveGroup}
                  disabled={isSaving}
                  className="flex-[2] bg-primary hover:bg-primary-dark text-white font-bold py-3 rounded-xl shadow-lg shadow-primary/20 transition-all active:scale-95 flex items-center justify-center gap-2 text-sm"
                >
                  {isSaving ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <Plus className="w-4 h-4" />}
                  {editingGroup ? 'Actualizar' : 'Crear Grupo'}
                </button>
              </div>
            </div>
          </div>

          {/* Groups List */}
          <div className="md:col-span-2 space-y-4">
            <h2 className="text-sm font-bold text-slate-500 uppercase tracking-widest">Grupos Existentes ({groups.length})</h2>
            <div className="grid sm:grid-cols-2 gap-4">
              {groups.length === 0 ? (
                <div className="sm:col-span-2 py-12 text-center bg-white dark:bg-surface-dark rounded-3xl border border-dashed border-slate-300 dark:border-slate-700">
                  <LayoutTemplate className="w-12 h-12 mx-auto mb-3 opacity-10" />
                  <p className="text-slate-400 text-sm">No hay grupos creados aún.</p>
                </div>
              ) : (
                groups.map(group => {
                  const IconComp = AVAILABLE_ICONS.find(i => i.id === group.icon)?.icon || PawPrint;
                  const count = guides.filter(g => g.group === group.name).length;
                  return (
                    <div key={group.id} className="bg-white dark:bg-surface-dark p-4 rounded-2xl border border-slate-200 dark:border-surface-lighter flex items-center justify-between shadow-sm group hover:border-primary/30 transition-colors">
                      <div className="flex items-center gap-4">
                        <div className="p-3 bg-slate-100 dark:bg-slate-800 rounded-xl text-primary group-hover:scale-110 transition-transform">
                          <IconComp className="w-6 h-6" />
                        </div>
                        <div>
                          <h3 className="font-bold text-slate-900 dark:text-white text-sm">{group.name}</h3>
                          <p className="text-[10px] text-slate-500 uppercase font-bold tracking-wider">{count} Publicaciones</p>
                        </div>
                      </div>
                      <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button 
                          onClick={() => handleEditGroup(group)}
                          className="p-2 text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-500/10 rounded-lg transition-colors"
                        >
                          <LayoutTemplate className="w-4 h-4" />
                        </button>
                        <button 
                          onClick={() => handleDeleteGroup(group.id)}
                          className="p-2 text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 rounded-lg transition-colors"
                        >
                          <XCircle className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Guide Form */}
          <div className="bg-white dark:bg-surface-dark p-8 rounded-[2.5rem] border border-slate-200 dark:border-surface-lighter shadow-xl space-y-6 relative overflow-hidden">
            <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-primary via-orange-500 to-yellow-500"></div>
            
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-black text-slate-900 dark:text-white flex items-center gap-3">
                <BookOpen className="w-6 h-6 text-primary" />
                {editingGuide ? 'Editar Publicación' : 'Nueva Publicación'}
              </h2>
              <button 
                onClick={() => setIsPreviewMode(!isPreviewMode)}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${isPreviewMode ? 'bg-primary text-white' : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200'}`}
              >
                <Eye className="w-4 h-4" />
                {isPreviewMode ? 'Cerrar Vista Previa' : 'Ver Vista Previa'}
              </button>
            </div>

            {isPreviewMode ? (
              <div className="bg-slate-50 dark:bg-black/40 rounded-3xl p-6 border border-slate-200 dark:border-slate-800 max-h-[600px] overflow-y-auto">
                <div className="max-w-2xl mx-auto space-y-6">
                  {guideImage && (
                    <div className="w-full h-48 rounded-2xl overflow-hidden relative shadow-md">
                      <img src={guideImage} alt="Preview" className="w-full h-full object-cover" />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent"></div>
                      <div className="absolute bottom-4 left-4 right-4">
                        <span className="inline-block px-2 py-1 bg-primary text-white text-[10px] font-bold uppercase tracking-wider rounded mb-2">
                          {guideVideo ? 'Video' : 'Artículo'} • {guideReadTime} min
                        </span>
                        <h2 className="text-xl font-bold text-white leading-tight mb-1">{guideTitle || 'Título de la Publicación'}</h2>
                        {guideSubtitle && <p className="text-sm text-slate-200 line-clamp-2">{guideSubtitle}</p>}
                      </div>
                    </div>
                  )}
                  <div className="bg-white dark:bg-surface-dark rounded-2xl p-6 shadow-sm border border-slate-100 dark:border-surface-lighter">
                    <h1 className="text-2xl font-black text-slate-900 dark:text-white mb-4">{guideTitle || 'Título de la Publicación'}</h1>
                    <div 
                      className="prose dark:prose-invert prose-sm max-w-none prose-headings:font-bold prose-h2:text-primary prose-a:text-primary prose-img:rounded-xl"
                      dangerouslySetInnerHTML={{ __html: guideContent || '<p className="text-slate-400 italic">Sin contenido aún...</p>' }}
                    />
                    
                    {guideFiles.length > 0 && (
                      <div className="mt-8 pt-6 border-t border-slate-100 dark:border-surface-lighter space-y-3">
                        <h4 className="text-xs font-bold text-slate-500 uppercase tracking-widest">Archivos Adjuntos</h4>
                        {guideFiles.map((file, i) => (
                          <div key={i} className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-200 dark:border-slate-700">
                            <div className="flex items-center gap-3">
                              <div className="p-2 bg-white dark:bg-slate-800 rounded-lg text-primary">
                                <FileText className="w-4 h-4" />
                              </div>
                              <div>
                                <p className="text-xs font-bold text-slate-900 dark:text-white">{file.name}</p>
                                <p className="text-[10px] text-slate-500 uppercase">{file.type.split('/')[1] || 'DOC'}</p>
                              </div>
                            </div>
                            <Download className="w-4 h-4 text-slate-400" />
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ) : (
              <div className="grid md:grid-cols-2 gap-8">
                <div className="space-y-4">
                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1.5">Título</label>
                    <input 
                      type="text" 
                      value={guideTitle}
                      onChange={(e) => setGuideTitle(e.target.value)}
                      className="w-full bg-slate-50 dark:bg-black/20 border border-slate-200 dark:border-surface-lighter rounded-xl px-4 py-3 text-sm text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-primary transition-all"
                      placeholder="Título llamativo..."
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1.5">Subtítulo / Resumen</label>
                    <textarea 
                      value={guideSubtitle}
                      onChange={(e) => setGuideSubtitle(e.target.value)}
                      className="w-full bg-slate-50 dark:bg-black/20 border border-slate-200 dark:border-surface-lighter rounded-xl px-4 py-3 text-sm text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-primary transition-all min-h-[80px] resize-none"
                      placeholder="Breve descripción para la tarjeta..."
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1.5">Grupo / Categoría</label>
                      <select 
                        value={guideGroup}
                        onChange={(e) => setGuideGroup(e.target.value)}
                        className="w-full bg-slate-50 dark:bg-black/20 border border-slate-200 dark:border-surface-lighter rounded-xl px-4 py-3 text-sm text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-primary transition-all appearance-none"
                      >
                        <option value="">Seleccionar Grupo</option>
                        {groups.map(g => (
                          <option key={g.id} value={g.name}>{g.name}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1.5">Tiempo de Lectura (min)</label>
                      <input 
                        type="number" 
                        value={guideReadTime}
                        onChange={(e) => setGuideReadTime(parseInt(e.target.value))}
                        className="w-full bg-slate-50 dark:bg-black/20 border border-slate-200 dark:border-surface-lighter rounded-xl px-4 py-3 text-sm text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-primary transition-all"
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1.5">URL Imagen de Portada</label>
                      <div className="relative">
                        <ImageIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                        <input 
                          type="text" 
                          value={guideImage}
                          onChange={(e) => setGuideImage(e.target.value)}
                          className="w-full bg-slate-50 dark:bg-black/20 border border-slate-200 dark:border-surface-lighter rounded-xl pl-10 pr-4 py-3 text-sm text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-primary transition-all"
                          placeholder="https://..."
                        />
                      </div>
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1.5">URL Video (Opcional)</label>
                      <div className="relative">
                        <PlayCircle className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                        <input 
                          type="text" 
                          value={guideVideo}
                          onChange={(e) => setGuideVideo(e.target.value)}
                          className="w-full bg-slate-50 dark:bg-black/20 border border-slate-200 dark:border-surface-lighter rounded-xl pl-10 pr-4 py-3 text-sm text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-primary transition-all"
                          placeholder="https://youtube.com/..."
                        />
                      </div>
                    </div>
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1.5">Archivos Adjuntos (PDF, DOCX)</label>
                    <div className="space-y-2">
                      <div className="flex gap-2">
                        <label className="flex-1 flex items-center justify-center gap-2 bg-slate-100 dark:bg-slate-800 border-2 border-dashed border-slate-300 dark:border-slate-700 rounded-xl py-3 cursor-pointer hover:bg-slate-200 dark:hover:bg-slate-700 transition-all text-xs font-bold text-slate-500">
                          <Plus className="w-4 h-4" /> Subir Archivo
                          <input type="file" className="hidden" onChange={handleFileUpload} />
                        </label>
                      </div>
                      <div className="grid grid-cols-1 gap-2">
                        {guideFiles.map((file, i) => (
                          <div key={i} className="flex items-center justify-between p-2 bg-slate-50 dark:bg-slate-800/50 rounded-lg border border-slate-200 dark:border-slate-700">
                            <span className="text-[10px] font-bold text-slate-600 dark:text-slate-300 truncate max-w-[150px]">{file.name}</span>
                            <button onClick={() => removeFile(i)} className="text-red-500 p-1 hover:bg-red-50 dark:hover:bg-red-500/10 rounded">
                              <XCircle className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1.5">Contenido de la Publicación</label>
                  <div className="bg-white dark:bg-white/5 rounded-2xl overflow-hidden border border-slate-200 dark:border-surface-lighter h-[400px] flex flex-col">
                    <ReactQuill 
                      theme="snow" 
                      value={guideContent} 
                      onChange={setGuideContent}
                      className="flex-1 overflow-y-auto dark:text-white"
                      modules={{
                        toolbar: [
                          [{ 'header': [1, 2, 3, false] }],
                          ['bold', 'italic', 'underline', 'strike'],
                          [{ 'list': 'ordered'}, { 'list': 'bullet' }],
                          ['link', 'image', 'video'],
                          ['clean']
                        ],
                      }}
                    />
                  </div>
                  <div className="flex gap-3 pt-4">
                    {editingGuide && (
                      <button 
                        onClick={resetGuideForm}
                        className="flex-1 py-4 rounded-2xl text-sm font-bold text-slate-500 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 transition-colors"
                      >
                        Cancelar
                      </button>
                    )}
                    <button 
                      onClick={handleSaveGuide}
                      disabled={isSaving}
                      className="flex-[2] bg-primary hover:bg-primary-dark text-white font-bold py-4 rounded-2xl shadow-xl shadow-primary/20 transition-all active:scale-95 flex items-center justify-center gap-2 text-base"
                    >
                      {isSaving ? <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <CheckCircle className="w-5 h-5" />}
                      {editingGuide ? 'Actualizar Publicación' : 'Publicar Ahora'}
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Guides Table */}
          <div className="space-y-4">
            <h2 className="text-sm font-bold text-slate-500 uppercase tracking-widest">Publicaciones Recientes</h2>
            <div className="bg-white dark:bg-surface-dark rounded-3xl border border-slate-200 dark:border-surface-lighter shadow-sm overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-50 dark:bg-surface-lighter border-b border-slate-200 dark:border-slate-700">
                      <th className="px-6 py-4 text-[10px] font-bold text-slate-500 uppercase tracking-widest">Publicación</th>
                      <th className="px-6 py-4 text-[10px] font-bold text-slate-500 uppercase tracking-widest">Grupo</th>
                      <th className="px-6 py-4 text-[10px] font-bold text-slate-500 uppercase tracking-widest">Media</th>
                      <th className="px-6 py-4 text-[10px] font-bold text-slate-500 uppercase tracking-widest">Fecha</th>
                      <th className="px-6 py-4 text-[10px] font-bold text-slate-500 uppercase tracking-widest text-right">Acciones</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {guides.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="px-6 py-12 text-center text-slate-400 text-sm">No hay publicaciones aún.</td>
                      </tr>
                    ) : (
                      guides.map(guide => (
                        <tr key={guide.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-3">
                              <div className="w-10 h-10 rounded-lg bg-slate-100 dark:bg-slate-800 overflow-hidden shrink-0">
                                {guide.image_url ? <img src={guide.image_url} className="w-full h-full object-cover" /> : <FileText className="w-5 h-5 m-2.5 text-slate-400" />}
                              </div>
                              <div>
                                <p className="text-sm font-bold text-slate-900 dark:text-white line-clamp-1">{guide.title}</p>
                                <p className="text-[10px] text-slate-500">{guide.read_time} min lectura</p>
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <span className="px-2 py-1 bg-primary/10 text-primary text-[10px] font-bold rounded-lg uppercase tracking-wider">
                              {guide.group}
                            </span>
                          </td>
                          <td className="px-6 py-4">
                            <div className="flex gap-1.5">
                              {guide.image_url && <ImageIcon className="w-3.5 h-3.5 text-blue-500" title="Imagen" />}
                              {guide.video_url && <PlayCircle className="w-3.5 h-3.5 text-red-500" title="Video" />}
                              {guide.files?.length > 0 && <FileText className="w-3.5 h-3.5 text-emerald-500" title={`${guide.files.length} Archivos`} />}
                            </div>
                          </td>
                          <td className="px-6 py-4 text-[10px] text-slate-500 font-medium">
                            {new Date(guide.created_at).toLocaleDateString()}
                          </td>
                          <td className="px-6 py-4 text-right">
                            <div className="flex justify-end gap-2">
                              <button 
                                onClick={() => handleEditGuide(guide)}
                                className="p-2 text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-500/10 rounded-xl transition-colors"
                              >
                                <LayoutTemplate className="w-4 h-4" />
                              </button>
                              <button 
                                onClick={() => handleDeleteGuide(guide.id)}
                                className="p-2 text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 rounded-xl transition-colors"
                              >
                                <XCircle className="w-4 h-4" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function DashboardHome() {
  const { t } = useLanguage();
  const [reports, setReports] = useState<any[]>([]);
  const [allReports, setAllReports] = useState<any[]>([]);
  const [stats, setStats] = useState({ total: 0, verified: 0 });
  const [chartData, setChartData] = useState<any[]>([]);
  const [showExportModal, setShowExportModal] = useState(false);
  const [activeTab, setActiveTab] = useState<'recientes' | 'totales' | 'verificados' | 'canjes' | 'mensajes'>('recientes');
  const [redemptions, setRedemptions] = useState<any[]>([]);
  const [messages, setMessages] = useState<any[]>([]);
  const [permissionError, setPermissionError] = useState(false);
  const chartRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<HTMLDivElement>(null);
  const recentMapRef = useRef<HTMLDivElement>(null);

  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [detailsModalType, setDetailsModalType] = useState<'reports' | 'verified' | 'redemptions' | 'messages' | null>(null);

  const openDetailsModal = (type: 'reports' | 'verified' | 'redemptions' | 'messages') => {
    setDetailsModalType(type);
    setShowDetailsModal(true);
  };

  const getModalTitle = () => {
    switch(detailsModalType) {
      case 'reports': return t('admin.total_reports');
      case 'verified': return t('admin.verified_reports');
      case 'redemptions': return t('admin.redemption_requests');
      case 'messages': return t('admin.messages');
      default: return '';
    }
  };

  const renderModalContent = () => {
    if (!detailsModalType) return null;

    if (detailsModalType === 'reports' || detailsModalType === 'verified') {
      const data = detailsModalType === 'verified' ? reports.filter(r => r.status === 'verified') : allReports;
      return (
        <div className="space-y-3">
          {data.map(r => (
            <div key={r.id} className="bg-slate-50 dark:bg-slate-800 p-4 rounded-xl border border-slate-200 dark:border-slate-700">
               <div className="flex justify-between items-start">
                  <div>
                    <p className="font-bold text-slate-900 dark:text-white capitalize">{r.type.replace('-', ' ')}</p>
                    <p className="text-sm text-slate-500 dark:text-slate-400">
                      {r.animal === 'otros' && r.specific_animal ? `${t('report.other')}: ${r.specific_animal}` : r.animal}
                    </p>
                  </div>
                  <span className={`px-2 py-1 rounded text-[10px] font-bold uppercase ${
                    r.status === 'verified' ? 'bg-green-100 text-green-700' : 
                    r.status === 'denied' ? 'bg-red-100 text-red-700' : 'bg-yellow-100 text-yellow-700'
                  }`}>
                    {r.status === 'verified' ? t('admin.status_verified') : r.status === 'denied' ? t('admin.status_denied') : t('admin.status_pending')}
                  </span>
               </div>
               <div className="mt-2 text-xs text-slate-600 dark:text-slate-300">
                 <p><strong>{t('admin.user')}:</strong> {r.anonymous ? t('admin.anonymous') : r.user_name}</p>
                 <p><strong>{t('admin.contact')}:</strong> {r.user_contact || 'N/A'}</p>
                 <p><strong>{t('admin.date')}:</strong> {new Date(r.created_at).toLocaleString()}</p>
                 {r.notes && <p className="mt-1 italic">"{r.notes}"</p>}
               </div>
            </div>
          ))}
        </div>
      );
    }

    if (detailsModalType === 'redemptions') {
      return (
        <div className="space-y-3">
          {redemptions.map(r => (
            <div key={r.id} className="bg-slate-50 dark:bg-slate-800 p-4 rounded-xl border border-slate-200 dark:border-slate-700">
              <div className="flex justify-between">
                <h4 className="font-bold text-slate-900 dark:text-white">{r.user_name}</h4>
                <span className="font-mono font-bold text-primary">{r.points} pts</span>
              </div>
              <p className="text-sm text-slate-500 dark:text-slate-400">{t('admin.contact')}: {r.contact}</p>
              <p className="text-xs text-slate-400 mt-1">{t('admin.date')}: {new Date(r.created_at).toLocaleString()}</p>
              <p className="text-xs mt-2 font-bold uppercase tracking-wider text-slate-500">
                {r.status === 'approved' ? t('admin.status_approved') : r.status === 'rejected' ? t('admin.status_rejected') : t('admin.status_pending')}
              </p>
            </div>
          ))}
        </div>
      );
    }

    if (detailsModalType === 'messages') {
      return (
        <div className="space-y-3">
          {messages.map(m => (
            <div key={m.id} className="bg-slate-50 dark:bg-slate-800 p-4 rounded-xl border border-slate-200 dark:border-slate-700">
              <h4 className="font-bold text-slate-900 dark:text-white">{m.user_name}</h4>
              <p className="text-sm text-slate-500 dark:text-slate-400 mb-2">{t('admin.contact')}: {m.user_contact}</p>
              <div className="bg-white dark:bg-black/20 p-3 rounded-lg text-sm italic text-slate-700 dark:text-slate-300">
                "{m.message}"
              </div>
              <p className="text-xs text-slate-400 mt-2 text-right">{new Date(m.created_at).toLocaleString()}</p>
            </div>
          ))}
        </div>
      );
    }

    return null;
  };

  useEffect(() => {
    fetchReports();
    fetchRedemptions();
    fetchMessages();
  }, []);

  const fetchMessages = async () => {
    try {
      const messagesRef = collection(db, 'messages');
      const q = query(messagesRef, orderBy('created_at', 'desc'));
      const querySnapshot = await getDocs(q);
      setMessages(querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      setPermissionError(false);
    } catch (error: any) {
      console.warn('Error fetching messages:', error.message);
      if (error.code === 'permission-denied') setPermissionError(true);
    }
  };

  const fetchRedemptions = async () => {
    try {
      const redemptionsRef = collection(db, 'redemptions');
      const q = query(redemptionsRef, orderBy('created_at', 'desc'));
      const querySnapshot = await getDocs(q);
      setRedemptions(querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      setPermissionError(false);
    } catch (error: any) {
      console.warn('Error fetching redemptions:', error.message);
      if (error.code === 'permission-denied') setPermissionError(true);
      setRedemptions([]);
    }
  };

  const handleRedemptionStatus = async (id: string, status: string) => {
    try {
      const ref = doc(db, 'redemptions', id);
      await updateDoc(ref, { status });
      toast.success(`Canje ${status === 'approved' ? 'aprobado' : 'rechazado'}`);
      fetchRedemptions();
    } catch (error: any) {
      console.error("Error updating redemption status", error);
      if (error.code === 'permission-denied') {
        toast.error('Error de permisos en Firebase. Revisa las reglas de Firestore.');
      } else {
        toast.error('Error al actualizar estado');
      }
    }
  };

  const fetchReports = async () => {
    try {
      const reportsRef = collection(db, 'reports');
      const q = query(reportsRef, orderBy('created_at', 'desc'));
      const querySnapshot = await getDocs(q);
      
      const fetchedReports = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));

      setAllReports(fetchedReports);

      // Filter for last 30 days
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      
      const recentReports = fetchedReports.filter((r: any) => new Date(r.created_at) >= thirtyDaysAgo);
      setReports(recentReports);
      
      // Calculate stats based on ALL reports
      const total = fetchedReports.length;
      const verified = fetchedReports.filter((r: any) => r.status === 'verified').length;
      setStats({ total, verified });

      // Calculate chart data based on 30 days
      const animalCounts: Record<string, number> = {};
      recentReports.forEach((r: any) => {
        const key = r.animal || 'desconocido';
        animalCounts[key] = (animalCounts[key] || 0) + 1;
      });
      setChartData(Object.keys(animalCounts).map(key => ({
        name: key.toUpperCase(),
        count: animalCounts[key]
      })));
      setPermissionError(false);

    } catch (error: any) {
      console.warn('Error fetching reports:', error.message);
      if (error.code === 'permission-denied') setPermissionError(true);
      setAllReports([]);
      setReports([]);
      setStats({ total: 0, verified: 0 });
      setChartData([]);
    }
  };

  const handleStatusUpdate = async (id: string, status: string) => {
    try {
      const reportRef = doc(db, 'reports', id);
      const report = allReports.find(r => r.id === id);

      // Prevent double verification points
      if (status === 'verified' && report?.status !== 'verified') {
        await updateDoc(reportRef, { status });
        
        if (report?.user_id) {
          const userRef = doc(db, 'users', report.user_id);
          await updateDoc(userRef, { points: increment(10) }); // Add 10 points for verified report
          toast.success('Reporte verificado y puntos asignados (+10)');
        } else {
          toast.success('Reporte verificado (sin usuario asociado)');
        }
      } else {
        await updateDoc(reportRef, { status });
        toast.success(`Reporte ${status === 'verified' ? 'verificado' : 'denegado'}`);
      }
      
      fetchReports();
    } catch (error: any) {
      console.error("Error updating status", error);
      if (error.code === 'permission-denied') {
        toast.error('Error de permisos en Firebase. Revisa las reglas de Firestore.');
      } else {
        toast.error('Error al actualizar estado');
      }
    }
  };

  const exportToExcel = (type: 'all' | 'recent' | 'verified') => {
    let dataToExport = [];
    let filename = '';

    if (type === 'all') {
      dataToExport = allReports;
      filename = `Reportes_Totales_Coex5_${new Date().toISOString().split('T')[0]}.xlsx`;
    } else if (type === 'recent') {
      dataToExport = reports;
      filename = `Reportes_30Dias_Coex5_${new Date().toISOString().split('T')[0]}.xlsx`;
    } else {
      dataToExport = reports.filter(r => r.status === 'verified');
      filename = `Reportes_Verificados_30Dias_Coex5_${new Date().toISOString().split('T')[0]}.xlsx`;
    }

    if (dataToExport.length === 0) {
      toast.error('No hay datos para exportar en esta categoría');
      return;
    }

    const exportData = dataToExport.map(r => ({
      'TIPO DE REPORTE': r.type.toUpperCase(),
      'FECHA Y HORA': new Date(r.created_at).toLocaleString(),
      'COORDENADAS EXACTAS': `${r.lat}, ${r.lng}`,
      'ANIMAL': r.animal === 'otros' && r.specific_animal ? `${t('report.other')}: ${r.specific_animal.toUpperCase()}` : t(`report.${r.animal}`).toUpperCase(),
      'SITUACIÓN / NOTAS': r.notes || 'N/A',
      'ENLACE DE EVIDENCIA': r.photo_url ? { t: 's', v: 'Ver Imagen', l: { Target: r.photo_url } } : 'Sin foto',
      'CONTACTO DE USUARIO': r.anonymous ? t('admin.anonymous') : `${r.user_name || 'N/A'}`,
      'ESTADO': r.status === 'verified' ? 'VERIFICADO' : r.status === 'denied' ? 'DENEGADO' : 'PENDIENTE'
    }));

    const ws = XLSX.utils.json_to_sheet(exportData);
    
    // Auto-size columns
    const colWidths = [
      { wch: 20 }, // TIPO
      { wch: 20 }, // FECHA
      { wch: 25 }, // COORDENADAS
      { wch: 25 }, // ANIMAL (Wider for specific names)
      { wch: 40 }, // NOTAS
      { wch: 20 }, // EVIDENCIA
      { wch: 30 }, // CONTACTO
      { wch: 15 }, // ESTADO
    ];
    ws['!cols'] = colWidths;

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Reportes");
    XLSX.writeFile(wb, filename);
    setShowExportModal(false);
    toast.success('Excel exportado correctamente');
  };

  const exportToCSV = (type: 'all' | 'recent' | 'verified') => {
    let dataToExport = [];
    let filename = '';

    if (type === 'all') {
      dataToExport = allReports;
      filename = `Reportes_Totales_Coex5_${new Date().toISOString().split('T')[0]}.csv`;
    } else if (type === 'recent') {
      dataToExport = reports;
      filename = `Reportes_30Dias_Coex5_${new Date().toISOString().split('T')[0]}.csv`;
    } else {
      dataToExport = reports.filter(r => r.status === 'verified');
      filename = `Reportes_Verificados_30Dias_Coex5_${new Date().toISOString().split('T')[0]}.csv`;
    }

    if (dataToExport.length === 0) {
      toast.error('No hay datos para exportar en esta categoría');
      return;
    }

    const headers = [
      'TIPO DE REPORTE',
      'FECHA Y HORA',
      'COORDENADAS EXACTAS',
      'ANIMAL',
      'SITUACIÓN / NOTAS',
      'ENLACE DE EVIDENCIA',
      'CONTACTO DE USUARIO',
      'ESTADO'
    ];

    const csvContent = [
      headers.join(','),
      ...dataToExport.map(r => [
        r.type.toUpperCase(),
        `"${new Date(r.created_at).toLocaleString()}"`,
        `"${r.lat}, ${r.lng}"`,
        r.animal === 'otros' && r.specific_animal ? `"${t('report.other')}: ${r.specific_animal.toUpperCase()}"` : t(`report.${r.animal}`).toUpperCase(),
        `"${(r.notes || 'N/A').replace(/"/g, '""')}"`,
        r.photo_url || 'Sin foto',
        r.anonymous ? t('admin.anonymous') : `"${(r.user_name || 'N/A').replace(/"/g, '""')}"`,
        r.status === 'verified' ? 'VERIFICADO' : r.status === 'denied' ? 'DENEGADO' : 'PENDIENTE'
      ].join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    if (link.download !== undefined) {
      const url = URL.createObjectURL(blob);
      link.setAttribute('href', url);
      link.setAttribute('download', filename);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
    setShowExportModal(false);
    toast.success('CSV exportado correctamente');
  };

  const copyChartToClipboard = async () => {
    if (chartRef.current) {
      try {
        const blob = await toBlob(chartRef.current);
        if (blob) {
          await navigator.clipboard.write([
            new ClipboardItem({ 'image/png': blob })
          ]);
          toast.success('Gráfica copiada al portapapeles');
        }
      } catch (err) {
        toast.error('Error al copiar gráfica');
      }
    }
  };

  const copyMapToClipboard = async (ref: React.RefObject<HTMLDivElement>) => {
    if (ref.current) {
      try {
        const blob = await toBlob(ref.current, { cacheBust: true, style: { transform: 'scale(1)' } });
        if (blob) {
          await navigator.clipboard.write([
            new ClipboardItem({ 'image/png': blob })
          ]);
          toast.success('Mapa copiado al portapapeles');
        }
      } catch (err) {
        console.error(err);
        toast.error('Error al copiar mapa');
      }
    }
  };

  const heatmapPoints: [number, number, number][] = allReports
    .filter(r => r.lat && r.lng)
    .map(r => [Number(r.lat), Number(r.lng), 1]);

  const displayReports = activeTab === 'recientes' 
    ? reports.filter(r => r.status === 'pending')
    : activeTab === 'verificados'
      ? reports.filter(r => r.status === 'verified')
      : allReports;

  return (
    <div className="flex flex-col min-h-screen bg-background-light dark:bg-background-dark pb-24">
      <Header />
      
      <div className="p-5 space-y-6">
        {permissionError && (
          <div className="bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/20 rounded-2xl p-4 flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
            <div>
              <h3 className="text-sm font-bold text-red-800 dark:text-red-400">Error de Permisos en Firebase</h3>
              <p className="text-xs text-red-600 dark:text-red-300 mt-1">
                No se pueden leer ni escribir datos. Para que el dashboard funcione con la base de datos, debes actualizar las reglas de seguridad de Firestore en tu consola de Firebase:
              </p>
              <pre className="mt-2 bg-white/50 dark:bg-black/20 p-2 rounded-lg text-[10px] text-red-800 dark:text-red-300 overflow-x-auto">
{`rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /{document=**} {
      allow read, write: if request.auth != null;
    }
  }
}`}
              </pre>
              <p className="text-xs text-red-600 dark:text-red-300 mt-2 font-bold">
                Actualmente estás viendo datos de prueba (MOCK DATA). Los cambios no se guardarán en la base de datos.
              </p>
            </div>
          </div>
        )}

        <div className="flex items-center justify-between">
          <h1 className="text-xl font-bold text-slate-900 dark:text-white">{t('admin.dashboard')}</h1>
          <button 
            onClick={() => setShowExportModal(true)}
            className="flex items-center gap-2 bg-green-600 hover:bg-green-700 text-white px-3 py-2 rounded-xl text-xs font-bold transition-colors shadow-lg shadow-green-600/20"
          >
            <Download className="w-4 h-4" />
            {t('admin.export_data')}
          </button>
        </div>

        {showExportModal && (
          <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-white dark:bg-surface-dark w-full max-w-md rounded-3xl overflow-hidden shadow-2xl">
              <div className="p-5 border-b border-slate-200 dark:border-surface-lighter flex items-center justify-between">
                <h3 className="font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <Download className="w-5 h-5 text-green-500" /> {t('admin.export_excel')}
                </h3>
                <button onClick={() => setShowExportModal(false)} className="text-slate-400 hover:text-slate-600 p-1">
                  <XCircle className="w-5 h-5" />
                </button>
              </div>
              <div className="p-5 space-y-3">
                <div className="grid grid-cols-2 gap-2">
                  <button onClick={() => exportToExcel('all')} className="w-full text-left p-3 rounded-xl border border-slate-200 dark:border-surface-lighter hover:border-green-500 hover:bg-green-50 dark:hover:bg-green-500/10 transition-all">
                    <p className="font-bold text-slate-900 dark:text-white text-xs">{t('admin.export_excel_history')}</p>
                  </button>
                  <button onClick={() => exportToCSV('all')} className="w-full text-left p-3 rounded-xl border border-slate-200 dark:border-surface-lighter hover:border-blue-500 hover:bg-blue-50 dark:hover:bg-blue-500/10 transition-all">
                    <p className="font-bold text-slate-900 dark:text-white text-xs">{t('admin.export_csv_history')}</p>
                  </button>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <button onClick={() => exportToExcel('recent')} className="w-full text-left p-3 rounded-xl border border-slate-200 dark:border-surface-lighter hover:border-green-500 hover:bg-green-50 dark:hover:bg-green-500/10 transition-all">
                    <p className="font-bold text-slate-900 dark:text-white text-xs">{t('admin.export_excel_30')}</p>
                  </button>
                  <button onClick={() => exportToCSV('recent')} className="w-full text-left p-3 rounded-xl border border-slate-200 dark:border-surface-lighter hover:border-blue-500 hover:bg-blue-50 dark:hover:bg-blue-500/10 transition-all">
                    <p className="font-bold text-slate-900 dark:text-white text-xs">{t('admin.export_csv_30')}</p>
                  </button>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <button onClick={() => exportToExcel('verified')} className="w-full text-left p-3 rounded-xl border border-slate-200 dark:border-surface-lighter hover:border-green-500 hover:bg-green-50 dark:hover:bg-green-500/10 transition-all">
                    <p className="font-bold text-slate-900 dark:text-white text-xs">{t('admin.export_excel_verified')}</p>
                  </button>
                  <button onClick={() => exportToCSV('verified')} className="w-full text-left p-3 rounded-xl border border-slate-200 dark:border-surface-lighter hover:border-blue-500 hover:bg-blue-50 dark:hover:bg-blue-500/10 transition-all">
                    <p className="font-bold text-slate-900 dark:text-white text-xs">{t('admin.export_csv_verified')}</p>
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div 
            onClick={() => { setActiveTab('totales'); openDetailsModal('reports'); }}
            className={`cursor-pointer p-4 rounded-2xl border transition-all shadow-sm ${activeTab === 'totales' ? 'bg-blue-50 dark:bg-blue-500/10 border-blue-500' : 'bg-white dark:bg-surface-dark border-slate-200 dark:border-surface-lighter hover:border-blue-300'}`}
          >
            <div className="flex items-center gap-2 mb-2">
              <div className="p-1.5 bg-blue-100 dark:bg-blue-500/20 text-blue-600 dark:text-blue-400 rounded-lg">
                <FileText className="w-4 h-4" />
              </div>
              <h3 className="text-slate-500 dark:text-slate-400 text-xs font-bold uppercase tracking-wider">{t('admin.total_reports')}</h3>
            </div>
            <p className="text-2xl font-black text-slate-900 dark:text-white">{stats.total}</p>
          </div>
          <div 
            onClick={() => { setActiveTab('verificados'); openDetailsModal('verified'); }}
            className={`cursor-pointer p-4 rounded-2xl border transition-all shadow-sm ${activeTab === 'verificados' ? 'bg-green-50 dark:bg-green-500/10 border-green-500' : 'bg-white dark:bg-surface-dark border-slate-200 dark:border-surface-lighter hover:border-green-300'}`}
          >
            <div className="flex items-center gap-2 mb-2">
              <div className="p-1.5 bg-green-100 dark:bg-green-500/20 text-green-600 dark:text-green-400 rounded-lg">
                <CheckCircle className="w-4 h-4" />
              </div>
              <h3 className="text-slate-500 dark:text-slate-400 text-xs font-bold uppercase tracking-wider">{t('admin.verified_reports')}</h3>
            </div>
            <p className="text-2xl font-black text-slate-900 dark:text-white">{stats.verified}</p>
          </div>
          <div 
            onClick={() => { setActiveTab('canjes'); openDetailsModal('redemptions'); }}
            className={`cursor-pointer p-4 rounded-2xl border transition-all shadow-sm ${activeTab === 'canjes' ? 'bg-orange-50 dark:bg-orange-500/10 border-orange-500' : 'bg-white dark:bg-surface-dark border-slate-200 dark:border-surface-lighter hover:border-orange-300'}`}
          >
            <div className="flex items-center gap-2 mb-2">
              <div className="p-1.5 bg-orange-100 dark:bg-orange-500/20 text-orange-600 dark:text-orange-400 rounded-lg">
                <Heart className="w-4 h-4" />
              </div>
              <h3 className="text-slate-500 dark:text-slate-400 text-xs font-bold uppercase tracking-wider">{t('admin.pending_redemptions')}</h3>
            </div>
            <p className="text-2xl font-black text-slate-900 dark:text-white">{redemptions.filter(r => r.status === 'pending').length}</p>
          </div>
          <div 
            onClick={() => { setActiveTab('mensajes'); openDetailsModal('messages'); }}
            className={`cursor-pointer p-4 rounded-2xl border transition-all shadow-sm ${activeTab === 'mensajes' ? 'bg-teal-50 dark:bg-teal-500/10 border-teal-500' : 'bg-white dark:bg-surface-dark border-slate-200 dark:border-surface-lighter hover:border-teal-300'}`}
          >
            <div className="flex items-center gap-2 mb-2">
              <div className="p-1.5 bg-teal-100 dark:bg-teal-500/20 text-teal-600 dark:text-teal-400 rounded-lg">
                <MessageCircle className="w-4 h-4" />
              </div>
              <h3 className="text-slate-500 dark:text-slate-400 text-xs font-bold uppercase tracking-wider">{t('admin.messages')}</h3>
            </div>
            <p className="text-2xl font-black text-slate-900 dark:text-white">{messages.length}</p>
          </div>
        </div>

        {showDetailsModal && (
          <div className="fixed inset-0 z-[100] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200">
            <div className="bg-white dark:bg-surface-dark w-full max-w-lg rounded-3xl overflow-hidden shadow-2xl flex flex-col max-h-[80vh]">
              <div className="p-5 border-b border-slate-200 dark:border-surface-lighter flex items-center justify-between shrink-0">
                <h3 className="font-bold text-slate-900 dark:text-white text-lg">{getModalTitle()}</h3>
                <button onClick={() => setShowDetailsModal(false)} className="text-slate-400 hover:text-slate-600 p-1">
                  <XCircle className="w-6 h-6" />
                </button>
              </div>
              <div className="p-5 overflow-y-auto">
                {renderModalContent()}
              </div>
            </div>
          </div>
        )}

        <div className="bg-white dark:bg-surface-dark p-4 rounded-2xl border border-slate-200 dark:border-surface-lighter shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider">{t('admin.frequency_type')}</h3>
            <button onClick={copyChartToClipboard} className="text-slate-400 hover:text-primary transition-colors" title="Copiar Gráfica">
              <Copy className="w-4 h-4" />
            </button>
          </div>
          <div className="h-48 w-full" ref={chartRef}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#333" opacity={0.2} />
                <XAxis dataKey="name" stroke="#888" fontSize={10} tickLine={false} axisLine={false} />
                <YAxis stroke="#888" fontSize={10} tickLine={false} axisLine={false} />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#1A1D26', border: 'none', borderRadius: '8px', color: '#fff', fontSize: '12px', textTransform: 'uppercase' }}
                  itemStyle={{ color: '#f48c25', fontWeight: 'bold' }}
                  cursor={{ fill: 'rgba(244, 140, 37, 0.1)' }}
                />
                <Bar dataKey="count" fill="#f48c25" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-white dark:bg-surface-dark p-4 rounded-2xl border border-slate-200 dark:border-surface-lighter shadow-sm overflow-hidden">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider">{t('admin.heatmap_history')}</h3>
            <button onClick={() => copyMapToClipboard(mapRef)} className="text-slate-400 hover:text-primary transition-colors" title="Copiar Mapa">
              <Copy className="w-4 h-4" />
            </button>
          </div>
          <div className="h-64 w-full rounded-xl overflow-hidden relative z-0" ref={mapRef}>
            <MapContainer center={[-16.290154, -63.588653]} zoom={5} style={{ height: '100%', width: '100%' }} zoomControl={false}>
              <TileLayer
                url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
              />
              <HeatmapLayer points={heatmapPoints} />
              {allReports.map((report) => (
                <CircleMarker 
                  key={report.id} 
                  center={[report.lat, report.lng]} 
                  radius={4}
                  fillColor={report.type === 'depredacion' ? '#ef4444' : '#f59e0b'}
                  color="#fff"
                  weight={1}
                  fillOpacity={0.8}
                >
                  <Popup className="custom-popup">
                    <div className="text-xs">
                      <p className="font-bold capitalize">{report.type}</p>
                      <p>{report.animal}</p>
                    </div>
                  </Popup>
                </CircleMarker>
              ))}
            </MapContainer>
          </div>
        </div>

        <div className="bg-white dark:bg-surface-dark p-4 rounded-2xl border border-slate-200 dark:border-surface-lighter shadow-sm overflow-hidden">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider">{t('admin.heatmap_30')}</h3>
            <button onClick={() => copyMapToClipboard(recentMapRef)} className="text-slate-400 hover:text-primary transition-colors" title="Copiar Mapa">
              <Copy className="w-4 h-4" />
            </button>
          </div>
          <div className="h-48 w-full rounded-xl overflow-hidden relative z-0" ref={recentMapRef}>
            <MapContainer center={[-16.290154, -63.588653]} zoom={5} style={{ height: '100%', width: '100%' }} zoomControl={false}>
              <TileLayer
                url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
              />
              <HeatmapLayer points={heatmapPoints} />
              {reports.map((report) => (
                <CircleMarker 
                  key={report.id} 
                  center={[report.lat, report.lng]} 
                  radius={4}
                  fillColor={report.type === 'depredacion' ? '#ef4444' : '#f59e0b'}
                  color="#fff"
                  weight={1}
                  fillOpacity={0.8}
                >
                  <Popup className="custom-popup">
                    <div className="text-xs">
                      <p className="font-bold capitalize">{report.type}</p>
                      <p>{report.animal}</p>
                    </div>
                  </Popup>
                </CircleMarker>
              ))}
            </MapContainer>
          </div>
        </div>

        <div>
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-bold text-slate-900 dark:text-white">
              {activeTab === 'recientes' ? t('admin.pending_reports') : activeTab === 'verificados' ? t('admin.verified_reports_30') : activeTab === 'canjes' ? t('admin.redemption_requests') : t('admin.report_history')}
            </h3>
            {activeTab !== 'recientes' && (
              <button onClick={() => setActiveTab('recientes')} className="text-xs text-primary font-bold">{t('admin.view_pending')}</button>
            )}
          </div>
          
          <div className="space-y-4">
            {activeTab === 'mensajes' ? (
              messages.map((m) => (
                <div key={m.id} className="bg-white dark:bg-surface-dark rounded-2xl border border-slate-200 dark:border-surface-lighter overflow-hidden shadow-sm p-4">
                  <h4 className="font-bold text-slate-900 dark:text-white">{m.user_name}</h4>
                  <p className="text-sm text-slate-500 dark:text-slate-400 mb-2">{t('admin.contact')}: {m.user_contact}</p>
                  <div className="bg-slate-50 dark:bg-black/20 p-3 rounded-lg text-sm italic text-slate-700 dark:text-slate-300">
                    "{m.message}"
                  </div>
                  <p className="text-xs text-slate-400 mt-2 text-right">{new Date(m.created_at).toLocaleString()}</p>
                </div>
              ))
            ) : activeTab === 'canjes' ? (
              redemptions.map((redemption) => (
                <div key={redemption.id} className="bg-white dark:bg-surface-dark rounded-2xl border border-slate-200 dark:border-surface-lighter overflow-hidden shadow-sm p-4">
                  <div className="flex justify-between items-start mb-3">
                    <div>
                      <span className={`inline-block px-2 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider mb-2 ${
                        redemption.status === 'approved' ? 'bg-green-100 text-green-700 dark:bg-green-500/20 dark:text-green-400' :
                        redemption.status === 'rejected' ? 'bg-red-100 text-red-700 dark:bg-red-500/20 dark:text-red-400' :
                        'bg-yellow-100 text-yellow-700 dark:bg-yellow-500/20 dark:text-yellow-400'
                      }`}>
                        {redemption.status === 'pending' ? t('admin.status_pending') : redemption.status === 'approved' ? t('admin.status_approved') : t('admin.status_rejected')}
                      </span>
                      <h4 className="font-bold text-slate-900 dark:text-white capitalize text-lg leading-tight">{redemption.user_name}</h4>
                      <p className="text-sm text-slate-500 dark:text-slate-400">{redemption.contact}</p>
                    </div>
                    <div className="text-right">
                      <p className="font-black text-2xl text-primary">{redemption.points} pts</p>
                      <p className="text-xs text-slate-400">{new Date(redemption.created_at).toLocaleDateString()}</p>
                    </div>
                  </div>
                  
                  {redemption.status === 'pending' && (
                    <div className="flex gap-2 mt-2">
                      <button 
                        onClick={() => handleRedemptionStatus(redemption.id, 'approved')}
                        className="flex-1 bg-green-50 hover:bg-green-100 text-green-600 dark:bg-green-500/10 dark:hover:bg-green-500/20 dark:text-green-400 py-2 rounded-xl text-sm font-bold transition-colors"
                      >
                        {t('admin.approve')}
                      </button>
                      <button 
                        onClick={() => handleRedemptionStatus(redemption.id, 'rejected')}
                        className="flex-1 bg-red-50 hover:bg-red-100 text-red-600 dark:bg-red-500/10 dark:hover:bg-red-500/20 dark:text-red-400 py-2 rounded-xl text-sm font-bold transition-colors"
                      >
                        {t('admin.reject')}
                      </button>
                    </div>
                  )}
                </div>
              ))
            ) : (
              displayReports.map((report) => (
                <div key={report.id} className="bg-white dark:bg-surface-dark rounded-2xl border border-slate-200 dark:border-surface-lighter overflow-hidden shadow-sm hover:shadow-md transition-shadow">
                  <div className="p-4">
                    <div className="flex justify-between items-start mb-2">
                      <div>
                        <span className={`inline-block px-2 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider mb-2 ${
                          report.type === 'depredacion' ? 'bg-red-100 text-red-700 dark:bg-red-500/20 dark:text-red-400' : 'bg-orange-100 text-orange-700 dark:bg-orange-500/20 dark:text-orange-400'
                        }`}>
                          {report.type}
                        </span>
                        <h3 className="font-bold text-slate-900 dark:text-white text-lg capitalize flex items-center gap-2">
                          {report.animal === 'otros' && report.specific_animal ? report.specific_animal : report.animal}
                          {report.status === 'verified' && <CheckCircle className="w-4 h-4 text-green-500" />}
                        </h3>
                      </div>
                      <span className="text-xs font-mono text-slate-400 bg-slate-100 dark:bg-black/30 px-2 py-1 rounded-lg">
                        {new Date(report.created_at).toLocaleDateString()}
                      </span>
                    </div>
                    
                    <p className="text-sm text-slate-600 dark:text-slate-300 mb-3 line-clamp-2">
                      {report.notes || 'Sin notas adicionales'}
                    </p>

                    {report.photo_url && (
                      <div className="mb-3 rounded-xl overflow-hidden h-32 w-full bg-slate-100 dark:bg-black/20">
                        <img src={report.photo_url} alt="Evidencia" className="w-full h-full object-cover" />
                      </div>
                    )}

                    <div className="flex items-center justify-between pt-3 border-t border-slate-100 dark:border-slate-700/50">
                      <div className="flex items-center gap-2">
                        <div className="h-6 w-6 rounded-full bg-slate-200 dark:bg-slate-700 flex items-center justify-center text-[10px] font-bold text-slate-600 dark:text-slate-300">
                          {report.user_name ? report.user_name.charAt(0).toUpperCase() : '?'}
                        </div>
                        <span className="text-xs text-slate-500 dark:text-slate-400 truncate max-w-[100px]">
                          {report.anonymous ? t('admin.anonymous') : report.user_name}
                        </span>
                      </div>
                      
                      <div className="flex gap-2">
                        {report.status === 'pending' ? (
                          <>
                            <button 
                              onClick={() => handleStatusUpdate(report.id, 'denied')}
                              className="p-2 rounded-lg bg-red-50 text-red-600 hover:bg-red-100 dark:bg-red-500/10 dark:hover:bg-red-500/20 dark:text-red-400 transition-colors"
                              title={t('admin.reject')}
                            >
                              <XCircle className="w-5 h-5" />
                            </button>
                            <button 
                              onClick={() => handleStatusUpdate(report.id, 'verified')}
                              className="p-2 rounded-lg bg-green-50 text-green-600 hover:bg-green-100 dark:bg-green-500/10 dark:hover:bg-green-500/20 dark:text-green-400 transition-colors"
                              title={t('admin.approve')}
                            >
                              <CheckCircle className="w-5 h-5" />
                            </button>
                          </>
                        ) : (
                          <span className={`text-xs font-bold uppercase px-2 py-1 rounded ${
                            report.status === 'verified' ? 'text-green-600 bg-green-50 dark:text-green-400 dark:bg-green-500/10' : 'text-red-600 bg-red-50 dark:text-red-400 dark:bg-red-500/10'
                          }`}>
                            {report.status === 'verified' ? t('admin.status_verified') : t('admin.status_denied')}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default function AdminDashboard({ user, setUser }: { user: any, setUser: any }) {
  return (
    <Routes>
      <Route path="/" element={<DashboardHome />} />
      <Route path="/editor" element={<Editor />} />
    </Routes>
  );
}
