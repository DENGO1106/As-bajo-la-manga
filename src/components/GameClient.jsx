'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';

export default function GameClient({ codigo, rolInicial, barajaInicial }) {
  const router = useRouter();
  const [peer, setPeer] = useState(null);
  const [conexiones, setConexiones] = useState([]); // Lista de conexiones (solo host)
  const [hostConn, setHostConn] = useState(null);  // Conexión al host (solo jugador)
  const [estado, setEstado] = useState('conectando'); // conectando | esperando | jugando
  const [cartaActual, setCartaActual] = useState(null);
  const [mensaje, setMensaje] = useState('');
  const [apodo, setApodo] = useState('');
  const [apodoConfirmado, setApodoConfirmado] = useState(false);
  const [jugadores, setJugadores] = useState([]);
  const [esAnfitrion, setEsAnfitrion] = useState(rolInicial === 'host');
  const [turnoActual, setTurnoActual] = useState(0); // Indice del jugador con turno
  const barajaRef = useRef([...barajaInicial].sort(() => Math.random() - 0.5));
  const indexCartaRef = useRef(0);
  const connListRef = useRef([]);

  // -------------------------------------------------------
  // INICIALIZAR PEER (WebRTC)
  // -------------------------------------------------------
  useEffect(() => {
    if (!apodoConfirmado) return;

    let peerInstance;
    
    // Importamos PeerJS dinámicamente (solo en browser)
    import('peerjs').then(({ Peer }) => {
      const peerId = esAnfitrion ? `ablm-host-${codigo}` : `ablm-${codigo}-${Date.now()}`;
      peerInstance = new Peer(peerId, { debug: 0 });

      peerInstance.on('open', () => {
        setPeer(peerInstance);

        if (esAnfitrion) {
          // HOST: Escuchar conexiones entrantes
          setEstado('esperando');
          setJugadores([{ id: peerId, apodo, esAnfitrion: true }]);

          peerInstance.on('connection', (conn) => {
            conn.on('open', () => {
              conn.on('data', (data) => manejarMensajeHost(conn, data, peerInstance));
              connListRef.current = [...connListRef.current, conn];
              setConexiones(prev => [...prev, conn]);
            });
          });
        } else {
          // JUGADOR: Conectarse al host
          const conn = peerInstance.connect(`ablm-host-${codigo}`);
          conn.on('open', () => {
            setHostConn(conn);
            conn.send({ tipo: 'unirse', apodo });
            conn.on('data', (data) => manejarMensajeJugador(data));
            setEstado('esperando');
          });
          conn.on('error', () => {
            setMensaje('No se encontró esa sala. Verificá el código.');
            setEstado('error');
          });
        }
      });

      peerInstance.on('error', () => {
        setMensaje('Error de conexión. Intentá de nuevo.');
        setEstado('error');
      });
    });

    return () => { if (peerInstance) peerInstance.destroy(); };
  }, [apodoConfirmado]);

  // -------------------------------------------------------
  // MENSAJES QUE RECIBE EL HOST
  // -------------------------------------------------------
  const manejarMensajeHost = useCallback((conn, data, peerInstance) => {
    if (data.tipo === 'unirse') {
      const nuevoJugador = { id: conn.peer, apodo: data.apodo, esAnfitrion: false };
      setJugadores(prev => {
        const lista = [...prev, nuevoJugador];
        // Notificar a todos la lista actualizada
        connListRef.current.forEach(c => c.send({ tipo: 'jugadores', lista }));
        return lista;
      });
    }
  }, []);

  // -------------------------------------------------------
  // MENSAJES QUE RECIBE EL JUGADOR
  // -------------------------------------------------------
  const manejarMensajeJugador = useCallback((data) => {
    if (data.tipo === 'jugadores') setJugadores(data.lista);
    if (data.tipo === 'carta') { setCartaActual(data.carta); setTurnoActual(data.turno); setEstado('jugando'); }
    if (data.tipo === 'inicio') setEstado('jugando');
  }, []);

  // -------------------------------------------------------
  // ACCIONES DEL HOST
  // -------------------------------------------------------
  const iniciarJuego = () => {
    connListRef.current.forEach(c => c.send({ tipo: 'inicio' }));
    setEstado('jugando');
  };

  const tirarCarta = () => {
    if (!esAnfitrion) return;
    const carta = barajaRef.current[indexCartaRef.current % barajaRef.current.length];
    indexCartaRef.current += 1;
    setCartaActual(carta);
    setTurnoActual(prev => {
      const siguiente = (prev + 1) % jugadores.length;
      connListRef.current.forEach(c => c.send({ tipo: 'carta', carta, turno: siguiente }));
      return siguiente;
    });
  };

  // -------------------------------------------------------
  // RENDER - Pantalla de Apodo
  // -------------------------------------------------------
  if (!apodoConfirmado) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen p-6">
        <div className="max-w-sm w-full bg-slate-900/50 p-8 rounded-3xl border border-slate-800">
          <h2 className="text-2xl font-bold text-center mb-8">¿Con qué apodo jugás?</h2>
          <input
            type="text"
            maxLength={16}
            placeholder="Tu apodo..."
            value={apodo}
            onChange={(e) => setApodo(e.target.value)}
            className="w-full bg-slate-950 border-2 border-slate-800 text-white text-center text-xl font-bold py-4 rounded-2xl focus:outline-none focus:border-purple-500 transition-colors mb-4"
            onKeyDown={(e) => { if (e.key === 'Enter' && apodo.trim()) setApodoConfirmado(true); }}
          />
          <button
            disabled={!apodo.trim()}
            onClick={() => setApodoConfirmado(true)}
            className="w-full bg-gradient-to-r from-red-600 to-purple-600 disabled:opacity-40 text-white font-bold py-4 rounded-2xl transition-all hover:scale-[1.02] active:scale-95"
          >
            Entrar a la Sala 🎮
          </button>
        </div>
      </div>
    );
  }

  // -------------------------------------------------------
  // RENDER - Error
  // -------------------------------------------------------
  if (estado === 'error') {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen p-6 text-center gap-6">
        <p className="text-xl text-red-400">{mensaje}</p>
        <button onClick={() => router.push('/')} className="bg-slate-800 px-6 py-3 rounded-2xl font-bold hover:bg-slate-700 transition-colors">← Volver</button>
      </div>
    );
  }

  // -------------------------------------------------------
  // RENDER - Esperando jugadores (Lobby)
  // -------------------------------------------------------
  if (estado === 'conectando' || estado === 'esperando') {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen p-6">
        <div className="max-w-md w-full">
          <div className="text-center mb-8">
            <p className="text-slate-400 text-sm uppercase tracking-widest mb-2">Código de la sala</p>
            <h2 className="text-7xl font-black text-transparent bg-clip-text bg-gradient-to-r from-red-500 to-purple-600 tracking-widest">{codigo}</h2>
            <p className="text-slate-400 mt-2 text-sm">Compartí este código con tus compas</p>
          </div>

          <div className="bg-slate-900/50 p-6 rounded-3xl border border-slate-800 mb-6">
            <h3 className="font-bold text-slate-400 text-sm uppercase tracking-wider mb-4">Jugadores ({jugadores.length})</h3>
            {jugadores.length === 0 && (
              <div className="flex items-center gap-3 text-slate-500">
                <div className="w-2 h-2 rounded-full bg-slate-600 animate-pulse"></div>
                <span>Esperando jugadores...</span>
              </div>
            )}
            {jugadores.map((j, i) => (
              <div key={j.id || i} className="flex items-center gap-3 py-2 border-b border-slate-800/50 last:border-0">
                <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse"></div>
                <span className="font-semibold">{j.apodo}</span>
                {j.esAnfitrion && <span className="ml-auto text-xs bg-amber-600/20 text-amber-400 px-2 py-0.5 rounded-full font-bold">HOST</span>}
              </div>
            ))}
          </div>

          {esAnfitrion && (
            <button
              onClick={iniciarJuego}
              disabled={jugadores.length < 2}
              className="w-full bg-gradient-to-r from-red-600 to-purple-600 disabled:opacity-40 text-white font-bold py-5 rounded-2xl text-lg transition-all hover:scale-[1.02] active:scale-95"
            >
              {jugadores.length < 2 ? 'Esperando al menos 1 compita más...' : '¡Iniciar Juego! 🃏'}
            </button>
          )}
          {!esAnfitrion && (
            <p className="text-center text-slate-400">Esperando que el host inicie el juego...</p>
          )}
        </div>
      </div>
    );
  }

  // -------------------------------------------------------
  // RENDER - Juego activo
  // -------------------------------------------------------
  const jugadorActivo = jugadores[turnoActual % jugadores.length];
  const esMiTurno = esAnfitrion && turnoActual % jugadores.length === 0; // Host controla

  return (
    <div className="flex flex-col items-center justify-center min-h-screen p-6 gap-8">
      {/* Info del turno */}
      <div className="text-center">
        <p className="text-slate-400 text-sm uppercase tracking-widest">Turno de</p>
        <h2 className="text-3xl font-black text-amber-400">{jugadorActivo?.apodo || '...'}</h2>
      </div>

      {/* Carta */}
      <div
        className="w-72 h-96 rounded-3xl shadow-2xl flex items-center justify-center p-8 text-center border border-white/10"
        style={{ backgroundColor: cartaActual?.colorHex || '#1e293b' }}
      >
        {cartaActual ? (
          <div>
            <h3 className="text-white font-black text-2xl mb-6 uppercase tracking-wider">{cartaActual.nombre}</h3>
            <p className={`text-white/90 leading-relaxed ${cartaActual.textSize || 'text-base'}`}>{cartaActual.descripcion}</p>
          </div>
        ) : (
          <div className="text-white/30 text-6xl">🃏</div>
        )}
      </div>

      {/* Boton tirar (solo host por ahora) */}
      {esAnfitrion && (
        <button
          onClick={tirarCarta}
          className="bg-gradient-to-r from-red-600 to-purple-600 text-white font-black text-xl py-5 px-12 rounded-full shadow-xl shadow-red-500/20 hover:scale-105 active:scale-95 transition-all"
        >
          {cartaActual ? 'Siguiente Carta 🃏' : 'Tirar Primera Carta 🎲'}
        </button>
      )}
      {!esAnfitrion && (
        <p className="text-slate-500 text-sm">Solo el host puede tirar las cartas</p>
      )}

      {/* Jugadores conectados */}
      <div className="flex gap-3 flex-wrap justify-center">
        {jugadores.map((j, i) => (
          <div
            key={j.id || i}
            className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-bold border transition-all ${turnoActual % jugadores.length === i ? 'bg-amber-500/20 border-amber-500 text-amber-400' : 'bg-slate-800/50 border-slate-700 text-slate-400'}`}
          >
            <div className="w-2 h-2 rounded-full bg-green-400"></div>
            {j.apodo}
          </div>
        ))}
      </div>
    </div>
  );
}
