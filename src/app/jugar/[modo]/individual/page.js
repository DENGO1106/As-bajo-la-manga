import { getCartas } from '@/lib/notion';
import IndividualClient from '@/components/IndividualClient';
export const runtime = 'edge';

const DB_MAP = {
  osc: process.env.NOTION_OSC_DB,
  toxic: process.env.NOTION_TOXIC_DB,
  poker: process.env.NOTION_POKER_DB,
};

const TITULO_MAP = {
  osc: 'La Última Carta 🃏',
  toxic: 'Toxic Cards ☠️',
  poker: 'Poker Caliente ♠️',
};

export default async function IndividualPage({ params }) {
  const { modo } = await params;
  const dbId = DB_MAP[modo] || DB_MAP.osc;
  const cartas = await getCartas(dbId);
  const titulo = TITULO_MAP[modo] || 'As Bajo La Manga';

  return <IndividualClient cartas={cartas} titulo={titulo} modo={modo} />;
}
