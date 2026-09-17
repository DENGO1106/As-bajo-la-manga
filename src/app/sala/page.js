import SalaClientWrapper from './SalaClientWrapper';

export const runtime = 'edge';

export const metadata = {
  title: 'Sala Multijugador | As Bajo La Manga',
};

export default function UniversalSalaPage() {
  return <SalaClientWrapper />;
}
