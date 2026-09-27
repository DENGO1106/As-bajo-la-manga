'use client';
import { useState, useEffect } from 'react';
import Link from 'next/link';

export default function AdminBibliotecaClient({ cartasIniciales, modo }) {
  const [auth, setAuth] = useState(false);
  const [isClient, setIsClient] = useState(false);
  const [cartas, setCartas] = useState(cartasIniciales);
  
  const [editingId, setEditingId] = useState(null);
  const [editForm, setEditForm] = useState({});
  const [loadingObj, setLoadingObj] = useState({});
  const [modoNuevaCat, setModoNuevaCat] = useState(false);

  useEffect(() => {
    setIsClient(true);
    if (sessionStorage.getItem('admin_pass') === '!DDeng@01106!') {
      setAuth(true);
    }
  }, []);

  if (!isClient) return null;

  if (!auth) {
    return (
      <main className="min-h-screen bg-[#020617] flex flex-col items-center justify-center p-4">
        <h1 className="text-red-400 font-bold mb-4">Acceso Restringido</h1>
        <Link href="/admin" className="text-white underline">Ir al Login</Link>
      </main>
    );
  }

  // Extraer categorías únicas que ya existen en Notion
  const categoriasUnicas = Array.from(new Set(cartas.map(c => c.categoria).filter(Boolean)));

  const handleEditClick = (carta) => {
    if (editingId === carta.id) {
      setEditingId(null);
      return;
    }
    setEditingId(carta.id);
    setModoNuevaCat(false);
    setEditForm({
      nombre: carta.nombre || '',
      descripcion: carta.descripcion || '',
      tragos: carta.tragos || '',
      categoria: carta.categoria || '',
    });
  };

  const handleSave = async (id) => {
    setLoadingObj({ ...loadingObj, [id]: true });
    try {
      const payload = {
        password: '!DDeng@01106!',
        pageId: id,
        ...editForm
      };
      const res = await fetch('/api/admin/edit', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      if (res.ok) {
        // Actualizar UI local para que sea instantáneo visualmente también
        setCartas(cartas.map(c => c.id === id ? { ...c, ...editForm } : c));
        setEditingId(null);
      } else {
        alert('Error al guardar en Notion');
      }
    } catch (error) {
      alert('Error de conexión');
    }
    setLoadingObj({ ...loadingObj, [id]: false });
  };

  const titulos = { osc: 'Sin Excusas', toxic: 'Toxic Cards', poker: 'Poker Caliente' };

  return (
    <main className="min-h-screen bg-[#020617] p-4 pt-10 pb-20 flex flex-col items-center">
      <div className="max-w-md w-full">
        <Link href="/admin" className="text-slate-500 hover:text-white text-sm mb-4 inline-block">← Volver a Bóveda</Link>
        <h1 className="text-3xl font-black gradient-gold mb-2">Editor: {titulos[modo]}</h1>
        <p className="text-slate-400 text-sm mb-6">Total cartas sincronizadas: {cartas.length}</p>

        <div className="space-y-4">
          {cartas.map(carta => (
            <div key={carta.id} className="glass p-4 rounded-2xl border border-slate-800">
              
              {/* VISTA NORMAL */}
              {editingId !== carta.id && (
                <div className="flex justify-between items-start gap-3">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      {carta.categoria && <span className="text-[10px] bg-slate-800 text-slate-400 px-2 py-0.5 rounded-full">{carta.categoria}</span>}
                      {carta.tragos && <span className="text-[10px] bg-red-900/40 text-red-400 px-2 py-0.5 rounded-full border border-red-900/50">🍷 {carta.tragos}</span>}
                    </div>
                    <h3 className="text-white font-bold text-sm">{carta.nombre}</h3>
                    <p className="text-slate-400 text-xs mt-1">{carta.descripcion}</p>
                  </div>
                  <button onClick={() => handleEditClick(carta)} className="bg-slate-800 text-slate-300 px-3 py-1.5 rounded-lg text-xs font-bold hover:bg-slate-700 transition-colors">
                    ✏️
                  </button>
                </div>
              )}

              {/* VISTA EDICIÓN */}
              {editingId === carta.id && (
                <div className="space-y-3 mt-2">
                  <input 
                    type="text" 
                    value={editForm.nombre} 
                    onChange={e => setEditForm({...editForm, nombre: e.target.value})} 
                    className="w-full bg-[#0f172a] border border-yellow-600/30 text-white px-3 py-2 rounded-lg text-sm"
                    placeholder="Título"
                  />
                  <textarea 
                    value={editForm.descripcion} 
                    onChange={e => setEditForm({...editForm, descripcion: e.target.value})} 
                    className="w-full bg-[#0f172a] border border-yellow-600/30 text-white px-3 py-2 rounded-lg text-sm min-h-[80px]"
                    placeholder="Descripción"
                  />
                  <div className="flex gap-2">
                    <input 
                      type="number" 
                      value={editForm.tragos} 
                      onChange={e => setEditForm({...editForm, tragos: e.target.value})} 
                      className="w-1/3 bg-[#0f172a] border border-yellow-600/30 text-white px-3 py-2 rounded-lg text-sm"
                      placeholder="Tragos"
                    />
                    
                    {/* Selector de Categorías Dinámico */}
                    {!modoNuevaCat ? (
                      <select 
                        value={categoriasUnicas.includes(editForm.categoria) ? editForm.categoria : ''} 
                        onChange={e => {
                          if (e.target.value === '___NUEVA___') {
                            setModoNuevaCat(true);
                            setEditForm({...editForm, categoria: ''});
                          } else {
                            setEditForm({...editForm, categoria: e.target.value});
                          }
                        }}
                        className="w-2/3 bg-[#0f172a] border border-yellow-600/30 text-white px-3 py-2 rounded-lg text-sm"
                      >
                        <option value="">Sin Categoría</option>
                        {categoriasUnicas.map(c => <option key={c} value={c}>{c}</option>)}
                        <option value="___NUEVA___">➕ Crear nueva...</option>
                      </select>
                    ) : (
                      <div className="w-2/3 flex gap-1">
                        <input 
                          type="text" 
                          value={editForm.categoria} 
                          onChange={e => setEditForm({...editForm, categoria: e.target.value})} 
                          className="w-full bg-[#0f172a] border border-yellow-600/30 text-white px-3 py-2 rounded-lg text-sm"
                          placeholder="Nueva categoría..."
                          autoFocus
                        />
                        <button onClick={() => setModoNuevaCat(false)} className="px-2 text-xs text-slate-500 hover:text-white">✕</button>
                      </div>
                    )}
                  </div>
                  <div className="flex gap-2 pt-2 border-t border-slate-700">
                    <button onClick={() => handleEditClick(carta)} className="w-1/2 py-2 text-xs font-bold text-slate-400 border border-slate-700 rounded-lg">Cancelar</button>
                    <button onClick={() => handleSave(carta.id)} disabled={loadingObj[carta.id]} className="w-1/2 py-2 text-xs font-black bg-gold text-slate-900 rounded-lg disabled:opacity-50">
                      {loadingObj[carta.id] ? 'Guardando en Notion...' : 'Guardar ✅'}
                    </button>
                  </div>
                </div>
              )}

            </div>
          ))}
        </div>
      </div>
    </main>
  );
}