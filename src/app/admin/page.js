'use client';
import { useState, useEffect } from 'react';
import Link from 'next/link';

export default function AdminPage() {
  const [pass, setPass] = useState('');
  const [auth, setAuth] = useState(false);
  const [isClient, setIsClient] = useState(false);
  
  useEffect(() => {
    setIsClient(true);
    if (sessionStorage.getItem('admin_pass') === '!DDeng@01106!') {
      setAuth(true);
      setPass('!DDeng@01106!');
    }
  }, []);

  // Formulario
  const [juego, setJuego] = useState('toxic');
  const [nombre, setNombre] = useState('');
  const [descripcion, setDescripcion] = useState('');
  const [tragos, setTragos] = useState('');
  const [categoria, setCategoria] = useState('');
  const [loading, setLoading] = useState(false);
  const [mensaje, setMensaje] = useState(null);

  const login = (e) => {
    e.preventDefault();
    if (pass === '!DDeng@01106!') {
      sessionStorage.setItem('admin_pass', pass);
      setAuth(true);
    } else {
      setMensaje({ tipo: 'error', texto: 'Acceso Denegado' });
      setTimeout(() => setMensaje(null), 2000);
    }
  };

  const cerrarSesion = () => {
    sessionStorage.removeItem('admin_pass');
    setAuth(false);
    setPass('');
  };

  const enviarCarta = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMensaje(null);
    try {
      const res = await fetch('/api/admin/add', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password: pass, juego, nombre, descripcion, tragos, categoria })
      });
      const data = await res.json();
      if (res.ok) {
        setMensaje({ tipo: 'exito', texto: '¡Carta inyectada en Notion correctamente!' });
        setNombre(''); setDescripcion(''); setTragos(''); setCategoria('');
      } else {
        setMensaje({ tipo: 'error', texto: data.error || 'Error al guardar' });
      }
    } catch (error) {
      setMensaje({ tipo: 'error', texto: 'Fallo de conexión' });
    }
    setLoading(false);
  };

  if (!isClient) return null;

  if (!auth) {
    return (
      <main className="min-h-screen bg-[#020617] flex flex-col items-center justify-center p-4">
        <form onSubmit={login} className="max-w-sm w-full glass p-8 rounded-3xl text-center">
          <div className="text-4xl mb-4">🔒</div>
          <h1 className="text-2xl font-black text-white mb-6">Panel de Control</h1>
          {mensaje && <p className="text-red-400 font-bold mb-4">{mensaje.texto}</p>}
          <input type="password" placeholder="Contraseña Maestra" value={pass} onChange={e => setPass(e.target.value)} className="w-full bg-[#0f172a] border border-slate-700 text-white px-4 py-3 rounded-xl mb-4 text-center font-bold tracking-widest" />
          <button type="submit" className="w-full bg-gold text-slate-900 font-black py-3 rounded-xl">Desbloquear</button>
          <Link href="/" className="block mt-6 text-slate-500 text-sm">← Volver al juego</Link>
        </form>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#020617] flex flex-col items-center p-4 pt-10 pb-20">
      <div className="max-w-md w-full">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-black gradient-gold">Bóveda Secreta</h1>
          <button onClick={cerrarSesion} className="text-red-400 text-sm font-bold bg-red-900/20 px-3 py-1.5 rounded-lg border border-red-900/50">Bloquear 🔒</button>
        </div>

        {/* BIBLIOTECA SEGURA */}
        <div className="glass p-6 rounded-3xl mb-6 border-yellow-600/20">
          <h2 className="text-white font-bold uppercase tracking-widest text-sm mb-4 border-b border-slate-700 pb-2">Administrar Bibliotecas</h2>
          <p className="text-xs text-slate-400 mb-4">Revisa y <b>edita</b> las cartas conectadas a Notion en tiempo real.</p>
          <div className="flex flex-col gap-2">
            <Link href="/admin/biblioteca/osc" className="w-full bg-yellow-900/20 border border-yellow-600/30 text-yellow-500 hover:bg-gold hover:text-slate-900 font-black py-3 rounded-xl text-center text-sm transition-all shadow-lg">Sin Excusas (Original) 🃏</Link>
            <Link href="/admin/biblioteca/toxic" className="w-full bg-yellow-900/20 border border-yellow-600/30 text-yellow-500 hover:bg-gold hover:text-slate-900 font-black py-3 rounded-xl text-center text-sm transition-all shadow-lg">Toxic Cards ☠️</Link>
            <Link href="/admin/biblioteca/poker" className="w-full bg-yellow-900/20 border border-yellow-600/30 text-yellow-500 hover:bg-gold hover:text-slate-900 font-black py-3 rounded-xl text-center text-sm transition-all shadow-lg">Poker Caliente ♠️</Link>
          </div>
        </div>

        {/* FORMULARIO INYECTAR */}
        <form onSubmit={enviarCarta} className="glass p-6 rounded-3xl space-y-4">
          <h2 className="text-white font-bold uppercase tracking-widest text-sm mb-4 border-b border-slate-700 pb-2">Crear Nueva Carta</h2>
          
          {mensaje && (
            <div className={`p-3 rounded-xl text-sm font-bold text-center ${mensaje.tipo === 'error' ? 'bg-red-900/40 text-red-400 border border-red-900' : 'bg-green-900/40 text-green-400 border border-green-900'}`}>
              {mensaje.texto}
            </div>
          )}

          <div>
            <label className="block text-slate-400 text-xs font-bold mb-1">Juego Destino (Notion DB)</label>
            <select value={juego} onChange={e => setJuego(e.target.value)} className="w-full bg-[#0f172a] border border-slate-700 text-white px-4 py-3 rounded-xl focus:border-yellow-600 outline-none">
              <option value="osc">Sin Excusas (Original) 🃏</option>
              <option value="toxic">Toxic Cards ☠️</option>
              <option value="poker">Poker Caliente ♠️</option>
            </select>
          </div>

          <div>
            <label className="block text-slate-400 text-xs font-bold mb-1">Título de la Carta</label>
            <input required type="text" value={nombre} onChange={e => setNombre(e.target.value)} className="w-full bg-[#0f172a] border border-slate-700 text-white px-4 py-3 rounded-xl focus:border-yellow-600 outline-none" placeholder="Ej: Verdad Picante" />
          </div>

          <div>
            <label className="block text-slate-400 text-xs font-bold mb-1">El Reto o Descripción</label>
            <textarea required value={descripcion} onChange={e => setDescripcion(e.target.value)} className="w-full bg-[#0f172a] border border-slate-700 text-white px-4 py-3 rounded-xl min-h-[100px] focus:border-yellow-600 outline-none" placeholder="Ej: Tienes que hacer X cosa..."></textarea>
          </div>

          <div className="flex gap-3">
            <div className="w-1/2">
              <label className="block text-slate-400 text-xs font-bold mb-1">Tragos (Opcional)</label>
              <input type="number" value={tragos} onChange={e => setTragos(e.target.value)} className="w-full bg-[#0f172a] border border-slate-700 text-white px-4 py-3 rounded-xl focus:border-yellow-600 outline-none" placeholder="Ej: 2" />
            </div>
            <div className="w-1/2">
              <label className="block text-slate-400 text-xs font-bold mb-1">Categoría (Opcional)</label>
              <input type="text" value={categoria} onChange={e => setCategoria(e.target.value)} className="w-full bg-[#0f172a] border border-slate-700 text-white px-4 py-3 rounded-xl focus:border-yellow-600 outline-none" placeholder="Ej: Hot" />
            </div>
          </div>

          <button type="submit" disabled={loading} className="w-full bg-slate-800 text-white hover:bg-slate-700 border border-slate-600 font-black py-4 rounded-xl mt-4 disabled:opacity-50 transition-colors shadow-lg">
            {loading ? 'Transmitiendo a Notion...' : 'Guardar Carta Directo 🚀'}
          </button>
        </form>
        <Link href="/" className="block mt-6 text-slate-500 text-sm text-center hover:text-white transition-colors">Volver a la App Principal</Link>
      </div>
    </main>
  );
}