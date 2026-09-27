'use client';

import { useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';

// -------------------------------------------------------
// BARAJA: 52 cartas estándar SIN los 4 Ases (48 cartas)
// -------------------------------------------------------
const PALOS = ['♣', '♦', '♥', '♠'];
const COLORES = { '♣': 'negro', '♦': 'rojo', '♥': 'rojo', '♠': 'negro' };
const FIGURAS = { J: 11, Q: 12, K: 13 };

function generarBaraja() {
  const cartas = [];
  const rangos = ['2','3','4','5','6','7','8','9','10','J','Q','K'];
  for (const palo of PALOS) {
    for (const rango of rangos) {
      const valor = FIGURAS[rango] ?? parseInt(rango);
      cartas.push({
        rango,
        palo,
        valor,
        color: COLORES[palo],
        esPar: valor % 2 === 0,
        display: `${rango}${palo}`,
      });
    }
  }
  // Fisher-Yates shuffle
  for (let i = cartas.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [cartas[i], cartas[j]] = [cartas[j], cartas[i]];
  }
  return cartas;
}

// Puntos por carta en la escalera
const PUNTOS_CARTA = [0, 1, 2, 3, 4]; // índice 1-4

// -------------------------------------------------------
// SETUP: Ingreso de jugadores
// -------------------------------------------------------
function Setup({ onIniciar }) {
  const [nombres, setNombres] = useState(['', '']);
  const agregar = () => setNombres(prev => [...prev, '']);
  const quitar = (i) => setNombres(prev => prev.filter((_, idx) => idx !== i));
  const cambiar = (i, val) => setNombres(prev => prev.map((n, idx) => idx === i ? val : n));
  const validos = nombres.filter(n => n.trim().length > 0);

  return (
    <div className="flex flex-col items-center justify-center min-h-screen p-6">
      <div className="max-w-sm w-full">
        <div className="text-center mb-8">
          <div className="text-5xl mb-3">🃏</div>
          <h1 className="text-4xl font-black gradient-gold">Sin Excusas</h1>
          <p className="text-slate-400 text-sm mt-2">Escalera de riesgo · 3 turnos por jugador</p>
        </div>

        <div className="bg-slate-900/60 rounded-3xl border border-slate-800 p-6 mb-4 space-y-3">
          <p className="text-slate-400 text-xs uppercase tracking-widest font-bold mb-2">Jugadores ({validos.length})</p>
          {nombres.map((n, i) => (
            <div key={i} className="flex gap-2">
              <input
                type="text"
                maxLength={16}
                placeholder={`Jugador ${i + 1}`}
                value={n}
                onChange={e => cambiar(i, e.target.value)}
                className="flex-1 bg-slate-950 border border-slate-700 text-white px-4 py-3 rounded-xl focus:outline-none focus:border-yellow-500 transition-colors font-semibold"
              />
              {nombres.length > 2 && (
                <button onClick={() => quitar(i)} className="text-red-500 px-3 rounded-xl border border-red-900/40 hover:bg-red-900/20 transition-colors">✕</button>
              )}
            </div>
          ))}
          <button
            onClick={agregar}
            className="w-full py-2 rounded-xl border border-dashed border-slate-700 text-slate-500 hover:text-slate-300 hover:border-slate-500 transition-colors text-sm"
          >
            + Agregar jugador
          </button>
        </div>

        <button
          disabled={validos.length < 2}
          onClick={() => onIniciar(validos.filter(n => n.trim()))}
          className="w-full py-4 rounded-2xl font-black text-lg bg-gradient-to-r from-yellow-600 to-yellow-400 text-slate-950 disabled:opacity-40 hover:scale-[1.02] active:scale-95 transition-all shadow-xl shadow-yellow-500/20"
        >
          ¡Empezar Torneo! 🎲
        </button>
      </div>
    </div>
  );
}

// -------------------------------------------------------
// JUEGO PRINCIPAL
// -------------------------------------------------------
export default function SinExcusasClient() {
  const router = useRouter();
  const [fase, setFase] = useState('setup'); // setup | jugando | fin
  const [jugadores, setJugadores] = useState([]); // { nombre, puntos, turnosJugados }
  const [baraja, setBaraja] = useState([]);
  const [indexBaraja, setIndexBaraja] = useState(0);
  const [turnoIdx, setTurnoIdx] = useState(0);     // índice del jugador activo
  const [escalera, setEscalera] = useState([]);     // cartas reveladas este turno [c1, c2, c3, c4]
  const [cartaActual, setCartaActual] = useState(null);
  const [etapa, setEtapa] = useState(0);            // 0=antes, 1=carta1, 2=carta2, 3=carta3, 4=carta4
  const [tragos, setTragos] = useState(0);          // tragos acumulados este turno
  const [esperandoRespuesta, setEsperandoRespuesta] = useState(false);
  const [resultado, setResultado] = useState(null); // { tipo:'acierto'|'fallo', mensaje }
  const [enRevancha, setEnRevancha] = useState(false);
  const [puntosGanadosEscalera, setPuntosGanadosEscalera] = useState(0);
  const [log, setLog] = useState([]);
  const [cobarde, setCobarde] = useState(false);

  // -------------------------------------------------------
  // INICIAR TORNEO
  // -------------------------------------------------------
  const iniciarTorneo = (nombres) => {
    const jug = nombres.map(n => ({ nombre: n.trim(), puntos: -1, turnosJugados: 0 }));
    setJugadores(jug);
    setBaraja(generarBaraja());
    setIndexBaraja(0);
    setTurnoIdx(0);
    setEtapa(0);
    setEscalera([]);
    setTragos(0);
    setPuntosGanadosEscalera(0);
    setLog([]);
    setCobarde(false);
    setResultado(null);
    setEnRevancha(false);
    setFase('jugando');
  };

  const jugadorActivo = jugadores[turnoIdx] || {};
  const totalTurnos = jugadores.length * 3;
  const turnosCompletos = jugadores.reduce((s, j) => s + j.turnosJugados, 0);

  // -------------------------------------------------------
  // SACAR CARTA DEL MAZO
  // -------------------------------------------------------
  const sacarCarta = useCallback(() => {
    if (indexBaraja >= baraja.length) {
      // Remezclar si se acaban las cartas
      const nueva = generarBaraja();
      setBaraja(nueva);
      setIndexBaraja(1);
      return nueva[0];
    }
    const carta = baraja[indexBaraja];
    setIndexBaraja(prev => prev + 1);
    return carta;
  }, [baraja, indexBaraja]);

  // -------------------------------------------------------
  // REGLA DEL COBARDE
  // -------------------------------------------------------
  const declararCobarde = () => {
    setCobarde(true);
    setLog(prev => [...prev, `💛 ${jugadorActivo.nombre} declaró cobarde → 1 trago`]);
    setResultado({ tipo: 'cobarde', mensaje: `${jugadorActivo.nombre} no juega este turno y toma 1 trago 🍺` });
    setEtapa(0);
  };

  const confirmarCobarde = () => {
    setCobarde(false);
    setResultado(null);
    avanzarTurno();
  };

  // -------------------------------------------------------
  // TIRAR CARTA (iniciar la escalera)
  // -------------------------------------------------------
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
  };

  // -------------------------------------------------------
  // RESPONDER CARTA 1: ¿Par o Impar?
  // -------------------------------------------------------
  const responderParImpar = (respuesta) => {
    const acierto = (respuesta === 'par') === cartaActual.esPar;
    procesarRespuesta(acierto, 1);
  };

  // -------------------------------------------------------
  // RESPONDER CARTA 2: ¿Mayor o Menor?
  // -------------------------------------------------------
  const responderMayorMenor = (respuesta) => {
    const carta1 = escalera[0];
    const acierto = respuesta === 'mayor'
      ? cartaActual.valor > carta1.valor
      : cartaActual.valor < carta1.valor;
    procesarRespuesta(acierto, 2);
  };

  // -------------------------------------------------------
  // RESPONDER CARTA 3: ¿Color?
  // -------------------------------------------------------
  const responderColor = (respuesta) => {
    const acierto = respuesta === cartaActual.color;
    procesarRespuesta(acierto, 3);
  };

  // -------------------------------------------------------
  // RESPONDER CARTA 4: ¿Palo?
  // -------------------------------------------------------
  const responderPalo = (respuesta) => {
    const acierto = respuesta === cartaActual.palo;
    procesarRespuesta(acierto, 4);
  };

  // -------------------------------------------------------
  // PROCESAR ACIERTO O FALLO
  // -------------------------------------------------------
  const procesarRespuesta = (acierto, etapaNum) => {
    setEsperandoRespuesta(false);

    if (enRevancha) {
      // Estamos en revancha
      const puntosEnJuego = PUNTOS_CARTA[etapaNum - 1] || 1; // puntos de la carta anterior
      if (acierto) {
        // Gana revancha: cancela el trago, gana puntos de carta anterior
        setTragos(0);
        setPuntosGanadosEscalera(prev => prev + puntosEnJuego);
        setResultado({ tipo: 'acierto', mensaje: `✅ ¡Revancha ganada! 0 tragos · +${puntosEnJuego} pts` });
        setLog(prev => [...prev, `✅ ${jugadorActivo.nombre} ganó revancha en carta ${etapaNum}: +${puntosEnJuego} pts`]);
      } else {
        // Pierde revancha: +1 trago extra, resta puntos de carta anterior
        setTragos(prev => prev + 1);
        setPuntosGanadosEscalera(prev => prev - puntosEnJuego);
        setResultado({ tipo: 'fallo', mensaje: `❌ Revancha perdida · 2 tragos · -${puntosEnJuego} pts` });
        setLog(prev => [...prev, `❌ ${jugadorActivo.nombre} perdió revancha en carta ${etapaNum}: -${puntosEnJuego} pts`]);
      }
      setEnRevancha(false);
      setEtapa(0);
      return;
    }

    if (acierto) {
      const puntos = PUNTOS_CARTA[etapaNum];
      setPuntosGanadosEscalera(prev => prev + puntos);
      setTragos(prev => Math.max(0, prev - 1));
      setResultado({ tipo: 'acierto', mensaje: `✅ ¡Acierto! +${puntos} pts` });
      setLog(prev => [...prev, `✅ ${jugadorActivo.nombre} acertó carta ${etapaNum}: +${puntos} pts`]);

      if (etapaNum === 4) {
        // Completó la escalera completa
        setEtapa(0);
      } else {
        setEtapa(etapaNum + 1); // Puede continuar o plantarse
      }
    } else {
      setTragos(prev => prev + 1);
      setResultado({ tipo: 'fallo', mensaje: `❌ Fallo · 1 trago acumulado` });
      setLog(prev => [...prev, `❌ ${jugadorActivo.nombre} falló carta ${etapaNum}`]);

      if (etapaNum === 4) {
        // No hay revancha en carta 4
        setEtapa(0);
      } else {
        setEtapa(-etapaNum); // Negativo = decisión pendiente (revancha o aceptar)
      }
    }
  };

  // -------------------------------------------------------
  // OPCIONES DESPUÉS DE FALLAR
  // -------------------------------------------------------
  const aceptarDerrota = () => {
    setResultado({ tipo: 'derrota', mensaje: `Turno terminado · ${tragos} trago(s)` });
    setEtapa(0);
  };

  const tomarRevancha = () => {
    // Sacar siguiente carta
    const carta = sacarCarta();
    setCartaActual(carta);
    setEscalera(prev => [...prev, carta]);
    setEnRevancha(true);
    setEsperandoRespuesta(true);
    setResultado(null);
    // La etapa de revancha es la siguiente
    setEtapa(Math.abs(etapa) + 1);
  };

  // -------------------------------------------------------
  // PLANTARSE (después de acierto, antes de carta 4)
  // -------------------------------------------------------
  const plantarse = () => {
    setResultado({ tipo: 'plantado', mensaje: `Se plantó con ${puntosGanadosEscalera} pts · ${tragos} trago(s)` });
    setEtapa(0);
  };

  // -------------------------------------------------------
  // CONTINUAR A LA SIGUIENTE CARTA
  // -------------------------------------------------------
  const siguienteCarta = () => {
    const carta = sacarCarta();
    setCartaActual(carta);
    setEscalera(prev => [...prev, carta]);
    setEsperandoRespuesta(true);
    setResultado(null);
  };

  // -------------------------------------------------------
  // CONFIRMAR FIN DE TURNO → aplicar puntos y pasar turno
  // -------------------------------------------------------
  const confirmarFinTurno = () => {
    setJugadores(prev => {
      const nuevo = [...prev];
      nuevo[turnoIdx] = {
        ...nuevo[turnoIdx],
        puntos: nuevo[turnoIdx].puntos + puntosGanadosEscalera,
        turnosJugados: nuevo[turnoIdx].turnosJugados + 1,
      };
      return nuevo;
    });
    avanzarTurno();
  };

  const avanzarTurno = () => {
    setEtapa(0);
    setEscalera([]);
    setCartaActual(null);
    setTragos(0);
    setPuntosGanadosEscalera(0);
    setResultado(null);
    setEnRevancha(false);
    setEsperandoRespuesta(false);

    // Verificar si el torneo terminó
    const turnosRestantes = jugadores.reduce((s, j, i) => {
      const t = i === turnoIdx ? j.turnosJugados + 1 : j.turnosJugados;
      return s + (3 - t);
    }, 0);

    if (turnosRestantes <= 0) {
      setFase('fin');
      return;
    }

    // Siguiente jugador con turnos disponibles
    let siguiente = (turnoIdx + 1) % jugadores.length;
    for (let i = 0; i < jugadores.length; i++) {
      const idx = (turnoIdx + 1 + i) % jugadores.length;
      if (jugadores[idx].turnosJugados < 3) {
        siguiente = idx;
        break;
      }
    }
    setTurnoIdx(siguiente);
  };

  // -------------------------------------------------------
  // PANTALLA: FIN DEL TORNEO
  // -------------------------------------------------------
  if (fase === 'fin') {
    const sorted = [...jugadores].sort((a, b) => b.puntos - a.puntos);
    const ganador = sorted[0];
    const perdedor = sorted[sorted.length - 1];

    return (
      <div className="flex flex-col items-center justify-center min-h-screen p-6">
        <div className="max-w-sm w-full">
          <div className="text-center mb-8">
            <div className="text-5xl mb-2">🏆</div>
            <h1 className="text-3xl font-black gradient-gold">Fin del Torneo</h1>
          </div>

          <div className="space-y-3 mb-6">
            {sorted.map((j, i) => (
              <div key={j.nombre} className={`flex items-center justify-between p-4 rounded-2xl border ${i === 0 ? 'border-yellow-500/50 bg-yellow-500/10' : i === sorted.length - 1 ? 'border-red-500/30 bg-red-500/10' : 'border-slate-700 bg-slate-900/50'}`}>
                <div className="flex items-center gap-3">
                  <span className="text-2xl">{i === 0 ? '🥇' : i === sorted.length - 1 ? '💀' : `#${i + 1}`}</span>
                  <span className="font-black text-white">{j.nombre}</span>
                </div>
                <span className={`font-black text-xl ${j.puntos >= 0 ? 'text-yellow-400' : 'text-red-400'}`}>{j.puntos} pts</span>
              </div>
            ))}
          </div>

          <div className="bg-slate-900/60 rounded-2xl border border-slate-800 p-4 mb-6 space-y-2 text-sm">
            <p className="text-yellow-400 font-bold">🥇 {ganador.nombre} asigna 4 tragos a quien quiera</p>
            <p className="text-red-400 font-bold">💀 {perdedor.nombre} toma 1 trago de castigo final</p>
          </div>

          <div className="flex gap-3">
            <button onClick={() => { setFase('setup'); setJugadores([]); }} className="flex-1 py-4 rounded-2xl font-bold bg-slate-800 hover:bg-slate-700 transition-colors">
              Nuevo torneo
            </button>
            <button onClick={() => router.push('/')} className="flex-1 py-4 rounded-2xl font-bold border border-slate-700 hover:bg-slate-800 transition-colors">
              Inicio
            </button>
          </div>
        </div>
      </div>
    );
  }

  // -------------------------------------------------------
  // PANTALLA: SETUP
  // -------------------------------------------------------
  if (fase === 'setup') return <Setup onIniciar={iniciarTorneo} />;

  // -------------------------------------------------------
  // PANTALLA: JUGANDO
  // -------------------------------------------------------
  const etapaAbs = Math.abs(etapa);
  const enDecision = etapa < 0; // Falló, debe elegir

  // Botones de respuesta según la etapa
  const botonesRespuesta = () => {
    const etapaReal = enRevancha ? etapaAbs : etapa;
    if (etapaReal === 1) {
      return (
        <div className="grid grid-cols-2 gap-3">
          <BtnRespuesta onClick={() => responderParImpar('par')} label="PAR" emoji="2️⃣" color="blue" />
          <BtnRespuesta onClick={() => responderParImpar('impar')} label="IMPAR" emoji="1️⃣" color="purple" />
        </div>
      );
    }
    if (etapaReal === 2) {
      return (
        <div className="grid grid-cols-2 gap-3">
          <BtnRespuesta onClick={() => responderMayorMenor('mayor')} label="MAYOR" emoji="⬆️" color="green" />
          <BtnRespuesta onClick={() => responderMayorMenor('menor')} label="MENOR" emoji="⬇️" color="red" />
        </div>
      );
    }
    if (etapaReal === 3) {
      return (
        <div className="grid grid-cols-2 gap-3">
          <BtnRespuesta onClick={() => responderColor('rojo')} label="ROJO" emoji="🔴" color="red" />
          <BtnRespuesta onClick={() => responderColor('negro')} label="NEGRO" emoji="⚫" color="slate" />
        </div>
      );
    }
    if (etapaReal === 4) {
      return (
        <div className="grid grid-cols-2 gap-3">
          <BtnRespuesta onClick={() => responderPalo('♣')} label="TRÉBOL" emoji="♣" color="slate" />
          <BtnRespuesta onClick={() => responderPalo('♦')} label="DIAMANTE" emoji="♦" color="red" />
          <BtnRespuesta onClick={() => responderPalo('♥')} label="CORAZÓN" emoji="♥" color="red" />
          <BtnRespuesta onClick={() => responderPalo('♠')} label="PICA" emoji="♠" color="slate" />
        </div>
      );
    }
    return null;
  };

  const preguntaEtapa = () => {
    const e = enRevancha ? etapaAbs : etapa;
    const labels = ['', '¿Par o Impar?', '¿Mayor o Menor que la anterior?', '¿Rojo o Negro?', '¿Cuál es el Palo?'];
    if (enRevancha) return `🔄 REVANCHA · ${labels[e] || ''}`;
    return labels[e] || '';
  };

  return (
    <div className="min-h-screen p-4 flex flex-col items-center justify-start pt-6 pb-24">
      <div className="max-w-sm w-full space-y-4">

        {/* Header */}
        <div className="flex items-center justify-between">
          <button onClick={() => router.push('/')} className="text-slate-500 hover:text-white transition-colors text-sm">← Salir</button>
          <span className="text-slate-400 text-xs font-bold">Turno {turnosCompletos + 1}/{totalTurnos}</span>
        </div>

        {/* Marcador */}
        <div className="bg-slate-900/60 rounded-2xl border border-slate-800 p-3">
          <div className="flex justify-around">
            {jugadores.map((j, i) => (
              <div key={j.nombre} className={`text-center px-2 ${i === turnoIdx ? 'opacity-100' : 'opacity-40'}`}>
                <p className={`text-xs font-bold uppercase truncate max-w-[60px] ${i === turnoIdx ? 'text-yellow-400' : 'text-slate-400'}`}>{j.nombre}</p>
                <p className={`text-lg font-black ${j.puntos < 0 ? 'text-red-400' : 'text-white'}`}>{j.puntos}</p>
                <p className="text-slate-600 text-xs">{j.turnosJugados}/3</p>
              </div>
            ))}
          </div>
        </div>

        {/* Turno activo */}
        <div className="text-center">
          <p className="text-slate-400 text-xs uppercase tracking-widest">Le toca a</p>
          <h2 className="text-3xl font-black text-yellow-400">{jugadorActivo.nombre}</h2>
          {tragos > 0 && <p className="text-red-400 font-bold mt-1">🍺 {tragos} trago(s) acumulados</p>}
        </div>

        {/* Escalera de cartas reveladas */}
        {escalera.length > 0 && (
          <div className="flex gap-2 justify-center flex-wrap">
            {escalera.map((c, i) => {
              // Si es la última carta de la escalera y estamos esperando respuesta, la ocultamos en el historial también
              const esUltima = i === escalera.length - 1;
              const estaOculta = esUltima && esperandoRespuesta && !resultado;
              
              if (estaOculta) {
                return (
                  <div key={i} className="w-14 h-20 rounded-xl border border-yellow-600/50 bg-gradient-to-br from-yellow-900/80 to-slate-900 flex flex-col items-center justify-center font-black text-lg shadow-lg">
                    <span className="text-2xl opacity-50">🃏</span>
                  </div>
                );
              }
              return (
                <div key={i} className={`w-14 h-20 rounded-xl border flex flex-col items-center justify-center font-black text-lg shadow-lg ${c.color === 'rojo' ? 'border-red-500/50 bg-red-950/40 text-red-400' : 'border-slate-600/50 bg-slate-900 text-slate-200'}`}>
                  <span className="text-sm">{c.rango}</span>
                  <span className="text-xl">{c.palo}</span>
                </div>
              );
            })}
          </div>
        )}

        {/* Carta actual grande */}
        {cartaActual && (
          <div className={`w-full h-44 rounded-3xl border-2 flex flex-col items-center justify-center shadow-2xl transition-all duration-300 ${esperandoRespuesta && !resultado ? 'border-yellow-600/50 bg-gradient-to-br from-yellow-900/40 to-slate-900/80' : cartaActual.color === 'rojo' ? 'border-red-500/60 bg-gradient-to-br from-red-950/60 to-red-900/30' : 'border-slate-600/60 bg-gradient-to-br from-slate-900/80 to-slate-800/40'}`}>
            {esperandoRespuesta && !resultado ? (
              <div className="text-center animate-pulse">
                <p className="text-6xl opacity-50">🃏</p>
              </div>
            ) : resultado ? (
              <div className="text-center px-4">
                <p className={`text-5xl font-black ${cartaActual.color === 'rojo' ? 'text-red-400' : 'text-white'}`}>{cartaActual.rango}{cartaActual.palo}</p>
                <p className={`text-sm font-bold mt-2 ${resultado.tipo === 'acierto' ? 'text-green-400' : resultado.tipo === 'cobarde' ? 'text-yellow-400' : 'text-red-400'}`}>{resultado.mensaje}</p>
              </div>
            ) : (
              <div className="text-center">
                <p className={`text-5xl font-black ${cartaActual.color === 'rojo' ? 'text-red-400' : 'text-white'}`}>{cartaActual.rango}{cartaActual.palo}</p>
              </div>
            )}
          </div>
        )}

        {/* ===== ZONA DE ACCIONES ===== */}

        {/* Antes de empezar el turno */}
        {etapa === 0 && !resultado && (
          <div className="space-y-3">
            {!cobarde && (
              <>
                <button onClick={tirarCarta} className="w-full py-5 rounded-2xl font-black text-xl bg-gradient-to-r from-yellow-600 to-yellow-400 text-slate-950 hover:scale-[1.02] active:scale-95 transition-all shadow-xl shadow-yellow-500/20">
                  Tirar Carta 🎲
                </button>
                <button onClick={declararCobarde} className="w-full py-3 rounded-2xl font-bold text-slate-500 border border-slate-700 hover:text-yellow-400 hover:border-yellow-700 transition-colors text-sm">
                  Soy cobarde (1 trago, paso el turno)
                </button>
              </>
            )}
          </div>
        )}

        {/* Cobarde confirmado */}
        {cobarde && resultado?.tipo === 'cobarde' && (
          <button onClick={confirmarCobarde} className="w-full py-4 rounded-2xl font-black bg-yellow-600 text-slate-950 hover:scale-[1.02] active:scale-95 transition-all">
            Confirmar (tomé mi trago) ✓
          </button>
        )}

        {/* Botones de respuesta */}
        {esperandoRespuesta && !resultado && (
          <div>
            <p className="text-center text-yellow-400 font-bold mb-3 text-sm uppercase tracking-wider">{preguntaEtapa()}</p>
            {botonesRespuesta()}
          </div>
        )}

        {/* Después de acierto: plantarse o continuar */}
        {resultado?.tipo === 'acierto' && !enRevancha && etapa > 1 && etapa <= 4 && (
          <div className="space-y-3">
            {etapa <= 4 && (
              <button onClick={siguienteCarta} className="w-full py-4 rounded-2xl font-black bg-gradient-to-r from-green-600 to-emerald-400 text-slate-950 hover:scale-[1.02] active:scale-95 transition-all">
                Seguir apostando (carta {etapa}) 🎯
              </button>
            )}
            <button onClick={plantarse} className="w-full py-3 rounded-2xl font-bold border border-slate-600 text-slate-300 hover:bg-slate-800 transition-colors">
              Plantarme con {puntosGanadosEscalera} pts
            </button>
          </div>
        )}

        {/* Acierto en carta 4 (completó escalera) */}
        {resultado?.tipo === 'acierto' && etapa === 0 && puntosGanadosEscalera > 0 && (
          <button onClick={confirmarFinTurno} className="w-full py-4 rounded-2xl font-black bg-gradient-to-r from-yellow-600 to-yellow-400 text-slate-950 hover:scale-[1.02] active:scale-95 transition-all">
            🎉 ¡Escalera completa! Confirmar turno ({puntosGanadosEscalera} pts · {tragos} tragos)
          </button>
        )}

        {/* Después de fallo: revancha o aceptar */}
        {enDecision && !esperandoRespuesta && !resultado?.tipo?.includes('derrota') && (
          <div className="space-y-3">
            {etapaAbs < 4 && (
              <button onClick={tomarRevancha} className="w-full py-4 rounded-2xl font-black bg-gradient-to-r from-red-600 to-rose-400 text-white hover:scale-[1.02] active:scale-95 transition-all">
                🔄 Tomar Revancha (apostar por carta {etapaAbs + 1})
              </button>
            )}
            <button onClick={aceptarDerrota} className="w-full py-3 rounded-2xl font-bold border border-slate-600 text-slate-300 hover:bg-slate-800 transition-colors">
              Aceptar derrota ({tragos} trago(s))
            </button>
          </div>
        )}

        {/* Revancha resuelta o derrota aceptada */}
        {(resultado?.tipo === 'derrota' || resultado?.tipo === 'plantado' || (resultado?.tipo === 'fallo' && !enDecision && etapa === 0) || (resultado?.tipo === 'acierto' && etapa === 0 && puntosGanadosEscalera === 0)) && (
          <button onClick={confirmarFinTurno} className="w-full py-4 rounded-2xl font-black bg-slate-700 hover:bg-slate-600 text-white transition-colors">
            Siguiente jugador →
          </button>
        )}

        {/* Log del turno */}
        {log.length > 0 && (
          <div className="bg-slate-950/60 rounded-xl border border-slate-800 p-3 space-y-1 max-h-32 overflow-y-auto">
            {[...log].reverse().slice(0, 5).map((l, i) => (
              <p key={i} className="text-xs text-slate-500">{l}</p>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// -------------------------------------------------------
// Botón de respuesta reutilizable
// -------------------------------------------------------
function BtnRespuesta({ onClick, label, emoji, color }) {
  const colors = {
    blue: 'border-blue-500/40 bg-blue-950/30 text-blue-300 hover:bg-blue-900/50',
    purple: 'border-purple-500/40 bg-purple-950/30 text-purple-300 hover:bg-purple-900/50',
    green: 'border-green-500/40 bg-green-950/30 text-green-300 hover:bg-green-900/50',
    red: 'border-red-500/40 bg-red-950/30 text-red-300 hover:bg-red-900/50',
    slate: 'border-slate-600/40 bg-slate-900/50 text-slate-200 hover:bg-slate-800/80',
  };
  return (
    <button
      onClick={onClick}
      className={`w-full py-4 rounded-2xl font-black border text-lg transition-all hover:scale-[1.02] active:scale-95 ${colors[color] || colors.slate}`}
    >
      {emoji} {label}
    </button>
  );
}
