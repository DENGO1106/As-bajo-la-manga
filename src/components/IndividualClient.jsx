'use client';
import { useState, useRef } from 'react';
import Link from 'next/link';

export default function IndividualClient({ cartas, titulo, modo }) {
  const [fase, setFase] = useState('setup');
  const [nombreInput, setNombreInput] = useState('');
  const [jugadores, setJugadores] = useState([]);
  const [turnoIdx, setTurnoIdx] = useState(0);
  const [cartaActual, setCartaActual] = useState(null);
  const [animKey, setAnimKey] = useState(0);

  // Categorías
  const categoriasDisponibles = [...new Set(cartas.map(c => c.categoria).filter(Boolean))];
  const [categoriasActivas, setCategoriasActivas] = useState(categoriasDisponibles);

  const barajaRef = useRef([...cartas].sort(() => Math.random() - 0.5));
  const indexRef = useRef(0);

  const agregarJugador = () => {
    const nombre = nombreInput.trim();
    if (!nombre || jugadores.includes(nombre) || jugadores.length >= 12) return;
    setJugadores(prev => [...prev, nombre]);
    setNombreInput('');
  };

  const iniciarJuego = () => {
    if (jugadores.length < 1) return;
    
    const filtradas = cartas.filter(c => !c.categoria || categoriasActivas.includes(c.categoria));
    if (filtradas.length === 0) {
      alert("¡Tenés que seleccionar al menos una categoría!");
      return;
    }

    barajaRef.current = [...filtradas].sort(() => Math.random() - 0.5);
    indexRef.current = 1;
    setTurnoIdx(0);
    setCartaActual(barajaRef.current[0]);
    setFase('jugando');
  };

  const tirarCarta = () => {
    const carta = barajaRef.current[indexRef.current % barajaRef.current.length];
    indexRef.current += 1;
    setAnimKey(k => k + 1);
    setCartaActual(carta);
  };

  const siguienteTurno = () => {
    setCartaActual(null);
    setTurnoIdx(prev => (prev + 1) % jugadores.length);
  };

  const jugadorActual = jugadores[turnoIdx] || '';

  // ---------- SETUP ----------
  if (fase === 'setup') {
    return (
      <main className="min-h-screen min-h-dvh bg-[#020617] flex flex-col items-center justify-center p-4 relative overflow-hidden">
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[500px] h-[300px] bg-yellow-600/10 rounded-full blur-[100px]"></div>
        </div>

        <div className="max-w-sm w-full z-10 animate-fade-in">
          <Link href="/" className="inline-flex items-center gap-2 text-slate-600 hover:text-slate-400 text-sm mb-8 transition-colors">
            ← Volver
          </Link>

          <h2 className="text-3xl font-black gradient-gold mb-1">{titulo}</h2>
          <p className="text-slate-500 text-sm mb-8">Modo Individual · Agregá los jugadores</p>

          {/* Input */}
          <div className="flex gap-2 mb-4">
            <input
              type="text"
              maxLength={20}
              placeholder="Nombre del jugador..."
              value={nombreInput}
              onChange={e => setNombreInput(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') agregarJugador(); }}
              className="flex-1 glass text-white px-4 py-3.5 rounded-2xl focus:outline-none focus:border-yellow-600/40 transition-all text-sm placeholder:text-slate-600"
            />
            <button
              onClick={agregarJugador}
              disabled={!nombreInput.trim() || jugadores.length >= 12}
              className="bg-gold text-slate-900 font-black px-5 py-3.5 rounded-2xl disabled:opacity-30 active:scale-95 transition-all text-lg"
            >
              +
            </button>
          </div>

          {/* Lista jugadores */}
          <div className="flex flex-col gap-2 mb-6">
            {jugadores.map((j, i) => (
              <div key={j} className="glass flex items-center justify-between px-4 py-3 rounded-xl">
                <div className="flex items-center gap-3">
                  <span className="gold-text text-sm font-black">#{i + 1}</span>
                  <span className="font-semibold text-sm">{j}</span>
                </div>
                <button
                  onClick={() => setJugadores(p => p.filter(x => x !== j))}
                  className="text-slate-600 hover:text-red-400 transition-colors font-bold text-lg leading-none"
                >×</button>
              </div>
            ))}
          </div>

          {/* Categorías */}
          {categoriasDisponibles.length > 0 && (
            <div className="glass p-4 rounded-3xl mb-8 border-yellow-600/10">
              <h3 className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-3 text-center">Filtros (Opcional)</h3>
              <div className="flex flex-wrap gap-2 justify-center">
                {categoriasDisponibles.map(cat => (
                  <button
                    key={cat}
                    onClick={() => setCategoriasActivas(prev => prev.includes(cat) ? prev.filter(c => c !== cat) : [...prev, cat])}
                    className={`px-3 py-1.5 rounded-full text-xs font-bold border transition-all ${categoriasActivas.includes(cat) ? 'bg-gold text-slate-900 border-transparent shadow-md' : 'bg-[#020617] text-slate-500 border-slate-800'}`}
                  >
                    {cat}
                  </button>
                ))}
              </div>
            </div>
          )}

          <button
            onClick={iniciarJuego}
            disabled={jugadores.length < 1}
            className="w-full bg-gold text-slate-900 font-black py-5 rounded-2xl text-base disabled:opacity-30 active:scale-95 transition-all shadow-lg shadow-yellow-900/30"
          >
            {jugadores.length < 1
              ? 'Agregá al menos 1 jugador'
              : `¡Jugar con ${jugadores.length} jugador${jugadores.length > 1 ? 'es' : ''}! 🎲`}
          </button>
        </div>
      </main>
    );
  }

  // ---------- JUGANDO ----------
  return (
    <main className="min-h-screen min-h-dvh bg-[#020617] flex flex-col items-center justify-center p-4 gap-6 relative overflow-hidden">
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[500px] h-[300px] bg-yellow-600/8 rounded-full blur-[100px]"></div>
      </div>

      {/* Turno */}
      <div className="text-center z-10">
        <p className="text-slate-600 text-xs uppercase tracking-widest mb-1 font-bold">Le toca a</p>
        <h2 className="text-4xl md:text-5xl font-black gradient-gold">{jugadorActual}</h2>
      </div>

      {/* Carta */}
      <div
        key={animKey}
        className="card-enter card-shadow z-10 w-[min(300px,85vw)] rounded-3xl p-8 text-center border border-yellow-600/10 relative overflow-hidden"
        style={{ backgroundColor: cartaActual?.colorHex || 'rgba(15,23,42,0.8)', minHeight: '380px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}
      >
        {cartaActual ? (
          <>
            {cartaActual.categoria && (
              <p className="text-white/40 text-xs uppercase tracking-widest font-black mb-5">{cartaActual.categoria}</p>
            )}
            <h3 className="text-white font-black text-2xl uppercase tracking-wide leading-tight mb-6">{cartaActual.nombre}</h3>
            <p className={`text-white/85 leading-relaxed ${cartaActual.textSize || 'text-base'}`}>{cartaActual.descripcion}</p>
            {cartaActual.tragos && (
              <p className="mt-6 text-white/50 text-sm font-bold border-t border-white/10 pt-4 w-full text-center">🍷 {cartaActual.tragos}</p>
            )}
          </>
        ) : (
          <div className="flex flex-col items-center gap-4 text-slate-700">
            <span className="text-7xl">🃏</span>
            <p className="text-sm font-semibold">Presioná para tirar</p>
          </div>
        )}
      </div>

      {/* Botones */}
      <div className="flex flex-col gap-3 w-full max-w-[300px] z-10">
        {!cartaActual ? (
          <button
            onClick={tirarCarta}
            className="w-full bg-gold text-slate-900 font-black text-lg py-5 rounded-2xl shadow-lg shadow-yellow-900/30 active:scale-95 transition-all"
          >
            🎲 Tirar Carta
          </button>
        ) : (
          <button
            onClick={siguienteTurno}
            className="w-full glass text-white font-black text-base py-5 rounded-2xl active:scale-95 transition-all"
          >
            Siguiente turno →
          </button>
        )}
        <button
          onClick={() => { setFase('setup'); setCartaActual(null); }}
          className="w-full text-slate-700 hover:text-slate-500 text-xs font-medium py-2 transition-colors"
        >
          ↩ Reiniciar partida
        </button>
      </div>

      {/* Jugadores chips */}
      <div className="flex gap-2 flex-wrap justify-center max-w-sm z-10">
        {jugadores.map((j, i) => (
          <div
            key={j}
            className={`px-4 py-1.5 rounded-full text-xs font-black border transition-all ${
              i === turnoIdx
                ? 'bg-gold text-slate-900 border-transparent shadow-lg shadow-yellow-900/30'
                : 'glass text-slate-500 border-yellow-600/10'
            }`}
          >
            {j}
          </div>
        ))}
      </div>
    </main>
  );
}
