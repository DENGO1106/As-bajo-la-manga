import { getCartas } from '@/lib/notion';
import GameClient from '@/components/GameClient';
export const runtime = 'edge';

export default async function SalaPage({ params, searchParams }) {
  const { codigo } = await params;
  const { rol } = await searchParams; // 'host' o 'jugador'
  
  // Obtenemos la baraja oficial de Notion
  const baraja = await getCartas();

  return (
    <main className="min-h-screen bg-slate-950 text-white flex flex-col relative overflow-hidden">
      <GameClient codigo={codigo} rolInicial={rol || 'jugador'} barajaInicial={baraja} />
    </main>
  );
}
