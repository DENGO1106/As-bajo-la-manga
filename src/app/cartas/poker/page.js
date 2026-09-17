import { getCartas } from '@/lib/notion';
import CartasClient from '@/components/CartasClient';
export const runtime = 'edge';

export default async function CartasPoker() {
  const cartas = await getCartas(process.env.NOTION_POKER_DB);
  return <CartasClient cartas={cartas} titulo="Poker Caliente ♠️" color="amber" volver="/" />;
}
