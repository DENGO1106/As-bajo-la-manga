'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function LobbyClient() {
  const [codigoSala, setCodigoSala] = useState('');
  const router = useRouter();

  const crearSala = () => {
    // Generar codigo aleatorio de 4 letras
    const letras = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    let codigo = '';
    for (let i = 0; i < 4; i++) {
      codigo += letras.charAt(Math.floor(Math.random() * letras.length));
    }
    // Redirigir a la sala como host
    router.push(`/sala/${codigo}?rol=host`);
  };

  const unirseSala = (e) => {
    e.preventDefault();
    if (codigoSala.length === 4) {
      router.push(`/sala/${codigoSala.toUpperCase()}?rol=jugador`);
    }
  };

  return (
    <div className="bg-slate-900/50 backdrop-blur-md p-8 rounded-3xl border border-slate-800 shadow-2xl">
      <button 
        onClick={crearSala}
        className="w-full bg-gradient-to-r from-red-600 to-red-500 hover:from-red-500 hover:to-red-400 text-white font-bold py-4 px-6 rounded-2xl shadow-lg shadow-red-600/20 transition-all hover:scale-[1.02] active:scale-95 mb-8 text-lg"
      >
        👑 Crear Nueva Sala
      </button>

      <div className="relative flex items-center py-5">
        <div className="flex-grow border-t border-slate-700"></div>
        <span className="flex-shrink-0 mx-4 text-slate-500 text-sm font-medium uppercase tracking-wider">o uníte a una</span>
        <div className="flex-grow border-t border-slate-700"></div>
      </div>

      <form onSubmit={unirseSala} className="flex flex-col gap-4 mt-2">
        <input 
          type="text" 
          maxLength={4}
          placeholder="CÓDIGO (ej. ABCD)"
          value={codigoSala}
          onChange={(e) => setCodigoSala(e.target.value.toUpperCase())}
          className="w-full bg-slate-950 border-2 border-slate-800 text-white text-center text-2xl font-black tracking-[0.5em] py-4 rounded-2xl focus:outline-none focus:border-purple-500 transition-colors uppercase placeholder:text-slate-700 placeholder:tracking-normal placeholder:font-normal placeholder:text-base"
        />
        <button 
          type="submit"
          disabled={codigoSala.length !== 4}
          className="w-full bg-slate-800 disabled:bg-slate-900 disabled:text-slate-600 text-white font-bold py-4 px-6 rounded-2xl transition-all hover:bg-slate-700 active:scale-95 text-lg"
        >
          Unirse a la Sala 🎮
        </button>
      </form>
    </div>
  );
}
