'use client';
import { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

const PALOS = ['♣', '♦', '♥', '♠'];
const COLORES = { '♣': 'negro', '♦': 'rojo', '♥': 'rojo', '♠': 'negro' };
const FIGURAS = { J: 11, Q: 12, K: 13 };
const PUNTOS_CARTA = [0, 1, 2, 3, 4];

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

function Setup({ onIniciar }) {
  const [nombre, setNombre] = useState('');
  const [jugadores, setJugadores] = useState([]);

  const agregarJugador = () => {
    const n = nombre.trim();
    if (!n || jugadores.includes(n)) return;
    setJugadores([...jugadores, n]);
    setNombre('');
  };

  return (
    <div className="min-h-screen bg-[#020617] flex flex-col items-center justify-center p-4">
      <div className="max-w-sm w-full space-y-6">
        <Link href="/" className="inline-flex items-center gap-2 text-slate-600 hover:text-slate-400 text-sm transition-colors">← Volver</Link>
        <div className="text-center">
          <h1 className="text-4xl font-black gradient-gold mb-2">La Última Carta</h1>
          <p className="text-slate-400 text-sm">Modo Local (Pasa el celular)</p>
        </div>
        <div className="bg-slate-900/50 p-6 rounded-3xl border border-slate-800 shadow-2xl">
          <div className="flex gap-2 mb-4">
            <input type="text" maxLength={15} placeholder="Nombre del jugador" value={nombre} onChange={(e) => setNombre(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && agregarJugador()} className="flex-1 bg-[#020617] border border-slate-800 text-white px-4 py-3 rounded-xl focus:outline-none focus:border-yellow-600/40" />
            <button onClick={agregarJugador} className="bg-yellow-900/20 text-yellow-500 border border-yellow-600/30 px-6 font-black rounded-xl hover:bg-yellow-900/40">+</button>
          </div>
          <div className="space-y-2 mb-6">
            {jugadores.map((j, i) => (
              <div key={j} className="bg-[#020617] px-4 py-3 rounded-xl text-white font-bold flex justify-between">
                <span>{j}</span>
                <button onClick={() => setJugadores(jugadores.filter(x => x !== j))} className="text-red-500">✕</button>
              </div>
            ))}
          </div>
          <button onClick={() => onIniciar(jugadores)} disabled={jugadores.length < 1} className="w-full bg-gold text-slate-900 font-black py-4 rounded-xl disabled:opacity-30 active:scale-95 transition-all shadow-lg shadow-yellow-900/30">
            ¡Comenzar Torneo! 🎲
          </button>
        </div>
      </div>
    </div>
  );
}

export default function SinExcusasClient() {
  const router = useRouter();
  const [fase, setFase] = useState('setup');
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
  
  const barajaRef = useRef([]);
  const indexBaraja = useRef(0);

  const iniciarTorneo = (lista) => {
    setJugadores(lista.map(n => ({ nombre: n, puntos: -1, turnosJugados: 0 })));
    barajaRef.current = generarBaraja();
    indexBaraja.current = 0;
    setTurnoIdx(0);
    setFase('jugando');
  };

  const sacarCarta = () => {
    if (indexBaraja.current >= barajaRef.current.length) {
      barajaRef.current = generarBaraja();
      indexBaraja.current = 0;
    }
    const c = barajaRef.current[indexBaraja.current];
    indexBaraja.current++;
    return c;
  };

  const tirarCarta = () => {
    const carta = sacarCarta();
    setCartaActual(carta);
    setEscalera([carta]);
    setEtapa(1);
    setEsperandoRespuesta(true);
    setResultado(null);
    setTragos(0);
    setPuntosGanadosEscalera(0);
    setEnRevancha(false);
    setCobarde(false);
  };

  const continuarEvento = () => {
    setEventoSorpresa(null);
  };

  const lanzarEventoManual = () => {
    const evento = EVENTOS_SORPRESA[Math.floor(Math.random() * EVENTOS_SORPRESA.length)];
    setEventoSorpresa(evento);
  };

  const banearCarta = () => {
    const carta = sacarCarta();
    setCartaActual(carta);
    const nuevaEscalera = [...escalera];
    if (nuevaEscalera.length > 0) {
      nuevaEscalera[nuevaEscalera.length - 1] = carta;
    } else {
      nuevaEscalera.push(carta);
    }
    setEscalera(nuevaEscalera);
    setEsperandoRespuesta(true);
    setResultado(null);
  };

  const procesarRespuesta = (acierto, etapaNum) => {
    setEsperandoRespuesta(false);
    if (enRevancha) {
      const puntosEnJuego = PUNTOS_CARTA[etapaNum - 1] || 1;
      if (acierto) {
        setTragos(0);
        setPuntosGanadosEscalera(prev => prev + puntosEnJuego);
        setResultado({ tipo: 'acierto', mensaje: `✅ Revancha ganada (+${puntosEnJuego})` });
        setEnRevancha(false);
        setEtapa(0);
      } else {
        setTragos(prev => prev + 1);
        setPuntosGanadosEscalera(prev => prev - puntosEnJuego);
        setResultado({ tipo: 'fallo', mensaje: `❌ Revancha perdida (-${puntosEnJuego})` });
        setEnRevancha(false);
        setEtapa(0);
      }
      return;
    }

    if (acierto) {
      const pts = PUNTOS_CARTA[etapaNum];
      setPuntosGanadosEscalera(prev => prev + pts);
      setTragos(prev => Math.max(0, prev - 1));
      setResultado({ tipo: 'acierto', mensaje: `✅ ¡Acierto! +${pts}` });
      setEtapa(etapaNum === 4 ? 0 : etapaNum + 1);
    } else {
      setTragos(prev => prev + 1);
      setResultado({ tipo: 'fallo', mensaje: `❌ Fallo (1 trago)` });
      setEtapa(-etapaNum);
    }
  };

  const siguienteCarta = () => {
    const carta = sacarCarta();
    setCartaActual(carta);
    setEscalera(prev => [...prev, carta]);
    setEsperandoRespuesta(true);
    setResultado(null);
  };

  const tomarRevancha = () => {
    const carta = sacarCarta();
    setCartaActual(carta);
    setEscalera(prev => [...prev, carta]);
    setEnRevancha(true);
    setEsperandoRespuesta(true);
    setResultado(null);
    setEtapa(prev => Math.abs(prev) + 1);
  };

  const declararCobarde = () => {
    setCobarde(true);
    setResultado({ tipo: 'cobarde', mensaje: `No juega y toma 1 trago 🍺` });
    setEtapa(0);
  };

  const confirmarCobarde = () => avanzarTurno(true);
  const aceptarDerrota = () => { setResultado({ tipo: 'derrota', mensaje: `Derrota aceptada (${tragos} tragos)` }); setEtapa(0); };
  const plantarse = () => { setResultado({ tipo: 'plantado', mensaje: `Plantado con ${puntosGanadosEscalera} pts` }); setEtapa(0); };
  const confirmarFinTurno = () => avanzarTurno(false);

  const avanzarTurno = (esCobarde) => {
    const nj = [...jugadores];
    if (!esCobarde) {
      nj[turnoIdx].puntos += puntosGanadosEscalera;
    }
    nj[turnoIdx].turnosJugados += 1;
    setJugadores(nj);

    const turnosRestantes = nj.reduce((sum, j) => sum + (3 - j.turnosJugados), 0);
    if (turnosRestantes <= 0) {
      setFase('fin');
      return;
    }

    let sig = (turnoIdx + 1) % nj.length;
    while (nj[sig].turnosJugados >= 3) {
      sig = (sig + 1) % nj.length;
    }
    setTurnoIdx(sig);
    setEtapa(0);
    setEscalera([]);
    setCartaActual(null);
    setTragos(0);
    setPuntosGanadosEscalera(0);
    setResultado(null);
    setEsperandoRespuesta(false);
    setCobarde(false);
  };

  if (fase === 'setup') return <Setup onIniciar={iniciarTorneo} />;

  if (fase === 'fin') {
    const sorted = [...jugadores].sort((a, b) => b.puntos - a.puntos);
    const ganador = sorted[0];
    const perdedor = sorted[sorted.length - 1];
    return (
      <div className="min-h-screen p-4 flex flex-col items-center justify-center bg-[#020617]">
        <div className="max-w-sm w-full text-center">
          <h1 className="text-4xl font-black gradient-gold mb-8">Fin del Torneo 🏆</h1>
          <div className="space-y-3 mb-6">
            {sorted.map((j, i) => (
              <div key={j.nombre} className={`flex items-center justify-between p-4 rounded-2xl border ${i === 0 ? 'border-yellow-500/50 bg-yellow-500/10' : i === sorted.length - 1 ? 'border-red-500/30 bg-red-500/10' : 'border-slate-700 bg-slate-900/50'}`}>
                <span className="font-black text-white text-lg">{i === 0 ? '🥇' : i === sorted.length - 1 ? '💀' : `#${i + 1}`} {j.nombre}</span>
                <span className={`font-black text-xl ${j.puntos >= 0 ? 'text-yellow-400' : 'text-red-400'}`}>{j.puntos} pts</span>
              </div>
            ))}
          </div>
          <div className="bg-slate-900/60 rounded-2xl border border-slate-800 p-4 mb-6 space-y-2 text-sm">
            <p className="text-yellow-400 font-bold">🥇 {ganador.nombre} asigna 4 tragos a quien quiera</p>
            <p className="text-red-400 font-bold">💀 {perdedor.nombre} toma 1 trago de castigo final</p>
          </div>
          <button onClick={() => { setFase('setup'); setJugadores([]); }} className="w-full py-4 rounded-2xl font-black bg-gold text-slate-900 mb-3">Nuevo torneo</button>
          <button onClick={() => router.push('/')} className="w-full py-4 rounded-2xl font-bold border border-slate-700 text-white">Inicio</button>
        </div>
      </div>
    );
  }

  const jugadorActivo = jugadores[turnoIdx];
  const eReal = enRevancha ? Math.abs(etapa) : etapa;

  const BtnRespuesta = ({ onClick, label, emoji }) => (
    <button onClick={onClick} className="w-full py-4 rounded-2xl font-black border text-lg hover:scale-[1.02] active:scale-95 border-slate-600/40 bg-slate-900/50 text-slate-200 shadow-lg">
      {emoji} {label}
    </button>
  );

  return (
    <div className="min-h-screen p-4 flex flex-col items-center pt-6 pb-24 bg-[#020617] relative">
      
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

      <div className="max-w-sm w-full space-y-4 z-10">
        <div className="flex justify-between items-center text-xs font-bold text-slate-400">
          <button onClick={() => router.push('/')} className="hover:text-white">← Salir</button>
        </div>

        <div className="text-center">
          <p className="text-slate-500 text-xs uppercase tracking-widest">Le toca a</p>
          <h2 className="text-3xl font-black text-yellow-400">{jugadorActivo.nombre}</h2>
          {tragos > 0 && <p className="text-red-400 font-bold">🍺 {tragos} tragos acumulados</p>}
        </div>

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

        {cartaActual && esperandoRespuesta && !resultado && (
          <button onClick={banearCarta} className="w-full py-2 rounded-xl text-xs font-bold border border-red-900/50 text-red-500 hover:bg-red-950/30 transition-all">
            🚫 Banear esta carta y sacar otra
          </button>
        )}

        {!eventoSorpresa && (
          <button onClick={lanzarEventoManual} className="w-full py-2 mb-2 rounded-xl text-xs font-bold border border-purple-900/50 text-purple-400 hover:bg-purple-950/30 transition-all">
            ⚡ Disparar Evento Sorpresa Manualmente
          </button>
        )}

        {!eventoSorpresa && (
          <div className="space-y-3">
            {etapa === 0 && !resultado && (
              <>
                <button onClick={tirarCarta} className="w-full py-5 rounded-2xl font-black text-xl bg-gradient-to-r from-yellow-600 to-yellow-400 text-slate-950 shadow-xl shadow-yellow-900/20 active:scale-95 transition-all">Tirar Carta 🎲</button>
                <button onClick={declararCobarde} className="w-full py-3 rounded-2xl font-bold text-slate-500 border border-slate-700">Soy cobarde (1 trago)</button>
              </>
            )}
            
            {cobarde && resultado?.tipo === 'cobarde' && <button onClick={confirmarCobarde} className="w-full py-4 rounded-2xl font-black bg-yellow-600 text-slate-900 active:scale-95 transition-all">Confirmar (tomé mi trago)</button>}
            
            {esperandoRespuesta && !resultado && (
              <div className="grid grid-cols-2 gap-3">
                {eReal === 1 && <><BtnRespuesta onClick={() => procesarRespuesta(cartaActual.esPar, 1)} label="PAR" emoji="2️⃣" /><BtnRespuesta onClick={() => procesarRespuesta(!cartaActual.esPar, 1)} label="IMPAR" emoji="1️⃣" /></>}
                {eReal === 2 && <><BtnRespuesta onClick={() => procesarRespuesta(cartaActual.valor > escalera[0].valor, 2)} label="MAYOR" emoji="⬆️" /><BtnRespuesta onClick={() => procesarRespuesta(cartaActual.valor < escalera[0].valor, 2)} label="MENOR" emoji="⬇️" /></>}
                {eReal === 3 && <><BtnRespuesta onClick={() => procesarRespuesta(cartaActual.color === 'rojo', 3)} label="ROJO" emoji="🔴" /><BtnRespuesta onClick={() => procesarRespuesta(cartaActual.color === 'negro', 3)} label="NEGRO" emoji="⚫" /></>}
                {eReal === 4 && <><BtnRespuesta onClick={() => procesarRespuesta(cartaActual.palo === '♣', 4)} label="TRÉBOL" emoji="♣" /><BtnRespuesta onClick={() => procesarRespuesta(cartaActual.palo === '♦', 4)} label="DIAMANTE" emoji="♦" /><BtnRespuesta onClick={() => procesarRespuesta(cartaActual.palo === '♥', 4)} label="CORAZÓN" emoji="♥" /><BtnRespuesta onClick={() => procesarRespuesta(cartaActual.palo === '♠', 4)} label="PICA" emoji="♠" /></>}
              </div>
            )}
            
            {resultado?.tipo === 'acierto' && !enRevancha && etapa > 1 && (
              <>
                {etapa <= 4 && <button onClick={siguienteCarta} className="w-full py-4 rounded-2xl font-black bg-gradient-to-r from-green-600 to-emerald-400 text-slate-950 active:scale-95 transition-all">Seguir apostando 🎯</button>}
                <button onClick={plantarse} className="w-full py-3 rounded-2xl font-bold border border-slate-600 text-slate-300">Plantarme con {puntosGanadosEscalera} pts</button>
              </>
            )}

            {resultado?.tipo === 'acierto' && etapa === 0 && puntosGanadosEscalera > 0 && (
               <button onClick={confirmarFinTurno} className="w-full py-4 rounded-2xl font-black bg-gradient-to-r from-yellow-600 to-yellow-400 text-slate-950 active:scale-95 transition-all">🎉 Escalera completa. Confirmar turno</button>
            )}

            {etapa < 0 && !esperandoRespuesta && !resultado?.tipo?.includes('derrota') && (
              <>
                {Math.abs(etapa) < 4 && <button onClick={tomarRevancha} className="w-full py-4 rounded-2xl font-black bg-gradient-to-r from-red-600 to-rose-400 text-white active:scale-95 transition-all">🔄 Tomar Revancha</button>}
                <button onClick={aceptarDerrota} className="w-full py-3 rounded-2xl font-bold border border-slate-600 text-slate-300">Aceptar derrota ({tragos} tragos)</button>
              </>
            )}

            {(resultado?.tipo === 'derrota' || resultado?.tipo === 'plantado' || (resultado?.tipo === 'fallo' && etapa === 0) || (resultado?.tipo === 'acierto' && etapa === 0 && puntosGanadosEscalera === 0)) && (
              <button onClick={confirmarFinTurno} className="w-full py-4 rounded-2xl font-black bg-slate-700 text-white active:scale-95 transition-all">Siguiente jugador →</button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}