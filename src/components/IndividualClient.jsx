'use client';
import { useState, useRef } from 'react';
import Link from 'next/link';

const EVENTOS_SORPRESA = [
  "Cascada: Empieza a tomar el jugador activo y nadie puede parar hasta que el de su derecha pare.",
  "Regla del Pulgar: El dueño del celular pone el pulgar en la mesa, el último en hacerlo toma 2 tragos.",
  "Misterio: Todos los hombres toman 1 trago.",
  "Chicas al poder: Todas las mujeres toman 1 trago.",
  "El jugador activo asigna 3 tragos a quien quiera.",
  "Cultura Chupística: Marcas de cerveza. El que pierda o repita, toma.",
  "El piso es lava: El último en levantar los pies toma 2 tragos.",
  "Salud global: Todos los jugadores chocan copas y toman 1 trago."
];

export default function IndividualClient({ cartas, titulo, modo }) {
  const [fase, setFase] = useState('setup');
  const [nombreInput, setNombreInput] = useState('');
  const [jugadores, setJugadores] = useState([]);
  const [turnoIdx, setTurnoIdx] = useState(0);
  const [cartaActual, setCartaActual] = useState(null);
  const [animKey, setAnimKey] = useState(0);
  const [eventoSorpresa, setEventoSorpresa] = useState(null);

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

  const banearCarta = () => {
    const carta = barajaRef.current[indexRef.current % barajaRef.current.length];
    indexRef.current += 1;
    setAnimKey(k => k + 1);
    setCartaActual(carta);
  };

  const lanzarEventoManual = () => {
    const evento = EVENTOS_SORPRESA[Math.floor(Math.random() * EVENTOS_SORPRESA.length)];
    setEventoSorpresa(evento);
  };

  const continuarEvento = () => {
    setEventoSorpresa(null);
  };

  const jugadorActual = jugadores[turnoIdx] || '';

  if (fase === 'setup') {
    return (
      <main className="min-h-screen min-h-dvh bg-[#020617] flex flex-col items-center justify-center p-4 relative overflow-hidden">
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[500px] h-[300px] bg-yellow-600/10 rounded-full blur-[100px]"></div>
        </div>

        <div className="max-w-sm w-full z-10 animate-fade-in">
          <Link href="/" className="inline-flex items-center gap-2 text-slate-600 hover:text-slate-400 text-sm mb-6 transition-colors">← Volver</Link>
          
          <div className="flex items-center justify-between mb-1">
            <h2 className="text-4xl font-black gradient-gold">{titulo}</h2>
          </div>
          <p className="text-slate-500 text-sm mb-6">Modo Local · Pasá el celular</p>

          <div className="glass p-5 rounded-3xl mb-6 border-yellow-600/20">
            <label className="block text-xs font-bold text-yellow-500 uppercase tracking-widest mb-3">Agregar Jugador</label>
            <div className="flex gap-2">
              <input
                type="text"
                maxLength={15}
                placeholder="Nombre..."
                value={nombreInput}
                onChange={e => setNombreInput(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && agregarJugador()}
                className="w-full bg-[#020617] border border-slate-800 text-white px-4 py-3.5 rounded-2xl focus:outline-none focus:border-yellow-600/40 transition-all text-sm"
              />
              <button
                onClick={agregarJugador}
                disabled={!nombreInput.trim() || jugadores.length >= 12}
                className="bg-yellow-900/20 text-yellow-500 border border-yellow-600/30 px-6 font-black rounded-2xl hover:bg-yellow-900/40 disabled:opacity-30 transition-all"
              >
                +
              </button>
            </div>
            
            {jugadores.length > 0 && (
              <div className="mt-4 space-y-2">
                {jugadores.map(j => (
                  <div key={j} className="flex justify-between items-center bg-[#020617] border border-slate-800/60 px-4 py-3 rounded-xl">
                    <span className="text-sm font-bold text-slate-300">{j}</span>
                    <button onClick={() => setJugadores(prev => prev.filter(x => x !== j))} className="text-red-900 hover:text-red-500 transition-colors">✕</button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {categoriasDisponibles.length > 0 && (
            <div className="glass p-4 rounded-3xl mb-6 border-yellow-600/10">
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
            className="w-full bg-gold text-slate-900 font-black py-4 rounded-2xl text-base disabled:opacity-30 active:scale-95 transition-all shadow-lg shadow-yellow-900/30"
          >
            ¡Iniciar Partida! 🎲
          </button>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen min-h-dvh bg-[#020617] flex flex-col items-center justify-center p-4 gap-6 relative overflow-hidden">
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[500px] h-[300px] bg-yellow-600/8 rounded-full blur-[100px]"></div>
      </div>

      {eventoSorpresa && (
        <div className="absolute inset-0 z-50 flex flex-col items-center justify-center bg-red-950/90 backdrop-blur-md p-6 text-center animate-fade-in">
          <div className="w-full max-w-sm glass border-red-500/50 p-8 rounded-3xl shadow-2xl shadow-red-900/50">
            <h2 className="text-3xl font-black text-red-500 mb-2 animate-pulse">¡ALERTA GLOBAL!</h2>
            <p className="text-white text-lg font-bold mb-8 leading-snug">{eventoSorpresa}</p>
            <p className="text-red-300 text-xs uppercase tracking-widest mb-6">Cumplan el castigo antes de seguir</p>
            <button onClick={continuarEvento} className="w-full py-4 rounded-2xl font-black text-lg bg-red-600 text-white shadow-lg active:scale-95 transition-all">
              Continuar con el turno ✓
            </button>
          </div>
        </div>
      )}

      {/* Info superior */}
      <div className="text-center z-10 w-full flex flex-col items-center">
        <div className="flex justify-between items-center w-full max-w-[300px] mb-4">
          <button onClick={() => { setFase('setup'); setCartaActual(null); }} className="text-slate-500 hover:text-white text-xs font-bold transition-colors">← Salir</button>
        </div>
        <p className="text-slate-600 text-xs uppercase tracking-widest mb-1 font-bold">Le toca a</p>
        <h2 className="text-4xl md:text-5xl font-black gradient-gold">{jugadorActual}</h2>
      </div>

      {/* Carta */}
      <div
        key={animKey}
        className={`card-enter card-shadow z-10 w-[min(300px,85vw)] rounded-3xl p-8 text-center border border-yellow-600/10 relative overflow-hidden transition-all duration-300 ${!cartaActual ? 'bg-slate-900/50' : ''}`}
        style={{ backgroundColor: cartaActual?.colorHex || (cartaActual ? 'rgba(15,23,42,0.8)' : undefined), minHeight: '380px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}
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
          <>
            <button
              onClick={banearCarta}
              className="w-full py-2 rounded-xl text-xs font-bold border border-red-900/50 text-red-500 hover:bg-red-950/30 transition-all"
            >
              🚫 Banear esta carta y sacar otra
            </button>

            {!eventoSorpresa && (
              <button onClick={lanzarEventoManual} className="w-full py-2 mb-2 rounded-xl text-xs font-bold border border-purple-900/50 text-purple-400 hover:bg-purple-950/30 transition-all">
                ⚡ Disparar Evento Sorpresa Manualmente
              </button>
            )}

            <button
              onClick={siguienteTurno}
              className="w-full glass text-white font-black text-base py-5 rounded-2xl active:scale-95 transition-all"
            >
              Siguiente turno →
            </button>
          </>
        )}
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