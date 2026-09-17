import Link from 'next/link';

const modos = [
  { id: 'osc',   nombre: 'La Última Carta', desc: '151 cartas · Escalera de riesgo', emoji: '🃏' },
  { id: 'toxic', nombre: 'Toxic Cards',      desc: '300 cartas · Verdad o reto',     emoji: '☠️' },
  { id: 'poker', nombre: 'Poker Caliente',   desc: '54 cartas · Mazo completo',      emoji: '♠️' },
];

export default function Home() {
  return (
    <main className="min-h-screen min-h-dvh bg-[#020617] flex flex-col items-center justify-center p-4 relative overflow-hidden">

      {/* Fondo decorativo */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[400px] bg-yellow-600/10 rounded-full blur-[120px]"></div>
        <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-[400px] h-[300px] bg-yellow-800/10 rounded-full blur-[100px]"></div>
      </div>

      <div className="max-w-md w-full z-10 animate-fade-in">

        {/* Título */}
        <div className="text-center mb-10">
          <div className="inline-flex items-center gap-2 bg-yellow-900/20 border border-yellow-600/20 text-yellow-400/80 text-xs font-bold uppercase tracking-widest px-4 py-1.5 rounded-full mb-6">
            🎴 Juego de Cartas
          </div>
          <h1 className="text-6xl md:text-7xl font-black gradient-gold leading-tight mb-3">
            As Bajo<br/>La Manga
          </h1>
          <p className="text-slate-500 text-sm">Elegí un juego y un modo para empezar</p>
        </div>

        {/* Modos */}
        <div className="flex flex-col gap-3">
          {modos.map(modo => (
            <div key={modo.id} className="glass rounded-2xl overflow-hidden">
              {/* Header del modo */}
              <div className="flex items-center gap-4 px-5 py-4 border-b border-yellow-600/10">
                <span className="text-3xl">{modo.emoji}</span>
                <div className="flex-1 min-w-0">
                  <p className="font-black text-white text-base leading-tight">{modo.nombre}</p>
                  <p className="text-slate-500 text-xs mt-0.5">{modo.desc}</p>
                </div>
              </div>
              {/* Botones */}
              <div className="grid grid-cols-2 divide-x divide-yellow-600/10">
                <Link
                  href={`/jugar/${modo.id}/individual`}
                  className="flex flex-col items-center gap-1 py-4 text-sm font-bold text-slate-400 hover:text-yellow-400 hover:bg-yellow-900/20 active:bg-yellow-900/30 transition-all"
                >
                  <span className="text-xl">👤</span>
                  <span>Individual</span>
                </Link>
                <Link
                  href={`/sala?modo=${modo.id}`}
                  className="flex flex-col items-center gap-1 py-4 text-sm font-bold text-slate-400 hover:text-yellow-400 hover:bg-yellow-900/20 active:bg-yellow-900/30 transition-all"
                >
                  <span className="text-xl">📱</span>
                  <span>En Sala</span>
                </Link>
              </div>
            </div>
          ))}
        </div>

        {/* Links discretos a catálogos */}
        <div className="mt-8 flex gap-4 justify-center flex-wrap">
          {modos.map(m => (
            <Link key={m.id} href={`/cartas/${m.id}`} className="text-slate-700 hover:text-slate-500 text-xs transition-colors underline underline-offset-2">
              Ver cartas — {m.nombre}
            </Link>
          ))}
        </div>
      </div>
    </main>
  );
}
