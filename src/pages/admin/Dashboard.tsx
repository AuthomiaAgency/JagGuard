import React, { useState, useEffect, useRef } from 'react';
import { Routes, Route } from 'react-router-dom';
import { FileText, Download, CheckCircle, XCircle, Plus, Image as ImageIcon, Eye, AlertTriangle, Info, Map as MapIcon, Camera, Leaf, Zap, Heart, BookOpen, LayoutTemplate, ListOrdered, Copy, PawPrint, Shield, MessageCircle } from 'lucide-react';
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
import { collection, getDocs, addDoc, updateDoc, doc, query, orderBy, deleteDoc } from 'firebase/firestore';

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

function DashboardHome() {
  const [reports, setReports] = useState<any[]>([]);
  const [allReports, setAllReports] = useState<any[]>([]);
  const [stats, setStats] = useState({ total: 0, verified: 0 });
  const [chartData, setChartData] = useState<any[]>([]);
  const [showExportModal, setShowExportModal] = useState(false);
  const [activeTab, setActiveTab] = useState<'recientes' | 'totales' | 'verificados' | 'canjes' | 'usuarios' | 'mensajes'>('recientes');
  const [redemptions, setRedemptions] = useState<any[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [messages, setMessages] = useState<any[]>([]);
  const [permissionError, setPermissionError] = useState(false);
  const chartRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<HTMLDivElement>(null);
  const recentMapRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetchReports();
    fetchRedemptions();
    fetchUsers();
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

  const fetchUsers = async () => {
    try {
      const usersRef = collection(db, 'users');
      const querySnapshot = await getDocs(usersRef);
      setUsers(querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      setPermissionError(false);
    } catch (error: any) {
      console.warn('Error fetching users:', error.message);
      if (error.code === 'permission-denied') setPermissionError(true);
      setUsers([]);
    }
  };

  const handleUserRole = async (id: string, currentRole: string) => {
    const newRole = currentRole === 'admin' ? 'user' : 'admin';

    try {
      const ref = doc(db, 'users', id);
      await updateDoc(ref, { role: newRole });
      toast.success(`Rol actualizado a ${newRole}`);
      fetchUsers();
    } catch (error: any) {
      console.error("Error updating user role", error);
      if (error.code === 'permission-denied') {
        toast.error('Error de permisos en Firebase. Revisa las reglas de Firestore.');
      } else {
        toast.error('Error al actualizar rol');
      }
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
      const typeCounts: Record<string, number> = {};
      recentReports.forEach((r: any) => {
        typeCounts[r.type] = (typeCounts[r.type] || 0) + 1;
      });
      setChartData(Object.keys(typeCounts).map(key => ({
        name: key.toUpperCase().replace('-', ' '),
        count: typeCounts[key]
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
      await updateDoc(reportRef, { status });
      
      toast.success(`Reporte ${status === 'verified' ? 'verificado' : 'denegado'}`);
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
      'ANIMAL': r.animal.toUpperCase(),
      'SITUACIÓN / NOTAS': r.notes || 'N/A',
      'ENLACE DE EVIDENCIA': r.photo_url ? { t: 's', v: 'Ver Imagen', l: { Target: r.photo_url } } : 'Sin foto',
      'CONTACTO DE USUARIO': r.anonymous ? 'Anónimo' : `${r.user_name || 'N/A'}`,
      'ESTADO': r.status === 'verified' ? 'VERIFICADO' : r.status === 'denied' ? 'DENEGADO' : 'PENDIENTE'
    }));

    const ws = XLSX.utils.json_to_sheet(exportData);
    
    // Auto-size columns
    const colWidths = [
      { wch: 20 }, // TIPO
      { wch: 20 }, // FECHA
      { wch: 25 }, // COORDENADAS
      { wch: 15 }, // ANIMAL
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
        r.animal.toUpperCase(),
        `"${(r.notes || 'N/A').replace(/"/g, '""')}"`,
        r.photo_url || 'Sin foto',
        r.anonymous ? 'Anónimo' : `"${(r.user_name || 'N/A').replace(/"/g, '""')}"`,
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

  const heatmapPoints: [number, number, number][] = allReports.map(r => [r.lat, r.lng, 1]);

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
          <h1 className="text-xl font-bold text-slate-900 dark:text-white">Dashboard</h1>
          <button 
            onClick={() => setShowExportModal(true)}
            className="flex items-center gap-2 bg-green-600 hover:bg-green-700 text-white px-3 py-2 rounded-xl text-xs font-bold transition-colors shadow-lg shadow-green-600/20"
          >
            <Download className="w-4 h-4" />
            Exportar Datos
          </button>
        </div>

        {showExportModal && (
          <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-white dark:bg-surface-dark w-full max-w-md rounded-3xl overflow-hidden shadow-2xl">
              <div className="p-5 border-b border-slate-200 dark:border-surface-lighter flex items-center justify-between">
                <h3 className="font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <Download className="w-5 h-5 text-green-500" /> Exportar a Excel
                </h3>
                <button onClick={() => setShowExportModal(false)} className="text-slate-400 hover:text-slate-600 p-1">
                  <XCircle className="w-5 h-5" />
                </button>
              </div>
              <div className="p-5 space-y-3">
                <div className="grid grid-cols-2 gap-2">
                  <button onClick={() => exportToExcel('all')} className="w-full text-left p-3 rounded-xl border border-slate-200 dark:border-surface-lighter hover:border-green-500 hover:bg-green-50 dark:hover:bg-green-500/10 transition-all">
                    <p className="font-bold text-slate-900 dark:text-white text-xs">Excel: Histórico</p>
                  </button>
                  <button onClick={() => exportToCSV('all')} className="w-full text-left p-3 rounded-xl border border-slate-200 dark:border-surface-lighter hover:border-blue-500 hover:bg-blue-50 dark:hover:bg-blue-500/10 transition-all">
                    <p className="font-bold text-slate-900 dark:text-white text-xs">CSV: Histórico</p>
                  </button>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <button onClick={() => exportToExcel('recent')} className="w-full text-left p-3 rounded-xl border border-slate-200 dark:border-surface-lighter hover:border-green-500 hover:bg-green-50 dark:hover:bg-green-500/10 transition-all">
                    <p className="font-bold text-slate-900 dark:text-white text-xs">Excel: 30 Días</p>
                  </button>
                  <button onClick={() => exportToCSV('recent')} className="w-full text-left p-3 rounded-xl border border-slate-200 dark:border-surface-lighter hover:border-blue-500 hover:bg-blue-50 dark:hover:bg-blue-500/10 transition-all">
                    <p className="font-bold text-slate-900 dark:text-white text-xs">CSV: 30 Días</p>
                  </button>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <button onClick={() => exportToExcel('verified')} className="w-full text-left p-3 rounded-xl border border-slate-200 dark:border-surface-lighter hover:border-green-500 hover:bg-green-50 dark:hover:bg-green-500/10 transition-all">
                    <p className="font-bold text-slate-900 dark:text-white text-xs">Excel: Verificados</p>
                  </button>
                  <button onClick={() => exportToCSV('verified')} className="w-full text-left p-3 rounded-xl border border-slate-200 dark:border-surface-lighter hover:border-blue-500 hover:bg-blue-50 dark:hover:bg-blue-500/10 transition-all">
                    <p className="font-bold text-slate-900 dark:text-white text-xs">CSV: Verificados</p>
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          <div 
            onClick={() => setActiveTab('totales')}
            className={`cursor-pointer p-4 rounded-2xl border transition-all shadow-sm ${activeTab === 'totales' ? 'bg-blue-50 dark:bg-blue-500/10 border-blue-500' : 'bg-white dark:bg-surface-dark border-slate-200 dark:border-surface-lighter hover:border-blue-300'}`}
          >
            <div className="flex items-center gap-2 mb-2">
              <div className="p-1.5 bg-blue-100 dark:bg-blue-500/20 text-blue-600 dark:text-blue-400 rounded-lg">
                <FileText className="w-4 h-4" />
              </div>
              <h3 className="text-slate-500 dark:text-slate-400 text-xs font-bold uppercase tracking-wider">Reportes Totales</h3>
            </div>
            <p className="text-2xl font-black text-slate-900 dark:text-white">{stats.total}</p>
          </div>
          <div 
            onClick={() => setActiveTab('verificados')}
            className={`cursor-pointer p-4 rounded-2xl border transition-all shadow-sm ${activeTab === 'verificados' ? 'bg-green-50 dark:bg-green-500/10 border-green-500' : 'bg-white dark:bg-surface-dark border-slate-200 dark:border-surface-lighter hover:border-green-300'}`}
          >
            <div className="flex items-center gap-2 mb-2">
              <div className="p-1.5 bg-green-100 dark:bg-green-500/20 text-green-600 dark:text-green-400 rounded-lg">
                <CheckCircle className="w-4 h-4" />
              </div>
              <h3 className="text-slate-500 dark:text-slate-400 text-xs font-bold uppercase tracking-wider">Reportes Verificados</h3>
            </div>
            <p className="text-2xl font-black text-slate-900 dark:text-white">{stats.verified}</p>
          </div>
          <div 
            onClick={() => setActiveTab('canjes')}
            className={`cursor-pointer p-4 rounded-2xl border transition-all shadow-sm ${activeTab === 'canjes' ? 'bg-orange-50 dark:bg-orange-500/10 border-orange-500' : 'bg-white dark:bg-surface-dark border-slate-200 dark:border-surface-lighter hover:border-orange-300'}`}
          >
            <div className="flex items-center gap-2 mb-2">
              <div className="p-1.5 bg-orange-100 dark:bg-orange-500/20 text-orange-600 dark:text-orange-400 rounded-lg">
                <Heart className="w-4 h-4" />
              </div>
              <h3 className="text-slate-500 dark:text-slate-400 text-xs font-bold uppercase tracking-wider">Canjes Pendientes</h3>
            </div>
            <p className="text-2xl font-black text-slate-900 dark:text-white">{redemptions.filter(r => r.status === 'pending').length}</p>
          </div>
          <div 
            onClick={() => setActiveTab('usuarios')}
            className={`cursor-pointer p-4 rounded-2xl border transition-all shadow-sm ${activeTab === 'usuarios' ? 'bg-purple-50 dark:bg-purple-500/10 border-purple-500' : 'bg-white dark:bg-surface-dark border-slate-200 dark:border-surface-lighter hover:border-purple-300'}`}
          >
            <div className="flex items-center gap-2 mb-2">
              <div className="p-1.5 bg-purple-100 dark:bg-purple-500/20 text-purple-600 dark:text-purple-400 rounded-lg">
                <Shield className="w-4 h-4" />
              </div>
              <h3 className="text-slate-500 dark:text-slate-400 text-xs font-bold uppercase tracking-wider">Usuarios</h3>
            </div>
            <p className="text-2xl font-black text-slate-900 dark:text-white">{users.length}</p>
          </div>
          <div 
            onClick={() => setActiveTab('mensajes')}
            className={`cursor-pointer p-4 rounded-2xl border transition-all shadow-sm ${activeTab === 'mensajes' ? 'bg-teal-50 dark:bg-teal-500/10 border-teal-500' : 'bg-white dark:bg-surface-dark border-slate-200 dark:border-surface-lighter hover:border-teal-300'}`}
          >
            <div className="flex items-center gap-2 mb-2">
              <div className="p-1.5 bg-teal-100 dark:bg-teal-500/20 text-teal-600 dark:text-teal-400 rounded-lg">
                <MessageCircle className="w-4 h-4" />
              </div>
              <h3 className="text-slate-500 dark:text-slate-400 text-xs font-bold uppercase tracking-wider">Mensajes</h3>
            </div>
            <p className="text-2xl font-black text-slate-900 dark:text-white">{messages.length}</p>
          </div>
        </div>

        <div className="bg-white dark:bg-surface-dark p-4 rounded-2xl border border-slate-200 dark:border-surface-lighter shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider">Frecuencia por Tipo (30d)</h3>
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
            <h3 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider">Mapa de Calor (Histórico)</h3>
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
            <h3 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider">Mapa de Calor (Últimos 30 días)</h3>
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
              {activeTab === 'recientes' ? 'Reportes Pendientes' : activeTab === 'verificados' ? 'Reportes Verificados (30d)' : activeTab === 'canjes' ? 'Solicitudes de Canje' : activeTab === 'usuarios' ? 'Gestión de Usuarios' : 'Historial de Reportes'}
            </h3>
            {activeTab !== 'recientes' && (
              <button onClick={() => setActiveTab('recientes')} className="text-xs text-primary font-bold">Ver Pendientes</button>
            )}
          </div>
          
          <div className="space-y-4">
            {activeTab === 'usuarios' ? (
              users.map((u) => (
                <div key={u.id} className="bg-white dark:bg-surface-dark rounded-2xl border border-slate-200 dark:border-surface-lighter overflow-hidden shadow-sm p-4 flex items-center justify-between">
                  <div>
                    <h4 className="font-bold text-slate-900 dark:text-white capitalize text-lg leading-tight">{u.name || 'Usuario'}</h4>
                    <p className="text-sm text-slate-500 dark:text-slate-400">{u.email || u.phone || 'Sin contacto'}</p>
                    <div className="mt-2 flex items-center gap-2">
                      <span className="text-xs font-bold text-slate-500">Puntos: {u.points || 0}</span>
                      <span className={`inline-block px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider ${
                        u.role === 'admin' ? 'bg-purple-100 text-purple-700 dark:bg-purple-500/20 dark:text-purple-400' : 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-400'
                      }`}>
                        {u.role === 'admin' ? 'Administrador' : 'Usuario'}
                      </span>
                    </div>
                  </div>
                  <button 
                    onClick={() => handleUserRole(u.id, u.role)}
                    className={`px-4 py-2 rounded-xl text-sm font-bold transition-colors ${
                      u.role === 'admin' 
                        ? 'bg-red-50 hover:bg-red-100 text-red-600 dark:bg-red-500/10 dark:hover:bg-red-500/20 dark:text-red-400' 
                        : 'bg-primary/10 hover:bg-primary/20 text-primary'
                    }`}
                  >
                    {u.role === 'admin' ? 'Quitar Admin' : 'Hacer Admin'}
                  </button>
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
                        {redemption.status === 'pending' ? 'Pendiente' : redemption.status === 'approved' ? 'Aprobado' : 'Rechazado'}
                      </span>
                      <h4 className="font-bold text-slate-900 dark:text-white capitalize text-lg leading-tight">{redemption.user_name}</h4>
                      <p className="text-sm text-slate-500 dark:text-slate-400">{redemption.contact}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-xs text-slate-500 dark:text-slate-400">{new Date(redemption.created_at).toLocaleDateString()}</p>
                      <p className="text-sm font-bold text-primary mt-1">{redemption.points} Pts</p>
                    </div>
                  </div>

                  {redemption.status === 'pending' && (
                    <div className="flex gap-2 pt-3 border-t border-slate-100 dark:border-surface-lighter">
                      <button 
                        onClick={() => handleRedemptionStatus(redemption.id, 'approved')}
                        className="flex-1 bg-green-50 hover:bg-green-100 dark:bg-green-500/10 dark:hover:bg-green-500/20 text-green-600 dark:text-green-400 py-2 rounded-xl text-sm font-bold transition-colors flex items-center justify-center gap-2"
                      >
                        <CheckCircle className="w-4 h-4" /> Aprobar
                      </button>
                      <button 
                        onClick={() => handleRedemptionStatus(redemption.id, 'rejected')}
                        className="flex-1 bg-red-50 hover:bg-red-100 dark:bg-red-500/10 dark:hover:bg-red-500/20 text-red-600 dark:text-red-400 py-2 rounded-xl text-sm font-bold transition-colors flex items-center justify-center gap-2"
                      >
                        <XCircle className="w-4 h-4" /> Rechazar
                      </button>
                    </div>
                  )}
                </div>
              ))
            ) : activeTab === 'mensajes' ? (
              messages.length === 0 ? (
                <div className="text-center py-12 text-slate-500 dark:text-slate-400">
                  <MessageCircle className="w-12 h-12 mx-auto mb-4 opacity-20" />
                  <p>No hay mensajes nuevos.</p>
                </div>
              ) : (
                messages.map((msg) => (
                  <div key={msg.id} className="bg-white dark:bg-surface-dark rounded-2xl border border-slate-200 dark:border-surface-lighter overflow-hidden shadow-sm p-4">
                    <div className="flex justify-between items-start mb-3">
                      <div>
                        <span className={`inline-block px-2 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider mb-2 ${
                          msg.status === 'read' ? 'bg-slate-100 text-slate-700 dark:bg-slate-500/20 dark:text-slate-400' :
                          'bg-teal-100 text-teal-700 dark:bg-teal-500/20 dark:text-teal-400'
                        }`}>
                          {msg.status === 'read' ? 'Leído' : 'Nuevo'}
                        </span>
                        <h4 className="font-bold text-slate-900 dark:text-white text-lg leading-tight">{msg.user_name}</h4>
                        <p className="text-sm text-slate-500 dark:text-slate-400">{msg.user_contact}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-xs text-slate-500 dark:text-slate-400">{new Date(msg.created_at).toLocaleDateString()}</p>
                        <p className="text-[10px] text-slate-400 mt-1">Ref: {msg.reference}</p>
                      </div>
                    </div>
                    <div className="bg-slate-50 dark:bg-surface-lighter p-3 rounded-xl text-sm text-slate-700 dark:text-slate-300">
                      {msg.message}
                    </div>
                    {msg.status !== 'read' && (
                      <div className="mt-3 flex justify-end">
                        <button 
                          onClick={async () => {
                            try {
                              await updateDoc(doc(db, 'messages', msg.id), { status: 'read' });
                              toast.success('Mensaje marcado como leído');
                              fetchMessages();
                            } catch (e: any) {
                              if (e.code === 'permission-denied') {
                                toast.error('Error de permisos en Firebase.');
                              } else {
                                toast.error('Error al actualizar');
                              }
                            }
                          }}
                          className="text-xs font-bold text-primary hover:underline flex items-center gap-1"
                        >
                          <CheckCircle className="w-3 h-3" /> Marcar como Leído
                        </button>
                      </div>
                    )}
                  </div>
                ))
              )
            ) : (
              displayReports.map((report) => (
                <div key={report.id} className="bg-white dark:bg-surface-dark rounded-2xl border border-slate-200 dark:border-surface-lighter overflow-hidden shadow-sm">
                  <div className="p-4">
                    <div className="flex justify-between items-start mb-3">
                      <div>
                        <span className={`inline-block px-2 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider mb-2 ${
                          report.status === 'verified' ? 'bg-green-100 text-green-700 dark:bg-green-500/20 dark:text-green-400' :
                          report.status === 'denied' ? 'bg-red-100 text-red-700 dark:bg-red-500/20 dark:text-red-400' :
                          'bg-yellow-100 text-yellow-700 dark:bg-yellow-500/20 dark:text-yellow-400'
                        }`}>
                          {report.status === 'pending' ? 'Pendiente' : report.status === 'verified' ? 'Verificado' : 'Denegado'}
                        </span>
                        <h4 className="font-bold text-slate-900 dark:text-white capitalize text-lg leading-tight">{report.type.replace('-', ' ')}</h4>
                        <p className="text-sm text-slate-500 dark:text-slate-400">{report.animal}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-xs text-slate-500 dark:text-slate-400">{new Date(report.created_at).toLocaleDateString()}</p>
                        <p className="text-[10px] text-slate-400 font-mono mt-1">{report.lat.toFixed(4)}, {report.lng.toFixed(4)}</p>
                      </div>
                    </div>

                    <div className="flex gap-4 mb-4">
                      <div className="w-24 h-24 rounded-xl overflow-hidden bg-slate-100 dark:bg-slate-800 shrink-0 border border-slate-200 dark:border-surface-lighter">
                        {report.photo_url ? (
                          <img src={report.photo_url} alt="Evidencia" className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-slate-400">Sin foto</div>
                        )}
                      </div>
                      <div className="flex-1">
                        <p className="text-xs text-slate-700 dark:text-slate-300 line-clamp-3 mb-2">
                          {report.notes || 'Sin descripción adicional.'}
                        </p>
                        <div className="bg-slate-50 dark:bg-surface-lighter p-2 rounded-lg">
                          <p className="text-[10px] text-slate-500 uppercase tracking-wider font-semibold mb-0.5">Usuario</p>
                          <p className="text-xs font-medium text-slate-900 dark:text-white">
                            {report.anonymous ? 'Anónimo' : report.user_name || 'Desconocido'}
                          </p>
                          {!report.anonymous && report.user_contact && (
                            <p className="text-[10px] text-slate-500">{report.user_contact}</p>
                          )}
                        </div>
                      </div>
                    </div>

                    {report.status === 'pending' && (
                      <div className="flex gap-2 pt-3 border-t border-slate-100 dark:border-surface-lighter">
                        <button 
                          onClick={() => handleStatusUpdate(report.id, 'verified')}
                          className="flex-1 bg-green-50 hover:bg-green-100 dark:bg-green-500/10 dark:hover:bg-green-500/20 text-green-600 dark:text-green-400 py-2 rounded-xl text-sm font-bold transition-colors flex items-center justify-center gap-2"
                        >
                          <CheckCircle className="w-4 h-4" /> Verificar
                        </button>
                        <button 
                          onClick={() => handleStatusUpdate(report.id, 'denied')}
                          className="flex-1 bg-red-50 hover:bg-red-100 dark:bg-red-500/10 dark:hover:bg-red-500/20 text-red-600 dark:text-red-400 py-2 rounded-xl text-sm font-bold transition-colors flex items-center justify-center gap-2"
                        >
                          <XCircle className="w-4 h-4" /> Denegar
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              ))
            )}
            {activeTab === 'canjes' && redemptions.length === 0 && (
              <p className="text-center text-slate-500 py-8">No hay solicitudes de canje.</p>
            )}
            {activeTab === 'usuarios' && users.length === 0 && (
              <p className="text-center text-slate-500 py-8">No hay usuarios registrados.</p>
            )}
            {activeTab !== 'canjes' && activeTab !== 'usuarios' && displayReports.length === 0 && (
              <p className="text-center text-slate-500 py-8">No hay reportes en esta categoría.</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function Editor() {
  const [activeTab, setActiveTab] = useState<'publicaciones' | 'grupos'>('publicaciones');
  const [selectedIcon, setSelectedIcon] = useState('paw');
  const [template, setTemplate] = useState<'blank' | 'gallery' | 'infographic'>('blank');
  const [content, setContent] = useState('');
  const [showPreview, setShowPreview] = useState(false);
  const [title, setTitle] = useState('');
  const [subtitle, setSubtitle] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [group, setGroup] = useState('');
  const [groupName, setGroupName] = useState('');
  const [groups, setGroups] = useState<any[]>([]);
  const [permissionError, setPermissionError] = useState(false);

  useEffect(() => {
    fetchGroups();
  }, []);

  const fetchGroups = async () => {
    try {
      const groupsRef = collection(db, 'groups');
      const querySnapshot = await getDocs(groupsRef);
      const fetchedGroups = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as any));
      setGroups(fetchedGroups);
      if (fetchedGroups.length > 0 && !group) {
        setGroup(fetchedGroups[0].name);
      }
      setPermissionError(false);
    } catch (error: any) {
      console.warn('Error fetching groups:', error.message);
      if (error.code === 'permission-denied') setPermissionError(true);
      setGroups([]);
    }
  };

  const handleTemplateChange = (t: 'blank' | 'gallery' | 'infographic') => {
    setTemplate(t);
    if (t === 'gallery') {
      setContent('<div class="grid grid-cols-2 gap-2">\n  <img src="https://picsum.photos/seed/1/400/300" class="rounded-xl w-full h-32 object-cover" />\n  <img src="https://picsum.photos/seed/2/400/300" class="rounded-xl w-full h-32 object-cover" />\n  <img src="https://picsum.photos/seed/3/400/300" class="rounded-xl w-full h-32 object-cover" />\n  <img src="https://picsum.photos/seed/4/400/300" class="rounded-xl w-full h-32 object-cover" />\n</div>');
    } else if (t === 'infographic') {
      setContent('<div class="bg-primary/10 p-6 rounded-2xl border border-primary/20 text-center">\n  <h2 class="text-2xl font-black text-primary mb-4">Pasos a seguir</h2>\n  <ol class="text-left space-y-4">\n    <li class="flex gap-3"><span class="w-6 h-6 rounded-full bg-primary text-white flex items-center justify-center font-bold shrink-0">1</span><p>Identificar el rastro con cuidado.</p></li>\n    <li class="flex gap-3"><span class="w-6 h-6 rounded-full bg-primary text-white flex items-center justify-center font-bold shrink-0">2</span><p>Tomar una fotografía clara con referencia de tamaño.</p></li>\n    <li class="flex gap-3"><span class="w-6 h-6 rounded-full bg-primary text-white flex items-center justify-center font-bold shrink-0">3</span><p>Enviar el reporte a través de la aplicación.</p></li>\n  </ol>\n</div>');
    } else {
      setContent('');
    }
  };

  const handlePublishGuide = async () => {
    if (!title || !content) {
      toast.error('Completa el título y el contenido');
      return;
    }

    try {
      await addDoc(collection(db, 'guides'), {
        title,
        subtitle,
        image_url: imageUrl,
        content,
        group,
        created_at: new Date().toISOString()
      });
      toast.success('Guía publicada correctamente');
      setTitle('');
      setSubtitle('');
      setImageUrl('');
      setContent('');
    } catch (error: any) {
      if (error.code === 'permission-denied') {
        toast.error('Error de permisos en Firebase.');
      } else {
        toast.error('Error al publicar guía');
      }
    }
  };

  const handleCreateGroup = async () => {
    if (!groupName) {
      toast.error('Ingresa el nombre del grupo');
      return;
    }

    try {
      await addDoc(collection(db, 'groups'), {
        name: groupName,
        icon: selectedIcon,
        created_at: new Date().toISOString()
      });
      toast.success('Grupo creado correctamente');
      setGroupName('');
      fetchGroups();
    } catch (error: any) {
      if (error.code === 'permission-denied') {
        toast.error('Error de permisos en Firebase.');
      } else {
        toast.error('Error al crear grupo');
      }
    }
  };

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
                No se pueden leer ni escribir datos. Para que el editor funcione con la base de datos, debes actualizar las reglas de seguridad de Firestore en tu consola de Firebase.
              </p>
              <p className="text-xs text-red-600 dark:text-red-300 mt-2 font-bold">
                Actualmente estás viendo datos de prueba (MOCK DATA). Los cambios no se guardarán en la base de datos.
              </p>
            </div>
          </div>
        )}

        <div className="flex items-center justify-between">
          <h1 className="text-xl font-bold text-slate-900 dark:text-white">Editor CMS</h1>
          <button className="bg-primary hover:bg-primary-dark text-white p-2 rounded-xl transition-colors shadow-lg shadow-primary/20">
            <Plus className="w-5 h-5" />
          </button>
        </div>

        <div className="flex bg-slate-200 dark:bg-surface-dark p-1 rounded-xl">
          <button 
            onClick={() => setActiveTab('publicaciones')}
            className={`flex-1 py-2 text-sm font-bold rounded-lg transition-colors ${activeTab === 'publicaciones' ? 'bg-white dark:bg-surface-lighter text-primary shadow-sm' : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'}`}
          >
            Publicaciones
          </button>
          <button 
            onClick={() => setActiveTab('grupos')}
            className={`flex-1 py-2 text-sm font-bold rounded-lg transition-colors ${activeTab === 'grupos' ? 'bg-white dark:bg-surface-lighter text-primary shadow-sm' : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'}`}
          >
            Grupos
          </button>
        </div>

        {activeTab === 'publicaciones' ? (
          <div className="bg-white dark:bg-surface-dark p-5 rounded-2xl border border-slate-200 dark:border-surface-lighter shadow-sm">
            <h3 className="text-sm font-bold text-slate-900 dark:text-white mb-4">Crear Nueva Publicación</h3>
            
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">Título (H1)</label>
                <input 
                  type="text" 
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Ej: Protocolo de Acción ante Depredación"
                  className="w-full bg-slate-50 dark:bg-surface-lighter border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 text-sm text-slate-900 dark:text-white focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-all"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">Subtítulo (Opcional)</label>
                <input 
                  type="text" 
                  value={subtitle}
                  onChange={(e) => setSubtitle(e.target.value)}
                  placeholder="Ej: Guía paso a paso para ganaderos"
                  className="w-full bg-slate-50 dark:bg-surface-lighter border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 text-sm text-slate-900 dark:text-white focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-all"
                />
              </div>
              
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">URL de Imagen de Portada</label>
                <input 
                  type="text" 
                  value={imageUrl}
                  onChange={(e) => setImageUrl(e.target.value)}
                  placeholder="https://ejemplo.com/imagen.jpg"
                  className="w-full bg-slate-50 dark:bg-surface-lighter border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 text-sm text-slate-900 dark:text-white focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-all"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">Grupo</label>
                <select 
                  value={group}
                  onChange={(e) => setGroup(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-surface-lighter border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 text-sm text-slate-900 dark:text-white focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-all"
                >
                  {groups.length === 0 ? (
                    <option value="">No hay grupos creados</option>
                  ) : (
                    groups.map((g) => (
                      <option key={g.id} value={g.name}>{g.name}</option>
                    ))
                  )}
                </select>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider">Contenido (WYSIWYG)</label>
                  <div className="flex gap-2">
                    <label className="cursor-pointer text-xs font-bold text-slate-500 hover:text-primary flex items-center gap-1 transition-colors">
                      <input 
                        type="file" 
                        accept=".txt,.md,.html" 
                        className="hidden" 
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) {
                            const reader = new FileReader();
                            reader.onload = (event) => {
                              const text = event.target?.result as string;
                              // Basic conversion for text/md to HTML (very simple)
                              // For production, use a library like marked or mammoth for docx
                              setContent(text.replace(/\n/g, '<br/>')); 
                              toast.success('Contenido importado');
                            };
                            reader.readAsText(file);
                          }
                        }}
                      />
                      <FileText className="w-3 h-3" /> Importar Texto
                    </label>
                    <button 
                      onClick={() => setShowPreview(!showPreview)}
                      className="text-xs font-bold text-primary flex items-center gap-1 hover:underline"
                    >
                      <Eye className="w-3 h-3" /> {showPreview ? 'Ocultar Vista Previa' : 'Vista Previa'}
                    </button>
                  </div>
                </div>
                <div className="bg-white dark:bg-surface-dark rounded-xl overflow-hidden border border-slate-200 dark:border-slate-700">
                  <ReactQuill 
                    theme="snow" 
                    value={content} 
                    onChange={setContent} 
                    className="h-96 text-slate-900 dark:text-white"
                    modules={{
                      toolbar: [
                        [{ 'header': [1, 2, 3, 4, 5, 6, false] }],
                        [{ 'font': [] }],
                        [{ 'size': ['small', false, 'large', 'huge'] }],
                        ['bold', 'italic', 'underline', 'strike'],
                        [{ 'color': [] }, { 'background': [] }],
                        [{ 'script': 'sub'}, { 'script': 'super' }],
                        [{ 'list': 'ordered'}, { 'list': 'bullet' }, { 'indent': '-1'}, { 'indent': '+1' }],
                        [{ 'align': [] }],
                        ['blockquote', 'code-block'],
                        ['link', 'image', 'video'],
                        ['clean']
                      ],
                    }}
                  />
                </div>
              </div>

              {showPreview && (
                <div className="mt-16 p-8 border border-slate-200 dark:border-slate-700 rounded-3xl bg-white dark:bg-surface-dark shadow-2xl relative overflow-hidden">
                  <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-primary to-orange-500"></div>
                  <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-8 flex items-center gap-2">
                    <Eye className="w-4 h-4 text-primary" /> Vista Previa en Vivo
                  </h4>
                  <div className="prose prose-lg dark:prose-invert max-w-none prose-headings:font-bold prose-h1:text-4xl prose-h1:tracking-tight prose-a:text-primary prose-img:rounded-2xl prose-img:shadow-lg">
                    {title && <h1 className="text-slate-900 dark:text-white mb-2">{title}</h1>}
                    {subtitle && <p className="text-xl text-slate-500 dark:text-slate-400 mb-8 font-medium leading-relaxed">{subtitle}</p>}
                    <div dangerouslySetInnerHTML={{ __html: content }} />
                  </div>
                </div>
              )}

              <div className="pt-4">
                <button 
                  onClick={handlePublishGuide}
                  className="w-full bg-primary hover:bg-primary-dark text-white font-bold py-3.5 rounded-xl transition-all shadow-lg shadow-primary/20 flex items-center justify-center gap-2"
                >
                  <CheckCircle className="w-5 h-5" />
                  Publicar Guía
                </button>
              </div>
            </div>
          </div>
        ) : (
          <div className="bg-white dark:bg-surface-dark p-5 rounded-2xl border border-slate-200 dark:border-surface-lighter shadow-sm">
            <h3 className="text-sm font-bold text-slate-900 dark:text-white mb-4">Crear Nuevo Grupo</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">Nombre del Grupo</label>
                <input 
                  type="text" 
                  value={groupName}
                  onChange={(e) => setGroupName(e.target.value)}
                  placeholder="Ej: Distinción de Rastros"
                  className="w-full bg-slate-50 dark:bg-surface-lighter border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 text-sm text-slate-900 dark:text-white focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-all"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">Icono del Grupo</label>
                <div className="grid grid-cols-4 gap-2">
                  {AVAILABLE_ICONS.map((item) => (
                    <button
                      key={item.id}
                      onClick={() => setSelectedIcon(item.id)}
                      className={`flex flex-col items-center justify-center p-3 rounded-xl border transition-all ${
                        selectedIcon === item.id 
                          ? 'bg-primary/10 border-primary text-primary shadow-sm' 
                          : 'bg-slate-50 dark:bg-surface-lighter border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400 hover:border-primary/50 hover:bg-slate-100 dark:hover:bg-surface-dark'
                      }`}
                    >
                      <item.icon className="w-6 h-6 mb-1" />
                      <span className="text-[10px] font-medium">{item.label}</span>
                    </button>
                  ))}
                </div>
              </div>
              <div className="pt-4">
                <button 
                  onClick={handleCreateGroup}
                  className="w-full bg-primary hover:bg-primary-dark text-white font-bold py-3.5 rounded-xl transition-all shadow-lg shadow-primary/20 flex items-center justify-center gap-2"
                >
                  <Plus className="w-5 h-5" />
                  Crear Grupo
                </button>
              </div>
            </div>
          </div>
        )}
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
