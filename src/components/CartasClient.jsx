'use client';
import { useState } from 'react';
import Link from 'next/link';

export default function CartasClient({ cartas, titulo, color, volver }) {
  const [busqueda, setBusqueda] = useState('');
  const [cartaSeleccionada, setCartaSeleccionada] = useState(null);

  const colores = {
    red: { ring: 'ring-red-500', text: 'text-red-400', btn: 'bg-red-600 hover:bg-red-500' },
    purple: { ring: 'ring-purple-500', text: 'text-purple-400', btn: 'bg-purple-600 hover:bg-purple-500' },
    amber: { ring: 'ring-amber-500', text: 'text-amber-400', btn: 'bg-amber-600 hover:bg-amber-500' },
  };
  const c = colores[color] || colores.red;

  const filtradas = cartas.filter(carta =>
    carta.nombre.toLowerCase().includes(busqueda.toLowerCase()) ||
    carta.descripcion?.toLowerCase().includes(busqueda.toLowerCase()) ||
    carta.categoria?.toLowerCase().includes(busqueda.toLowerCase())
  );

  return (
    <main className="min-h-screen bg-slate-950 text-white p-4 md:p-8">
      <div className="max-w-5xl mx-auto">
        {/* Header */}
        <div className="flex items-center gap-4 mb-8">
          <Link href={volver} className="text-slate-400 hover:text-white transition-colors text-sm font-medium">
            ← Volver
          </Link>
          <h1 className={`text-3xl font-black ${c.text}`}>{titulo}</h1>
          <span className="ml-auto text-slate-500 text-sm">{filtradas.length} cartas</span>
        </div>

        {/* Buscador */}
        <div className="relative mb-8">
          <span className="absolute left-4 top-3.5 text-slate-500">🔍</span>
          <input
            type="text"
            placeholder="Buscar carta..."
            value={busqueda}
            onChange={e => setBusqueda(e.target.value)}
            className="w-full bg-slate-900 border border-slate-800 text-white pl-12 pr-4 py-3 rounded-2xl focus:outline-none focus:border-slate-600 transition-all"
          />
        </div>

        {/* Grid de cartas */}
        {filtradas.length === 0 ? (
          <div className="text-center py-20 text-slate-500">No se encontraron cartas</div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {filtradas.map(carta => (
              <button
                key={carta.id}
                onClick={() => setCartaSeleccionada(carta)}
                className="text-left bg-slate-900/60 border border-slate-800 hover:border-slate-600 rounded-2xl p-5 transition-all hover:scale-[1.02] hover:shadow-xl cursor-pointer"
                style={{ borderLeftColor: carta.colorHex || undefined, borderLeftWidth: carta.colorHex ? '4px' : undefined }}
              >
                <p className={`text-xs uppercase tracking-wider font-bold mb-2 ${c.text}`}>{carta.categoria}</p>
                <h3 className="font-bold text-white mb-2 text-base leading-tight">{carta.nombre}</h3>
                <p className="text-slate-400 text-sm line-clamp-2 leading-relaxed">{carta.descripcion}</p>
                {carta.tragos && (
                  <p className="mt-3 text-xs font-bold text-rose-400">🍷 {carta.tragos}</p>
                )}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Modal de carta seleccionada */}
      {cartaSeleccionada && (
        <div
          className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center p-6 z-50"
          onClick={() => setCartaSeleccionada(null)}
        >
          <div
            className="max-w-sm w-full rounded-3xl p-8 text-center shadow-2xl border border-white/10"
            style={{ backgroundColor: cartaSeleccionada.colorHex || '#1e293b' }}
            onClick={e => e.stopPropagation()}
          >
            <p className="text-white/60 text-xs uppercase tracking-widest font-bold mb-4">{cartaSeleccionada.categoria}</p>
            <h2 className={`text-white font-black text-2xl mb-6 uppercase tracking-wide ${cartaSeleccionada.textSize || 'text-lg'}`}>
              {cartaSeleccionada.nombre}
            </h2>
            <p className="text-white/90 leading-relaxed text-base">{cartaSeleccionada.descripcion}</p>
            {cartaSeleccionada.tragos && (
              <p className="mt-6 text-white/70 text-sm font-bold">🍷 {cartaSeleccionada.tragos}</p>
            )}
            <button
              onClick={() => setCartaSeleccionada(null)}
              className="mt-8 bg-black/30 text-white/80 font-bold py-2 px-6 rounded-full text-sm hover:bg-black/50 transition-colors"
            >
              Cerrar
            </button>
          </div>
        </div>
      )}
    </main>
  );
}
