'use client';
import { useState, useEffect, useRef, useCallback } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';

const EVENTOS_SORPRESA = [
  "Cascada: Empieza a tomar el jugador activo y nadie puede parar hasta que el de su derecha pare.",
  "Regla del Pulgar: El host pone el pulgar en la mesa, el ultimo en hacerlo toma 2 tragos.",
  "Misterio: Todos los hombres toman 1 trago.",
  "Chicas al poder: Todas las mujeres toman 1 trago.",
  "El jugador activo asigna 3 tragos a quien quiera.",
  "Cultura Chupistica: Marcas de cerveza. El que pierda o repita, toma.",
  "El piso es lava: El ultimo en levantar los pies toma 2 tragos.",
  "Salud global: Todos los jugadores chocan copas y toman 1 trago."
];

const ICE = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
    { urls: 'turn:openrelay.metered.ca:80', username: 'openrelayproject', credential: 'openrelayproject' },
    { urls: 'turn:openrelay.metered.ca:443', username: 'openrelayproject', credential: 'openrelayproject' }
  ]
};

export default function SalaClient() {
  const searchParams = useSearchParams();
  const modoInicial = searchParams.get('modo') || 'osc';

  const [fase, setFase] = useState('menu');
  const [apodo, setApodo] = useState('');
  const [codigoSala, setCodigoSala] = useState('');
  const [esHost, setEsHost] = useState(false);
  const [jugadores, setJugadores] = useState([]);
  const [error, setError] = useState('');
  const [isConnecting, setIsConnecting] = useState(false);

  const [modoSeleccionado, setModoSeleccionado] = useState(modoInicial);
  const [tituloJuego, setTituloJuego] = useState('As Bajo La Manga');
  const [cartasData, setCartasData] = useState([]);
  const [isLoadingCards, setIsLoadingCards] = useState(false);
  const [categoriasDisponibles, setCategoriasDisponibles] = useState([]);
  const [categoriasActivas, setCategoriasActivas] = useState([]);

  const [cartaActual, setCartaActual] = useState(null);
  const [turnoIdx, setTurnoIdx] = useState(0);
  const [animKey, setAnimKey] = useState(0);
  const [eventoSorpresa, setEventoSorpresa] = useState(null);

  const [peer, setPeer] = useState(null);
  const connListRef = useRef([]);
  const hostConnRef = useRef(null);
  const barajaRef = useRef([]);
  const indexRef = useRef(0);

  // Refs para evitar closures obsoletos
  const faseRef = useRef('menu');
  const turnoRef = useRef(0);
  const jugadoresRef = useRef([]);
  const modoRef = useRef(modoInicial);
  const tituloRef = useRef('As Bajo La Manga');
  const cartaActualRef = useRef(null);

  useEffect(() => { faseRef.current = fase; }, [fase]);
  useEffect(() => { turnoRef.current = turnoIdx; }, [turnoIdx]);
  useEffect(() => { jugadoresRef.current = jugadores; }, [jugadores]);
  useEffect(() => { modoRef.current = modoSeleccionado; }, [modoSeleccionado]);
  useEffect(() => { tituloRef.current = tituloJuego; }, [tituloJuego]);
  useEffect(() => { cartaActualRef.current = cartaActual; }, [cartaActual]);

  // -------------------------------------------------------
  // Utilidades de broadcast
  // -------------------------------------------------------
  const broadcast = useCallback((msg) => {
    connListRef.current.forEach(c => { if (c.open) c.send(msg); });
  }, []);

  const broadcastEstadoCompleto = useCallback(() => {
    broadcast({
      tipo: 'sync_completo',
      fase: faseRef.current,
      jugadores: jugadoresRef.current,
      modo: modoRef.current,
      titulo: tituloRef.current,
      carta: cartaActualRef.current,
      turnoIdx: turnoRef.current,
    });
  }, [broadcast]);

  // -------------------------------------------------------
  // Cargar juego desde API
  // -------------------------------------------------------
  const cargarJuego = useCallback(async (modo) => {
    setModoSeleccionado(modo);
    setIsLoadingCards(true);
    try {
      const res = await fetch(`/api/cartas?modo=${modo}`);
      const data = await res.json();
      setCartasData(data);
      const unicas = [...new Set(data.map(c => c.categoria).filter(Boolean))];
      setCategoriasDisponibles(unicas);
      setCategoriasActivas(unicas);
      const titles = { osc: 'Sin Excusas', toxic: 'Toxic Cards', poker: 'Poker Caliente' };
      const nTitulo = titles[modo] || 'As Bajo La Manga';
      setTituloJuego(nTitulo);
      broadcast({ tipo: 'cambio_modo', modo, titulo: nTitulo });
    } catch (e) {
      setError('Error al cargar las cartas. Revisa tu conexion.');
    }
    setIsLoadingCards(false);
  }, [broadcast]);

  // -------------------------------------------------------
  // Conectar (Crear o Unirse)
  // -------------------------------------------------------
  const conectar = async (crear) => {
    if (!apodo.trim()) return;
    setError('');
    setIsConnecting(true);

    const codigoLimpio = codigoSala.trim().toUpperCase();
    const codigoFinal = crear ? Math.random().toString(36).substring(2, 6).toUpperCase() : codigoLimpio;

    if (!crear && codigoFinal.length !== 4) {
      setError('El codigo debe tener exactamente 4 caracteres');
      setIsConnecting(false);
      return;
    }

    setCodigoSala(codigoFinal);
    setEsHost(crear);

    if (crear) {
      setFase('lobby');
      cargarJuego(modoInicial);
    }

    const { Peer } = await import('peerjs');
    const peerId = crear ? `ablm-host-${codigoFinal}` : `ablm-${codigoFinal}-${Date.now()}`;

    const newPeer = new Peer(peerId, { debug: 0, secure: true, config: ICE });

    let connectionTimeout;
    if (!crear) {
      connectionTimeout = setTimeout(() => {
        if (faseRef.current === 'menu') {
          setError('Tiempo agotado. Verifica el codigo o tu conexion a internet.');
          setIsConnecting(false);
          newPeer.destroy();
        }
      }, 12000);
    }

    newPeer.on('open', () => {
      setPeer(newPeer);

      if (crear) {
        // HOST
        setJugadores([{ id: peerId, apodo, esHost: true }]);
        setIsConnecting(false);

        newPeer.on('connection', (conn) => {
          conn.on('open', () => {
            connListRef.current = [...connListRef.current, conn];

            // FIX #1: Mandar estado completo al jugador nuevo (jugadores existentes + modo + carta si hay partida)
            conn.send({
              tipo: 'sync_completo',
              fase: faseRef.current,
              jugadores: jugadoresRef.current,
              modo: modoRef.current,
              titulo: tituloRef.current,
              carta: cartaActualRef.current,
              turnoIdx: turnoRef.current,
            });

            conn.on('data', (data) => {
              if (data.tipo === 'unirse') {
                if (faseRef.current === 'jugando') {
                  conn.send({ tipo: 'rechazado', mensaje: 'La partida ya comenzo. Espera a que terminen.' });
                  setTimeout(() => conn.close(), 500);
                  return;
                }
                setJugadores(prev => {
                  const nuevos = [...prev, { id: conn.peer, apodo: data.apodo, esHost: false }];
                  // FIX #1b: Broadcast lista actualizada a TODOS (incluyendo el nuevo)
                  connListRef.current.forEach(c => {
                    if (c.open) c.send({ tipo: 'lista_jugadores', jugadores: nuevos });
                  });
                  return nuevos;
                });
              }
              if (data.tipo === 'accion_siguiente') {
                // FIX #2: Leer directamente de refs para evitar closures obsoletos
                const nuevoTurno = (turnoRef.current + 1) % jugadoresRef.current.length;
                const carta = barajaRef.current[indexRef.current % barajaRef.current.length];
                indexRef.current += 1;
                setTurnoIdx(nuevoTurno);
                setCartaActual(carta);
                setAnimKey(k => k + 1);
                broadcast({ tipo: 'nueva_carta', carta, turnoIdx: nuevoTurno });
              }
            });
          });

          conn.on('close', () => {
            connListRef.current = connListRef.current.filter(c => c.peer !== conn.peer);
            setJugadores(prev => {
              const nuevos = prev.filter(j => j.id !== conn.peer);
              broadcast({ tipo: 'lista_jugadores', jugadores: nuevos });
              return nuevos;
            });
          });
        });

      } else {
        // JUGADOR
        const conn = newPeer.connect(`ablm-host-${codigoFinal}`, { reliable: true });
        conn.on('open', () => {
          clearTimeout(connectionTimeout);
          hostConnRef.current = conn;
          setFase('lobby');
          setIsConnecting(false);
          conn.send({ tipo: 'unirse', apodo });
          conn.on('data', manejarMensajeJugador);
        });
        conn.on('error', () => {
          clearTimeout(connectionTimeout);
          setError('No se pudo conectar. Verifica el codigo.');
          setIsConnecting(false);
          setFase('menu');
        });
        conn.on('close', () => {
          if (faseRef.current !== 'menu') {
            setError('Te desconectaste de la sala.');
            setFase('menu');
            setPeer(null);
          }
        });
      }
    });

    newPeer.on('error', (err) => {
      clearTimeout(connectionTimeout);
      const msg = err?.type === 'unavailable-id'
        ? 'Ya existe una sala con ese codigo. Intenta con otro.'
        : 'Error de conexion. Verifica el codigo o tu WiFi.';
      setError(msg);
      setIsConnecting(false);
      setFase('menu');
    });
  };

  const salirDeSala = () => {
    if (peer) { peer.destroy(); setPeer(null); }
    setJugadores([]);
    setCodigoSala('');
    setCartaActual(null);
    setEventoSorpresa(null);
    setFase('menu');
  };

  // -------------------------------------------------------
  // Mensajes para el Jugador (recibe del Host)
  // -------------------------------------------------------
  const manejarMensajeJugador = useCallback((data) => {
    if (data.tipo === 'rechazado') { setError(data.mensaje); salirDeSala(); }
    
    // FIX #1: Recibir estado completo al unirse
    if (data.tipo === 'sync_completo') {
      if (data.jugadores) setJugadores(data.jugadores);
      if (data.modo) setModoSeleccionado(data.modo);
      if (data.titulo) setTituloJuego(data.titulo);
      if (data.carta) setCartaActual(data.carta);
      if (data.turnoIdx !== undefined) setTurnoIdx(data.turnoIdx);
      if (data.fase === 'jugando') setFase('jugando');
    }

    if (data.tipo === 'cambio_modo') { setModoSeleccionado(data.modo); setTituloJuego(data.titulo); }
    if (data.tipo === 'lista_jugadores') setJugadores(data.jugadores);

    if (data.tipo === 'inicio_juego') {
      setFase('jugando');
      setCartaActual(data.carta);
      setTurnoIdx(data.turnoIdx);
    }
    if (data.tipo === 'volver_lobby') {
      setFase('lobby');
      setCartaActual(null);
      setEventoSorpresa(null);
      if (data.jugadores) setJugadores(data.jugadores);
    }
    if (data.tipo === 'nueva_carta') {
      setCartaActual(data.carta);
      setTurnoIdx(data.turnoIdx);
      setAnimKey(k => k + 1);
    }
    if (data.tipo === 'evento_sorpresa') setEventoSorpresa(data.evento);
    if (data.tipo === 'cerrar_evento') setEventoSorpresa(null);
  }, []);

  // -------------------------------------------------------
  // Acciones del Host (Juego)
  // -------------------------------------------------------
  const iniciarJuego = () => {
    if (cartasData.length === 0) { alert('Las cartas aun estan cargando...'); return; }
    const filtradas = cartasData.filter(c => !c.categoria || categoriasActivas.includes(c.categoria));
    if (filtradas.length === 0) { alert('Selecciona al menos una categoria!'); return; }

    barajaRef.current = [...filtradas].sort(() => Math.random() - 0.5);
    indexRef.current = 1;
    const cartaInicial = barajaRef.current[0];
    setCartaActual(cartaInicial);
    setTurnoIdx(0);
    setFase('jugando');
    broadcast({ tipo: 'inicio_juego', carta: cartaInicial, turnoIdx: 0 });
  };

  const siguienteTurno = useCallback(() => {
    const nuevoTurno = (turnoRef.current + 1) % jugadoresRef.current.length;
    const carta = barajaRef.current[indexRef.current % barajaRef.current.length];
    indexRef.current += 1;
    setTurnoIdx(nuevoTurno);
    setCartaActual(carta);
    setAnimKey(k => k + 1);
    broadcast({ tipo: 'nueva_carta', carta, turnoIdx: nuevoTurno });
  }, [broadcast]);

  const banearCarta = useCallback(() => {
    const carta = barajaRef.current[indexRef.current % barajaRef.current.length];
    indexRef.current += 1;
    setCartaActual(carta);
    setAnimKey(k => k + 1);
    broadcast({ tipo: 'nueva_carta', carta, turnoIdx: turnoRef.current });
  }, [broadcast]);

  const lanzarEventoManual = useCallback(() => {
    const evento = EVENTOS_SORPRESA[Math.floor(Math.random() * EVENTOS_SORPRESA.length)];
    setEventoSorpresa(evento);
    broadcast({ tipo: 'evento_sorpresa', evento });
  }, [broadcast]);

  const continuarEvento = useCallback(() => {
    setEventoSorpresa(null);
    broadcast({ tipo: 'cerrar_evento' });
  }, [broadcast]);

  const reiniciarLobby = useCallback(() => {
    setFase('lobby');
    setCartaActual(null);
    setEventoSorpresa(null);
    // FIX #3: Mandar lista de jugadores actualizada al volver al lobby
    broadcast({ tipo: 'volver_lobby', jugadores: jugadoresRef.current });
  }, [broadcast]);

  useEffect(() => { return () => { if (peer) peer.destroy(); }; }, [peer]);

  const jugadorActual = jugadores[turnoIdx]?.apodo || '';
  const esMiTurno = jugadores[turnoIdx]?.id === peer?.id;

  // ==========================================
  // MENU
  // ==========================================
  if (fase === 'menu') {
    return (
      <main className="min-h-screen min-h-dvh bg-[#020617] flex flex-col items-center justify-center p-4 relative overflow-hidden">
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[500px] h-[300px] bg-yellow-600/10 rounded-full blur-[100px]"></div>
        </div>
        <div className="max-w-sm w-full z-10 animate-fade-in">
          <Link href="/" className="inline-flex items-center gap-2 text-slate-600 hover:text-slate-400 text-sm mb-6 transition-colors">← Volver</Link>
          <h2 className="text-3xl font-black gradient-gold mb-1">{tituloJuego}</h2>
          <p className="text-slate-500 text-sm mb-6">Modo en Sala</p>

          {error && <div className="bg-red-900/30 border border-red-500/30 text-red-400 p-3 rounded-xl mb-6 text-sm text-center font-bold">{error}</div>}

          <div className="glass p-5 rounded-3xl mb-6 border-yellow-600/20">
            <label className="block text-xs font-bold text-yellow-500 uppercase tracking-widest mb-3">Paso 1: Tu apodo</label>
            <input type="text" maxLength={15} placeholder="Escribi tu apodo..." value={apodo} onChange={e => setApodo(e.target.value)} className="w-full bg-[#020617] border border-slate-800 text-white px-4 py-3.5 rounded-2xl focus:outline-none focus:border-yellow-600/40 transition-all text-sm" />
          </div>

          <div className="glass p-5 rounded-3xl border-yellow-600/20">
            <label className="block text-xs font-bold text-yellow-500 uppercase tracking-widest mb-4">Paso 2: Accion</label>
            <button onClick={() => conectar(true)} disabled={!apodo.trim()} className="w-full bg-gold text-slate-900 font-black py-3.5 rounded-2xl text-sm disabled:opacity-30 active:scale-95 transition-all shadow-lg shadow-yellow-900/30 mb-6">
              👑 Crear Nueva Sala
            </button>
            <div className="relative border-t border-slate-800/60 mb-6">
              <span className="absolute left-1/2 -translate-x-1/2 -top-2.5 bg-[#0f172a] px-3 text-[10px] font-bold text-slate-500 rounded-full">O UNITE</span>
            </div>
            <div className="flex gap-2">
              <input type="text" maxLength={4} placeholder="CODIGO" value={codigoSala} onChange={e => setCodigoSala(e.target.value.toUpperCase())} className="w-1/2 bg-[#020617] border border-slate-800 text-center font-black text-white px-4 py-3 rounded-xl focus:outline-none focus:border-yellow-600/40 transition-all text-base" />
              <button onClick={() => conectar(false)} disabled={!apodo.trim() || codigoSala.length !== 4 || isConnecting} className="w-1/2 bg-yellow-900/20 text-yellow-400 border border-yellow-600/30 font-black py-3 rounded-xl text-sm disabled:opacity-30 active:scale-95 transition-all hover:bg-yellow-900/40">
                {isConnecting ? '⏳ Conectando...' : 'Unirse 🚀'}
              </button>
            </div>
          </div>
        </div>
      </main>
    );
  }

  // ==========================================
  // LOBBY
  // ==========================================
  if (fase === 'lobby') {
    return (
      <main className="min-h-screen min-h-dvh bg-[#020617] flex flex-col items-center justify-center p-4 relative overflow-hidden">
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[500px] h-[300px] bg-yellow-600/10 rounded-full blur-[100px]"></div>
        </div>
        <div className="max-w-sm w-full z-10 animate-fade-in text-center">
          <p className="text-yellow-500 text-sm font-black uppercase tracking-widest mb-1">{tituloJuego}</p>
          <p className="text-slate-500 text-[10px] font-bold uppercase tracking-widest mb-2">Codigo de Sala</p>
          <h1 className="text-6xl font-black gradient-gold tracking-widest mb-6">{codigoSala}</h1>

          <div className="glass rounded-2xl p-4 mb-4">
            <h3 className="text-left text-xs font-bold text-slate-500 uppercase tracking-widest border-b border-slate-800 pb-3 mb-3">Jugadores ({jugadores.length})</h3>
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
            <div className="glass p-4 rounded-3xl mb-4 border-yellow-600/10">
              <h3 className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-3">Seleccionar Juego</h3>
              <div className="flex gap-2 justify-center">
                {[['osc','Sin Excusas'],['toxic','Toxic Cards'],['poker','Poker Caliente']].map(([id, label]) => (
                  <button key={id} onClick={() => cargarJuego(id)} className={`px-3 py-2 rounded-xl text-[10px] font-black uppercase transition-all ${modoSeleccionado === id ? 'bg-gold text-slate-900' : 'bg-[#020617] text-slate-500 border border-slate-800'}`}>
                    {isLoadingCards && modoSeleccionado === id ? '...' : label}
                  </button>
                ))}
              </div>
            </div>
          )}

          {esHost && categoriasDisponibles.length > 0 && (
            <div className="glass p-4 rounded-3xl mb-4 border-yellow-600/10">
              <h3 className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-3">Filtros</h3>
              <div className="flex flex-wrap gap-2 justify-center">
                {categoriasDisponibles.map(cat => (
                  <button key={cat} onClick={() => setCategoriasActivas(prev => prev.includes(cat) ? prev.filter(c => c !== cat) : [...prev, cat])} className={`px-3 py-1.5 rounded-full text-xs font-bold border transition-all ${categoriasActivas.includes(cat) ? 'bg-gold text-slate-900 border-transparent' : 'bg-[#020617] text-slate-500 border-slate-800'}`}>
                    {cat}
                  </button>
                ))}
              </div>
            </div>
          )}

          {esHost && (
            <button onClick={iniciarJuego} disabled={isLoadingCards || cartasData.length === 0} className="w-full bg-gold text-slate-900 font-black py-4 rounded-2xl text-base disabled:opacity-30 active:scale-95 transition-all shadow-lg shadow-yellow-900/30 mb-4">
              {isLoadingCards ? 'Cargando cartas...' : 'Iniciar Partida! 🎲'}
            </button>
          )}

          <button onClick={salirDeSala} className="text-slate-500 hover:text-red-400 text-sm font-bold transition-colors">
            {esHost ? 'Cerrar Sala' : 'Salir de la Sala'}
          </button>
        </div>
      </main>
    );
  }

  // ==========================================
  // JUGANDO
  // ==========================================
  return (
    <main className="min-h-screen min-h-dvh bg-[#020617] flex flex-col items-center justify-center p-4 gap-6 relative overflow-hidden">
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[500px] h-[300px] bg-yellow-600/8 rounded-full blur-[100px]"></div>
      </div>

      {eventoSorpresa && (
        <div className="absolute inset-0 z-50 flex flex-col items-center justify-center bg-red-950/90 backdrop-blur-md p-6 text-center animate-fade-in">
          <div className="w-full max-w-sm glass border-red-500/50 p-8 rounded-3xl shadow-2xl shadow-red-900/50">
            <h2 className="text-3xl font-black text-red-500 mb-2 animate-pulse">ALERTA GLOBAL!</h2>
            <p className="text-white text-lg font-bold mb-8 leading-snug">{eventoSorpresa}</p>
            <p className="text-red-300 text-xs uppercase tracking-widest mb-6">Cumplan el castigo antes de seguir</p>
            {esHost ? (
              <button onClick={continuarEvento} className="w-full py-4 rounded-2xl font-black text-lg bg-red-600 text-white shadow-lg active:scale-95 transition-all">Continuar con el turno</button>
            ) : (
              <p className="text-red-400 text-sm font-bold animate-pulse">Esperando que el Host continue...</p>
            )}
          </div>
        </div>
      )}

      <div className="text-center z-10">
        <p className="text-slate-600 text-xs uppercase tracking-widest mb-1 font-bold">Le toca a</p>
        <h2 className="text-4xl md:text-5xl font-black gradient-gold">{jugadorActual}</h2>
      </div>

      <div key={animKey} className="card-enter card-shadow z-10 w-[min(300px,85vw)] rounded-3xl p-8 text-center border border-yellow-600/10 relative overflow-hidden"
        style={{ backgroundColor: cartaActual?.colorHex || 'rgba(15,23,42,0.8)', minHeight: '380px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
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
        {(esHost || esMiTurno) ? (
          <>
            {esHost && (
              <button onClick={banearCarta} className="w-full py-2 rounded-xl text-xs font-bold border border-red-900/50 text-red-500 hover:bg-red-950/30 transition-all">
                🚫 Host: Banear esta carta y sacar otra
              </button>
            )}
            {esHost && !eventoSorpresa && (
              <button onClick={lanzarEventoManual} className="w-full py-2 rounded-xl text-xs font-bold border border-purple-900/50 text-purple-400 hover:bg-purple-950/30 transition-all">
                ⚡ Host: Disparar Evento Sorpresa
              </button>
            )}
            <button
              onClick={() => esHost ? siguienteTurno() : hostConnRef.current?.send({ tipo: 'accion_siguiente' })}
              className="w-full glass text-white font-black text-base py-4 rounded-2xl active:scale-95 transition-all">
              {esMiTurno ? 'Siguiente Turno →' : 'Forzar Siguiente →'}
            </button>
          </>
        ) : (
          <div className="glass py-4 text-center rounded-2xl text-sm font-bold text-slate-500">
            Esperando a {jugadorActual}...
          </div>
        )}

        {esHost && (
          <button onClick={reiniciarLobby} className="w-full text-slate-700 hover:text-red-500 text-xs font-bold py-3 mt-4 transition-colors">
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