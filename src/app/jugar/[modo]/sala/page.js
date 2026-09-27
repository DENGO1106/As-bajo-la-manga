import { getCartas } from '@/lib/notion';
import SalaClient from '@/components/SalaClient';
import SinExcusasSalaClient from '@/components/SinExcusasSalaClient';
export const runtime = 'edge';

const DB_MAP = {
  osc:   process.env.NOTION_OSC_DB,
  toxic: process.env.NOTION_TOXIC_DB,
  poker: process.env.NOTION_POKER_DB,
};

const TITULO_MAP = {
  osc:   'Sin Excusas',
  toxic: 'Toxic Cards',
  poker: 'Poker Caliente',
};

export default async function SalaPage({ params }) {
  const { modo } = await params;

  // La Ultima Carta: motor propio conectado a WebRTC
  if (modo === 'escalera') {
    return <SinExcusasSalaClient />;
  }

  const dbId = DB_MAP[modo] || DB_MAP.osc;
  const cartas = await getCartas(dbId);
  const titulo = TITULO_MAP[modo] || 'As Bajo La Manga';

  return <SalaClient cartas={cartas} titulo={titulo} modo={modo} />;
}