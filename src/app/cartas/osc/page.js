import { getCartas } from '@/lib/notion';
import CartasClient from '@/components/CartasClient';
export const runtime = 'edge';

export default async function CartasOSC() {
  const cartas = await getCartas(process.env.NOTION_OSC_DB);
  return <CartasClient cartas={cartas} titulo="La Última Carta 🃏" color="red" volver="/" />;
}
