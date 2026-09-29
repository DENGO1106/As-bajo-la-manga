'use client';
import { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

const PALOS = ['♣', '♦', '♥', '♠'];
const COLORES = { '♣': 'negro', '♦': 'rojo', '♥': 'rojo', '♠': 'negro' };
const FIGURAS = { J: 11, Q: 12, K: 13 };
const PUNTOS_CARTA = [0, 1, 2, 3, 4];

const EVENTOS_SORPRESA = [
  "Cascada: Empieza a tomar el jugador activo y nadie puede parar hasta que el de su derecha pare.",
  "Regla del Pulgar: El host pone el pulgar en la mesa, el último en hacerlo toma 2 tragos.",
  "Misterio: Todos los hombres toman 1 trago.",
  "Chicas al poder: Todas las mujeres toman 1 trago.",
  "El jugador activo asigna 3 tragos a quien quiera.",
  "Cultura Chupística: Marcas de cerveza. El que pierda o repita, toma.",
  "El piso es lava: El último en levantar los pies toma 2 tragos.",
  "Salud global: Todos los jugadores chocan copas y toman 1 trago."
];

function generarBaraja() {
  const cartas = [];
  const rangos = ['2','3','4','5','6','7','8','9','10','J','Q','K'];
  for (const palo of PALOS) {
    for (const rango of rangos) {
      const valor = FIGURAS[rango] ?? parseInt(rango);
      cartas.push({ rango, palo, valor, color: COLORES[palo], esPar: valor % 2 === 0, display: `${rango}${palo}` });
    }
  }
  for (let i = cartas.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [cartas[i], cartas[j]] = [cartas[j], cartas[i]];
  }
  return cartas;
}

export default function SinExcusasSalaClient() {
  const router = useRouter();
  
  // -- LOBBY STATE --
  const [faseGlobal, setFaseGlobal] = useState('menu');
  const [apodo, setApodo] = useState('');
  const [codigoSala, setCodigoSala] = useState('');
  const [esHost, setEsHost] = useState(false);
  const [error, setError] = useState('');
  const [isConnecting, setIsConnecting] = useState(false);
  
  // -- GAME STATE --
  const [jugadores, setJugadores] = useState([]);
  const [turnoIdx, setTurnoIdx] = useState(0);
  const [escalera, setEscalera] = useState([]);
  const [cartaActual, setCartaActual] = useState(null);
  const [etapa, setEtapa] = useState(0);
  const [tragos, setTragos] = useState(0);
  const [esperandoRespuesta, setEsperandoRespuesta] = useState(false);
  const [resultado, setResultado] = useState(null);
  const [enRevancha, setEnRevancha] = useState(false);
  const [puntosGanadosEscalera, setPuntosGanadosEscalera] = useState(0);
  const [cobarde, setCobarde] = useState(false);
  const [eventoSorpresa, setEventoSorpresa] = useState(null);
  const [log, setLog] = useState([]);

  // -- WEBRTC STATE --
  const [peer, setPeer] = useState(null);
  const connListRef = useRef([]);
  const hostConnRef = useRef(null);
  
  // -- HOST GAME REFS --
  const gameStateRef = useRef({
    faseGlobal: 'menu', jugadores: [], turnoIdx: 0, escalera: [], cartaActual: null,
    etapa: 0, tragos: 0, esperandoRespuesta: false, resultado: null, enRevancha: false,
    puntosGanadosEscalera: 0, cobarde: false, eventoSorpresa: null, log: [], baraja: [], indexBaraja: 0
  });

  const miIdRef = useRef('');

  // -----------------------------------------------------
  // BROADCAST (Host -> Peers)
  // -----------------------------------------------------
  const broadcastState = (newStateUpdates) => {
    if (!esHost) return;
    const nextState = { ...gameStateRef.current, ...newStateUpdates };
    gameStateRef.current = nextState;
    
    setFaseGlobal(nextState.faseGlobal);
    setJugadores(nextState.jugadores);
    setTurnoIdx(nextState.turnoIdx);
    setEscalera(nextState.escalera);
    setCartaActual(nextState.cartaActual);
    setEtapa(nextState.etapa);
    setTragos(nextState.tragos);
    setEsperandoRespuesta(nextState.esperandoRespuesta);
    setResultado(nextState.resultado);
    setEnRevancha(nextState.enRevancha);
    setPuntosGanadosEscalera(nextState.puntosGanadosEscalera);
    setCobarde(nextState.cobarde);
    setEventoSorpresa(nextState.eventoSorpresa);
    setLog(nextState.log);

    const { baraja, indexBaraja, ...publicState } = nextState;
    connListRef.current.forEach(c => {
      if (c.open) c.send({ tipo: 'sync_state', state: publicState });
    });
  };

  // -----------------------------------------------------
  // RED (Conectar, Unirse, Hostear)
  // -----------------------------------------------------
  const conectar = async (crear) => {
    if (!apodo.trim()) return;
    setError('');
    setIsConnecting(true);
    
    const codigoLimpio = codigoSala.trim().toUpperCase();
    const codigoFinal = crear ? Math.random().toString(36).substring(2, 6).toUpperCase() : codigoLimpio;
    
    setCodigoSala(codigoFinal);
    setEsHost(crear);

    const { Peer } = await import('peerjs');
    const peerId = crear ? `ablm-host-${codigoFinal}` : `ablm-${codigoFinal}-${Date.now()}`;
    miIdRef.current = peerId;
    
    const newPeer = new Peer(peerId, { 
      debug: 1,
      secure: true,
      config: {
        iceServers: [
          { urls: 'stun:stun.l.google.com:19302' },
          { urls: 'stun:stun.cloudflare.com:3478' },
          { urls: 'stun:stun.miwifi.com:3478' },
          { urls: 'turn:openrelay.metered.ca:80', username: 'openrelayproject', credential: 'openrelayproject' },
          { urls: 'turn:openrelay.metered.ca:443', username: 'openrelayproject', credential: 'openrelayproject' }
        ]
      }
    });

    let connectionTimeout;
    if (!crear) {
      connectionTimeout = setTimeout(() => {
        if (gameStateRef.current.faseGlobal === 'menu') {
          setError('Tiempo de conexion agotado (25s). Revisa tu red o codigo.');
          setIsConnecting(false);
          newPeer.destroy();
        }
      }, 25000);
    }

    newPeer.on('open', () => {
      setPeer(newPeer);
      if (crear) {
        setFaseGlobal('lobby');
        const initJug = [{ id: peerId, apodo, esHost: true, puntos: -1, turnosJugados: 0 }];
        broadcastState({ faseGlobal: 'lobby', jugadores: initJug, baraja: generarBaraja(), indexBaraja: 0 });
        setIsConnecting(false);

        newPeer.on('connection', (conn) => {
          conn.on('open', () => {
            connListRef.current.push(conn);
            const { baraja, indexBaraja, ...publicState } = gameStateRef.current;
            conn.send({ tipo: 'sync_state', state: publicState });
            conn.on('data', (data) => manejarMensajeHost(conn, data));
          });
          conn.on('close', () => {
            connListRef.current = connListRef.current.filter(c => c.peer !== conn.peer);
            const nuevos = gameStateRef.current.jugadores.filter(j => j.id !== conn.peer);
            broadcastState({ jugadores: nuevos });
          });
        });
      } else {
        const conn = newPeer.connect(`ablm-host-${codigoFinal}`);
        conn.on('open', () => {
          clearTimeout(connectionTimeout);
          hostConnRef.current = conn;
          setIsConnecting(false);
          conn.send({ tipo: 'unirse', apodo });
          conn.on('data', manejarMensajeJugador);
        });
        conn.on('error', () => {
          clearTimeout(connectionTimeout);
          setError('No se pudo conectar. Verifica el codigo.');
          setIsConnecting(false);
          setFaseGlobal('menu');
        });
        conn.on('close', () => {
          if (gameStateRef.current.faseGlobal !== 'menu') {
            setError('Te desconectaste de la sala.');
            setFaseGlobal('menu');
          }
        });
      }
    });
    newPeer.on('error', (err) => {
      clearTimeout(connectionTimeout);
      const msg = err?.type === 'unavailable-id'
        ? 'Ya existe una sala con ese codigo.'
        : 'Error de conexion. Verifica el codigo o tu WiFi.';
      setError(msg);
      setIsConnecting(false);
      setFaseGlobal('menu');
    });
  };

  const salirDeSala = () => {
    if (peer) peer.destroy();
    setPeer(null);
    setFaseGlobal('menu');
  };

  const manejarMensajeHost = useCallback((conn, data) => {
    if (data.tipo === 'unirse') {
      const state = gameStateRef.current;
      if (state.faseGlobal === 'jugando') {
        conn.send({ tipo: 'rechazado', mensaje: 'Partida en curso' });
        setTimeout(() => conn.close(), 500);
        return;
      }
      const nuevos = [...state.jugadores, { id: conn.peer, apodo: data.apodo, esHost: false, puntos: -1, turnosJugados: 0 }];
      broadcastState({ jugadores: nuevos });
    }
    if (data.tipo === 'accion') {
      procesarAccionHost(data.accion, data.payload, conn.peer);
    }
  }, []);

  const enviarAccion = (accion, payload = null) => {
    if (esHost) procesarAccionHost(accion, payload, miIdRef.current);
    else hostConnRef.current?.send({ tipo: 'accion', accion, payload });
  };

  const manejarMensajeJugador = useCallback((data) => {
    if (data.tipo === 'sync_state') {
      const s = data.state;
      setFaseGlobal(s.faseGlobal); setJugadores(s.jugadores); setTurnoIdx(s.turnoIdx);
      setEscalera(s.escalera); setCartaActual(s.cartaActual); setEtapa(s.etapa);
      setTragos(s.tragos); setEsperandoRespuesta(s.esperandoRespuesta); setResultado(s.resultado);
      setEnRevancha(s.enRevancha); setPuntosGanadosEscalera(s.puntosGanadosEscalera);
      setCobarde(s.cobarde); setEventoSorpresa(s.eventoSorpresa); setLog(s.log);
    }
    if (data.tipo === 'rechazado') {
      setError(data.mensaje); salirDeSala();
    }
  }, []);

  const procesarAccionHost = (accion, payload, peerId) => {
    const s = gameStateRef.current;
    const jugadorActivo = s.jugadores[s.turnoIdx];
    if (!jugadorActivo) return;
    
    // El Host tiene poderes para accionar algunas cosas aunque no sea su turno
    const esElHost = peerId === miIdRef.current;
    if (peerId !== jugadorActivo.id && !esElHost) return;

    const sacarCartaHost = () => {
      let b = s.baraja;
      let i = s.indexBaraja;
      if (i >= b.length) { b = generarBaraja(); i = 0; }
      const c = b[i];
      s.baraja = b; s.indexBaraja = i + 1;
      return c;
    };

    const addLog = (msg) => { s.log = [...s.log.slice(-9), msg]; };

    if (accion === 'iniciarJuego') {
      if (s.jugadores.length < 1) return;
      s.jugadores = s.jugadores.map(j => ({ ...j, puntos: -1, turnosJugados: 0 }));
      broadcastState({ faseGlobal: 'jugando', baraja: generarBaraja(), indexBaraja: 0, turnoIdx: 0, etapa: 0, log: [], eventoSorpresa: null });
    }
    
    if (accion === 'tirarCarta') {
      const carta = sacarCartaHost();
      broadcastState({ cartaActual: carta, escalera: [carta], etapa: 1, esperandoRespuesta: true, resultado: null, tragos: 0, puntosGanadosEscalera: 0, enRevancha: false, cobarde: false });
    }

    if (accion === 'lanzarEventoManual' && esElHost) {
      const evento = EVENTOS_SORPRESA[Math.floor(Math.random() * EVENTOS_SORPRESA.length)];
      broadcastState({ eventoSorpresa: evento });
    }

    if (accion === 'continuarEvento' && esElHost) {
      // El Host cerró el evento, simplemente se oculta y el turno sigue exactamente donde estaba
      broadcastState({ eventoSorpresa: null });
    }

    if (accion === 'banearCarta' && esElHost) {
      // Saca carta nueva sin avanzar turno y la reemplaza
      const carta = sacarCartaHost();
      const nuevaEscalera = [...s.escalera];
      if (nuevaEscalera.length > 0) {
        nuevaEscalera[nuevaEscalera.length - 1] = carta;
      } else {
        nuevaEscalera.push(carta);
      }
      addLog(`🚫 Host baneó la carta. Nueva carta sacada.`);
      broadcastState({ cartaActual: carta, escalera: nuevaEscalera, esperandoRespuesta: true, resultado: null });
    }

    if (accion === 'declararCobarde') {
      addLog(`💛 ${jugadorActivo.apodo} declaró cobarde → 1 trago`);
      broadcastState({ cobarde: true, resultado: { tipo: 'cobarde', mensaje: `No juega y toma 1 trago 🍺` }, etapa: 0 });
    }

    if (accion === 'confirmarCobarde' || accion === 'siguienteTurno') {
      let nj = [...s.jugadores];
      if (accion !== 'confirmarCobarde') {
        nj[s.turnoIdx] = { ...nj[s.turnoIdx], puntos: nj[s.turnoIdx].puntos + s.puntosGanadosEscalera, turnosJugados: nj[s.turnoIdx].turnosJugados + 1 };
      } else {
        nj[s.turnoIdx] = { ...nj[s.turnoIdx], turnosJugados: nj[s.turnoIdx].turnosJugados + 1 };
      }
      
      const turnosRestantes = nj.reduce((sum, j) => sum + (3 - j.turnosJugados), 0);
      if (turnosRestantes <= 0) {
        broadcastState({ faseGlobal: 'fin', jugadores: nj });
        return;
      }
      
      let sig = (s.turnoIdx + 1) % nj.length;
      while (nj[sig].turnosJugados >= 3) sig = (sig + 1) % nj.length;
      
      broadcastState({ jugadores: nj, turnoIdx: sig, etapa: 0, escalera: [], cartaActual: null, tragos: 0, puntosGanadosEscalera: 0, resultado: null, esperandoRespuesta: false, cobarde: false, eventoSorpresa: null });
    }

    if (accion === 'responder') {
      const acierto = payload.acierto;
      const etapaNum = payload.etapaNum;
      
      if (s.enRevancha) {
        const puntosEnJuego = PUNTOS_CARTA[etapaNum - 1] || 1;
        if (acierto) {
          addLog(`✅ ${jugadorActivo.apodo} ganó revancha: +${puntosEnJuego} pts`);
          broadcastState({ tragos: 0, puntosGanadosEscalera: s.puntosGanadosEscalera + puntosEnJuego, resultado: { tipo: 'acierto', mensaje: `✅ Revancha ganada (+${puntosEnJuego})` }, esperandoRespuesta: false, enRevancha: false, etapa: 0 });
        } else {
          addLog(`❌ ${jugadorActivo.apodo} perdió revancha: -${puntosEnJuego} pts`);
          broadcastState({ tragos: s.tragos + 1, puntosGanadosEscalera: s.puntosGanadosEscalera - puntosEnJuego, resultado: { tipo: 'fallo', mensaje: `❌ Revancha perdida (-${puntosEnJuego})` }, esperandoRespuesta: false, enRevancha: false, etapa: 0 });
        }
        return;
      }

      if (acierto) {
        const pts = PUNTOS_CARTA[etapaNum];
        addLog(`✅ ${jugadorActivo.apodo} acertó carta ${etapaNum}: +${pts} pts`);
        broadcastState({ puntosGanadosEscalera: s.puntosGanadosEscalera + pts, tragos: Math.max(0, s.tragos - 1), resultado: { tipo: 'acierto', mensaje: `✅ ¡Acierto! +${pts}` }, esperandoRespuesta: false, etapa: etapaNum === 4 ? 0 : etapaNum + 1 });
      } else {
        addLog(`❌ ${jugadorActivo.apodo} falló carta ${etapaNum}`);
        broadcastState({ tragos: s.tragos + 1, resultado: { tipo: 'fallo', mensaje: `❌ Fallo (1 trago)` }, esperandoRespuesta: false, etapa: etapaNum === 4 ? 0 : -etapaNum });
      }
    }

    if (accion === 'aceptarDerrota') {
      broadcastState({ resultado: { tipo: 'derrota', mensaje: `Derrota aceptada (${s.tragos} tragos)` }, etapa: 0 });
    }

    if (accion === 'plantarse') {
      broadcastState({ resultado: { tipo: 'plantado', mensaje: `Plantado con ${s.puntosGanadosEscalera} pts` }, etapa: 0 });
    }

    if (accion === 'tomarRevancha' || accion === 'siguienteCarta') {
      const carta = sacarCartaHost();
      if (accion === 'tomarRevancha') {
        broadcastState({ cartaActual: carta, escalera: [...s.escalera, carta], enRevancha: true, esperandoRespuesta: true, resultado: null, etapa: Math.abs(s.etapa) + 1 });
      } else {
        broadcastState({ cartaActual: carta, escalera: [...s.escalera, carta], esperandoRespuesta: true, resultado: null });
      }
    }

    if (accion === 'nuevoTorneo') {
      broadcastState({ faseGlobal: 'lobby' });
    }
  };

  const BtnRespuesta = ({ onClick, label, emoji }) => (
    <button onClick={onClick} className="w-full py-4 rounded-2xl font-black border text-lg hover:scale-[1.02] active:scale-95 border-slate-600/40 bg-slate-900/50 text-slate-200 shadow-lg">
      {emoji} {label}
    </button>
  );

  const miTurno = jugadores[turnoIdx]?.id === peer?.id || esHost;
  const jugadorActivo = jugadores[turnoIdx] || {};

  if (faseGlobal === 'menu') {
    return (
      <main className="min-h-screen bg-[#020617] flex flex-col items-center justify-center p-4">
        <div className="max-w-sm w-full z-10 animate-fade-in text-center">
          <h2 className="text-4xl font-black gradient-gold mb-1">La Última Carta</h2>
          <p className="text-slate-500 text-sm mb-6">Modo en Sala · Sincronizado</p>
          {error && <p className="text-red-400 mb-4 font-bold">{error}</p>}
          <input type="text" maxLength={15} placeholder="Tu apodo" value={apodo} onChange={e => setApodo(e.target.value)} className="w-full bg-[#0f172a] border border-slate-800 text-white px-4 py-3 rounded-2xl mb-4 text-center font-bold" />
          <button onClick={() => conectar(true)} disabled={!apodo.trim()} className="w-full bg-gold text-slate-900 font-black py-3.5 rounded-2xl mb-4">👑 Crear Sala</button>
          <div className="flex gap-2">
            <input type="text" maxLength={4} placeholder="CÓDIGO" value={codigoSala} onChange={e => setCodigoSala(e.target.value.toUpperCase())} className="w-1/2 bg-[#0f172a] border border-slate-800 text-white text-center font-black px-4 py-3 rounded-xl" />
            <button onClick={() => conectar(false)} disabled={!apodo.trim() || codigoSala.length !== 4 || isConnecting} className="w-1/2 bg-yellow-900/20 text-yellow-400 font-black py-3 rounded-xl">Unirse</button>
          </div>
          <Link href="/" className="block mt-6 text-slate-500 text-sm">Volver al inicio</Link>
        </div>
      </main>
    );
  }

  if (faseGlobal === 'lobby') {
    return (
      <main className="min-h-screen bg-[#020617] flex flex-col items-center justify-center p-4">
        <div className="max-w-sm w-full z-10 animate-fade-in text-center">
          <p className="text-slate-500 text-xs font-bold uppercase tracking-widest mb-1">Código de Sala</p>
          <h1 className="text-6xl font-black gradient-gold tracking-widest mb-6">{codigoSala}</h1>
          <div className="glass rounded-2xl p-4 mb-6 text-left border border-slate-800">
            <h3 className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-3">Jugadores ({jugadores.length})</h3>
            {jugadores.map(j => <div key={j.id} className="text-white font-bold py-1">{j.apodo} {j.esHost && '👑'}</div>)}
          </div>
          {esHost && <button onClick={() => enviarAccion('iniciarJuego')} className="w-full bg-gold text-slate-900 font-black py-4 rounded-2xl mb-4 shadow-lg shadow-yellow-900/30">Iniciar Torneo 🎲</button>}
          {!esHost && <p className="text-slate-500 text-sm mb-4">Esperando al Host...</p>}
          <button onClick={salirDeSala} className="text-red-500 text-sm font-bold">Salir de la sala</button>
        </div>
      </main>
    );
  }

  if (faseGlobal === 'fin') {
    const sorted = [...jugadores].sort((a, b) => b.puntos - a.puntos);
    return (
      <div className="min-h-screen p-4 flex flex-col items-center justify-center bg-[#020617]">
        <h1 className="text-3xl font-black gradient-gold mb-6">Fin del Torneo 🏆</h1>
        <div className="max-w-sm w-full space-y-3 mb-6">
          {sorted.map((j, i) => (
            <div key={j.id} className="glass p-4 rounded-xl flex justify-between border border-slate-800">
              <span className="font-bold text-white">{i === 0 ? '🥇' : i === sorted.length - 1 ? '💀' : `#${i + 1}`} {j.apodo}</span>
              <span className="font-black text-yellow-400">{j.puntos} pts</span>
            </div>
          ))}
        </div>
        {esHost && <button onClick={() => enviarAccion('nuevoTorneo')} className="w-full py-4 bg-gold text-slate-900 font-black rounded-xl">Volver al Lobby</button>}
      </div>
    );
  }

  const eReal = enRevancha ? Math.abs(etapa) : etapa;
  
  return (
    <div className="min-h-screen bg-[#020617] p-4 flex flex-col items-center pt-6 pb-24 relative">
      
      {/* OVERLAY DE EVENTO SORPRESA */}
      {eventoSorpresa && (
        <div className="absolute inset-0 z-50 flex flex-col items-center justify-center bg-red-950/90 backdrop-blur-md p-6 text-center animate-fade-in">
          <div className="w-full max-w-sm glass border-red-500/50 p-8 rounded-3xl shadow-2xl shadow-red-900/50">
            <h2 className="text-3xl font-black text-red-500 mb-2 animate-pulse">¡ALERTA GLOBAL!</h2>
            <p className="text-white text-lg font-bold mb-8 leading-snug">{eventoSorpresa}</p>
            <p className="text-red-300 text-xs uppercase tracking-widest mb-6">Cumplan el castigo antes de seguir</p>
            
            {esHost ? (
              <button onClick={() => enviarAccion('continuarEvento')} className="w-full py-4 rounded-2xl font-black text-lg bg-red-600 text-white shadow-lg active:scale-95 transition-all">
                Continuar con el turno ✓
              </button>
            ) : (
              <p className="text-red-400 text-sm font-bold animate-pulse">Esperando que el Host continúe...</p>
            )}
          </div>
        </div>
      )}

      <div className="max-w-sm w-full space-y-4 z-10">
        <div className="flex justify-between items-center text-xs font-bold text-slate-400">
          <span>Sala: {codigoSala}</span>
          <button onClick={salirDeSala} className="hover:text-red-400">Salir</button>
        </div>

        <div className="text-center">
          <p className="text-slate-500 text-xs uppercase tracking-widest">Le toca a</p>
          <h2 className="text-3xl font-black text-yellow-400">{jugadorActivo.apodo}</h2>
          {tragos > 0 && <p className="text-red-400 font-bold">🍺 {tragos} tragos acumulados</p>}
        </div>

        {/* Escalera */}
        {escalera.length > 0 && (
          <div className="flex gap-2 justify-center flex-wrap">
            {escalera.map((c, i) => {
              const estaOculta = (i === escalera.length - 1) && esperandoRespuesta && !resultado;
              if (estaOculta) return <div key={i} className="w-14 h-20 rounded-xl border border-yellow-600/50 bg-gradient-to-br from-yellow-900/80 to-slate-900 flex items-center justify-center"><span className="text-2xl opacity-50">🃏</span></div>;
              return (
                <div key={i} className={`w-14 h-20 rounded-xl border flex flex-col items-center justify-center font-black text-lg shadow-lg ${c.color === 'rojo' ? 'text-red-400 border-red-500/50 bg-red-950/40' : 'text-slate-200 border-slate-600/50 bg-slate-900'}`}>
                  <span className="text-sm">{c.rango}</span><span>{c.palo}</span>
                </div>
              );
            })}
          </div>
        )}

        {/* Carta Grande */}
        {cartaActual && (
          <div className={`w-full h-44 rounded-3xl border-2 flex flex-col items-center justify-center shadow-2xl transition-all ${esperandoRespuesta && !resultado ? 'border-yellow-600/50 bg-gradient-to-br from-yellow-900/40 to-slate-900/80' : cartaActual.color === 'rojo' ? 'border-red-500/60 bg-gradient-to-br from-red-950/60 to-red-900/30' : 'border-slate-600/60 bg-gradient-to-br from-slate-900/80 to-slate-800/40'}`}>
            {esperandoRespuesta && !resultado ? (
              <p className="text-6xl opacity-50 animate-pulse">🃏</p>
            ) : resultado ? (
              <div className="text-center px-4">
                <p className={`text-5xl font-black ${cartaActual.color === 'rojo' ? 'text-red-400' : 'text-white'}`}>{cartaActual.rango}{cartaActual.palo}</p>
                <p className={`text-sm font-bold mt-2 ${resultado.tipo === 'acierto' ? 'text-green-400' : 'text-red-400'}`}>{resultado.mensaje}</p>
              </div>
            ) : (
              <p className={`text-5xl font-black ${cartaActual.color === 'rojo' ? 'text-red-400' : 'text-white'}`}>{cartaActual.rango}{cartaActual.palo}</p>
            )}
          </div>
        )}

        {/* Botones Especiales para el Host */}
        {esHost && cartaActual && esperandoRespuesta && !resultado && (
          <button onClick={() => enviarAccion('banearCarta')} className="w-full py-2 rounded-xl text-xs font-bold border border-red-900/50 text-red-500 hover:bg-red-950/30 transition-all">
            🚫 Host: Banear esta carta y sacar otra
          </button>
        )}

        {esHost && !eventoSorpresa && (
          <button onClick={() => enviarAccion('lanzarEventoManual')} className="w-full py-2 mb-2 rounded-xl text-xs font-bold border border-purple-900/50 text-purple-400 hover:bg-purple-950/30 transition-all">
            ⚡ Host: Disparar Evento Sorpresa
          </button>
        )}

        {/* Acciones */}
        {!miTurno && !eventoSorpresa && <p className="text-center text-slate-500 text-sm py-4 animate-pulse">Esperando que {jugadorActivo.apodo} juegue...</p>}
        
        {miTurno && !eventoSorpresa && (
          <div className="space-y-3">
            {etapa === 0 && !resultado && (
              <>
                <button onClick={() => enviarAccion('tirarCarta')} className="w-full py-5 rounded-2xl font-black text-xl bg-gradient-to-r from-yellow-600 to-yellow-400 text-slate-950 shadow-xl shadow-yellow-900/20 active:scale-95 transition-all">Tirar Carta 🎲</button>
                <button onClick={() => enviarAccion('declararCobarde')} className="w-full py-3 rounded-2xl font-bold text-slate-500 border border-slate-700">Soy cobarde (1 trago)</button>
              </>
            )}
            
            {cobarde && resultado?.tipo === 'cobarde' && <button onClick={() => enviarAccion('confirmarCobarde')} className="w-full py-4 rounded-2xl font-black bg-yellow-600 text-slate-900 active:scale-95 transition-all">Confirmar (tomé mi trago)</button>}
            
            {esperandoRespuesta && !resultado && (
              <div className="grid grid-cols-2 gap-3">
                {eReal === 1 && <><BtnRespuesta onClick={() => enviarAccion('responder', {acierto: cartaActual.esPar, etapaNum: 1})} label="PAR" emoji="2️⃣" /><BtnRespuesta onClick={() => enviarAccion('responder', {acierto: !cartaActual.esPar, etapaNum: 1})} label="IMPAR" emoji="1️⃣" /></>}
                {eReal === 2 && <><BtnRespuesta onClick={() => enviarAccion('responder', {acierto: cartaActual.valor > escalera[0].valor, etapaNum: 2})} label="MAYOR" emoji="⬆️" /><BtnRespuesta onClick={() => enviarAccion('responder', {acierto: cartaActual.valor < escalera[0].valor, etapaNum: 2})} label="MENOR" emoji="⬇️" /></>}
                {eReal === 3 && <><BtnRespuesta onClick={() => enviarAccion('responder', {acierto: cartaActual.color === 'rojo', etapaNum: 3})} label="ROJO" emoji="🔴" /><BtnRespuesta onClick={() => enviarAccion('responder', {acierto: cartaActual.color === 'negro', etapaNum: 3})} label="NEGRO" emoji="⚫" /></>}
                {eReal === 4 && <><BtnRespuesta onClick={() => enviarAccion('responder', {acierto: cartaActual.palo === '♣', etapaNum: 4})} label="TRÉBOL" emoji="♣" /><BtnRespuesta onClick={() => enviarAccion('responder', {acierto: cartaActual.palo === '♦', etapaNum: 4})} label="DIAMANTE" emoji="♦" /><BtnRespuesta onClick={() => enviarAccion('responder', {acierto: cartaActual.palo === '♥', etapaNum: 4})} label="CORAZÓN" emoji="♥" /><BtnRespuesta onClick={() => enviarAccion('responder', {acierto: cartaActual.palo === '♠', etapaNum: 4})} label="PICA" emoji="♠" /></>}
              </div>
            )}
            
            {resultado?.tipo === 'acierto' && !enRevancha && etapa > 1 && (
              <>
                {etapa <= 4 && <button onClick={() => enviarAccion('siguienteCarta')} className="w-full py-4 rounded-2xl font-black bg-gradient-to-r from-green-600 to-emerald-400 text-slate-950 active:scale-95 transition-all">Seguir apostando 🎯</button>}
                <button onClick={() => enviarAccion('plantarse')} className="w-full py-3 rounded-2xl font-bold border border-slate-600 text-slate-300">Plantarme con {puntosGanadosEscalera} pts</button>
              </>
            )}

            {resultado?.tipo === 'acierto' && etapa === 0 && puntosGanadosEscalera > 0 && (
               <button onClick={() => enviarAccion('siguienteTurno')} className="w-full py-4 rounded-2xl font-black bg-gradient-to-r from-yellow-600 to-yellow-400 text-slate-950 active:scale-95 transition-all">🎉 Escalera completa. Confirmar turno</button>
            )}

            {etapa < 0 && !esperandoRespuesta && !resultado?.tipo?.includes('derrota') && (
              <>
                {Math.abs(etapa) < 4 && <button onClick={() => enviarAccion('tomarRevancha')} className="w-full py-4 rounded-2xl font-black bg-gradient-to-r from-red-600 to-rose-400 text-white active:scale-95 transition-all">🔄 Tomar Revancha</button>}
                <button onClick={() => enviarAccion('aceptarDerrota')} className="w-full py-3 rounded-2xl font-bold border border-slate-600 text-slate-300">Aceptar derrota ({tragos} tragos)</button>
              </>
            )}

            {(resultado?.tipo === 'derrota' || resultado?.tipo === 'plantado' || (resultado?.tipo === 'fallo' && etapa === 0) || (resultado?.tipo === 'acierto' && etapa === 0 && puntosGanadosEscalera === 0)) && (
              <button onClick={() => enviarAccion('siguienteTurno')} className="w-full py-4 rounded-2xl font-black bg-slate-700 text-white active:scale-95 transition-all">Siguiente jugador →</button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}