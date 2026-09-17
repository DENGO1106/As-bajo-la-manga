'use client';
import { useState, useEffect, useRef, useCallback } from 'react';
import Link from 'next/link';

export default function SalaClient({ cartas, titulo, modo }) {
  const [fase, setFase] = useState('menu'); // menu | lobby | jugando
  const [apodo, setApodo] = useState('');
  const [codigoSala, setCodigoSala] = useState('');
  const [esHost, setEsHost] = useState(false);
  const [jugadores, setJugadores] = useState([]);
  const [error, setError] = useState('');
  
  // Estados del juego
  const [cartaActual, setCartaActual] = useState(null);
  const [turnoIdx, setTurnoIdx] = useState(0);
  const [animKey, setAnimKey] = useState(0);

  // WebRTC (PeerJS)
  const [peer, setPeer] = useState(null);
  const connListRef = useRef([]); // Host: conexiones a jugadores
  const hostConnRef = useRef(null); // Jugador: conexion al host
  const barajaRef = useRef([]);
  const indexRef = useRef(0);

  // -----------------------------------------------------
  // 1. INICIAR CONEXIÓN (Crear o Unirse)
  // -----------------------------------------------------
  const conectar = async (crear) => {
    if (!apodo.trim()) return;
    setError('');
    const codigoFinal = crear ? Math.random().toString(36).substring(2, 6).toUpperCase() : codigoSala.toUpperCase();
    if (!crear && codigoFinal.length !== 4) {
      setError('El código debe tener 4 letras');
      return;
    }

    setCodigoSala(codigoFinal);
    setEsHost(crear);
    setFase('lobby');

    // Importar PeerJS dinámicamente
    const { Peer } = await import('peerjs');
    const peerId = crear ? `ablm-host-${codigoFinal}-${modo}` : `ablm-${codigoFinal}-${Date.now()}`;
    
    const newPeer = new Peer(peerId, { debug: 0 });

    newPeer.on('open', () => {
      setPeer(newPeer);

      if (crear) {
        // HOST: Espera conexiones
        setJugadores([{ id: peerId, apodo, esHost: true }]);
        newPeer.on('connection', (conn) => {
          conn.on('open', () => {
            connListRef.current = [...connListRef.current, conn];
            conn.on('data', (data) => manejarMensajeHost(conn, data));
          });
        });
      } else {
        // JUGADOR: Se conecta al host
        const conn = newPeer.connect(`ablm-host-${codigoFinal}-${modo}`);
        conn.on('open', () => {
          hostConnRef.current = conn;
          conn.send({ tipo: 'unirse', apodo });
          conn.on('data', manejarMensajeJugador);
        });
        conn.on('error', () => {
          setError('No se encontró la sala');
          setFase('menu');
        });
      }
    });

    newPeer.on('error', (err) => {
      console.error(err);
      setError('Error de conexión. ¿El código es correcto?');
      setFase('menu');
    });
  };

  // -----------------------------------------------------
  // 2. COMUNICACIÓN (Host <-> Jugadores)
  // -----------------------------------------------------
  // -----------------------------------------------------
  // 3. LÓGICA DE JUEGO (Solo el Host la ejecuta)
  // -----------------------------------------------------
  const iniciarJuego = () => {
    if (jugadores.length < 1) return;
    barajaRef.current = [...cartas].sort(() => Math.random() - 0.5);
    indexRef.current = 0;
    
    // Avisar a todos
    connListRef.current.forEach(c => c.send({ tipo: 'inicio_juego' }));
    setFase('jugando');
  };

  // Usamos referencias para evitar problemas con callbacks
  const turnoRef = useRef(0);
  useEffect(() => { turnoRef.current = turnoIdx; }, [turnoIdx]);
  const jugadoresRef = useRef([]);
  useEffect(() => { jugadoresRef.current = jugadores; }, [jugadores]);

  const tirarCarta = useCallback(() => {
    // La logica ahora usa barajaRef
    const carta = barajaRef.current[indexRef.current % barajaRef.current.length];
    indexRef.current += 1;
    
    setCartaActual(carta);
    setAnimKey(k => k + 1);
    
    // Avisar a todos
    connListRef.current.forEach(c => c.send({ tipo: 'nueva_carta', carta, turnoIdx: turnoRef.current }));
  }, []);

  const siguienteTurno = useCallback(() => {
    const nuevoTurno = (turnoRef.current + 1) % jugadoresRef.current.length;
    setTurnoIdx(nuevoTurno);
    setCartaActual(null);
    
    // Avisar a todos
    connListRef.current.forEach(c => c.send({ tipo: 'nueva_carta', carta: null, turnoIdx: nuevoTurno }));
  }, []);

  const reiniciarLobby = useCallback(() => {
    setFase('lobby');
    setCartaActual(null);
    connListRef.current.forEach(c => c.send({ tipo: 'volver_lobby' }));
  }, []);

  const manejarMensajeHost = useCallback((conn, data) => {
    if (data.tipo === 'unirse') {
      setJugadores(prev => {
        const nuevos = [...prev, { id: conn.peer, apodo: data.apodo, esHost: false }];
        connListRef.current.forEach(c => c.send({ tipo: 'lista_jugadores', jugadores: nuevos }));
        return nuevos;
      });
    }
    if (data.tipo === 'accion_tirar') tirarCarta();
    if (data.tipo === 'accion_siguiente') siguienteTurno();
  }, [tirarCarta, siguienteTurno]);

  const manejarMensajeJugador = useCallback((data) => {
    if (data.tipo === 'lista_jugadores') setJugadores(data.jugadores);
    if (data.tipo === 'inicio_juego') setFase('jugando');
    if (data.tipo === 'volver_lobby') {
      setFase('lobby');
      setCartaActual(null);
    }
    if (data.tipo === 'nueva_carta') {
      setCartaActual(data.carta);
      setTurnoIdx(data.turnoIdx);
      setAnimKey(k => k + 1);
    }
  }, []);

  const jugadorActual = jugadores[turnoIdx]?.apodo || '';
  const esMiTurno = jugadores[turnoIdx]?.id === peer?.id;

  // Limpiar conexion al salir
  useEffect(() => {
    return () => { if (peer) peer.destroy(); };
  }, [peer]);

  // ==========================================
  // PANTALLA 1: MENU (Crear o Unirse)
  // ==========================================
  if (fase === 'menu') {
    return (
      <main className="min-h-screen min-h-dvh bg-[#020617] flex flex-col items-center justify-center p-4 relative overflow-hidden">
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[500px] h-[300px] bg-yellow-600/10 rounded-full blur-[100px]"></div>
        </div>
        <div className="max-w-sm w-full z-10 animate-fade-in">
          <Link href="/" className="inline-flex items-center gap-2 text-slate-600 hover:text-slate-400 text-sm mb-6 transition-colors">← Volver</Link>
          <h2 className="text-3xl font-black gradient-gold mb-1">{titulo}</h2>
          <p className="text-slate-500 text-sm mb-6">Modo en Sala · Conectate con tus compas</p>

          {error && <div className="bg-red-900/30 border border-red-500/30 text-red-400 p-3 rounded-xl mb-6 text-sm text-center font-bold">{error}</div>}

          {/* Paso 1: Apodo (Global) */}
          <div className="glass p-5 rounded-3xl mb-6 border-yellow-600/20">
            <label className="block text-xs font-bold text-yellow-500 uppercase tracking-widest mb-3">Paso 1: ¿Quién sos?</label>
            <input
              type="text"
              maxLength={15}
              placeholder="Escribí tu apodo..."
              value={apodo}
              onChange={e => setApodo(e.target.value)}
              className="w-full bg-[#020617] border border-slate-800 text-white px-4 py-3.5 rounded-2xl focus:outline-none focus:border-yellow-600/40 transition-all text-sm placeholder:text-slate-600"
            />
          </div>

          {/* Paso 2: Acción */}
          <div className="glass p-5 rounded-3xl border-yellow-600/20">
            <label className="block text-xs font-bold text-yellow-500 uppercase tracking-widest mb-4">Paso 2: ¿Qué vas a hacer?</label>
            
            <button
              onClick={() => conectar(true)}
              disabled={!apodo.trim()}
              className="w-full bg-gold text-slate-900 font-black py-3.5 rounded-2xl text-sm disabled:opacity-30 active:scale-95 transition-all shadow-lg shadow-yellow-900/30 mb-6"
            >
              👑 Crear Nueva Sala
            </button>

            <div className="relative border-t border-slate-800/60 mb-6">
              <span className="absolute left-1/2 -translate-x-1/2 -top-2.5 bg-[#0f172a] px-3 text-[10px] font-bold text-slate-500 rounded-full">O UNITE A UNA</span>
            </div>

            <div className="flex gap-2">
              <input
                type="text"
                maxLength={4}
                placeholder="CÓDIGO"
                value={codigoSala}
                onChange={e => setCodigoSala(e.target.value.toUpperCase())}
                className="w-1/2 bg-[#020617] border border-slate-800 text-center font-black text-white px-4 py-3 rounded-xl focus:outline-none focus:border-yellow-600/40 transition-all text-base placeholder:text-slate-600"
              />
              <button
                onClick={() => conectar(false)}
                disabled={!apodo.trim() || codigoSala.length !== 4}
                className="w-1/2 bg-yellow-900/20 text-yellow-400 border border-yellow-600/30 font-black py-3 rounded-xl text-sm disabled:opacity-30 active:scale-95 transition-all hover:bg-yellow-900/40"
              >
                Unirse 🚀
              </button>
            </div>
          </div>
        </div>
      </main>
    );
  }

  // ==========================================
  // PANTALLA 2: LOBBY
  // ==========================================
  if (fase === 'lobby') {
    return (
      <main className="min-h-screen min-h-dvh bg-[#020617] flex flex-col items-center justify-center p-4 relative overflow-hidden">
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[500px] h-[300px] bg-yellow-600/10 rounded-full blur-[100px]"></div>
        </div>
        <div className="max-w-sm w-full z-10 animate-fade-in text-center">
          <p className="text-slate-500 text-xs font-bold uppercase tracking-widest mb-2">Código de Sala</p>
          <h1 className="text-6xl font-black gradient-gold tracking-widest mb-8">{codigoSala}</h1>

          <div className="glass rounded-2xl p-4 mb-8">
            <h3 className="text-left text-xs font-bold text-slate-500 uppercase tracking-widest border-b border-slate-800 pb-3 mb-3">
              Jugadores ({jugadores.length})
            </h3>
            <div className="flex flex-col gap-2">
              {jugadores.map((j) => (
                <div key={j.id} className="flex justify-between items-center text-sm font-semibold">
                  <span className="text-white">{j.apodo} {j.id === peer?.id ? '(Vos)' : ''}</span>
                  {j.esHost && <span className="text-[10px] bg-yellow-900/40 text-yellow-400 px-2 py-0.5 rounded-full border border-yellow-600/20">HOST</span>}
                </div>
              ))}
            </div>
            {!esHost && <p className="text-xs text-slate-500 mt-4 animate-pulse">Esperando que el host inicie...</p>}
          </div>

          {esHost && (
            <button
              onClick={iniciarJuego}
              disabled={jugadores.length < 1}
              className="w-full bg-gold text-slate-900 font-black py-4 rounded-2xl text-base disabled:opacity-30 active:scale-95 transition-all shadow-lg shadow-yellow-900/30"
            >
              ¡Iniciar Partida! 🎲
            </button>
          )}
        </div>
      </main>
    );
  }

  // ==========================================
  // PANTALLA 3: JUGANDO
  // ==========================================
  return (
    <main className="min-h-screen min-h-dvh bg-[#020617] flex flex-col items-center justify-center p-4 gap-6 relative overflow-hidden">
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[500px] h-[300px] bg-yellow-600/8 rounded-full blur-[100px]"></div>
      </div>

      <div className="text-center z-10">
        <p className="text-slate-600 text-xs uppercase tracking-widest mb-1 font-bold">Le toca a</p>
        <h2 className="text-4xl md:text-5xl font-black gradient-gold">{jugadorActual}</h2>
      </div>

      <div
        key={animKey}
        className="card-enter card-shadow z-10 w-[min(300px,85vw)] rounded-3xl p-8 text-center border border-yellow-600/10 relative overflow-hidden"
        style={{ backgroundColor: cartaActual?.colorHex || 'rgba(15,23,42,0.8)', minHeight: '380px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}
      >
        {cartaActual ? (
          <>
            {cartaActual.categoria && <p className="text-white/40 text-xs uppercase tracking-widest font-black mb-5">{cartaActual.categoria}</p>}
            <h3 className="text-white font-black text-2xl uppercase tracking-wide leading-tight mb-6">{cartaActual.nombre}</h3>
            <p className={`text-white/85 leading-relaxed ${cartaActual.textSize || 'text-base'}`}>{cartaActual.descripcion}</p>
            {cartaActual.tragos && <p className="mt-6 text-white/50 text-sm font-bold border-t border-white/10 pt-4 w-full text-center">🍷 {cartaActual.tragos}</p>}
          </>
        ) : (
          <div className="flex flex-col items-center gap-4 text-slate-700">
            <span className="text-7xl">🃏</span>
            <p className="text-sm font-semibold">Esperando carta...</p>
          </div>
        )}
      </div>

      <div className="flex flex-col gap-3 w-full max-w-[300px] z-10">
        {!cartaActual ? (
          (esHost || esMiTurno) ? (
            <button onClick={() => esHost ? tirarCarta() : hostConnRef.current?.send({ tipo: 'accion_tirar' })} className="w-full bg-gold text-slate-900 font-black text-lg py-4 rounded-2xl shadow-lg shadow-yellow-900/30 active:scale-95 transition-all">
              🎲 {esMiTurno ? 'Tirar Carta' : 'Forzar Carta'}
            </button>
          ) : (
            <div className="glass py-4 text-center rounded-2xl text-sm font-bold text-slate-500">
              Esperando a {jugadorActual}...
            </div>
          )
        ) : (
          (esHost || esMiTurno) ? (
            <button onClick={() => esHost ? siguienteTurno() : hostConnRef.current?.send({ tipo: 'accion_siguiente' })} className="w-full glass text-white font-black text-base py-4 rounded-2xl active:scale-95 transition-all">
              {esMiTurno ? 'Siguiente turno →' : 'Forzar Siguiente →'}
            </button>
          ) : (
            <div className="glass py-4 text-center rounded-2xl text-sm font-bold text-slate-500">
              Turno de {jugadorActual}
            </div>
          )
        )}
        
        {/* Botón para volver al lobby (solo Host) */}
        {esHost && (
          <button
            onClick={reiniciarLobby}
            className="w-full text-slate-700 hover:text-red-500 text-xs font-bold py-3 mt-4 transition-colors"
          >
            🛑 Terminar Partida (Volver a la Sala)
          </button>
        )}
      </div>

      <div className="flex gap-2 flex-wrap justify-center max-w-sm z-10">
        {jugadores.map((j, i) => (
          <div key={j.id} className={`px-4 py-1.5 rounded-full text-xs font-black border transition-all ${i === turnoIdx ? 'bg-gold text-slate-900 border-transparent shadow-lg shadow-yellow-900/30' : 'glass text-slate-500 border-yellow-600/10'}`}>
            {j.apodo}
          </div>
        ))}
      </div>
    </main>
  );
}
