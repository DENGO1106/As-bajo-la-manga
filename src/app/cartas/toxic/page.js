import { getCartas } from '@/lib/notion';
import CartasClient from '@/components/CartasClient';
export const runtime = 'edge';

export default async function CartasToxic() {
  const cartas = await getCartas(process.env.NOTION_TOXIC_DB);
  return <CartasClient cartas={cartas} titulo="Toxic Cards ☠️" color="purple" volver="/" />;
}
