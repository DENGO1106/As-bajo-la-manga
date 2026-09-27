import { getCartas } from '@/lib/notion';
import AdminBibliotecaClient from '@/components/AdminBibliotecaClient';

export const runtime = 'edge';

const DB_MAP = {
  osc:   process.env.NOTION_OSC_DB,
  toxic: process.env.NOTION_TOXIC_DB,
  poker: process.env.NOTION_POKER_DB,
};

export default async function AdminBibliotecaPage({ params }) {
  const { modo } = await params;
  const dbId = DB_MAP[modo] || DB_MAP.osc;
  const cartas = await getCartas(dbId);
  return <AdminBibliotecaClient cartasIniciales={cartas} modo={modo} />;
}