import { getCartas } from '@/lib/notion';
import IndividualClient from '@/components/IndividualClient';
import SinExcusasClient from '@/components/SinExcusasClient';
export const runtime = 'edge';

const DB_MAP = {
  osc:     process.env.NOTION_OSC_DB,
  toxic:   process.env.NOTION_TOXIC_DB,
  poker:   process.env.NOTION_POKER_DB,
};

const TITULO_MAP = {
  osc:     'Sin Excusas',
  toxic:   'Toxic Cards',
  poker:   'Poker Caliente',
};

export default async function IndividualPage({ params }) {
  const { modo } = await params;

  // La Ultima Carta: motor propio con reglamento V3 (no usa Notion)
  if (modo === 'escalera') {
    return <SinExcusasClient />;
  }

  const dbId = DB_MAP[modo] || DB_MAP.osc;
  const cartas = await getCartas(dbId);
  const titulo = TITULO_MAP[modo] || 'As Bajo La Manga';

  return <IndividualClient cartas={cartas} titulo={titulo} modo={modo} />;
}